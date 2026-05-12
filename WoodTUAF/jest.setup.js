/* eslint-env jest */

jest.mock('react-native-vision-camera', () => ({
  Camera: 'Camera',
  useCameraDevice: () => ({neutralZoom: 1}),
  useFrameProcessor: frameProcessor => frameProcessor,
  VisionCameraProxy: {
    initFrameProcessorPlugin: () => ({call: jest.fn()}),
  },
}));

jest.mock('react-native-worklets-core', () => ({
  Worklets: {
    createRunOnJS: fn => fn,
  },
}));

jest.mock('react-native-reanimated', () => ({
  useSharedValue: value => ({value}),
}));

jest.mock('onnxruntime-react-native', () => ({
  InferenceSession: {
    create: jest.fn(),
  },
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/tmp',
  exists: jest.fn(() => Promise.resolve(false)),
  mkdir: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
