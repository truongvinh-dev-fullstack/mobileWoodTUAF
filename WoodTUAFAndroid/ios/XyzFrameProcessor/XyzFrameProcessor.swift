import VisionCamera

@objc(XyzFrameProcessorPlugin)
public class XyzFrameProcessorPlugin: FrameProcessorPlugin {
  private var isProcessing = false

  // MARK: - ONNX Initialization (Giữ nguyên, đã tối ưu)
  private static var ortEnv: ORTEnv?
  private static var ortSession: ORTSession?

  public override init(proxy: VisionCameraProxyHolder, options: [AnyHashable: Any]! = [:]) {
    super.init(proxy: proxy, options: options)
  }

  @objc
  public static func initialize(modelName: String = "model_converted_v2", modelExtension: String = "onnx") {
      guard ortEnv == nil, ortSession == nil else { return }
      do {
          ortEnv = try ORTEnv(loggingLevel: .warning)
          guard let env = ortEnv,
                let modelPath = Bundle.main.path(forResource: modelName, ofType: modelExtension) else {
              print("❌ Lỗi: Không tìm thấy model ONNX trong app bundle.")
              return
          }
          let options = try ORTSessionOptions()
          try options.setGraphOptimizationLevel(.all)
          ortSession = try ORTSession(env: env, modelPath: modelPath, sessionOptions: options)
          print("✅ ONNX model loaded thành công từ app bundle")
      } catch {
          print("❌ Lỗi khi khởi tạo ONNX session: \(error)")
      }
  }

