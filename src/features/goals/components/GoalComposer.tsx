import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppModal } from '../../../shared/components/AppModal';
import { Category, listCategories } from '../../../db/repositories/categories';
import { createGoal } from '../../../db/repositories/goals';

type Props = { visible: boolean; onClose: () => void; onSaved: () => void };
export function GoalComposer({ visible, onClose, onSaved }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'duration' | 'count' | 'boolean'>('duration');
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');
  const [target, setTarget] = useState('30');
  useEffect(() => { if (visible) listCategories().then(items => { setCategories(items); if (!category && items[0]) setCategory(items[0].id); }); }, [visible]);
  const save = async () => {
    const targetValue = type === 'boolean' ? 1 : Number(target);
    if (!title.trim() || !category || !Number.isFinite(targetValue) || targetValue <= 0) return;
    await createGoal({ categoryId: category, title, targetType: type, targetValue, period });
    setTitle(''); onSaved(); onClose();
  };
  return <AppModal visible={visible} title="Nueva meta" onClose={onClose}>
    <Text style={styles.label}>Categoría</Text>
    <View style={styles.chips}>{categories.map(item => <Pressable onPress={() => setCategory(item.id)} key={item.id} style={[styles.chip, category === item.id && styles.chipActive]}><View style={[styles.dot, { backgroundColor: item.color }]} /><Text style={styles.chipText}>{item.name}</Text></Pressable>)}</View>
    <Text style={styles.label}>¿Qué quieres lograr?</Text><TextInput value={title} onChangeText={setTitle} placeholder="Ej. Leer sin distracciones" placeholderTextColor="#75798B" style={styles.input} />
    <Text style={styles.label}>Medición</Text><View style={styles.chips}>{([['duration', 'Minutos'], ['count', 'Veces'], ['boolean', 'Sí / no']] as const).map(([value, label]) => <Pressable key={value} onPress={() => setType(value)} style={[styles.chip, type === value && styles.chipActive]}><Text style={styles.chipText}>{label}</Text></Pressable>)}</View>
    {type !== 'boolean' && <><Text style={styles.label}>Objetivo</Text><TextInput value={target} keyboardType="decimal-pad" onChangeText={setTarget} style={styles.input} /></>}
    <Text style={styles.label}>Frecuencia</Text><View style={styles.chips}>{([['daily', 'Cada día'], ['weekly', 'Cada semana']] as const).map(([value, label]) => <Pressable key={value} onPress={() => setPeriod(value)} style={[styles.chip, period === value && styles.chipActive]}><Text style={styles.chipText}>{label}</Text></Pressable>)}</View>
    <Pressable style={styles.save} onPress={save}><Text style={styles.saveText}>Crear meta</Text></Pressable>
  </AppModal>;
}
const styles = StyleSheet.create({
  label: { color: '#C9B6E8', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: .8 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 12, backgroundColor: '#202433', paddingHorizontal: 12, paddingVertical: 11 }, chipActive: { borderWidth: 1, borderColor: '#A78BFA' }, chipText: { color: '#E8E9EE', fontSize: 14 }, dot: { height: 8, width: 8, borderRadius: 4 }, input: { height: 48, borderRadius: 12, backgroundColor: '#202433', color: '#F8F7FB', paddingHorizontal: 13, fontSize: 15 }, save: { marginTop: 8, height: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: '#A78BFA' }, saveText: { color: '#171421', fontWeight: '800', fontSize: 15 },
});
