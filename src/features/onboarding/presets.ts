/**
 * Metas preconfiguradas del onboarding: cada chip crea una meta diaria
 * lista para que el inicio nunca esté vacío.
 */

export type GoalPreset = {
  emoji: string;
  label: string;
  categoryName: string;
  categoryColor: string;
  goalTitle: string;
  targetType: 'duration' | 'count' | 'boolean';
  targetValue: number;
};

export const GOAL_PRESETS: GoalPreset[] = [
  {
    emoji: '💪',
    label: 'Salud',
    categoryName: 'Salud',
    categoryColor: '#64D9A0',
    goalTitle: 'Moverme 30 minutos',
    targetType: 'duration',
    targetValue: 30,
  },
  {
    emoji: '📚',
    label: 'Lectura',
    categoryName: 'Lectura',
    categoryColor: '#58BDEB',
    goalTitle: 'Leer 20 minutos',
    targetType: 'duration',
    targetValue: 20,
  },
  {
    emoji: '💰',
    label: 'Ahorro',
    categoryName: 'Ahorro',
    categoryColor: '#F5B86B',
    goalTitle: 'Ahorrar algo hoy',
    targetType: 'boolean',
    targetValue: 1,
  },
  {
    emoji: '🧘',
    label: 'Calma',
    categoryName: 'Calma',
    categoryColor: '#A78BFA',
    goalTitle: 'Meditar 10 minutos',
    targetType: 'duration',
    targetValue: 10,
  },
];

export const CUSTOM_CATEGORY = {
  name: 'General',
  color: '#9372BE',
  emoji: '✨',
};

export const ONBOARDING_DONE_KEY = 'onboarding_done';
