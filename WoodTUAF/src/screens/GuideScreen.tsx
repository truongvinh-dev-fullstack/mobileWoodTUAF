import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

const GuideScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container2} edges={['top', 'bottom']}>
      <View style={styles.wrapper}>
        {/* Header với nút Back */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons
              style={styles.btnBackIcon}
              name="chevron-back-outline"
              size={20}
              color="#333"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hướng dẫn sử dụng</Text>
          <View style={{ width: 24 }} />
          {/* Placeholder để cân đối header, cùng width với icon */}
        </View>

        {/* Nội dung */}
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
          <Text style={styles.sectionTitle}>1. Chuẩn bị trước khi chụp/quay</Text>
          <Text style={styles.text}>• Lau sạch bề mặt gỗ, tránh bụi bẩn hoặc vết xước lớn.</Text>
          <Text style={styles.text}>• Đảm bảo ánh sáng đủ sáng, không bị bóng che.</Text>
          <Text style={styles.text}>• Không dùng đèn flash trực tiếp vì dễ gây lóa.</Text>

          <Text style={styles.sectionTitle}>2. Thiết lập khi chụp/quay</Text>
          <Text style={styles.text}>• Zoom điện thoại: chỉnh ở mức 1.8x.</Text>
          <Text style={styles.text}>• Kính zoom: đặt đúng 200x và giữ cố định.</Text>
          <Text style={styles.text}>• Đặt điện thoại sát vào kính, khung hình thấy rõ vân gỗ.</Text>

          <Text style={styles.sectionTitle}>3. Cách chụp ảnh</Text>
          <Text style={styles.text}>• Giữ chắc tay, hạn chế rung lắc.</Text>
          <Text style={styles.text}>• Canh sao cho ảnh vân gỗ nằm trọn trong khung.</Text>
          <Text style={styles.text}>• Chụp 2–3 ảnh ở các góc khác nhau để tăng độ chính xác.</Text>

          <Text style={styles.sectionTitle}>4. Cách quay video</Text>
          <Text style={styles.text}>• Giữ điện thoại ổn định trong khoảng 5-7 giây.</Text>
          <Text style={styles.text}>• Không di chuyển quá nhanh để AI nhận diện rõ chi tiết.</Text>

          <Text style={styles.sectionTitle}>5. Lưu ý quan trọng</Text>
          <Text style={styles.text}>• Ảnh/Video càng rõ nét, ánh sáng đều → nhận diện càng chính xác.</Text>
          <Text style={styles.text}>• Tránh chụp bề mặt có nhiều vết bẩn,vết cắt, sơn phủ, phản quang mạnh,...</Text>
          <Text style={styles.text}>• Sau khi chụp/quay, ứng dụng sẽ tự động xử lý và đưa ra kết quả.</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  btnBackIcon: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#333",
  },
  container2: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
    color: "#2c3e50",
  },
  text: {
    fontSize: 15,
    marginBottom: 4,
    color: "#34495e",
    lineHeight: 20,
  },
});

export default GuideScreen;
