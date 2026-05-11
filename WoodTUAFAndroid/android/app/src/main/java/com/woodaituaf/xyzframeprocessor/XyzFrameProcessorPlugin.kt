package com.woodaituaf.xyzframeprocessor

import android.graphics.ImageFormat
import android.media.Image
import android.util.Log
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.mrousavy.camera.frameprocessors.VisionCameraProxy
import ai.onnxruntime.*
import android.content.res.AssetManager
import java.nio.FloatBuffer
import android.graphics.Bitmap
import android.graphics.Bitmap.Config
import android.graphics.Matrix
import java.io.File
import java.io.FileOutputStream

class XyzFrameProcessorPlugin(private val proxy: VisionCameraProxy, options: Map<String, Any>?) : FrameProcessorPlugin() {
  private var isProcessing = false

  companion object {
    private var ortEnv: OrtEnvironment? = null
    private var ortSession: OrtSession? = null

    fun initialize(assetManager: AssetManager) {
      if (ortEnv != null && ortSession != null) return

      try {
        ortEnv = OrtEnvironment.getEnvironment()
        val modelInputStream = assetManager.open("model_converted_v2.onnx")
        val modelBytes = modelInputStream.readBytes()
        ortSession = ortEnv!!.createSession(modelBytes)
        Log.d("ONNX", "✅ ONNX model loaded thành công từ assets")
      } catch (e: Exception) {
        Log.e("ONNX", "❌ Lỗi khi load model: ${e.message}")
      }
    }
  }

  override fun callback(frame: Frame, arguments: Map<String, Any>?): Any? {
    if (isProcessing) return null
    isProcessing = true
    val startTime = System.currentTimeMillis()

    try {
      val image: Image = frame.image ?: return null
      if (image.format != ImageFormat.YUV_420_888) {
        Log.w("FrameProcessor", "Unsupported image format: ${image.format}")
        return null
      }

      val width = image.width
      val height = image.height

      val rgb = yuv420ToRGB(image)

      // 3. Rotate ảnh 90 độ nếu cần (camera trước/sau tùy bạn điều chỉnh)
      val rotatedRgb = rotateRGB(rgb, width, height, 90)  // bạn có thể đổi 270 nếu cần
      val resizedRgb = resizeAndCenterCropRGB(rotatedRgb, height, width)
//      saveRGBAsBitmap(resizedRgb, 224, 224)
      val inputTensor = convertRGBToFloatArray(resizedRgb, 224, 224)

      // 5. Tạo ONNX Tensor và inference
      val tensorShape = longArrayOf(1, 3, 224, 224)
      val floatBuffer = FloatBuffer.wrap(inputTensor.map { it.toFloat() }.toFloatArray())
      val inputName = ortSession!!.inputNames.iterator().next()
      val tensor = OnnxTensor.createTensor(ortEnv, floatBuffer, tensorShape)

      val output = ortSession!!.run(mapOf(inputName to tensor))
      val resultTensor = output[0].value as Array<FloatArray>
      val resultList = resultTensor[0].map { it.toDouble() }

      Log.d("ONNX", "✅ Output: $resultList")
      return resultList
    } catch (e: Exception) {
      Log.e("FrameProcessor", "❌ Lỗi xử lý frame: ${e.message}")
      return null
    } finally {
      isProcessing = false
      val duration = System.currentTimeMillis() - startTime
      Log.d("ONNX", "⏱️ Frame xử lý trong $duration ms")
    }
  }
  private fun yuv420ToRGB(image: Image): ByteArray {
    val width = image.width
    val height = image.height
    val yPlane = image.planes[0]
    val uPlane = image.planes[1]
    val vPlane = image.planes[2]

    val yBuffer = yPlane.buffer
    val uBuffer = uPlane.buffer
    val vBuffer = vPlane.buffer

    val yRowStride = yPlane.rowStride
    val uvRowStride = uPlane.rowStride
    val uvPixelStride = uPlane.pixelStride

    val rgbBytes = ByteArray(width * height * 3)
    var outputOffset = 0

    for (j in 0 until height) {
      val yPos = j * yRowStride
      val uvPos = (j shr 1) * uvRowStride

      for (i in 0 until width) {
        val y = yBuffer.get(yPos + i).toInt() and 0xFF
        val u = uBuffer.get(uvPos + (i shr 1) * uvPixelStride).toInt() and 0xFF
        val v = vBuffer.get(uvPos + (i shr 1) * uvPixelStride).toInt() and 0xFF

        val yVal = (y - 16).coerceAtLeast(0)
        val uVal = u - 128
        val vVal = v - 128

        var r = (1.164f * yVal + 1.596f * vVal).toInt()
        var g = (1.164f * yVal - 0.813f * vVal - 0.391f * uVal).toInt()
        var b = (1.164f * yVal + 2.018f * uVal).toInt()

        r = r.coerceIn(0, 255)
        g = g.coerceIn(0, 255)
        b = b.coerceIn(0, 255)

        rgbBytes[outputOffset++] = r.toByte()
        rgbBytes[outputOffset++] = g.toByte()
        rgbBytes[outputOffset++] = b.toByte()
      }
    }
    return rgbBytes
  }

