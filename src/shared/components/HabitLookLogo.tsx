import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Path,
  G,
} from 'react-native-svg';

type Props = {
  size?: number;
};

export function HabitLookLogo({ size = 44 }: Props) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="logoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#A78BFA" />
            <Stop offset="50%" stopColor="#818CF8" />
            <Stop offset="100%" stopColor="#34D399" />
          </LinearGradient>
          <LinearGradient id="logoGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#67E8F9" />
            <Stop offset="100%" stopColor="#C084FC" />
          </LinearGradient>
          <LinearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1E1B2E" />
            <Stop offset="100%" stopColor="#11131F" />
          </LinearGradient>
        </Defs>

        {/* Background rounded squircle */}
        <Path
          d="M 16 0 H 84 A 16 16 0 0 1 100 16 V 84 A 16 16 0 0 1 84 100 H 16 A 16 16 0 0 1 0 84 V 16 A 16 16 0 0 1 16 0 Z"
          fill="url(#bgGrad)"
        />

        {/* Outer 24h dial track */}
        <Circle
          cx="50"
          cy="50"
          r="38"
          stroke="url(#logoGrad1)"
          strokeWidth="3.5"
          strokeDasharray="4 3"
          fill="none"
          opacity={0.85}
        />

        {/* Outer tick marks */}
        <G stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" opacity={0.6}>
          <Path d="M 50 14 L 50 18" />
          <Path d="M 86 50 L 82 50" />
          <Path d="M 50 86 L 50 82" />
          <Path d="M 14 50 L 18 50" />
        </G>

        {/* Intertwined orbit 1 */}
        <Path
          d="M 28 42 C 24 26, 44 20, 62 34 C 76 44, 76 66, 62 74 C 44 84, 28 66, 42 48"
          stroke="url(#logoGrad1)"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Intertwined orbit 2 */}
        <Path
          d="M 72 42 C 76 26, 56 20, 38 34 C 24 44, 24 66, 38 74 C 56 84, 72 66, 58 48"
          stroke="url(#logoGrad2)"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Celestial core: Sun / Focus point */}
        <Circle cx="50" cy="50" r="6" fill="#FDE047" />
        <Circle
          cx="50"
          cy="50"
          r="10"
          stroke="#FDE047"
          strokeWidth="1.5"
          fill="none"
          opacity={0.4}
        />

        {/* Crescent moon accent on top */}
        <Path
          d="M 50 17 A 4 4 0 0 0 46 22 A 4.5 4.5 0 0 1 51 22 A 4 4 0 0 0 50 17 Z"
          fill="#DDD6FE"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
