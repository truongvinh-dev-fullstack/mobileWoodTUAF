#import "ImageRecognizerModule.h"
#import <React/RCTLog.h>
#import <React/RCTConvert.h>
#import <onnxruntime/core/session/onnxruntime_cxx_api.h>
#import <Accelerate/Accelerate.h>

@implementation ImageRecognizerModule

RCT_EXPORT_MODULE();

static Ort::Env* ortEnv = nil;
static Ort::Session* ortSession = nil;
static Ort::SessionOptions* sessionOptions = nil;

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

RCT_REMAP_METHOD(recognizeImage,
                 withPath:(NSString *)imagePath
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  [ImageRecognizerModule initializeOnnxModel];
  if (!ortSession) {
    reject(@"onnx_init_failed", @"ONNX model chưa được khởi tạo", nil);
    return;
  }

  UIImage* image = [UIImage imageWithContentsOfFile:imagePath];
  if (!image) {
    reject(@"invalid_image", @"Không đọc được ảnh từ đường dẫn", nil);
    return;
  }

  int cropSize = 224;
  NSData* floatData = [self preprocessUIImage:image cropSize:cropSize];
  if (!floatData) {
    reject(@"preprocess_failed", @"Tiền xử lý ảnh thất bại", nil);
    return;
  }

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

    const char* inputName = ortSession->GetInputName(0, Ort::AllocatorWithDefaultOptions());
    const char* outputName = ortSession->GetOutputName(0, Ort::AllocatorWithDefaultOptions());

    std::vector<const char*> inputNames = {inputName};
    std::vector<const char*> outputNames = {outputName};

    auto output = ortSession->Run(Ort::RunOptions{nullptr}, inputNames.data(), &inputTensor, 1, outputNames.data(), 1);

    float* resultPtr = output.front().GetTensorMutableData<float>();
    size_t outputLen = output.front().GetTensorTypeAndShapeInfo().GetElementCount();

    NSMutableArray* resultArray = [NSMutableArray arrayWithCapacity:outputLen];
    for (int i = 0; i < outputLen; i++) {
      [resultArray addObject:@(resultPtr[i])];
    }

    resolve(resultArray);
  } catch (const Ort::Exception& e) {
    NSString* error = [NSString stringWithUTF8String:e.what()];
    reject(@"onnx_run_failed", error, nil);
  }
}

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

  // Tạo context để resize
  CGContextRef resizeContext = CGBitmapContextCreate(NULL, resizedWidth, resizedHeight, 8, resizedWidth * 4,
    CGColorSpaceCreateDeviceRGB(), kCGImageAlphaPremultipliedLast);
  CGContextDrawImage(resizeContext, CGRectMake(0, 0, resizedWidth, resizedHeight), cgImage);
  CGImageRef resizedImage = CGBitmapContextCreateImage(resizeContext);

  // Tính toán cropX, cropY như Android
  size_t cropX = 0;
  size_t cropY = (resizedHeight > cropSize) ? (resizedHeight - cropSize) / 2 : 0;

  // Tạo ảnh crop từ ảnh đã resize
  CGRect cropRect = CGRectMake(cropX, cropY, cropSize, cropSize);
  CGImageRef croppedImage = CGImageCreateWithImageInRect(resizedImage, cropRect);

  // Context chuẩn 224x224 để vẽ ảnh crop
  CGContextRef finalContext = CGBitmapContextCreate(NULL, cropSize, cropSize, 8, cropSize * 4,
    CGColorSpaceCreateDeviceRGB(), kCGImageAlphaPremultipliedLast);
  CGContextDrawImage(finalContext, CGRectMake(0, 0, cropSize, cropSize), croppedImage);

  UInt8* pixels = (UInt8*)CGBitmapContextGetData(finalContext);
  if (!pixels) return nil;

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

  vDSP_vsub(&mean[0], 1, red, 1, red, 1, count);
  vDSP_vdiv(&std[0], 1, red, 1, red, 1, count);
  vDSP_vsub(&mean[1], 1, green, 1, green, 1, count);
  vDSP_vdiv(&std[1], 1, green, 1, green, 1, count);
  vDSP_vsub(&mean[2], 1, blue, 1, blue, 1, count);
  vDSP_vdiv(&std[2], 1, blue, 1, blue, 1, count);

  NSMutableData* tensorData = [NSMutableData dataWithLength:sizeof(float) * count * 3];
  memcpy(tensorData.mutableBytes, red, sizeof(float) * count);
  memcpy((float*)tensorData.mutableBytes + count, green, sizeof(float) * count);
  memcpy((float*)tensorData.mutableBytes + count * 2, blue, sizeof(float) * count);

  free(red); free(green); free(blue);
  CGContextRelease(finalContext);
  CGContextRelease(resizeContext);
  CGImageRelease(resizedImage);
  CGImageRelease(croppedImage);

  return tensorData;
}

@end
