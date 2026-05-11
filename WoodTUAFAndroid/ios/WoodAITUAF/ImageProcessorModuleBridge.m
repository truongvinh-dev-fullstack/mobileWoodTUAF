// ImageProcessorModuleBridge.m
#import "ImageProcessorModuleBridge.h"
#import "React/RCTLog.h" // Để dùng RCTLog
// Thay "WoodAITUAF-Swift.h" bằng tên dự án của bạn
#import "WoodAITUAF-Swift.h" // <-- QUAN TRỌNG: Đảm bảo đúng tên file Bridging Header của bạn

@implementation ImageProcessorModuleBridge

// Đăng ký module với tên "ImageProcessorModule" để gọi từ JS
RCT_EXPORT_MODULE(ImageProcessorModule);

// Khai báo phương thức `processImageAndRunModel` để có thể gọi từ JS
RCT_REMAP_METHOD(processImageAndRunModel,
                 imageUri:(NSString *)imageUri
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  // Gọi phương thức static trong lớp Swift
  [ImageProcessorSwiftModule processImageAndRunModel:imageUri
                                                 resolve:resolve
                                                 reject:reject];
}

// Phương thức này bắt buộc nếu bạn muốn sử dụng RCTEventEmitter,
// nếu không dùng EventEmitter thì có thể bỏ qua.
- (NSArray<NSString *> *)supportedEvents {
  return @[]; // Trả về mảng rỗng nếu không có sự kiện nào được phát ra
}

@end
