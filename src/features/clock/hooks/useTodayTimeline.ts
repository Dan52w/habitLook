import { useEffect, useState, useCallback, useRef } from 'react';
import { listBlocksForDate, TimeBlockWithCategory } from '../../../db/repositories/timeBlocks';
import { buildRingSegments, mergeSegmentsByCategory, RingSegment, TimeBlockSegment } from '../utils/clockMath';
import { dateFromKey, localDateKey, weekdayFromKey } from '../../../shared/utils/date';
import { updateTodayWidget } from '../../../services/todayWidget';

const DAY_START = 6 * 60;
const DAY_END = 18 * 60;
const NIGHT_END = 30 * 60;

const toMinutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return (hour || 0) * 60 + (minute || 0);
};

export function useTodayTimeline(selectedDate: string, now = new Date()) {
  const [segments, setSegments] = useState<RingSegment[]>([]);
  const [nightSegments, setNightSegments] = useState<RingSegment[]>([]);
  const [legend, setLegend] = useState<{ categoryName: string; color: string; hours: number }[]>([]);
  const [currentActivity, setCurrentActivity] = useState({ name: 'Libre', color: '#4B4F5A' });
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);

  const load = useCallback(async () => {
    if (!hasLoaded.current) setLoading(true);

    const blocks: TimeBlockWithCategory[] = await listBlocksForDate(selectedDate);
    const today = localDateKey(now);
    const isToday = selectedDate === today;
    const isEarlyMorning = now.getHours() < 6;

    const previousDate = (() => {
      const d = dateFromKey(selectedDate);
      d.setDate(d.getDate() - 1);
      return localDateKey(d);
    })();
    const previousDayOfWeek = weekdayFromKey(previousDate);

    // Separamos bloques diurnos (06:00–18:00) y nocturnos (18:00–06:00)
    const dayBlocks: TimeBlockSegment[] = [];
    const nightBlocks: TimeBlockSegment[] = [];
    const activeBlocksToday: { name: string; color: string; start: number; end: number }[] = [];

    for (const block of blocks) {
      const startMin = toMinutes(block.start_time);
      const endMin = toMinutes(block.end_time);
      const isFromYesterday =
        block.schedule_date === previousDate ||
        (block.schedule_date === null && block.day_of_week === previousDayOfWeek);
      const crossesMidnight = endMin < startMin;

      const baseSegment = {
        categoryId: block.category_id,
        categoryName: block.category_name,
        color: block.category_color,
        emoji: block.category_emoji,
      };

      if (isFromYesterday) {
        if (crossesMidnight) {
          activeBlocksToday.push({
            name: block.category_name,
            color: block.category_color,
            start: 0,
            end: endMin,
          });

          if (isToday && isEarlyMorning) {
            nightBlocks.push({
              ...baseSegment,
              startMinutes: startMin,
              endMinutes: endMin + 1440,
            });
          }
        } else if (startMin >= DAY_END && isToday && isEarlyMorning) {
          nightBlocks.push({
            ...baseSegment,
            startMinutes: startMin,
            endMinutes: endMin,
          });
        }
      } else {
        // Bloque perteneciente a selectedDate
        if (crossesMidnight) {
          activeBlocksToday.push({
            name: block.category_name,
            color: block.category_color,
            start: startMin,
            end: 1440,
          });

          if (!(isToday && isEarlyMorning)) {
            nightBlocks.push({
              ...baseSegment,
              startMinutes: startMin,
              endMinutes: endMin + 1440,
            });
          }
        } else {
          activeBlocksToday.push({
            name: block.category_name,
            color: block.category_color,
            start: startMin,
            end: endMin,
          });

          // Si solapa con el horario diurno (06:00–18:00)
          if (startMin < DAY_END && endMin > DAY_START) {
            dayBlocks.push({
              ...baseSegment,
              startMinutes: Math.max(startMin, DAY_START),
              endMinutes: Math.min(endMin, DAY_END),
            });
          }

          // Si está en la noche (18:00–24:00)
          if (startMin >= DAY_END) {
            if (!(isToday && isEarlyMorning)) {
              nightBlocks.push({
                ...baseSegment,
                startMinutes: startMin,
                endMinutes: endMin,
              });
            }
          }

          // Si está en la madrugada (00:00–06:00)
          if (endMin <= DAY_START) {
            nightBlocks.push({
              ...baseSegment,
              startMinutes: 1440 + startMin,
              endMinutes: 1440 + endMin,
            });
          }
        }
      }
    }

    const day = buildRingSegments(dayBlocks, DAY_START, DAY_END, 180, 360);
    const night = buildRingSegments(nightBlocks, DAY_END, NIGHT_END, 180, 360);

    setSegments(day);
    setNightSegments(night);
    setLegend(mergeSegmentsByCategory([...day, ...night]));

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const active = isToday
      ? activeBlocksToday.find(b => nowMinutes >= b.start && nowMinutes < b.end)
      : undefined;

    setCurrentActivity(
      active
        ? { name: active.name, color: active.color }
        : { name: isToday ? 'Libre' : 'Día seleccionado', color: '#4B4F5A' }
    );

    hasLoaded.current = true;
    setLoading(false);

    if (isToday) {
      const next = activeBlocksToday
        .filter(b => b.start >= nowMinutes)
        .sort((a, b) => a.start - b.start)[0];

      updateTodayWidget(
        next?.name ?? 'Sin actividad próxima',
        next
          ? `Próxima: ${String(Math.floor(next.start / 60)).padStart(2, '0')}:${String(next.start % 60).padStart(2, '0')}`
          : 'Planifica tu día en HabitLook'
      );
    }
  }, [selectedDate, now]);

  useEffect(() => {
    load();
  }, [load]);

  return { segments, nightSegments, legend, currentActivity, loading, reload: load };
}