  // MARK: - Frame Processor Callback
  public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable: Any]?) -> Any? {
      guard !isProcessing else { return nil }
      isProcessing = true
      defer { isProcessing = false }

      let startTime = CACurrentMediaTime()

      guard let session = XyzFrameProcessorPlugin.ortSession else {
          print("❌ Lỗi: ONNX Session chưa được khởi tạo.")
          return nil
      }
      
      guard let pixelBuffer = CMSampleBufferGetImageBuffer(frame.buffer) else {
          print("Không thể lấy CVPixelBuffer từ frame.")
          return nil
      }

      do {
          // MARK: - BƯỚC TỐI ƯU CHÍNH NẰM Ở ĐÂY
          // Tiền xử lý ảnh bằng vImage để có hiệu năng cao nhất
          let cropSize = 224
          guard let floatData = preprocessWithVImage(pixelBuffer: pixelBuffer, cropSize: cropSize) else {
              print("Lỗi tiền xử lý ảnh với vImage.")
              return nil
          }
          
          // Các bước còn lại giữ nguyên
          let inputName = try session.inputNames().first!
          let shape: [NSNumber] = [1, 3, NSNumber(value: cropSize), NSNumber(value: cropSize)]
          
          let inputTensor = try ORTValue(tensorData: floatData, elementType: .float, shape: shape)
          let outputs = try session.run(withInputs: [inputName: inputTensor], outputNames: try session.outputNames(), runOptions: nil)

          guard let outputTensor = outputs.first?.value as? ORTValue,
                let resultData = try? outputTensor.tensorData() as Data else { return nil }
          
          let resultArray = resultData.withUnsafeBytes { Array($0.bindMemory(to: Float.self)) }

          let endTime = CACurrentMediaTime()
          print("🚀 Tốc độ xử lý (vImage): \(String(format: "%.2f", (endTime - startTime) * 1000)) ms")
          
          return resultArray

      } catch {
          print("❌ Lỗi khi xử lý frame: \(error)")
          return nil
      }
  }

  // MARK: - Tối ưu tiền xử lý với vImage
  
  /// Hàm tiền xử lý mới, hiệu năng cao, sử dụng vImage
  private func preprocessWithVImage(pixelBuffer: CVPixelBuffer, cropSize: Int) -> Data? {
      let sourceWidth = CVPixelBufferGetWidth(pixelBuffer)
      let sourceHeight = CVPixelBufferGetHeight(pixelBuffer)
      
      // 1. Tạo một vImage_Buffer từ CVPixelBuffer
      // Thao tác này không sao chép dữ liệu, chỉ trỏ vào bộ nhớ của pixelBuffer
      guard var sourceBuffer = try? vImage_Buffer(from: pixelBuffer) else {
          print("Không thể tạo vImage_Buffer từ CVPixelBuffer.")
          return nil
      }
      
      // 2. Cắt (Crop) ảnh bằng cách điều chỉnh con trỏ bộ nhớ
      // Kỹ thuật này tránh việc phải tạo ra một ảnh tạm đã được cắt
      let cropX = (sourceWidth - cropSize) / 2
      let cropY = (sourceHeight - cropSize) / 2
      let bytesPerPixel = 4 // Giả định là BGRA8888
      let cropStartPtr = sourceBuffer.data.advanced(by: cropY * sourceBuffer.rowBytes + cropX * bytesPerPixel)
      
      var croppedSourceBuffer = vImage_Buffer(data: cropStartPtr,
                                              height: vImagePixelCount(cropSize),
                                              width: vImagePixelCount(cropSize),
                                              rowBytes: sourceBuffer.rowBytes)
      
      // 3. Chuẩn bị các buffer đích cho 3 kênh R, G, B dạng Float
      var redPlanarF = [Float](repeating: 0.0, count: cropSize * cropSize)
      var greenPlanarF = [Float](repeating: 0.0, count: cropSize * cropSize)
      var bluePlanarF = [Float](repeating: 0.0, count: cropSize * cropSize)
      
      // 4. Chuyển đổi từ BGRA (interleaved) sang RGB (planar) và chuẩn hóa
      // vImage cho phép thực hiện nhiều bước trong một hàm để tối ưu
      redPlanarF.withUnsafeMutableBufferPointer { redPtr in
          greenPlanarF.withUnsafeMutableBufferPointer { greenPtr in
              bluePlanarF.withUnsafeMutableBufferPointer { bluePtr in
                  var destRedBuffer = vImage_Buffer(data: redPtr.baseAddress!, height: vImagePixelCount(cropSize), width: vImagePixelCount(cropSize), rowBytes: cropSize * 4)
                  var destGreenBuffer = vImage_Buffer(data: greenPtr.baseAddress!, height: vImagePixelCount(cropSize), width: vImagePixelCount(cropSize), rowBytes: cropSize * 4)
                  var destBlueBuffer = vImage_Buffer(data: bluePtr.baseAddress!, height: vImagePixelCount(cropSize), width: vImagePixelCount(cropSize), rowBytes: cropSize * 4)
                  
                  // Chuyển đổi BGRA_8888 sang PlanarF (Float)
                  // Đây là hàm "thần kỳ" của vImage
                  vImageConvert_BGRA8888toPlanarF(&croppedSourceBuffer, &destBlueBuffer, &destGreenBuffer, &destRedBuffer, [255.0, 255.0, 255.0], [0, 0, 0], vImage_Flags(kvImageNoFlags))
              }
          }
      }
      
      // 5. Chuẩn hóa bằng Mean và Std
      let mean: [Float] = [0.485, 0.456, 0.406]
      let std: [Float] = [0.229, 0.224, 0.225]
      
      vDSP_vsub(mean, 1, redPlanarF, 1, &redPlanarF, 1, vDSP_Length(cropSize * cropSize))
      vDSP_vsub(mean.advanced(by: 1), 1, greenPlanarF, 1, &greenPlanarF, 1, vDSP_Length(cropSize * cropSize))
      vDSP_vsub(mean.advanced(by: 2), 1, bluePlanarF, 1, &bluePlanarF, 1, vDSP_Length(cropSize * cropSize))
      
      vDSP_vdiv(std, 1, redPlanarF, 1, &redPlanarF, 1, vDSP_Length(cropSize * cropSize))
      vDSP_vdiv(std.advanced(by: 1), 1, greenPlanarF, 1, &greenPlanarF, 1, vDSP_Length(cropSize * cropSize))
      vDSP_vdiv(std.advanced(by: 2), 1, bluePlanarF, 1, &bluePlanarF, 1, vDSP_Length(cropSize * cropSize))
      
      // 6. Ghép 3 kênh R, G, B lại thành một mảng Float duy nhất
      var finalFloatArray = [Float]()
      finalFloatArray.append(contentsOf: redPlanarF)
      finalFloatArray.append(contentsOf: greenPlanarF)
      finalFloatArray.append(contentsOf: bluePlanarF)
      
      return finalFloatArray.withUnsafeBufferPointer { Data(buffer: $0) }
  }
}