import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { WoodSpecies } from '../models/wood-species';
import { WoodGrainIcon } from '../components/FeatureGrid';
import {
  fetchWoodSpecies,
  getCachedWoodSpecies,
} from '../services/wood-library-service';
import { StatusBarHeight } from '../services';

export const WoodLibraryScreen = ({ navigation }: any) => {
  const [items, setItems] = useState<WoodSpecies[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const refreshInBackground = useCallback(async () => {
    try {
      setRefreshing(true);
      setItems(await fetchWoodSpecies());
    } catch (refreshError) {
      console.error('WoodLibraryScreen refresh error:', refreshError);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    const cached = await getCachedWoodSpecies();
    if (cached.length) {
      setItems(cached);
      setLoading(false);
      refreshInBackground();
      return;
    }

    try {
      setItems(await fetchWoodSpecies());
    } catch (loadError) {
      console.error('WoodLibraryScreen load error:', loadError);
      setError('Không tải được thư viện gỗ');
    } finally {
      setLoading(false);
    }
  }, [refreshInBackground]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const formattedQuery = query.trim().toLowerCase();
    if (!formattedQuery) {
      return items;
    }
    return items.filter(item => {
      return (
        item.scientificName.toLowerCase().includes(formattedQuery) ||
        item.vietnameseName?.toLowerCase().includes(formattedQuery)
      );
    });
  }, [items, query]);

  const renderItem = ({ item }: { item: WoodSpecies }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={() => navigation.navigate('WoodDetail', { species: item })}>
      <View style={styles.iconCircle}>
        <WoodGrainIcon size={24} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.vietnameseNameTitle}>
          {item.vietnameseName || item.scientificName}
        </Text>
        {!!item.vietnameseName && (
          <Text style={styles.scientificNameSubtitle}>
            {item.scientificName}
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
        <Text style={styles.title}>Thư viện gỗ</Text>
      </View>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color="#6d7f72" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm theo tên khoa học hoặc tiếng Việt"
          placeholderTextColor="#7b8c80"
          style={styles.input}
        />
      </View>
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#07923f" />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={item => item.scientificName}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={refreshInBackground}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Không tìm thấy loài gỗ phù hợp</Text>
          }
        />
      )}
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
  searchBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0eee5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginLeft: 8,
    color: '#12351f',
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    minHeight: 84,
    padding: 14,
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
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef8f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    marginHorizontal: 12,
  },
  vietnameseNameTitle: {
    color: '#12351f',
    fontSize: 16,
    fontWeight: '700',
  },
  scientificNameSubtitle: {
    marginTop: 4,
    color: '#66766b',
    fontSize: 13,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#8b1e1e',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 14,
  },
  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#07923f',
  },
  retryText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 32,
    color: '#66766b',
    fontSize: 15,
    textAlign: 'center',
  },
});
