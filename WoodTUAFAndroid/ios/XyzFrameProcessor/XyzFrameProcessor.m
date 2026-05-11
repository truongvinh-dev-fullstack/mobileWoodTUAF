#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>

#if __has_include("WoodAITUAF/WoodAITUAF-Swift.h")
#import "WoodAITUAF/WoodAITUAF-Swift.h"
#else
#import "WoodAITUAF-Swift.h"
#endif

VISION_EXPORT_SWIFT_FRAME_PROCESSOR(XyzFrameProcessorPlugin, xyz)