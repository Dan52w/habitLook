import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { RingSegment, angleForClockHand, describeArc, polarToCartesian } from '../utils/clockMath';

type Props = {
  daySegments: RingSegment[];
  nightSegments: RingSegment[];
  now: Date;
  size?: number;
  onSegmentPress?: (segment: RingSegment) => void;
};

const DAY_LABELS = [{ label: '06', angle: 180 }, { label: '09', angle: 270 }, { label: '12', angle: 0 }, { label: '15', angle: 90 }];
const NIGHT_LABELS = [{ label: '18', angle: 180 }, { label: '21', angle: 270 }, { label: '00', angle: 0 }, { label: '03', angle: 90 }];

export function DayRing({ daySegments, nightSegments, now, size = 294, onSegmentPress }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const dayRadius = size / 2 - 24;
  const nightRadius = dayRadius - 35;
  const isDaytime = now.getHours() >= 6 && now.getHours() < 18;
  const outerSegments = isDaytime ? daySegments : nightSegments;
  const innerSegments = isDaytime ? nightSegments : daySegments;
  const outerLabels = isDaytime ? DAY_LABELS : NIGHT_LABELS;
  const innerLabels = isDaytime ? NIGHT_LABELS : DAY_LABELS;
  const drawSegments = (segments: RingSegment[], radius: number, width: number, prefix: string) => segments.map((segment, index) => {
    const span = segment.endAngle - segment.startAngle;
    const gap = Math.min(2.2, span * .16);
    const start = segment.startAngle + gap;
    const end = segment.endAngle - gap;
    if (end <= start) return null;
    return <Path key={`${prefix}-${segment.categoryId}-${index}`} d={describeArc(cx, cy, radius, start, end)} stroke={segment.color} strokeWidth={width} strokeLinecap="round" fill="none" onPress={() => onSegmentPress?.(segment)} />;
  });
  const time = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });

  return <View style={{ width: size, height: size }}>
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={dayRadius} stroke="#30384C" strokeWidth={20} fill="none" />
      <Circle cx={cx} cy={cy} r={nightRadius} stroke="#434B61" strokeWidth={14} fill="none" />
      {drawSegments(outerSegments, dayRadius, 20, 'outer')}
      {drawSegments(innerSegments, nightRadius, 14, 'inner')}

      {outerLabels.map(({ label, angle }) => {
        const point = polarToCartesian(cx, cy, dayRadius + 20, angle);
        return <SvgText key={`outer-${label}`} x={point.x} y={point.y + 4} fill="#D9DDEA" fontSize={10} fontWeight="800" textAnchor="middle">{label}</SvgText>;
      })}
      {innerLabels.map(({ label, angle }) => {
        const point = polarToCartesian(cx, cy, nightRadius - 17, angle);
        return <SvgText key={`inner-${label}`} x={point.x} y={point.y + 4} fill="#A9B0C3" fontSize={9} fontWeight="800" textAnchor="middle">{label}</SvgText>;
      })}

      {outerSegments.filter(segment => segment.categoryId !== '__free__' && segment.emoji).map((segment, index) => {
        const point = polarToCartesian(cx, cy, dayRadius, (segment.startAngle + segment.endAngle) / 2);
        return <SvgText key={`emoji-${index}`} x={point.x} y={point.y + 5} fontSize={12} textAnchor="middle">{segment.emoji}</SvgText>;
      })}
      {innerSegments.filter(segment => segment.categoryId !== '__free__' && segment.emoji).map((segment, index) => {
        const point = polarToCartesian(cx, cy, nightRadius, (segment.startAngle + segment.endAngle) / 2);
        return <SvgText key={`inner-emoji-${index}`} x={point.x} y={point.y + 4} fontSize={10} textAnchor="middle">{segment.emoji}</SvgText>;
      })}

      {(() => { const hour = polarToCartesian(cx, cy, dayRadius - 5, angleForClockHand(now, 'hour')); const minute = polarToCartesian(cx, cy, dayRadius + 3, angleForClockHand(now, 'minute')); return <><Line x1={cx} y1={cy} x2={hour.x} y2={hour.y} stroke="#F5F2FC" strokeWidth={3.5} strokeLinecap="round" /><Line x1={cx} y1={cy} x2={minute.x} y2={minute.y} stroke="#C9B6E8" strokeWidth={2} strokeLinecap="round" /><Circle cx={cx} cy={cy} r={3.5} fill="#A78BFA" /></>; })()}

      <Circle cx={cx} cy={cy} r={38} fill="#121621" stroke="#4A536C" strokeWidth={1.5} />
      <SvgText x={cx} y={cy - 8} fill="#F8F7FB" fontSize={16} fontWeight="800" textAnchor="middle">{time}</SvgText>
    </Svg>
  </View>;
}
