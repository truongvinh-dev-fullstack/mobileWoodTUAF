package com.woodaituaf // THAY ĐỔI THÀNH TÊN PACKAGE CỦA BẠN

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableNativeArray
import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import java.io.IOException
import java.nio.FloatBuffer
import java.util.Collections

class ImageProcessorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val TAG = "ImageProcessorModule"
    private val CROP_SIZE = 224 // Kích thước cuối cùng của ảnh đầu vào model
    private val MEAN = floatArrayOf(0.485f, 0.456f, 0.406f)
    private val STD = floatArrayOf(0.229f, 0.224f, 0.225f)

    // ONNX Runtime environment và session, được khởi tạo một lần
    private var ortEnvironment: OrtEnvironment? = null
    private var ortSession: OrtSession? = null

    init {
        // Khởi tạo ONNX Runtime environment
        ortEnvironment = OrtEnvironment.getEnvironment()
        try {
            // Đọc model ONNX từ thư mục assets
            val modelPath = reactContext.assets.open("model_converted_v2.onnx")
            val modelBytes = modelPath.readBytes()
            ortSession = ortEnvironment?.createSession(modelBytes, OrtSession.SessionOptions())
            modelPath.close()
            Log.d(TAG, "ONNX model 'model_converted_v2.onnx' loaded successfully.")
        } catch (e: IOException) {
            Log.e(TAG, "Failed to load ONNX model from assets: ${e.message}", e)
            // Có thể thông báo cho người dùng hoặc xử lý lỗi khác
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing ONNX session: ${e.message}", e)
        }
    }

    override fun getName(): String {
        return "ImageProcessorModule" // Tên module sẽ được gọi từ JavaScript
    }

    /**
     * Phương thức chính để xử lý ảnh và chạy suy luận ONNX.
     * @param imageUri URI của ảnh được chọn (thường từ react-native-image-picker).
     * @param promise Promise để trả về kết quả hoặc lỗi về JavaScript.
     */
    @ReactMethod
    fun processImageAndRunModel(imageUri: String, promise: Promise) {
        // Kiểm tra xem ONNX model đã được tải thành công chưa
        if (ortEnvironment == null || ortSession == null) {
            promise.reject("MODEL_NOT_LOADED", "ONNX model was not loaded. Please check native logs for errors during initialization.")
            return
        }

        try {
            // 1. Tải ảnh từ URI
            val uri = Uri.parse(imageUri)
            val inputStream = reactApplicationContext.contentResolver.openInputStream(uri)
            if (inputStream == null) {
                promise.reject("LOAD_IMAGE_FAILED", "Could not open image stream for URI: $imageUri")
                return
            }

            // Giải mã Bitmap từ InputStream
            val bitmap = BitmapFactory.decodeStream(inputStream)
            inputStream.close()

            if (bitmap == null) {
                promise.reject("LOAD_IMAGE_FAILED", "Could not decode image from URI: $imageUri")
                return
            }

            // 2. Tiền xử lý ảnh: Resize và Crop theo logic JavaScript ban đầu
            val preprocessedBitmap = preprocessBitmap(bitmap)
            if (preprocessedBitmap == null) {
                promise.reject("PREPROCESS_FAILED", "Failed to preprocess image bitmap. Check if crop dimensions are valid.")
                return
            }

            // 3. Chuyển đổi Bitmap sang FloatBuffer và chuẩn hóa
            val inputTensorBuffer = convertBitmapToFloatBuffer(preprocessedBitmap)

            // 4. Định nghĩa hình dạng (shape) đầu vào cho model ONNX
            // Giả định model của bạn mong đợi định dạng [1, 3, CROP_SIZE, CROP_SIZE] (Batch, Channel, Height, Width)
            val inputShape = longArrayOf(1, 3, CROP_SIZE.toLong(), CROP_SIZE.toLong())

            // 5. Tạo ONNX Tensor từ FloatBuffer và hình dạng
            val inputName = ortSession!!.inputNames.iterator().next() // Lấy tên đầu vào duy nhất của model
            val inputTensor = OnnxTensor.createTensor(ortEnvironment, inputTensorBuffer, inputShape)

            // 6. Chạy suy luận ONNX
            val result: OrtSession.Result? = ortSession?.run(Collections.singletonMap(inputName, inputTensor))

            if (result == null) {
                promise.reject("INFERENCE_FAILED", "ONNX model inference returned null result.")
                return
            }

            // 7. Trích xuất kết quả từ đầu ra của model
            // SỬA ĐỔI QUAN TRỌNG TẠI ĐÂY: Ép kiểu sang Array<FloatArray> và lấy phần tử đầu tiên
            val outputTensor = result[0]
            val outputData = (outputTensor.value as Array<FloatArray>)[0] // <<--- ĐÃ SỬA ĐỔI DÒNG NÀY

            // 8. Chuyển đổi FloatArray sang WritableArray để trả về JavaScript
            val resultArray = WritableNativeArray()
            for (value in outputData) {
                resultArray.pushDouble(value.toDouble())
            }

            promise.resolve(resultArray) // Trả về mảng kết quả về JS

            // Đảm bảo đóng các tài nguyên để tránh rò rỉ bộ nhớ
            result.close()
            inputTensor.close()
            preprocessedBitmap.recycle() // Giải phóng bộ nhớ của Bitmap đã xử lý
            bitmap.recycle() // Giải phóng bộ nhớ của Bitmap gốc
        } catch (e: IOException) {
            Log.e(TAG, "IO Error processing image: ${e.message}", e)
            promise.reject("IO_ERROR", "Error reading image data: ${e.message}", e)
        } catch (e: Exception) {
            Log.e(TAG, "General error in processImageAndRunModel: ${e.message}", e)
            promise.reject("GENERAL_ERROR", "An unexpected error occurred: ${e.message}", e)
        }
    }

    /**
     * Tiền xử lý Bitmap bằng cách resize và crop theo logic trong mã JavaScript ban đầu.
     * Logic này không phải lúc nào cũng là center crop hoàn toàn.
     * - Resize ảnh sao cho chiều nhỏ hơn bằng CROP_SIZE, giữ nguyên tỷ lệ.
     * - Crop ảnh CROP_SIZE x CROP_SIZE:
     * - Nếu ảnh gốc là ảnh chân dung (height > width): crop từ (0, top_offset) (left-aligned, vertically centered).
     * - Nếu ảnh gốc là ảnh phong cảnh (width > height): crop từ (0, 0) (top-left corner).
     * @param bitmap Bitmap gốc cần tiền xử lý.
     * @return Bitmap đã được resize và crop, hoặc null nếu có lỗi.
     */
    private fun preprocessBitmap(bitmap: Bitmap): Bitmap? {
        val originalWidth = bitmap.width
        val originalHeight = bitmap.height

        val scale: Float
        // Tính toán tỷ lệ dựa trên chiều nhỏ hơn của ảnh gốc
        if (originalWidth < originalHeight) {
            scale = 300f / originalWidth
        } else {
            scale = 300f / originalHeight
        }

        // Kích thước sau khi resize theo tỷ lệ
        val resizedWidth = (originalWidth * scale).toInt()
        val resizedHeight = (originalHeight * scale).toInt()

        // Tạo một Bitmap đã được resize
        val matrix = Matrix()
        matrix.postScale(scale, scale)
        val scaledBitmap = Bitmap.createBitmap(bitmap, 0, 0, originalWidth, originalHeight, matrix, true)

        // Tính toán tọa độ crop (cropX và cropY) theo logic JS ban đầu
        val cropX = 0 // Luôn là 0 trong mã JS
        val cropY: Int

        // Logic `cropTop = Math.floor((resized.height - CROP_SIZE) / 2);` từ JS
        // Khi `resized.height` lớn hơn `CROP_SIZE`, đây là center crop theo chiều dọc.
        // Khi `resized.height` bằng `CROP_SIZE` (trường hợp ảnh ngang), `cropTop` sẽ là 0.
        val jsCropTop = (resizedHeight - CROP_SIZE) / 2
        cropY = jsCropTop

        // Đảm bảo kích thước crop không vượt quá kích thước Bitmap đã resize
        val actualCropWidth = CROP_SIZE
        val actualCropHeight = CROP_SIZE

        if (cropX + actualCropWidth > scaledBitmap.width || cropY + actualCropHeight > scaledBitmap.height) {
            Log.e(TAG, "Crop dimensions are out of bounds for scaled bitmap. Scaled: ${scaledBitmap.width}x${scaledBitmap.height}, Crop: ($cropX,$cropY) ${actualCropWidth}x${actualCropHeight}")
            scaledBitmap.recycle() // Giải phóng bộ nhớ
            return null
        }

        // Thực hiện crop cuối cùng
        val finalBitmap = Bitmap.createBitmap(scaledBitmap, cropX, cropY, actualCropWidth, actualCropHeight)
        scaledBitmap.recycle() // Giải phóng bộ nhớ của Bitmap trung gian
        return finalBitmap
    }

    /**
     * Chuyển đổi Bitmap sang FloatBuffer và chuẩn hóa dữ liệu pixel.
     * Dữ liệu được sắp xếp theo channel-first (R, G, B riêng biệt).
     * @param bitmap Bitmap đã được tiền xử lý (kích thước CROP_SIZE x CROP_SIZE).
     * @return FloatBuffer chứa dữ liệu pixel đã chuẩn hóa.
     */
    private fun convertBitmapToFloatBuffer(bitmap: Bitmap): FloatBuffer {
        val width = bitmap.width
        val height = bitmap.height
        val floatBuffer = FloatBuffer.allocate(width * height * 3) // 3 kênh: R, G, B

        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

        // Điền dữ liệu kênh R
        for (i in pixels.indices) {
            val pixel = pixels[i]
            val r = ((pixel shr 16) and 0xFF).toFloat() // Lấy giá trị R
            floatBuffer.put((r / 255.0f - MEAN[0]) / STD[0])
        }

        // Điền dữ liệu kênh G
        for (i in pixels.indices) {
            val pixel = pixels[i]
            val g = ((pixel shr 8) and 0xFF).toFloat() // Lấy giá trị G
            floatBuffer.put((g / 255.0f - MEAN[1]) / STD[1])
        }

        // Điền dữ liệu kênh B
        for (i in pixels.indices) {
            val pixel = pixels[i]
            val b = (pixel and 0xFF).toFloat() // Lấy giá trị B
            floatBuffer.put((b / 255.0f - MEAN[2]) / STD[2])
        }

        floatBuffer.flip() // Đặt lại con trỏ buffer về vị trí 0
        return floatBuffer
    }
}
