import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

type IconProps = { color: string; size?: number };

export function ClockTabIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Line x1="12" y1="12" x2="12" y2="7" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="12" y1="12" x2="15.5" y2="13.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function WalletTabIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M9 12h6M12 9v6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function NotesTabIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="3" width="14" height="18" rx="2" stroke={color} strokeWidth={2} />
      <Line x1="8" y1="8" x2="16" y2="8" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="8" y1="16" x2="13" y2="16" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ProfileTabIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={2} />
      <Path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}