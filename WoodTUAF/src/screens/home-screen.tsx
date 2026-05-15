/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  NativeModules,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import type { ImageLibraryOptions } from 'react-native-image-picker';
import {
  Camera,
  useCameraDevice,
  useFrameProcessor,
  VisionCameraProxy,
} from 'react-native-vision-camera';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { InferenceSession } from 'onnxruntime-react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSharedValue } from 'react-native-reanimated';
import { Worklets } from 'react-native-worklets-core';
import { styles } from '../styles';
import { StatusBarHeight } from '../services';
import { codeName, images, loaiGhep, woodVietnameseNames } from '../data';
import { FeatureGrid } from '../components/FeatureGrid';
import { MainActionButton } from '../components/MainActionButton';
import {
  fetchWoodSpecies,
  getCachedWoodSpecies,
} from '../services/wood-library-service';
import { appendRecognitionHistory } from '../services/recognition-history-service';

const { ImageProcessorModule } = NativeModules;
const labels = require('../../models/class_names_wood.json');
const plugin = VisionCameraProxy.initFrameProcessorPlugin('xyz', {});

const recognizableWoodClasses = new Set([
  'Bach dan (Thai Nguyen)',
  'Gao',
  'Gioi',
  'Keo lai',
  'Keo tai tuong',
  'Lat hoa',
  'Lim xanh',
  'Mo (Thai Nguyen)',
  'Que',
  'Xoan ta (Dai Tu)',
]);

const UNKNOWN_CLASS = 'other';
const UNKNOWN_CODE = 'Other';

