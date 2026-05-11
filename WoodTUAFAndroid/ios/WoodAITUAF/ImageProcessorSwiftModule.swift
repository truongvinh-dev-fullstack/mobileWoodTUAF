import Foundation
import UIKit
import CoreGraphics // Để xử lý ảnh bitmap
import onnxruntime_objc // Thư viện ONNX Runtime iOS
import React // Để dùng RCTPromiseResolveBlock và RCTPromiseRejectBlock

@objc(ImageProcessorSwiftModule) // Tên lớp Swift được expose sang Objective-C
class ImageProcessorSwiftModule: NSObject {

    private static let TAG = "ImageProcessorSwiftModule"
    private static let CROP_SIZE: Int = 224 // Kích thước cuối cùng của ảnh đầu vào model
    private static let MEAN: [Float] = [0.485, 0.456, 0.406]
    private static let STD: [Float] = [0.229, 0.224, 0.225]

    // ONNX Runtime environment và session, được khởi tạo một lần
    private static var ortEnvironment: ORTEnv?
    private static var ortSession: ORTSession?

    // Biến cờ để đảm bảo khởi tạo chỉ một lần
    private static var isInitialized = false

    @objc override init() {
        super.init()
        // Khởi tạo ONNX Runtime một lần duy nhất
        if !ImageProcessorSwiftModule.isInitialized {
            ImageProcessorSwiftModule.initializeORT()
            ImageProcessorSwiftModule.isInitialized = true
        }
    }

    private static func initializeORT() {
        do {
            ortEnvironment = try ORTEnv(loggingLevel: .info) // Khởi tạo môi trường ONNX Runtime
            
            // Đọc model ONNX từ Bundle chính của ứng dụng
            guard let modelPath = Bundle.main.url(forResource: "model_converted_v2", withExtension: "onnx") else {
                RCTLogError("ONNX model 'model_converted_v2.onnx' not found in main bundle.")
                return
            }
            
            // Tạo session ONNX Runtime
            ortSession = try ORTSession(contentsOf: modelPath)
            RCTLogInfo("ONNX model 'model_converted_v2.onnx' loaded successfully.")
            
        } catch let error as NSError {
            RCTLogError("Failed to initialize ONNX session: \(error.localizedDescription)")
            // Có thể thông báo cho người dùng hoặc xử lý lỗi khác
        }
    }

    /**
     * Phương thức chính để xử lý ảnh và chạy suy luận ONNX.
     * Được gọi từ JavaScript thông qua Native Module Bridge.
     * @param imageUri URI của ảnh được chọn (thường từ react-native-image-picker).
     * @param resolve Promise resolve block để trả về kết quả thành công.
     * @param reject Promise reject block để trả về lỗi.
     */
    @objc static func processImageAndRunModel(_ imageUri: String,
                                              resolve: @escaping RCTPromiseResolveBlock,
                                              reject: @escaping RCTPromiseRejectBlock) {
        // Kiểm tra xem ONNX model đã được tải thành công chưa
        guard let environment = ortEnvironment, let session = ortSession else {
            reject("MODEL_NOT_LOADED", "ONNX model was not loaded. Please check native logs for errors during initialization.", nil)
            return
        }

        guard let url = URL(string: imageUri), let uiImage = UIImage(contentsOfFile: url.path) else {
            reject("LOAD_IMAGE_FAILED", "Could not load image from URI: \(imageUri)", nil)
            return
        }

        do {
            // 1. Tiền xử lý ảnh: Resize và Crop theo logic JavaScript ban đầu
            guard let preprocessedCGImage = preprocessImage(uiImage) else {
                reject("PREPROCESS_FAILED", "Failed to preprocess image bitmap. Check if crop dimensions are valid.", nil)
                return
            }
            
            // 2. Chuyển đổi CGImage sang Float32Array và chuẩn hóa
            let inputTensorData = convertImageToFloat32Array(preprocessedCGImage)

            // 3. Định nghĩa hình dạng (shape) đầu vào cho model ONNX
            // Giả định model của bạn mong đợi định dạng [1, 3, CROP_SIZE, CROP_SIZE] (Batch, Channel, Height, Width)
            let inputShape: [NSNumber] = [1, 3, NSNumber(value: CROP_SIZE), NSNumber(value: CROP_SIZE)]

            // 4. Tạo ONNX Tensor từ Float32Array và hình dạng
            guard let inputName = session.inputNames.first else {
                reject("INPUT_NAME_ERROR", "Could not find input name for ONNX model.", nil)
                return
            }
            let inputORTValue = try ORTValue(tensorData: Data(bytes: inputTensorData, count: inputTensorData.count * MemoryLayout<Float32>.stride),
                                              elementType: ORTElementType.float,
                                              shape: inputShape)

            // 5. Chạy suy luận ONNX
            let inputs: [String: ORTValue] = [inputName: inputORTValue]
            let output = try session.run(withInputs: inputs)

            // 6. Trích xuất kết quả từ đầu ra của model
            guard let outputORTValue = output.first?.value else {
                reject("OUTPUT_ERROR", "Failed to get output value from ONNX model.", nil)
                return
            }
            
            // Ép kiểu output data sang Float32Array
            guard let outputData = try? outputORTValue.tensorData().withUnsafeBytes({ (ptr: UnsafeRawBufferPointer) -> [Float32] in
                Array(UnsafeBufferPointer(start: ptr.baseAddress!.assumingMemoryBound(to: Float32.self), count: ptr.count / MemoryLayout<Float32>.stride))
            }) else {
                reject("OUTPUT_CAST_ERROR", "Failed to cast output tensor data to Float32Array.", nil)
                return
            }
            
            // Trả về kết quả về JS
            resolve(outputData)

        } catch let error as NSError {
            RCTLogError("Error in processImageAndRunModel: \(error.localizedDescription)")
            reject("INFERENCE_ERROR", "An unexpected error occurred during ONNX inference: \(error.localizedDescription)", error)
        }
    }

