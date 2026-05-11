#import "ImageRecognizerModule.h"
#import <React/RCTLog.h>
#import <React/RCTConvert.h>
#import <Accelerate/Accelerate.h>
#import <onnxruntime_cxx_api.h>

@implementation ImageRecognizerModule

RCT_EXPORT_MODULE();

// Các biến static cho ONNX session (không thay đổi)
static Ort::Env* ortEnv = nil;
static Ort::Session* ortSession = nil;
static Ort::SessionOptions* sessionOptions = nil;

// Phương thức khởi tạo model (không thay đổi)
+ (void)initializeOnnxModel {
  if (ortEnv && ortSession) return;

  NSString* modelPath = [[NSBundle mainBundle] pathForResource:@"model_converted_v2" ofType:@"onnx"];
  if (!modelPath) {
    RCTLogError(@"❌ Không tìm thấy model onnx.");
    return;
  }

  ortEnv = new Ort::Env(ORT_LOGGING_LEVEL_WARNING, "image_recognizer");
  sessionOptions = new Ort::SessionOptions();
  sessionOptions->SetGraphOptimizationLevel(GraphOptimizationLevel::ORT_ENABLE_ALL);
  ortSession = new Ort::Session(*ortEnv, [modelPath UTF8String], *sessionOptions);
}

// --- BẮT ĐẦU PHẦN CHỈNH SỬA ---

RCT_REMAP_METHOD(recognizeImage,
                 withPath:(NSString *)imagePath
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  [ImageRecognizerModule initializeOnnxModel];
  if (!ortSession) {
    dispatch_async(dispatch_get_main_queue(), ^{
      reject(@"onnx_init_failed", @"ONNX model chưa được khởi tạo", nil);
    });
    return;
  }

  UIImage* image = [UIImage imageWithContentsOfFile:imagePath];
  if (!image) {
    dispatch_async(dispatch_get_main_queue(), ^{
      reject(@"invalid_image", @"Không đọc được ảnh từ đường dẫn", nil);
    });
    return;
  }

  int cropSize = 300;
  NSData* floatData = [ImageRecognizerModule preprocessUIImage:image cropSize:cropSize];
  if (!floatData) {
    dispatch_async(dispatch_get_main_queue(), ^{
      reject(@"preprocess_failed", @"Tiền xử lý ảnh thất bại", nil);
    });
    return;
  }

  // ✅ Chạy inference trong background thread
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    try {
      size_t inputTensorSize = cropSize * cropSize * 3;
      std::vector<int64_t> inputShape = {1, 3, cropSize, cropSize};

      Ort::MemoryInfo memoryInfo = Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);
      Ort::Value inputTensor = Ort::Value::CreateTensor<float>(
        memoryInfo,
        (float*)floatData.bytes,
        inputTensorSize,
        inputShape.data(),
        inputShape.size()
      );

      Ort::AllocatorWithDefaultOptions allocator;
      auto inputNamePtr = ortSession->GetInputNameAllocated(0, allocator);
      auto outputNamePtr = ortSession->GetOutputNameAllocated(0, allocator);

      const char* inputName = inputNamePtr.get();
      const char* outputName = outputNamePtr.get();

      std::vector<const char*> inputNames = {inputName};
      std::vector<const char*> outputNames = {outputName};

      auto output = ortSession->Run(Ort::RunOptions{nullptr}, inputNames.data(), &inputTensor, 1, outputNames.data(), 1);

      float* resultPtr = output.front().GetTensorMutableData<float>();
      size_t outputLen = output.front().GetTensorTypeAndShapeInfo().GetElementCount();

      NSMutableArray* resultArray = [NSMutableArray arrayWithCapacity:outputLen];
      for (int i = 0; i < outputLen; i++) {
        [resultArray addObject:@(resultPtr[i])];
      }

      dispatch_async(dispatch_get_main_queue(), ^{
        resolve(resultArray);
      });

    } catch (const Ort::Exception& e) {
      NSString* error = [NSString stringWithUTF8String:e.what()];
      dispatch_async(dispatch_get_main_queue(), ^{
        reject(@"onnx_run_failed", error, nil);
      });
    }
  });

}


