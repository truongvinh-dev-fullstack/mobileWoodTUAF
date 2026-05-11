#import <Accelerate/Accelerate.h>
#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>
#import <VisionCamera/Frame.h>
#import <CoreMedia/CoreMedia.h>
#import <CoreVideo/CoreVideo.h>
#import <CoreImage/CoreImage.h>
#import "onnxruntime_cxx_api.h"
#include <memory>
#include <vector>

@interface XyzFrameProcessorPlugin : FrameProcessorPlugin {
  BOOL isProcessing;
  std::unique_ptr<Ort::Env> ortEnv;
  std::unique_ptr<Ort::Session> ortSession;
  std::vector<const char*> inputNames;
  std::vector<const char*> outputNames;
  Ort::AllocatorWithDefaultOptions allocator;
  char* inputName;
  char* outputName;
}
@end

@implementation XyzFrameProcessorPlugin

- (instancetype _Nonnull)initWithProxy:(VisionCameraProxyHolder*)proxy
                           withOptions:(NSDictionary* _Nullable)options {
  self = [super initWithProxy:proxy withOptions:options];
  if (self) {
    isProcessing = NO;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
      [self initializeOnnxModel];
    });
  }
  return self;
}

- (void)initializeOnnxModel {
  NSLog(@"[ONNX] Bắt đầu khởi tạo model...");
  NSString* modelPath = [[NSBundle mainBundle] pathForResource:@"model_converted_v2" ofType:@"onnx"];
  if (!modelPath) {
    NSLog(@"[ONNX] ❌ Không tìm thấy file model_converted_v2.onnx trong bundle.");
    return;
  }
  try {
    ortEnv = std::make_unique<Ort::Env>(ORT_LOGGING_LEVEL_WARNING, "xyz_env");
    Ort::SessionOptions sessionOptions;
    sessionOptions.SetGraphOptimizationLevel(GraphOptimizationLevel::ORT_ENABLE_ALL);
    ortSession = std::make_unique<Ort::Session>(*ortEnv, [modelPath UTF8String], sessionOptions);
    inputName = ortSession->GetInputNameAllocated(0, allocator).release();
    outputName = ortSession->GetOutputNameAllocated(0, allocator).release();
    inputNames.push_back(inputName);
    outputNames.push_back(outputName);
    NSLog(@"[ONNX] ✅ ONNX model loaded và khởi tạo thành công.");
  } catch (const Ort::Exception& e) {
    NSLog(@"[ONNX] ❌ Lỗi khởi tạo Ort::Exception: %s", e.what());
  }
}

- (void)dealloc {
  if (inputName) allocator.Free(inputName);
  if (outputName) allocator.Free(outputName);
}