    /**
     * Tiền xử lý UIImage bằng cách resize và crop theo logic trong mã JavaScript ban đầu.
     * Logic này không phải lúc nào cũng là center crop hoàn toàn.
     * - Resize ảnh sao cho chiều nhỏ hơn bằng CROP_SIZE, giữ nguyên tỷ lệ.
     * - Crop ảnh CROP_SIZE x CROP_SIZE:
     * - Nếu ảnh gốc là ảnh chân dung (height > width): crop từ (0, top_offset) (left-aligned, vertically centered).
     * - Nếu ảnh gốc là ảnh phong cảnh (width > height): crop từ (0, 0) (top-left corner).
     * @param image UIImage gốc cần tiền xử lý.
     * @return CGImage đã được resize và crop, hoặc null nếu có lỗi.
     */
    private static func preprocessImage(_ image: UIImage) -> CGImage? {
        let originalWidth = image.size.width
        let originalHeight = image.size.height

        let scale: CGFloat
        // Tính toán tỷ lệ dựa trên chiều nhỏ hơn của ảnh gốc
        if originalWidth < originalHeight {
            scale = CGFloat(CROP_SIZE) / originalWidth
        } else {
            scale = CGFloat(CROP_SIZE) / originalHeight
        }

        // Kích thước sau khi resize theo tỷ lệ
        let resizedWidth = (originalWidth * scale).rounded()
        let resizedHeight = (originalHeight * scale).rounded()

        // Tạo một UIImage đã được resize
        UIGraphicsBeginImageContextWithOptions(CGSize(width: resizedWidth, height: resizedHeight), false, image.scale)
        image.draw(in: CGRect(origin: .zero, size: CGSize(width: resizedWidth, height: resizedHeight)))
        let scaledImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        guard let scaledCGImage = scaledImage?.cgImage else {
            RCTLogError("Failed to get CGImage from scaled UIImage.")
            return nil
        }

        // Tính toán tọa độ crop (cropX và cropY) theo logic JS ban đầu
        let cropX: Int = 0 // Luôn là 0 trong mã JS
        let cropY: Int

        // Logic `cropTop = Math.floor((resized.height - CROP_SIZE) / 2);` từ JS
        // Khi `resized.height` lớn hơn `CROP_SIZE`, đây là center crop theo chiều dọc.
        // Khi `resized.height` bằng `CROP_SIZE` (trường hợp ảnh ngang), `cropTop` sẽ là 0.
        let jsCropTop = Int((resizedHeight - CGFloat(CROP_SIZE)) / 2).rounded()
        cropY = Int(jsCropTop) // Ép kiểu về Int sau khi làm tròn

        // Đảm bảo kích thước crop không vượt quá kích thước Bitmap đã resize
        let actualCropWidth = CROP_SIZE
        let actualCropHeight = CROP_SIZE

        let cropRect = CGRect(x: cropX, y: cropY, width: actualCropWidth, height: actualCropHeight)

        guard cropRect.minX >= 0 && cropRect.minY >= 0 &&
              cropRect.maxX <= scaledCGImage.width &&
              cropRect.maxY <= scaledCGImage.height else {
            RCTLogError("Crop dimensions are out of bounds for scaled image. Scaled: \(scaledCGImage.width)x\(scaledCGImage.height), Crop: (\(cropX),\(cropY)) \(actualCropWidth)x\(actualCropHeight)")
            return nil
        }

        // Thực hiện crop cuối cùng
        return scaledCGImage.cropping(to: cropRect)
    }

    /**
     * Chuyển đổi CGImage sang Float32Array và chuẩn hóa dữ liệu pixel.
     * Dữ liệu được sắp xếp theo channel-first (R, G, B riêng biệt).
     * @param cgImage CGImage đã được tiền xử lý (kích thước CROP_SIZE x CROP_SIZE).
     * @return Float32Array chứa dữ liệu pixel đã chuẩn hóa.
     */
    private static func convertImageToFloat32Array(_ cgImage: CGImage) -> [Float32] {
        let width = cgImage.width
        let height = cgImage.height
        
        let bytesPerPixel = 4 // RGBA
        let bytesPerRow = bytesPerPixel * width
        let bitsPerComponent = 8 // 8 bits per color component (R, G, B, A)

        var pixelData = [UInt8](repeating: 0, count: width * height * bytesPerPixel)
        let context = CGContext(data: &pixelData,
                                width: width,
                                height: height,
                                bitsPerComponent: bitsPerComponent,
                                bytesPerRow: bytesPerRow,
                                space: CGColorSpaceCreateDeviceRGB(),
                                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue)

        guard let drawingContext = context else {
            RCTLogError("Failed to create CGContext for pixel data extraction.")
            return []
        }

        drawingContext.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))

        var floatArray = [Float32](repeating: 0, count: width * height * 3) // 3 kênh: R, G, B

        for i in 0..<(width * height) {
            let pixelIndex = i * bytesPerPixel
            let r = Float32(pixelData[pixelIndex])
            let g = Float32(pixelData[pixelIndex + 1])
            let b = Float32(pixelData[pixelIndex + 2])
            // Skip alpha pixelData[pixelIndex + 3]

            // Chuẩn hóa và điền vào mảng channel-first
            floatArray[i] = (r / 255.0 - MEAN[0]) / STD[0] // R channel
            floatArray[i + width * height] = (g / 255.0 - MEAN[1]) / STD[1] // G channel
            floatArray[i + 2 * width * height] = (b / 255.0 - MEAN[2]) / STD[2] // B channel
        }

        return floatArray
    }
}