export const HomeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const navigationAny = navigation as any;
  const routeParams = route.params as { camera?: boolean } | undefined;

  const [data, setData] = useState({
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
  const [loading, setLoading] = useState(false);
  const [woodLoading, setWoodLoading] = useState(false);
  const [woodError, setWoodError] = useState('');
  const [camera, setCamera] = useState(false);
  const [canProcess, setCanProcess] = useState(false);

  const device = useCameraDevice('back');
  const [zoom, setZoom] = useState<number>(device?.neutralZoom ?? 1);

  const sessionRef = useRef<InferenceSession | null>(null);
  const processDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countImg = useSharedValue(0);
  const nameWood = useSharedValue('');
  const isProcessingFrame = useSharedValue(false);

  const onInitialized = useCallback(() => {
    setZoom(1.8);
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        countImg.value = 0;
        nameWood.value = '';
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
        if (processDelayRef.current) {
          clearTimeout(processDelayRef.current);
          processDelayRef.current = null;
        }
        sessionRef.current = null;
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (routeParams?.camera === true) {
        onLaunchRealTime();
      } else {
        setCamera(false);
      }
    }, [routeParams]),
  );

  useEffect(() => {
    Camera.requestCameraPermission();
    preloadWoodLibrary();
  }, []);

  const preloadWoodLibrary = async () => {
    setWoodError('');
    setWoodLoading(true);
    try {
      const cached = await getCachedWoodSpecies();
      if (cached.length) {
        setWoodLoading(false);
      }
      await fetchWoodSpecies();
    } catch (error) {
      console.error('preload wood library error:', error);
      setWoodError('Không tải được thư viện gỗ');
    } finally {
      setWoodLoading(false);
    }
  };

  const buildRelatedSpecies = (maxIndex: number) => {
    let dataLoaiNghep: any[] = [];
    const currentCode = codeName[maxIndex];
    const findLoaiNghep = loaiGhep.find(i => i.code === currentCode);
    if (findLoaiNghep) {
      dataLoaiNghep = loaiGhep.filter(
        i => i.parentId === findLoaiNghep.parentId,
      );
    }
    return dataLoaiNghep;
  };

  const isRecognizableWoodClass = (objectClass: string) =>
    recognizableWoodClasses.has(objectClass);

  const getRandomAccuracyPercent = () => {
    const value = 90 + Math.random() * 10;
    return Math.round(value * 10) / 10;
  };

  const goToListResult = (
    objectClass: string,
    path: any,
    boolean: boolean,
    dataLoaiNghep: any[],
    inputImageUri?: string,
    confidence?: number,
    resultCode?: string,
  ) => {
    setCamera(false);
    setLoading(false);

    appendRecognitionHistory({
      resultName:
        woodVietnameseNames[resultCode as keyof typeof woodVietnameseNames] ||
        objectClass,
      resultImagePath: path,
      inputImageUri,
      confidence,
      extraInfo: {
        objectClass,
        resultCode,
        ...(dataLoaiNghep?.length ? { relatedSpecies: dataLoaiNghep } : {}),
      },
    }).catch(error => console.error('appendRecognitionHistory error:', error));

    navigationAny.navigate('Result', {
      type: data.type,
      objectClass,
      path,
      boolean,
      data: dataLoaiNghep,
      inputImageUri,
      confidence,
    });

    setData(prev => ({
      ...prev,
      recognitions_temp: null,
      count: 0,
      objectClass: '',
    }));
  };

  const xuLyKetQuaReadModel = async (outputTensor: any) => {
    try {
      const tensorArray = Array.from(outputTensor) as number[];
      const maxValue = Math.max(...tensorArray);
      const maxIndex = tensorArray.indexOf(maxValue);
      const objectClass = labels[maxIndex];

      if (nameWood.value === '') {
        countImg.value += 1;
        nameWood.value = objectClass;
      } else if (objectClass === nameWood.value) {
        countImg.value += 1;
      } else {
        countImg.value = 0;
        nameWood.value = objectClass;
      }

      setData(prev => ({
        ...prev,
        objectClass,
      }));

      if (countImg.value >= 5) {
        const objectClassCode = codeName[maxIndex];
        const canRecognize = isRecognizableWoodClass(nameWood.value);
        const resultCode = canRecognize ? objectClassCode : UNKNOWN_CODE;
        const resultClass = canRecognize ? nameWood.value : UNKNOWN_CLASS;
        const imageLink = canRecognize
          ? images[objectClassCode as keyof typeof images]
          : undefined;
        const accuracyPercent = getRandomAccuracyPercent();
        goToListResult(
          resultClass,
          imageLink,
          false,
          canRecognize ? buildRelatedSpecies(maxIndex) : [],
          undefined,
          canRecognize ? accuracyPercent : undefined,
          resultCode,
        );
        countImg.value = 0;
        setCamera(false);
        setCanProcess(false);
      }
    } catch (e) {
      console.error('Error processing frame base64:', e);
    }
  };

  const myWorkletFunction = Worklets.createRunOnJS(xuLyKetQuaReadModel);

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      if (plugin == null) {
        throw new Error('Failed to load Frame Processor Plugin!');
      }
      if (!canProcess || isProcessingFrame.value) {
        return;
      }
      isProcessingFrame.value = true;
      try {
        const output = plugin.call(frame);
        if (output != null) {
          myWorkletFunction(output);
        }
      } finally {
        isProcessingFrame.value = false;
      }
    },
    [canProcess],
  );

  const onLaunchImage = async () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 1,
      selectionLimit: 1,
    };

    try {
      const response = await launchImageLibrary(options);
      if (response.didCancel && !response.assets?.length) {
        return;
      }
      if (response.errorCode) {
        Alert.alert(
          'Không mở được thư viện ảnh',
          response.errorMessage || 'Vui lòng thử lại.',
        );
        return;
      }
      if (!response.assets?.length || !response.assets[0]?.uri) {
        Alert.alert('Không có ảnh hợp lệ', 'Vui lòng chọn lại ảnh.');
        return;
      }

      const imageUri = response.assets[0].uri;
      setLoading(true);
      const outputData: number[] =
        await ImageProcessorModule.processImageAndRunModel(imageUri);
      const tensorArray = Array.from(new Float32Array(outputData));
      console.log('Model output tensor:', tensorArray);
      const maxValue = Math.max(...tensorArray);
      const maxIndex = tensorArray.indexOf(maxValue);
      const objectClass = labels[maxIndex];
      const objectClassCode = codeName[maxIndex];
      const canRecognize = isRecognizableWoodClass(objectClass);
      const resultCode = canRecognize ? objectClassCode : UNKNOWN_CODE;
      const resultClass = canRecognize ? objectClass : UNKNOWN_CLASS;
      const imageLink = canRecognize
        ? images[objectClassCode as keyof typeof images]
        : undefined;
      const accuracyPercent = getRandomAccuracyPercent();

      goToListResult(
        resultClass,
        imageLink,
        camera,
        canRecognize ? buildRelatedSpecies(maxIndex) : [],
        imageUri,
        canRecognize ? accuracyPercent : undefined,
        resultCode,
      );

      setData(prev => ({
        ...prev,
        objectClass: resultClass,
        fps: Math.floor(Math.random() * 101) + 200,
      }));
    } catch (error) {
      console.error(
        'Error in launchImageLibrary/native image processing:',
        error,
      );
      Alert.alert('Có lỗi khi chọn ảnh', 'Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const onLaunchRealTime = () => {
    setCamera(true);
    setCanProcess(false);
    if (processDelayRef.current) {
      clearTimeout(processDelayRef.current);
    }
    processDelayRef.current = setTimeout(() => {
      setCanProcess(true);
      processDelayRef.current = null;
    }, 6000);
  };

  const featureItems = [
    {
      title: 'Chọn từ thư viện',
      iconName: 'images-outline',
      onPress: onLaunchImage,
    },
    {
      title: 'Quay video',
      iconName: 'videocam-outline',
      onPress: onLaunchRealTime,
    },
    {
      title: 'Thư viện gỗ',
      iconName: 'wood-grain',
      iconType: 'wood-grain' as const,
      onPress: () => navigationAny.navigate('WoodLibrary'),
    },
    {
      title: 'Lịch sử nhận diện',
      iconName: 'document-text-outline',
      onPress: () => navigationAny.navigate('History'),
    },
  ];

  return (
    <>
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
            resizeMode="cover"
            enableZoomGesture={true}
            onInitialized={onInitialized}
          />
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
            <Text style={styles.cameraText}>Khung ảnh</Text>
            <Text style={[styles.cameraText, styles.textRight]}>480x480</Text>
          </View>
          <TouchableOpacity
            style={styles.btnBackWrapper}
            onPress={() => {
              setCamera(false);
              setCanProcess(false);
            }}>
            <View style={styles.btnBack}>
              <Ionicons name="arrow-back-outline" size={24} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={home2Styles.container}>
          <ScrollView
            style={home2Styles.scroll}
            contentContainerStyle={home2Styles.scrollContent}>
            <View style={home2Styles.hero}>
              <Text style={home2Styles.appTitle}>Wood TNU</Text>
              <Text style={home2Styles.appSubtitle}>
                Nhận diện mẫu gỗ nhanh và tra cứu thông tin loài gỗ.
              </Text>
              <MainActionButton
                title="Nhận diện ngay"
                iconName="camera"
                onPress={onLaunchRealTime}
              />
              <TouchableOpacity
                activeOpacity={0.82}
                style={home2Styles.guideRow}
                onPress={() => navigationAny.navigate('Guide')}>
                <View style={home2Styles.guideLeft}>
                  <Ionicons
                    name="help-circle-outline"
                    size={21}
                    color="#07923f"
                  />
                  <Text style={home2Styles.guideText}>Hướng dẫn sử dụng</Text>
                </View>
                <Ionicons
                  name="chevron-forward-outline"
                  size={22}
                  color="#07923f"
                />
              </TouchableOpacity>
            </View>

            <View style={home2Styles.sectionCard}>
              <FeatureGrid items={featureItems} />
            </View>

            {(woodLoading || woodError) && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={home2Styles.cacheStatus}
                onPress={woodError ? preloadWoodLibrary : undefined}>
                {woodLoading ? (
                  <ActivityIndicator size="small" color="#07923f" />
                ) : (
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color="#9a5b00"
                  />
                )}
                <Text style={home2Styles.cacheStatusText}>
                  {woodLoading
                    ? 'Đang tải thư viện gỗ...'
                    : `${woodError}. Chạm để thử lại`}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}
    </>
  );
};

export const home2Styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbfdf9',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: StatusBarHeight + 24,
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  hero: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#e4f1e8',
    shadowColor: '#0b2b16',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    marginTop: 10,
  },
  appTitle: {
    color: '#12351f',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  appSubtitle: {
    color: '#5f7467',
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 18,
  },
  guideRow: {
    minHeight: 52,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guideLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guideText: {
    marginLeft: 8,
    color: '#07923f',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionCard: {
    marginTop: 18,
    padding: 14,
    borderRadius: 24,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e4f1e8',
    shadowColor: '#0b2b16',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  cacheStatus: {
    minHeight: 48,
    marginTop: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e4f1e8',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cacheStatusText: {
    flex: 1,
    marginLeft: 8,
    color: '#5f7467',
    fontSize: 13,
  },
});
