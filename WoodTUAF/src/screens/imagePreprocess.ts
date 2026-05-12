/* eslint-disable no-bitwise */
// imagePreprocess.ts

import RNFS from 'react-native-fs';
import jpeg from 'jpeg-js';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import {Tensor} from 'onnxruntime-react-native';
import {Buffer} from 'buffer';
// import { Frame } from 'react-native-vision-camera';

const CROP_SIZE = 224;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

export const resizeImageMaintainAspect = async (
  image: any,
  minSize: number,
): Promise<{uri: string; width: number; height: number}> => {
  const {width, height} = image;

  const scale = minSize / Math.min(width, height);
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const resized = await ImageResizer.createResizedImage(
    image.uri || image.path,
    targetWidth,
    targetHeight,
    'JPEG',
    100,
  );

  return {
    uri: resized.uri.replace('file://', ''),
    width: targetWidth,
    height: targetHeight,
  };
};

/** Crop ảnh RGB từ ảnh JPG đã resize */
export const cropImage = async (
  uri: string,
  width: number,
  height: number,
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number,
): Promise<Uint8Array> => {
  const base64 = await RNFS.readFile(uri, 'base64');
  const jpegData = Buffer.from(base64, 'base64');
  const rawImageData = jpeg.decode(jpegData, {useTArray: true});

  if (!rawImageData || !rawImageData.data) {
    throw new Error('Invalid image data');
  }

  const {data: sourceData} = rawImageData;

  // Ensure crop area is within bounds
  if (
    cropX < 0 ||
    cropY < 0 ||
    cropX + cropWidth > width ||
    cropY + cropHeight > height
  ) {
    throw new Error('Crop area is out of image bounds');
  }

  const cropped = new Uint8Array(cropWidth * cropHeight * 4);
  let dstIdx = 0;

  for (let y = 0; y < cropHeight; y++) {
    const srcRowStart = (y + cropY) * width + cropX;
    for (let x = 0; x < cropWidth; x++) {
      const srcIdx = (srcRowStart + x) * 4;

      cropped[dstIdx] = sourceData[srcIdx]; // R
      cropped[dstIdx + 1] = sourceData[srcIdx + 1]; // G
      cropped[dstIdx + 2] = sourceData[srcIdx + 2]; // B
      cropped[dstIdx + 3] = 255; // A

      dstIdx += 4;
    }
  }

  return cropped;
};

export const preprocessImageToTensor = async (image: any): Promise<Tensor> => {
  const resized = await resizeImageMaintainAspect(image, CROP_SIZE);
  const cropTop = Math.floor((resized.height - CROP_SIZE) / 2);
  const croppedData = await cropImage(
    resized.uri,
    resized.width,
    resized.height,
    0,
    cropTop,
    CROP_SIZE,
    CROP_SIZE,
  );

  const imageArea = CROP_SIZE * CROP_SIZE;
  const floatArray = new Float32Array(3 * imageArea);

  const [meanR, meanG, meanB] = MEAN;
  const [stdR, stdG, stdB] = STD;

  let pixelIndex = 0;
  for (let i = 0; i < imageArea; i++) {
    const r = croppedData[pixelIndex++] / 255;
    const g = croppedData[pixelIndex++] / 255;
    const b = croppedData[pixelIndex++] / 255;
    pixelIndex++; // Skip alpha

    floatArray[i] = (r - meanR) / stdR; // R channel
    floatArray[i + imageArea] = (g - meanG) / stdG; // G channel
    floatArray[i + 2 * imageArea] = (b - meanB) / stdB; // B channel
  }

  return new Tensor('float32', floatArray, [1, 3, CROP_SIZE, CROP_SIZE]);
};
