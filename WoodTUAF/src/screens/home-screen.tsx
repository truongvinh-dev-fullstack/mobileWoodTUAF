/* eslint-disable jsx-quotes */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable eqeqeq */
/* eslint-disable no-trailing-spaces */
/* eslint-disable quotes */
/* eslint-disable no-undef-init */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable prettier/prettier */
// @ts-ignore
import Icon from 'react-native-vector-icons/dist/FontAwesome';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  NativeModules,
  Alert,
  PermissionsAndroid,
  Platform,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
// import {idName} from '../data';
import { styles } from '../styles';
import { CurvedBottomBar } from 'react-native-curved-bottom-bar';
// import { AnimalListScreen } from './animal-list-screen';
import { launchImageLibrary } from 'react-native-image-picker';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InferenceSession } from 'onnxruntime-react-native';
// import { preprocessImageToTensor } from './imagePreprocess';
import { Camera, useCameraDevice, useFrameProcessor, VisionCameraProxy } from 'react-native-vision-camera';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { StatusBarHeight } from '../services';
import { AnimalListScreen } from './animal-list-screen';
import { Worklets } from 'react-native-worklets-core';
import { useSharedValue } from 'react-native-reanimated';
import { codeName, images, labelToImageKey, loaiGhep } from '../data';
import { SafeAreaView } from 'react-native-safe-area-context';

const { ImageProcessorModule } = NativeModules;

const CAM_PREVIEW_WIDTH = Dimensions.get('window').width;

const labels = require('../../models/class_names_wood.json');

const plugin = VisionCameraProxy.initFrameProcessorPlugin('xyz', {});

