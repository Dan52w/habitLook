import { useEffect, useState, useCallback } from 'react';
import { listBlocksForDate, TimeBlockWithCategory } from '../../../db/repositories/timeBlocks';
import { buildRingSegments, mergeSegmentsByCategory, RingSegment } from '../utils/clockMath';
import { localDateKey } from '../../../shared/utils/date';

const DAY_START = 6 * 60; const DAY_END = 18 * 60; const NIGHT_END = 30 * 60;
const toMinutes = (time: string) => { const [hour, minute] = time.split(':').map(Number); return hour * 60 + minute; };

export function useTodayTimeline(selectedDate: string) {
  const [segments, setSegments] = useState<RingSegment[]>([]); const [nightSegments, setNightSegments] = useState<RingSegment[]>([]);
  const [legend, setLegend] = useState<{ categoryName: string; color: string; hours: number }[]>([]);
  const [currentActivity, setCurrentActivity] = useState({ name: 'Libre', color: '#4B4F5A' }); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); const blocks: TimeBlockWithCategory[] = await listBlocksForDate(selectedDate);
    const mapped = blocks.map(block => ({ categoryId: block.category_id, categoryName: block.category_name, color: block.category_color, emoji: block.category_emoji, startMinutes: toMinutes(block.start_time), endMinutes: toMinutes(block.end_time) }));
    // Son dos relojes completos de doce horas. El exterior contiene 06:00–17:59
    // y el interior 18:00–05:59; no se mezclan ni se solapan visualmente.
    const day = buildRingSegments(mapped, DAY_START, DAY_END, 180, 360);
    const night = buildRingSegments(
      mapped.map(block => ({
        ...block,
        startMinutes: block.startMinutes < DAY_START ? block.startMinutes + 1440 : block.startMinutes,
        endMinutes: block.endMinutes <= DAY_START ? block.endMinutes + 1440 : block.endMinutes,
      })),
      DAY_END,
      NIGHT_END,
      180,
      360,
    );
    setSegments(day); setNightSegments(night); setLegend(mergeSegmentsByCategory([...day, ...night]));
    const today = localDateKey(); const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const active = selectedDate === today ? mapped.find(block => nowMinutes >= block.startMinutes && nowMinutes < block.endMinutes) : undefined;
    setCurrentActivity(active ? { name: active.categoryName, color: active.color } : { name: selectedDate === today ? 'Libre' : 'Día seleccionado', color: '#4B4F5A' }); setLoading(false);
  }, [selectedDate]);
  useEffect(() => { load(); }, [load]);
  return { segments, nightSegments, legend, currentActivity, loading, reload: load };
}
