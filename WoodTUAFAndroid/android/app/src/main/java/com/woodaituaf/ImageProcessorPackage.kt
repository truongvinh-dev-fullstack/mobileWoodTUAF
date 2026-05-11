package com.woodaituaf

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import java.util.Collections

class ImageProcessorPackage : ReactPackage {
    /**
     * Tạo và trả về danh sách các Native Modules cần đăng ký.
     * @param reactContext ReactApplicationContext hiện tại.
     * @return Danh sách các Native Modules.
     */
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(ImageProcessorModule(reactContext)) // Đăng ký ImageProcessorModule của bạn
    }

    /**
     * Tạo và trả về danh sách các View Managers (không cần thiết cho trường hợp này).
     * @param reactContext ReactApplicationContext hiện tại.
     * @return Danh sách các View Managers (trống).
     */
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return Collections.emptyList()
    }
}
