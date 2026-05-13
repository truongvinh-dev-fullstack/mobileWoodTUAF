import {Dimensions, Platform} from 'react-native';

export const isIphoneWithNotch = () => {
  const dimen = Dimensions.get('window');
  const minDimension = Math.min(dimen.width, dimen.height);
  const maxDimension = Math.max(dimen.width, dimen.height);

  return (
    Platform.OS === 'ios' &&
    !Platform.isPad &&
    !Platform.isTV &&
    minDimension >= 375 &&
    maxDimension >= 812
  );
};

export const StatusBarHeight = Platform.select({
  ios: isIphoneWithNotch() ? 47 : 16,
  // android: StatusBar.currentHeight,
  android: 0,
  default: 0,
});
