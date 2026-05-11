// ImageProcessorModuleBridge.h
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// Định nghĩa module Swift của bạn để có thể truy cập từ Objective-C/React Native
@interface ImageProcessorModuleBridge : RCTEventEmitter <RCTBridgeModule>

@end
