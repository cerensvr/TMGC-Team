import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const SHELLY_ICON = require('../../assets/shelly-icon.png');

export default function ShellyIcon({ size = 32, style }: Props) {
  return (
    <View
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Image source={SHELLY_ICON} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