- (id _Nullable)callback:(Frame* _Nonnull)frame
           withArguments:(NSDictionary* _Nullable)arguments {
  if (isProcessing || !ortSession) return nil;
  isProcessing = YES;

  CVPixelBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(frame.buffer);
  if (!pixelBuffer) {
    NSLog(@"[FrameProcessor] ❌ Không lấy được CVPixelBuffer.");
    isProcessing = NO;
    return nil;
  }
  
  [self savePixelBufferToCache:pixelBuffer];

  try {
    CVPixelBufferLockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
    size_t originalWidth = CVPixelBufferGetWidth(pixelBuffer);
    size_t originalHeight = CVPixelBufferGetHeight(pixelBuffer);

    const int cropSize = 300;
    size_t count = cropSize * cropSize;

    // === Resize giữ tỉ lệ ===
    float scale = (originalWidth < originalHeight)
      ? ((float)cropSize / originalWidth)
      : ((float)cropSize / originalHeight);

    size_t resizedWidth = originalWidth * scale;
    size_t resizedHeight = originalHeight * scale;

    CIImage* ciImage = [CIImage imageWithCVPixelBuffer:pixelBuffer];
    ciImage = [ciImage imageByApplyingTransform:CGAffineTransformMakeScale(scale, scale)];

    // === Crop center 224x224 ===
    CGRect cropRect = CGRectMake(
      (resizedWidth > cropSize ? (resizedWidth - cropSize) / 2 : 0),
      (resizedHeight > cropSize ? (resizedHeight - cropSize) / 2 : 0),
      cropSize,
      cropSize
    );
    ciImage = [ciImage imageByCroppingToRect:cropRect];

    // === Render ảnh về RGBA ===
    CIContext* ciContext = [CIContext contextWithOptions:nil];
    CGImageRef cgImage = [ciContext createCGImage:ciImage fromRect:ciImage.extent];

    UInt8* rgba = (UInt8*)malloc(count * 4);
    CGContextRef ctx = CGBitmapContextCreate(
      rgba,
      cropSize,
      cropSize,
      8,
      cropSize * 4,
      CGColorSpaceCreateDeviceRGB(),
      kCGImageAlphaPremultipliedLast
    );
    CGContextDrawImage(ctx, CGRectMake(0, 0, cropSize, cropSize), cgImage);

    // === Chuẩn hóa RGB theo ImageNet ===
    float* red = (float*)malloc(sizeof(float) * count);
    float* green = (float*)malloc(sizeof(float) * count);
    float* blue = (float*)malloc(sizeof(float) * count);

    for (int i = 0; i < count; i++) {
      red[i] = rgba[i * 4] / 255.0f;
      green[i] = rgba[i * 4 + 1] / 255.0f;
      blue[i] = rgba[i * 4 + 2] / 255.0f;
    }

    float mean[] = {0.485f, 0.456f, 0.406f};
    float std[] = {0.229f, 0.224f, 0.225f};
    for (int i = 0; i < count; i++) {
      red[i] = (red[i] - mean[0]) / std[0];
      green[i] = (green[i] - mean[1]) / std[1];
      blue[i] = (blue[i] - mean[2]) / std[2];
    }

    float* chw = (float*)malloc(sizeof(float) * count * 3);
    memcpy(chw, red, sizeof(float) * count);
    memcpy(chw + count, green, sizeof(float) * count);
    memcpy(chw + count * 2, blue, sizeof(float) * count);

    Ort::MemoryInfo memoryInfo = Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);
    Ort::Value inputTensor = Ort::Value::CreateTensor<float>(
      memoryInfo,
      chw,
      count * 3,
      std::vector<int64_t>{1, 3, cropSize, cropSize}.data(),
      4
    );

    auto output = ortSession->Run(
      Ort::RunOptions{nullptr},
      inputNames.data(),
      &inputTensor,
      1,
      outputNames.data(),
      1
    );

    float* outputData = output.front().GetTensorMutableData<float>();
    size_t outputLen = output.front().GetTensorTypeAndShapeInfo().GetElementCount();

    // In thử kết quả
    NSLog(@"[ONNX] ✅ Output[0] = %f", outputData[0]);

    NSMutableArray* resultArray = [NSMutableArray arrayWithCapacity:outputLen];
    for (int i = 0; i < outputLen; i++) {
        [resultArray addObject:@(outputData[i])];
    }

    // Clean up như trước
    CGImageRelease(cgImage);
    CGContextRelease(ctx);
    free(rgba);
    free(red);
    free(green);
    free(blue);
    free(chw);
    CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
    isProcessing = NO;

    return resultArray;

  } catch (const Ort::Exception& e) {
    NSLog(@"[ONNX] ❌ Lỗi runtime Ort::Exception: %s", e.what());
  }

  isProcessing = NO;
  return nil;
}

- (NSString *)savePixelBufferToCache:(CVPixelBufferRef)pixelBuffer {
  NSString *cacheDir = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES).firstObject;
  NSString *savePath = [cacheDir stringByAppendingPathComponent:@"frame_latest.png"];

  [[NSFileManager defaultManager] removeItemAtPath:savePath error:nil];

  // Xoay 90 độ theo chiều kim đồng hồ (rotate + translate)
  CIImage *inputImage = [CIImage imageWithCVPixelBuffer:pixelBuffer];
  CGAffineTransform transform = CGAffineTransformMakeTranslation(inputImage.extent.size.height, 0);
  transform = CGAffineTransformRotate(transform, -M_PI_2);
  CIImage *rotatedImage = [inputImage imageByApplyingTransform:transform];

  CIContext *context = [CIContext contextWithOptions:nil];
  CGImageRef cgImage = [context createCGImage:rotatedImage fromRect:rotatedImage.extent];
  if (!cgImage) return nil;

  UIImage *uiImage = [UIImage imageWithCGImage:cgImage];
  CGImageRelease(cgImage);

  NSData *imageData = UIImagePNGRepresentation(uiImage);
  if (!imageData) return nil;

  if ([imageData writeToFile:savePath atomically:YES]) {
    return savePath;
  }

  return nil;
}




VISION_EXPORT_FRAME_PROCESSOR(XyzFrameProcessorPlugin, xyz)

@end
