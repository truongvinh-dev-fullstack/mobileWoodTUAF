import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

type Props = {
  title: string;
  iconName: string;
  onPress: () => void;
};

export const MainActionButton = ({title, iconName, onPress}: Props) => (
  <TouchableOpacity
    activeOpacity={0.85}
    style={styles.button}
    onPress={onPress}>
    <Ionicons name={iconName} size={24} color="white" />
    <Text style={styles.text}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    minHeight: 58,
    paddingHorizontal: 24,
    borderRadius: 18,
    backgroundColor: '#07923f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#07923f',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  text: {
    marginLeft: 10,
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
});
