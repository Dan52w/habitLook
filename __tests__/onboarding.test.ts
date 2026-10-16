import {
  CUSTOM_CATEGORY,
  GOAL_PRESETS,
  ONBOARDING_DONE_KEY,
} from '../src/features/onboarding/presets';

describe('onboarding presets', () => {
  it('define 4 chips preconfigurados con metas diarias válidas', () => {
    expect(GOAL_PRESETS).toHaveLength(4);
    for (const preset of GOAL_PRESETS) {
      expect(preset.emoji.trim().length).toBeGreaterThan(0);
      expect(preset.label.trim().length).toBeGreaterThan(0);
      expect(preset.categoryName.trim().length).toBeGreaterThan(0);
      expect(preset.goalTitle.trim().length).toBeGreaterThan(0);
      expect(['duration', 'count', 'boolean']).toContain(preset.targetType);
      expect(preset.targetValue).toBeGreaterThan(0);
    }
  });

  it('usa etiquetas únicas por chip', () => {
    const labels = GOAL_PRESETS.map(p => p.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('la meta booleana usa target 1 (hacerlo una vez al día)', () => {
    const booleanOnes = GOAL_PRESETS.filter(p => p.targetType === 'boolean');
    for (const preset of booleanOnes) {
      expect(preset.targetValue).toBe(1);
    }
  });

  it('expone la categoría y la llave de la bandera de onboarding', () => {
    expect(CUSTOM_CATEGORY.name.trim().length).toBeGreaterThan(0);
    expect(ONBOARDING_DONE_KEY).toBe('onboarding_done');
  });
});
