import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import {
  RingSegment,
  angleForClockHand,
  describeArc,
  polarToCartesian,
} from '../utils/clockMath';
import { useTheme } from '../../../shared/theme/ThemeProvider';

type Props = {
  daySegments: RingSegment[];
  nightSegments: RingSegment[];
  now: Date;
  size?: number;
  onSegmentPress?: (segment: RingSegment) => void;
  /** Ángulo (0-360) de la hora actual sobre el anillo exterior; null si no aplica. */
  nowAngle?: number | null;
  /** Texto pequeño bajo la hora en el centro (actividad actual, etc.). */
  centerSub?: string;
};

const DAY_LABELS = [
  { label: '06', angle: 180 },
  { label: '09', angle: 270 },
  { label: '12', angle: 0 },
  { label: '15', angle: 90 },
];

const NIGHT_LABELS = [
  { label: '18', angle: 180 },
  { label: '21', angle: 270 },
  { label: '00', angle: 0 },
  { label: '03', angle: 90 },
];

export function DayRing({
  daySegments,
  nightSegments,
  now,
  size = 294,
  onSegmentPress,
  nowAngle = null,
  centerSub,
}: Props) {
  const theme = useTheme();
  const cx = size / 2;
  const cy = size / 2;
  const dayRadius = size / 2 - 24;
  const nightRadius = dayRadius - 35;

  const currentHour = now.getHours();
  const isDaytime = currentHour >= 6 && currentHour < 18;

  const outerSegments = isDaytime ? daySegments : nightSegments;
  const innerSegments = isDaytime ? nightSegments : daySegments;
  const outerLabels = isDaytime ? DAY_LABELS : NIGHT_LABELS;
  const innerLabels = isDaytime ? NIGHT_LABELS : DAY_LABELS;

  const drawSegments = (
    segments: RingSegment[],
    radius: number,
    width: number,
    prefix: string,
  ) =>
    segments.map((segment, index) => {
      const span = segment.endAngle - segment.startAngle;
      const gap = Math.min(2.2, span * 0.16);
      const start = segment.startAngle + gap;
      const end = segment.endAngle - gap;
      if (end <= start) return null;
      return (
        <Path
          key={`${prefix}-${segment.categoryId}-${index}`}
          d={describeArc(cx, cy, radius, start, end)}
          stroke={segment.color}
          strokeWidth={width}
          strokeLinecap="round"
          fill="none"
          onPress={() => onSegmentPress?.(segment)}
        />
      );
    });

  const time = now.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const trackDayColor = theme.isLight ? '#DDD5C7' : '#30384C';
  const trackNightColor = theme.isLight ? '#EAE2D2' : '#434B61';
  const outerLabelColor = theme.isLight ? '#665E50' : '#D9DDEA';
  const innerLabelColor = theme.isLight ? '#8C8272' : '#A9B0C3';
  const centerFill = theme.isLight ? '#FFFDF8' : '#121621';
  const centerBorder = theme.isLight ? '#DCD4C4' : '#4A536C';
  const timeTextColor = theme.isLight ? '#22201C' : '#F8F7FB';
  const subTextColor = theme.isLight ? '#8C8272' : '#A9B0C3';
  const hourHandColor = theme.isLight ? '#22201C' : '#F5F2FC';
  const minuteHandColor = theme.isLight ? '#75549E' : '#C9B6E8';

  // Segmento que contiene la hora actual (para el resplandor).
  const activeSegment =
    nowAngle != null
      ? outerSegments.find(
          s => nowAngle >= s.startAngle && nowAngle < s.endAngle,
        ) ?? null
      : null;

  const nowDot =
    nowAngle != null
      ? polarToCartesian(cx, cy, dayRadius, nowAngle)
      : null;

  const drawGlow = (
    segment: RingSegment | null,
    radius: number,
    width: number,
  ) => {
    if (!segment) return null;
    const span = segment.endAngle - segment.startAngle;
    const gap = Math.min(2.2, span * 0.16);
    const start = segment.startAngle + gap;
    const end = segment.endAngle - gap;
    if (end <= start) return null;
    return (
      <Path
        key="now-glow"
        d={describeArc(cx, cy, radius, start, end)}
        stroke={segment.color}
        strokeWidth={width + 12}
        strokeLinecap="round"
        fill="none"
        opacity={0.22}
      />
    );
  };

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={cx}
          cy={cy}
          r={dayRadius}
          stroke={trackDayColor}
          strokeWidth={20}
          fill="none"
        />
        <Circle
          cx={cx}
          cy={cy}
          r={nightRadius}
          stroke={trackNightColor}
          strokeWidth={14}
          fill="none"
        />
        {drawGlow(activeSegment, dayRadius, 20)}
        {drawSegments(outerSegments, dayRadius, 20, 'outer')}
        {drawSegments(innerSegments, nightRadius, 14, 'inner')}

        {outerLabels.map(({ label, angle }) => {
          const point = polarToCartesian(cx, cy, dayRadius + 20, angle);
          return (
            <SvgText
              key={`outer-${label}`}
              x={point.x}
              y={point.y + 4}
              fill={outerLabelColor}
              fontSize={10}
              fontWeight="800"
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}

        {innerLabels.map(({ label, angle }) => {
          const point = polarToCartesian(cx, cy, nightRadius - 17, angle);
          return (
            <SvgText
              key={`inner-${label}`}
              x={point.x}
              y={point.y + 4}
              fill={innerLabelColor}
              fontSize={9}
              fontWeight="800"
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}

        {outerSegments
          .filter(segment => segment.categoryId !== '__free__' && segment.emoji)
          .map((segment, index) => {
            const point = polarToCartesian(
              cx,
              cy,
              dayRadius,
              (segment.startAngle + segment.endAngle) / 2,
            );
            return (
              <SvgText
                key={`emoji-${index}`}
                x={point.x}
                y={point.y + 5}
                fontSize={12}
                textAnchor="middle"
              >
                {segment.emoji}
              </SvgText>
            );
          })}

        {innerSegments
          .filter(segment => segment.categoryId !== '__free__' && segment.emoji)
          .map((segment, index) => {
            const point = polarToCartesian(
              cx,
              cy,
              nightRadius,
              (segment.startAngle + segment.endAngle) / 2,
            );
            return (
              <SvgText
                key={`inner-emoji-${index}`}
                x={point.x}
                y={point.y + 4}
                fontSize={10}
                textAnchor="middle"
              >
                {segment.emoji}
              </SvgText>
            );
          })}

        {(() => {
          const hour = polarToCartesian(
            cx,
            cy,
            dayRadius - 5,
            angleForClockHand(now, 'hour'),
          );
          const minute = polarToCartesian(
            cx,
            cy,
            dayRadius + 3,
            angleForClockHand(now, 'minute'),
          );
          return (
            <>
              <Line
                x1={cx}
                y1={cy}
                x2={hour.x}
                y2={hour.y}
                stroke={hourHandColor}
                strokeWidth={3.5}
                strokeLinecap="round"
              />
              <Line
                x1={cx}
                y1={cy}
                x2={minute.x}
                y2={minute.y}
                stroke={minuteHandColor}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <Circle cx={cx} cy={cy} r={3.5} fill="#A78BFA" />
            </>
          );
        })()}

        {nowDot ? (
          <>
            <Circle
              cx={nowDot.x}
              cy={nowDot.y}
              r={10}
              fill="#A78BFA"
              opacity={0.35}
            />
            <Circle
              cx={nowDot.x}
              cy={nowDot.y}
              r={4.5}
              fill="#FFFFFF"
              stroke="#A78BFA"
              strokeWidth={2}
            />
          </>
        ) : null}

        <Circle
          cx={cx}
          cy={cy}
          r={44}
          fill={centerFill}
          stroke={centerBorder}
          strokeWidth={1.5}
        />
        <SvgText
          x={cx}
          y={centerSub ? cy - 1 : cy + 6}
          fill={timeTextColor}
          fontSize={17}
          fontWeight="800"
          textAnchor="middle"
        >
          {time}
        </SvgText>
        {centerSub ? (
          <SvgText
            x={cx}
            y={cy + 18}
            fill={subTextColor}
            fontSize={10.5}
            fontWeight="700"
            textAnchor="middle"
          >
            {centerSub.length > 20 ? centerSub.slice(0, 20) + '…' : centerSub}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}
