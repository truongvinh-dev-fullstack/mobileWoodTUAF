import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Svg, {Circle, Path} from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';

export type FeatureItemConfig = {
  title: string;
  iconName: string;
  iconType?: 'ionicon' | 'wood-grain';
  onPress: () => void;
};

type Props = {
  items: FeatureItemConfig[];
};

export const FeatureGrid = ({items}: Props) => (
  <View style={styles.grid}>
    {items.map(item => (
      <FeatureItem key={item.title} item={item} />
    ))}
  </View>
);

const FeatureItem = ({item}: {item: FeatureItemConfig}) => (
  <TouchableOpacity
    activeOpacity={0.85}
    style={styles.item}
    onPress={item.onPress}>
    <View style={styles.iconBox}>
      {item.iconType === 'wood-grain' ? (
        <WoodGrainIcon />
      ) : (
        <Ionicons name={item.iconName} size={28} color="#07923f" />
      )}
    </View>
    <Text style={styles.title}>{item.title}</Text>
  </TouchableOpacity>
);

type WoodGrainIconProps = {
  size?: number;
  color?: string;
};

export const WoodGrainIcon = ({
  size = 34,
  color = '#07923f',
}: WoodGrainIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 34 34">
    <Path
      d="M17 1.9c1.2 0 2.1 1.1 3.2 1.4s2.5-.2 3.4.5 1 2.2 1.8 3 2.2 1 2.8 2 .1 2.3.5 3.4 1.5 2 1.5 3.2-1.1 2.1-1.4 3.2.2 2.5-.5 3.4-2.2 1-3 1.8-1 2.2-2 2.8-2.3.1-3.4.5-2 1.5-3.2 1.5-2.1-1.1-3.2-1.4-2.5.2-3.4-.5-1-2.2-1.8-3-2.2-1-2.8-2-.1-2.3-.5-3.4-1.5-2-1.5-3.2 1.1-2.1 1.4-3.2-.2-2.5.5-3.4 2.2-1 3-1.8 1-2.2 2-2.8 2.3-.1 3.4-.5 2-1.5 3.2-1.5z"
      stroke={color}
      strokeWidth={1.55}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Circle cx={17} cy={17} r={12.5} stroke={color} strokeWidth={1.55} fill="none" />
    <Circle cx={17} cy={17} r={9.6} stroke={color} strokeWidth={1.55} fill="none" />
    <Circle cx={17} cy={17} r={6.8} stroke={color} strokeWidth={1.55} fill="none" />
    <Circle cx={17} cy={17} r={4.1} stroke={color} strokeWidth={1.55} fill="none" />
    <Circle cx={17} cy={17} r={1.5} stroke={color} strokeWidth={1.55} fill="none" />
  </Svg>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  item: {
    width: '50%',
    paddingHorizontal: 6,
    paddingBottom: 12,
    alignItems: 'stretch',
  },
  iconBox: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cdeed9',
    backgroundColor: '#f7fffa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    minHeight: 42,
    color: '#18251d',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    textAlign: 'center',
  },
});