// --- KẾT THÚC PHẦN CHỈNH SỬA ---


// Phương thức tiền xử lý ảnh (không thay đổi)
+ (NSData*)preprocessUIImage:(UIImage *)image cropSize:(int)cropSize {
  CGImageRef cgImage = [image CGImage];
  size_t originalWidth = CGImageGetWidth(cgImage);
  size_t originalHeight = CGImageGetHeight(cgImage);

    int minTargetSize = 400;
   float scale;
   if (originalWidth < originalHeight) {
     scale = (float)minTargetSize / originalWidth;
   } else {
     scale = (float)minTargetSize / originalHeight;
   }

  size_t resizedWidth = (size_t)(originalWidth * scale);
  size_t resizedHeight = (size_t)(originalHeight * scale);

  // Resize
  CGContextRef resizeContext = CGBitmapContextCreate(NULL, resizedWidth, resizedHeight, 8, resizedWidth * 4,
    CGColorSpaceCreateDeviceRGB(), kCGImageAlphaPremultipliedLast);
  CGContextDrawImage(resizeContext, CGRectMake(0, 0, resizedWidth, resizedHeight), cgImage);
  CGImageRef resizedImage = CGBitmapContextCreateImage(resizeContext);
  CGContextRelease(resizeContext);

  // Crop
  size_t cropX = 0;
  size_t cropY = (resizedHeight > cropSize) ? (resizedHeight - cropSize) / 2 : 0;
  CGRect cropRect = CGRectMake(cropX, cropY, cropSize, cropSize);
  CGImageRef croppedImage = CGImageCreateWithImageInRect(resizedImage, cropRect);
  CGImageRelease(resizedImage);

  // Final 224x224 context
  CGContextRef finalContext = CGBitmapContextCreate(NULL, cropSize, cropSize, 8, cropSize * 4,
    CGColorSpaceCreateDeviceRGB(), kCGImageAlphaPremultipliedLast);
  CGContextDrawImage(finalContext, CGRectMake(0, 0, cropSize, cropSize), croppedImage);
  CGImageRelease(croppedImage);

  UInt8* pixels = (UInt8*)CGBitmapContextGetData(finalContext);
  if (!pixels) {
    CGContextRelease(finalContext);
    return nil;
  }

  size_t count = cropSize * cropSize;
  float* red = (float*)malloc(sizeof(float) * count);
  float* green = (float*)malloc(sizeof(float) * count);
  float* blue = (float*)malloc(sizeof(float) * count);

  for (int i = 0; i < count; i++) {
    red[i] = pixels[i * 4] / 255.0f;
    green[i] = pixels[i * 4 + 1] / 255.0f;
    blue[i] = pixels[i * 4 + 2] / 255.0f;
  }

  float mean[] = {0.485f, 0.456f, 0.406f};
  float std[] = {0.229f, 0.224f, 0.225f};

  for (int i = 0; i < count; i++) {
    red[i] = (red[i] - mean[0]) / std[0];
    green[i] = (green[i] - mean[1]) / std[1];
    blue[i] = (blue[i] - mean[2]) / std[2];
  }

  NSMutableData* tensorData = [NSMutableData dataWithLength:sizeof(float) * count * 3];
  memcpy(tensorData.mutableBytes, red, sizeof(float) * count);
  memcpy((float*)tensorData.mutableBytes + count, green, sizeof(float) * count);
  memcpy((float*)tensorData.mutableBytes + count * 2, blue, sizeof(float) * count);

  free(red); free(green); free(blue);

  // --- Ghi ảnh debug ---
  CGImageRef debugImage = CGBitmapContextCreateImage(finalContext);
  UIImage* finalUIImage = [UIImage imageWithCGImage:debugImage];
  NSString* tempPath = [NSTemporaryDirectory() stringByAppendingPathComponent:@"debug_processed.png"];
  [UIImagePNGRepresentation(finalUIImage) writeToFile:tempPath atomically:YES];
  NSLog(@"✅ Đường dẫn ảnh đã xử lý: %@", tempPath);
  CGImageRelease(debugImage);

  CGContextRelease(finalContext);
  return tensorData;
}

@end
