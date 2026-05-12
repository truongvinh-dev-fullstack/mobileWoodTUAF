import React from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {WoodSpecies} from '../models/wood-species';
import {StatusBarHeight} from '../services';

const contentWidth = Dimensions.get('window').width - 32;

export const WoodDetailScreen = ({route, navigation}: any) => {
  const species = route.params?.species as WoodSpecies | undefined;
  const title = species?.vietnameseName || species?.scientificName;
  const subtitle = species?.vietnameseName ? species.scientificName : '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={22} color="#12351f" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {title || 'Chi tiết loài gỗ'}
          </Text>
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}>
        {species?.htmlContent ? (
          <RenderHtml
            contentWidth={contentWidth}
            source={{html: species.htmlContent}}
          />
        ) : (
          <Text style={styles.emptyText}>Không có dữ liệu chi tiết</Text>
        )}
      </ScrollView>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e3eee6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef8f1',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: '#12351f',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 3,
    color: '#5a6c60',
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
  },
  emptyText: {
    color: '#52645a',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 40,
  },
});