  private fun convertRGBToFloatArray(rgb: ByteArray, width: Int, height: Int): FloatArray {
    val cropSize = 224
    val cropX = ((width - cropSize) / 2).coerceAtLeast(0)
    val cropY = ((height - cropSize) / 2).coerceAtLeast(0)

    val mean = floatArrayOf(0.485f, 0.456f, 0.406f)
    val std = floatArrayOf(0.229f, 0.224f, 0.225f)

    val output = FloatArray(3 * cropSize * cropSize)

    for (y in 0 until cropSize) {
      for (x in 0 until cropSize) {
        val srcIdx = ((cropY + y) * width + (cropX + x)) * 3
        val dstIdx = y * cropSize + x

        val r = (rgb[srcIdx].toInt() and 0xFF) / 255.0f
        val g = (rgb[srcIdx + 1].toInt() and 0xFF) / 255.0f
        val b = (rgb[srcIdx + 2].toInt() and 0xFF) / 255.0f

        output[dstIdx] = (r - mean[0]) / std[0]  // R channel
        output[cropSize * cropSize + dstIdx] = (g - mean[1]) / std[1]  // G channel
        output[2 * cropSize * cropSize + dstIdx] = (b - mean[2]) / std[2]  // B channel
      }
    }

    return output
  }

  private fun saveRGBAsBitmap(rgb: ByteArray, width: Int, height: Int) {
    try {
      val bmp = Bitmap.createBitmap(width, height, Config.ARGB_8888)
      var p = 0
      for (y in 0 until height) {
        for (x in 0 until width) {
          val r = rgb[p++].toInt() and 0xFF
          val g = rgb[p++].toInt() and 0xFF
          val b = rgb[p++].toInt() and 0xFF
          bmp.setPixel(x, y, (0xFF shl 24) or (r shl 16) or (g shl 8) or b)
        }
      }
      val outFile = File(proxy.context.cacheDir, "frame_latest.png")
      FileOutputStream(outFile).use { fos ->
        bmp.compress(Bitmap.CompressFormat.PNG, 90, fos)
      }
      Log.d("FrameProcessor", "Frame saved at ${outFile.absolutePath}")
    } catch (ex: Exception) {
      Log.e("FrameProcessor", "Failed saving frame: ${ex.message}")
    }
  }

  private fun rotateRGB(rgb: ByteArray, width: Int, height: Int, degrees: Int): ByteArray {
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val pixels = IntArray(width * height)

    for (i in 0 until width * height) {
      val r = rgb[i * 3].toInt() and 0xFF
      val g = rgb[i * 3 + 1].toInt() and 0xFF
      val b = rgb[i * 3 + 2].toInt() and 0xFF
      pixels[i] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
    }

    bitmap.setPixels(pixels, 0, width, 0, 0, width, height)

    val matrix = Matrix()
    matrix.postRotate(degrees.toFloat())
    val rotated = Bitmap.createBitmap(bitmap, 0, 0, width, height, matrix, true)

    val rotatedPixels = IntArray(rotated.width * rotated.height)
    rotated.getPixels(rotatedPixels, 0, rotated.width, 0, 0, rotated.width, rotated.height)

    val rotatedRgb = ByteArray(rotatedPixels.size * 3)
    for (i in rotatedPixels.indices) {
      rotatedRgb[i * 3] = ((rotatedPixels[i] shr 16) and 0xFF).toByte()
      rotatedRgb[i * 3 + 1] = ((rotatedPixels[i] shr 8) and 0xFF).toByte()
      rotatedRgb[i * 3 + 2] = (rotatedPixels[i] and 0xFF).toByte()
    }

    return rotatedRgb
  }

  private fun resizeAndCenterCropRGB(
    rgb: ByteArray,
    srcWidth: Int,
    srcHeight: Int,
    resizeMin: Int = 300,   // cạnh ngắn nhất sau resize
    cropSize: Int = 224     // kích thước crop cuối cùng
  ): ByteArray {
    // B1: Convert RGB ByteArray to Bitmap
    val pixels = IntArray(srcWidth * srcHeight)
    for (i in 0 until srcWidth * srcHeight) {
      val r = rgb[i * 3].toInt() and 0xFF
      val g = rgb[i * 3 + 1].toInt() and 0xFF
      val b = rgb[i * 3 + 2].toInt() and 0xFF
      pixels[i] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
    }

    val srcBitmap = Bitmap.createBitmap(srcWidth, srcHeight, Bitmap.Config.ARGB_8888)
    srcBitmap.setPixels(pixels, 0, srcWidth, 0, 0, srcWidth, srcHeight)

    // B2: Resize sao cho cạnh ngắn nhất = resizeMin
    val scale = resizeMin.toFloat() / minOf(srcWidth, srcHeight)
    val resizedWidth = (srcWidth * scale).toInt()
    val resizedHeight = (srcHeight * scale).toInt()
    val resizedBitmap = Bitmap.createScaledBitmap(srcBitmap, resizedWidth, resizedHeight, true)

    // B3: Center Crop về cropSize (vd: 224×224)
    val offsetX = ((resizedWidth - cropSize) / 2).coerceAtLeast(0)
    val offsetY = ((resizedHeight - cropSize) / 2).coerceAtLeast(0)
    val croppedBitmap = Bitmap.createBitmap(resizedBitmap, offsetX, offsetY, cropSize, cropSize)

    // B4: Convert lại thành RGB ByteArray
    val croppedPixels = IntArray(cropSize * cropSize)
    croppedBitmap.getPixels(croppedPixels, 0, cropSize, 0, 0, cropSize, cropSize)
    val outputRGB = ByteArray(cropSize * cropSize * 3)

    for (i in croppedPixels.indices) {
      outputRGB[i * 3] = ((croppedPixels[i] shr 16) and 0xFF).toByte()
      outputRGB[i * 3 + 1] = ((croppedPixels[i] shr 8) and 0xFF).toByte()
      outputRGB[i * 3 + 2] = (croppedPixels[i] and 0xFF).toByte()
    }

    return outputRGB
  }

}
