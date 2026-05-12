import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import type {RecognitionHistoryRecord} from '../models/recognition-history';

const HISTORY_KEY = 'recognitionHistory';
const MAX_HISTORY_RECORDS = 20;
const HISTORY_IMAGE_DIR = `${RNFS.DocumentDirectoryPath}/recognition-history`;

export const getRecognitionHistory = async () => {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecognitionHistoryRecord[]) : [];
  } catch (error) {
    console.error('getRecognitionHistory error:', error);
    return [];
  }
};

export const appendRecognitionHistory = async (
  record: Omit<RecognitionHistoryRecord, 'id' | 'recognizedAt'> &
    Partial<Pick<RecognitionHistoryRecord, 'id' | 'recognizedAt'>>,
) => {
  const current = await getRecognitionHistory();
  const id =
    record.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const localInputImageUri = await persistInputImage(record.inputImageUri, id);
  const nextRecord: RecognitionHistoryRecord = {
    id,
    recognizedAt: record.recognizedAt || new Date().toISOString(),
    inputImageUri: localInputImageUri,
    resultImagePath: record.resultImagePath,
    resultName: record.resultName,
    confidence: record.confidence ?? null,
    extraInfo: record.extraInfo || null,
  };

  const allRecords = [nextRecord, ...current];
  const next = allRecords.slice(0, MAX_HISTORY_RECORDS);
  const removed = allRecords.slice(MAX_HISTORY_RECORDS);
  removed.forEach(item => {
    removeHistoryImage(item.inputImageUri).catch(error =>
      console.error('removeHistoryImage error:', error),
    );
  });
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return nextRecord;
};

const persistInputImage = async (
  inputImageUri: string | null | undefined,
  id: string,
) => {
  if (!inputImageUri) {
    return null;
  }

  try {
    const exists = await RNFS.exists(HISTORY_IMAGE_DIR);
    if (!exists) {
      await RNFS.mkdir(HISTORY_IMAGE_DIR);
    }

    const sourcePath = inputImageUri.replace('file://', '');
    const extension =
      sourcePath.match(/\.(jpg|jpeg|png|webp)$/i)?.[0] || '.jpg';
    const destinationPath = `${HISTORY_IMAGE_DIR}/${id}${extension}`;
    await RNFS.copyFile(sourcePath, destinationPath);
    return `file://${destinationPath}`;
  } catch (error) {
    console.error('persistInputImage error:', error);
    return inputImageUri;
  }
};

const removeHistoryImage = async (inputImageUri?: string | null) => {
  if (!inputImageUri?.startsWith('file://')) {
    return;
  }

  const path = inputImageUri.replace('file://', '');
  if (!path.startsWith(HISTORY_IMAGE_DIR)) {
    return;
  }

  const exists = await RNFS.exists(path);
  if (exists) {
    await RNFS.unlink(path);
  }
};