export const HomeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const [data, setData] = useState({
    tfReady: false,
    type: null,
    camera: false,
    models: [],
    fps: 0,
    // autoRender: false,
    recognitions_temp: null,
    count: 0,
    objectClass: '',
    confidence: '',
    heightImg: '',
    widthImg: '',
    countImg: 3,
  });
  const [loading, setLoading] = useState(false);
  const [camera, setCamera] = useState(false);


  const device = useCameraDevice('back');
  const [zoom, setZoom] = useState<number>(device?.neutralZoom ?? 1);

  const onInitialized = useCallback(() => {
    // Đặt về zoom 2x ngay sau khi camera đã sẵn sàng
    setZoom(1.8);
  }, []);


  const [canProcess, setCanProcess] = useState(false);  // dùng để đợi 1 khoảng tg mới cho phép xử lý frame

  const sessionRef = useRef<InferenceSession | null>(null);

  const count = 5;
  const countImg = useSharedValue(0);
  const nameWood = useSharedValue("");

  const isProcessing = React.useRef(false);  // dùng để gán mốc xử lý frame

  useFocusEffect(
    useCallback(() => {
      // On focus: không cần làm gì nếu bạn chỉ muốn dọn khi rời trang
      return () => {
        // 👇 Clear khi rời khỏi màn hình
        console.log('Navigating away, clearing data');

        // Reset shared values
        countImg.value = 0;
        nameWood.value = '';

        // Reset state
        setData({
          tfReady: false,
          type: null,
          camera: false,
          models: [],
          fps: 0,
          recognitions_temp: null,
          count: 0,
          objectClass: '',
          confidence: '',
          heightImg: '',
          widthImg: '',
          countImg: 3,
        });

        setLoading(false);
        setCamera(false);
        setCanProcess(false);

        // Clear session nếu cần
        sessionRef.current = null;
      };
    }, [])
  );


  useFocusEffect(
    React.useCallback(() => {
      if (route?.params?.camera == true) {
        onLaunchRealTime();
      } else {
        setCamera(false);
      }
    }, [route?.params]),
  );

  useEffect(() => {
    Camera.requestCameraPermission();
    // loadModel();
    fetchData();
  }, []);

  // const loadModel = async () => {
  //   const assetModelPath = 'model_converted_v2.onnx';
  //   const destPath = `${RNFS.DocumentDirectoryPath}/${assetModelPath}`;

  //   try {
  //     await RNFS.copyFileAssets(assetModelPath, destPath);
  //     const session = await InferenceSession.create(`file://${destPath}`);
  //     console.log('✅ ONNX model loaded');
  //     sessionRef.current = session;
  //   } catch (err) {
  //     console.error('❌ Lỗi tải mô hình:', err);
  //   }
  // };

  const fetchData = async () => {
    // tải dữ liệu gỗ về bộ nhớ máy
    async function fetchAPI() {
      NetInfo.fetch().then(async state => {
        console.log('Connection type: ', state.type);
        console.log('Is connected: ', state.isConnected);
        let responseJson = [];
        if (state.isConnected) {
          const response = await fetch(
            'http://tuaf.tringhiatech.vn/wood/index_get?key=9061f27544ec0703a50aa4a13afc63e73683fece',
          );
          responseJson = await response.json();
          await AsyncStorage.setItem(
            'responseJson',
            JSON.stringify(responseJson),
          );
        }
      });
    }
    fetchAPI();
  };


  const xuLyKetQuaReadModel = async (outputTensor: any) => {
    try {

      console.log("outputTensor: ", outputTensor)

      const tensorArray = Array.from(outputTensor);
      const maxValue = Math.max(...tensorArray);
      const maxIndex = tensorArray.indexOf(maxValue);

      console.log("maxValue: ", maxValue, " maxIndex: ", maxIndex)

      // const outputTensor = output[Object.keys(output)[0]].data as Float32Array;



      // @ts-ignore
      let objectClass = '';

      // if (maxValue < valueOther) {
      //   objectClass = 'Other';
      // } else {
      //   objectClass = labels[maxIndex];
      // }
      objectClass = labels[maxIndex];
      console.log("objectClass: ", objectClass);

      if (nameWood.value == "") {
        countImg.value += 1;
        nameWood.value = objectClass;
      } else {
        if (objectClass == nameWood.value) {
          countImg.value += 1;
        } else {
          countImg.value == 0;
          nameWood.value = objectClass;
        }
      }

      setData(prev => ({
        ...prev,
        objectClass,
      }));
      if (countImg.value >= count) {
        // let imageLink = null

        // if (objectClass != 'Other') {
        //   const imageKey = labelToImageKey[objectClass]; // imageKey = "BachDanLangSon"
        //   imageLink = images[imageKey]; // imageLink = require('../images/BachDanLangSon.jpg')
        // }

        // Tìm loài ghép
        let dataLoaiNghep: any[] = [];
        let _codeName: string = codeName[maxIndex];
        let findLoaiNghep = loaiGhep.find((i) => i.code == _codeName);
        if (findLoaiNghep) {
          dataLoaiNghep = loaiGhep.filter(i => i.parentId == findLoaiNghep.parentId);
        }

        // Lấy link ảnh
        objectClassCode = codeName[maxIndex];  // dùng để lấy ảnh
        imageLink = images[objectClassCode]; // imageKey = "BachDanLangSon"

        goToListResult(nameWood.value, imageLink, false, dataLoaiNghep);
        countImg.value == 0;
        setCamera(false);
        setCanProcess(false);
        return;
      }

      // console.log('Class:', objectClass);
    } catch (e) {
      console.error("Error processing frame base64:", e);
    }
  };

  const myWorkletFunction = Worklets.createRunOnJS(xuLyKetQuaReadModel);


  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (plugin == null) {
      throw new Error("Failed to load Frame Processor Plugin!");
    }
    if (!canProcess) {
      return; // Nếu chưa được phép, thoát ngay lập tức
    }

    if (isProcessing.current) {
      // đang bận, bỏ qua frame này
      return;
    }
    isProcessing.current = true;

    try {
      const output = plugin.call(frame);
      myWorkletFunction(output);
    } finally {
      isProcessing.current = false;
    }
  }, [canProcess]);

  const requestPhotoPermissionAndroid = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }
    try {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: 'Cấp quyền truy cập ảnh',
            message: 'Ứng dụng cần quyền đọc ảnh để mở thư viện.',
            buttonNegative: 'Từ chối',
            buttonPositive: 'Đồng ý',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Cấp quyền truy cập ảnh',
          message: 'Ứng dụng cần quyền đọc ảnh để mở thư viện.',
          buttonNegative: 'Từ chối',
          buttonPositive: 'Đồng ý',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      console.error('requestPhotoPermissionAndroid error:', e);
      return false;
    }
  };


  const onLaunchImage = async () => {
    const hasPermission = await requestPhotoPermissionAndroid();
    if (!hasPermission) {
      Alert.alert(
        'Thiếu quyền truy cập ảnh',
        'Vui lòng cấp quyền trong Cài đặt để chọn ảnh.',
        [
          { text: 'Đóng', style: 'cancel' },
          {
            text: 'Mở cài đặt',
            onPress: () => Linking.openSettings(),
          },
        ],
      );
      return;
    }

    const options = {
      mediaType: 'photo',
      quality: 1,
      selectionLimit: 1,
    };

    try {
      const response = await launchImageLibrary(options);
      console.log("response: ", response)
      if (response.didCancel && !response.assets?.length) {
        return;
      }
      if (response.errorCode) {
        console.error('launchImageLibrary error:', response.errorCode, response.errorMessage);
        Alert.alert('Không mở được thư viện ảnh', response.errorMessage || 'Vui lòng thử lại.');
        return;
      }
      if (!response.assets?.length || !response.assets[0]?.uri) {
        Alert.alert('Không có ảnh hợp lệ', 'Vui lòng chọn lại ảnh.');
        return;
      }

      const imageAsset = response.assets[0];
      const imageUri = imageAsset.uri;
      setLoading(true);

      // Gọi Native Module để tiền xử lý ảnh và chạy model ONNX.
      const outputData: number[] = await ImageProcessorModule.processImageAndRunModel(imageUri);
      console.log("outputData: ", outputData)

      // `outputData` bây giờ là mảng Float32Array (được trả về dưới dạng Array<number>)
      // chứa kết quả suy luận từ model ONNX.
      const outputTensor = new Float32Array(outputData);
      const tensorArray = Array.from(outputTensor);
      const maxValue = Math.max(...tensorArray);
      const maxIndex = tensorArray.indexOf(maxValue);

      console.log("outputTensor: ", outputTensor);
      console.log("maxIndex: ", maxIndex);

      let objectClass = '';
      let imageLink = null;

      objectClass = labels[maxIndex];

      objectClassCode = codeName[maxIndex];  // dùng để lấy ảnh
      console.log("objectClassCode: ", objectClassCode)
      imageLink = images[objectClassCode]; // imageKey = "BachDanLangSon"
      console.log("imageLink: ", imageLink)


      // Tìm loài ghép
      let dataLoaiNghep: any[] = [];
      let _codeName: string = codeName[maxIndex];
      let findLoaiNghep = loaiGhep.find((i) => i.code == _codeName);
      if (findLoaiNghep) {
        dataLoaiNghep = loaiGhep.filter(i => i.parentId == findLoaiNghep.parentId);
      }
      // console.log('Class:', objectClass);
      goToListResult(objectClass, imageLink, camera, dataLoaiNghep);

      // Final state update
      setData(prev => ({
        ...prev,
        objectClass,
        fps: Math.floor(Math.random() * 101) + 200, // Random FPS 200–300
        loading: false,
      }));
    } catch (error) {
      console.error("Error in launchImageLibrary/native image processing:", error);
      Alert.alert('Có lỗi khi chọn ảnh', 'Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const onLaunchRealTime = () => {
    setCamera(true);
    setTimeout(() => {
      console.log('Đã hết 7 giây, bắt đầu xử lý frame...');
      setCanProcess(true); // Cho phép frame processor chạy
    }, 6000);
  };

  const goToListResult = (
    objectClass: any,
    path: any,
    boolean: any,
    dataLoaiNghep: any[],
  ) => {
    // @ts-ignore
    setCamera(false);
    setLoading(false);

    navigation.navigate('Result', {
      type: data.type,
      objectClass,
      path,
      boolean,
      data: dataLoaiNghep,
    });

    setData(prev => ({
      ...prev,
      recognitions_temp: null,
      count: 0,
      objectClass: '',
    }));
  };


  const _renderIcon = (routeName: string, selectTab: string) => {
    let icon = '';
    switch (routeName) {
      case 'title1':
        icon = 'ios-home-outline';
        break;
      case 'title2':
        icon = 'albums-outline';
        break;
    }
    return (
      <Ionicons
        name={icon}
        size={24}
        color={routeName === selectTab ? 'green' : 'black'}
      />
    );
  };

  const renderTabBar = ({ routeName, selectTab, navigate }: any) => {
    return (
      <TouchableOpacity
        onPress={() => navigate(routeName)}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {_renderIcon(routeName, selectTab)}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={home2Styles.container} edges={['top', 'bottom']}>
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#125fa1" />
        </View>
      )}

      {camera && device ? (
        <View style={styles.cameraContainer}>
          <Camera
            style={styles.camera}
            device={device}
            isActive={true}
            frameProcessor={frameProcessor}
            video={true}
            zoom={zoom}
            resizeMode='contain'
            enableZoomGesture={true}
            onInitialized={onInitialized}
          />
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
            <Text style={styles.cameraText}>Khung ảnh</Text>
            <Text style={[styles.cameraText, styles.textRight]}>480x480</Text>
            {/* <Text style={styles.cameraText}>Loại cây</Text>
            <Text style={[styles.cameraText, styles.textRight]}>
              {data.objectClass}
            </Text> */}
          </View>
          <TouchableOpacity
            style={styles.btnBackWrapper}
            onPress={() => { setCamera(false), setCanProcess(false) }}>
            <View style={styles.btnBack}>
              <Icon
                style={styles.btnBackIcon}
                name="chevron-left"
                size={13}
                color="white"
              />
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <CurvedBottomBar.Navigator
            type="up"
            strokeWidth={0.5}
            height={55}
            circleWidth={55}
            bgColor="white"
            initialRouteName="title1"
            screenOptions={{}}
            borderTopLeftRight
            swipeEnabled={true}
            renderCircle={({ selectTab, navigate }) => (
              <LinearGradient
                colors={['#2da44e', 'green']}
                style={home2Styles.btnCircleUp}>
                <TouchableOpacity
                  style={{ flex: 1, justifyContent: 'center' }}
                  onPress={onLaunchRealTime}>
                  <Ionicons name={'camera-outline'} size={28} color={'white'} />
                </TouchableOpacity>
              </LinearGradient>
            )}
            tabBar={renderTabBar}>
            <CurvedBottomBar.Screen
              options={{ headerShown: false }}
              name="title1"
              position="left"
              component={() => (
                <LinearGradient style={{ flex: 1 }} colors={['green', '#efedeb']}>
                  <ScrollView style={{ flex: 1 }}>
                    <View style={{ flex: 1, marginTop: StatusBarHeight }}>
                      <View
                        style={[
                          home2Styles.card,
                          {
                            justifyContent: 'space-around',
                            paddingVertical: 16,
                          },
                        ]}>

                        <TouchableOpacity
                          style={{ alignItems: 'center' }}
                          // @ts-ignore
                          onPress={onLaunchImage}>
                          <LinearGradient
                            colors={['#2da44e', 'green']}
                            style={home2Styles.optionIcon}>
                            <Ionicons
                              name={'image'}
                              size={24}
                              color={'white'}
                            />
                          </LinearGradient>
                          <Text>Chọn ảnh</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ alignItems: 'center' }}
                          onPress={onLaunchRealTime}>
                          <LinearGradient
                            colors={['#2da44e', 'green']}
                            style={home2Styles.optionIcon}>
                            <Ionicons
                              name={'camera'}
                              size={24}
                              color={'white'}
                            />
                          </LinearGradient>
                          <Text>Quay ảnh</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ alignItems: 'center' }}
                          onPress={
                            () => { navigation.navigate('Guide') }
                            // this.props.navigation.navigate('Home3')
                          }>
                          <LinearGradient
                            colors={['#2da44e', 'green']}
                            style={home2Styles.optionIcon}>
                            <Ionicons
                              name={'help-outline'}
                              size={24}
                              color={'white'}
                            />
                          </LinearGradient>
                          <Text>Hướng dẫn</Text>
                        </TouchableOpacity>

                      </View>
                      {/* <TouchableOpacity
                        style={[
                          home2Styles.card,
                          { justifyContent: 'space-between', flexWrap: 'wrap' },
                        ]}
                        // @ts-ignore
                        onPress={() => {
                          navigation.navigate('Guid1');
                        }}>
                        <View style={{ padding: 8, width: '70%' }}>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: '500',
                              marginBottom: 8,
                            }}>
                            Hướng dẫn nhận dạng gỗ
                          </Text>
                          <Text style={{ fontSize: 12, color: 'gray' }}>
                            3 mẹo hữu ích để cải thiện độ chính xác của nhận
                            dạng
                          </Text>
                        </View>
                      </TouchableOpacity> */}
                      <View>
                        <Image
                          source={require('../../assets/images/Logo_no_background.png')}
                          style={{
                            width: CAM_PREVIEW_WIDTH,
                            height: CAM_PREVIEW_WIDTH,
                            borderRadius: 8,
                            opacity: 0.6,
                          }}
                        />
                      </View>
                    </View>
                  </ScrollView>
                </LinearGradient>
              )}
            />
            <CurvedBottomBar.Screen
              options={{ headerShown: false }}
              name="title2"
              component={() => <AnimalListScreen />}
              position="right"
            />
          </CurvedBottomBar.Navigator>
        </View>
      )}
    </SafeAreaView>
  );
};

export const home2Styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    padding: 8,
    borderRadius: 8,
    marginTop: 16,
  },
  container: {
    flex: 1,
  },
  button: {
    marginVertical: 5,
  },
  bottomBar: {},
  btnCircleUp: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'green',
    bottom: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 1,
  },
  imgCircle: {
    width: 30,
    height: 30,
    tintColor: 'gray',
  },
  img: {
    width: 30,
    height: 30,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 42 / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  // container: {
  //     alignItems: 'center',
  //     backgroundColor: '#ffffff',
  //     flexGrow: 1,
  //     padding: 20,
  // },
  label: {
    marginBottom: 10,
  },
  camera: {
    flexGrow: 1,
    width: '100%',
  },
});
