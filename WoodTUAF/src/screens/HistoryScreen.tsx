import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { RecognitionHistoryRecord } from '../models/recognition-history';
import { getRecognitionHistory } from '../services/recognition-history-service';
import { StatusBarHeight } from '../services';

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('vi-VN');
};

const formatConfidencePercent = (value: number) => {
  const percent = value <= 1 ? value * 100 : value;
  return `${percent.toFixed(1)}%`;
};

export const HistoryScreen = ({ navigation }: any) => {
  const [items, setItems] = useState<RecognitionHistoryRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      getRecognitionHistory().then(setItems);
    }, []),
  );

  const renderItem = ({ item }: { item: RecognitionHistoryRecord }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={() =>
        navigation.navigate('Result', {
          objectClass:
            typeof item.extraInfo?.objectClass === 'string'
              ? item.extraInfo.objectClass
              : item.resultName,
          path: item.resultImagePath,
          inputImageUri: item.inputImageUri,
          confidence: item.confidence,
          boolean: false,
          data: [],
        })
      }>
      <View style={styles.thumb}>
        {item.inputImageUri ? (
          <Image source={{ uri: item.inputImageUri }} style={styles.thumbImage} />
        ) : (
          <Ionicons name="image-outline" size={26} color="#07923f" />
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.resultName} numberOfLines={1}>
          {item.resultName}
        </Text>
        <Text style={styles.timeText}>{formatTime(item.recognizedAt)}</Text>
        {typeof item.confidence === 'number' && (
          <Text style={styles.confidenceText}>
            Độ chính xác: {formatConfidencePercent(item.confidence)}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward-outline" size={20} color="#799083" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={22} color="#12351f" />
        </TouchableOpacity>
        <Text style={styles.title}>Lịch sử nhận diện</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          !items.length && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Chưa có lịch sử nhận diện</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbfdf9',
    paddingTop: StatusBarHeight,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef8f1',
    marginRight: 12,
  },
  title: {
    color: '#12351f',
    fontSize: 22,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    minHeight: 92,
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0eee5',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#0b2b16',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#eef8f1',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    flex: 1,
    marginHorizontal: 12,
  },
  resultName: {
    color: '#12351f',
    fontSize: 16,
    fontWeight: '700',
  },
  timeText: {
    marginTop: 5,
    color: '#66766b',
    fontSize: 13,
  },
  confidenceText: {
    marginTop: 4,
    color: '#07923f',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    color: '#66766b',
    fontSize: 16,
    textAlign: 'center',
  },
});
