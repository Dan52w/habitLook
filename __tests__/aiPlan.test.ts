import {
  extractPlanBlock,
  stripPlanBlock,
  describeAction,
  describePlanDate,
  CREATION_INTENT_RE,
} from '../src/services/ai/plan';

// plan.ts importa repositorios que usan el módulo nativo de SQLite:
// se aíslan porque aquí solo se prueban las funciones puras.
jest.mock('../src/db/repositories/timeBlocks', () => ({}));
jest.mock('../src/db/repositories/goals', () => ({}));
jest.mock('../src/db/repositories/notes', () => ({}));
jest.mock('../src/db/repositories/categories', () => ({}));

const VALID = `Aquí va tu plan:

\`\`\`plan
{"actions":[
  {"type":"time_block","category":"Trabajo","start":"09:00","end":"10:30"},
  {"type":"goal","title":"Leer 20 páginas","target_type":"count","target_value":20,"frequency":"once"},
  {"type":"note","text":"Llamar al banco","category":"Personal"}
]}
\`\`\`

¿Quieres que lo aplique?`;

describe('extractPlanBlock', () => {
  it('extrae y valida un plan correcto', () => {
    const plan = extractPlanBlock(VALID);
    expect(plan).not.toBeNull();
    expect(plan!.actions).toHaveLength(3);
    expect(plan!.actions[0]).toEqual({
      type: 'time_block',
      category: 'Trabajo',
      start: '09:00',
      end: '10:30',
    });
  });

  it('devuelve null si no hay bloque plan', () => {
    expect(extractPlanBlock('Hola, ¿cómo estás?')).toBeNull();
  });

  it('devuelve null con JSON inválido', () => {
    expect(extractPlanBlock('```plan\n{no es json}\n```')).toBeNull();
  });

  it('rechaza todo el plan si una acción es inválida (fail-closed)', () => {
    const bad = VALID.replace('"end":"10:30"', '"end":"08:00"');
    expect(extractPlanBlock(bad)).toBeNull();
  });

  it('rechaza horas mal formadas', () => {
    const bad = VALID.replace('"start":"09:00"', '"start":"9am"');
    expect(extractPlanBlock(bad)).toBeNull();
  });

  it('rechaza tipos de acción desconocidos', () => {
    const bad = VALID.replace('"type":"note"', '"type":"hack"');
    expect(extractPlanBlock(bad)).toBeNull();
  });

  it('rechaza más de 12 acciones', () => {
    const many = Array.from({ length: 13 }, (_, i) => ({
      type: 'note',
      text: `nota ${i}`,
    }));
    const text = '```plan\n' + JSON.stringify({ actions: many }) + '\n```';
    expect(extractPlanBlock(text)).toBeNull();
  });

  it('rechaza meta con frequency inválida', () => {
    const bad = VALID.replace('"frequency":"once"', '"frequency":"siempre"');
    expect(extractPlanBlock(bad)).toBeNull();
  });
});

describe('extractPlanBlock tolerante', () => {
  const mini = (fence: string) =>
    `Plan:\n${fence}\n{"actions":[{"type":"note","text":"Hola"}]}\n\`\`\``;

  it('acepta bloque sin saltos de línea estrictos', () => {
    const plan = extractPlanBlock(mini('```plan'));
    expect(plan?.actions).toHaveLength(1);
  });

  it('acepta bloque en una sola línea', () => {
    const plan = extractPlanBlock(
      '```plan {"actions":[{"type":"note","text":"Hola"}]}```',
    );
    expect(plan?.actions).toHaveLength(1);
  });

  it('acepta ```json como alternativa si valida como plan', () => {
    const plan = extractPlanBlock(mini('```json'));
    expect(plan?.actions).toHaveLength(1);
  });

  it('ignora ```json que no es un plan', () => {
    expect(
      extractPlanBlock('Mira:\n```json\n{"foo": 1}\n```'),
    ).toBeNull();
  });
});

describe('stripPlanBlock', () => {
  it('quita el bloque plan del texto', () => {
    const stripped = stripPlanBlock(VALID);
    expect(stripped).not.toContain('```plan');
    expect(stripped).not.toContain('"actions"');
    expect(stripped).toContain('Aquí va tu plan');
    expect(stripped).toContain('¿Quieres que lo aplique?');
  });

  it('deja intacto el texto sin bloque', () => {
    expect(stripPlanBlock('Hola')).toBe('Hola');
  });
});

describe('describePlanDate', () => {
  it('dice hoy si no hay fecha o es la de hoy', () => {
    expect(describePlanDate(undefined, '2026-10-16')).toBe('hoy');
    expect(describePlanDate('2026-10-16', '2026-10-16')).toBe('hoy');
  });

  it('dice mañana para el día siguiente', () => {
    expect(describePlanDate('2026-10-17', '2026-10-16')).toBe('mañana');
  });

  it('muestra fecha corta para otros días', () => {
    expect(describePlanDate('2026-10-20', '2026-10-16')).toContain('20');
  });
});

describe('fecha del plan', () => {
  const withDate = (date: string) =>
    '```plan\n' +
    JSON.stringify({
      date,
      actions: [{ type: 'note', text: 'Hola' }],
    }) +
    '\n```';

  it('acepta fecha válida', () => {
    const plan = extractPlanBlock(withDate('2026-10-17'));
    expect(plan?.date).toBe('2026-10-17');
  });

  it('el plan sin fecha queda sin date', () => {
    const plan = extractPlanBlock(
      '```plan\n{"actions":[{"type":"note","text":"Hola"}]}\n```',
    );
    expect(plan?.date).toBeUndefined();
  });

  it('rechaza fecha con formato inválido', () => {
    expect(extractPlanBlock(withDate('17-10-2026'))).toBeNull();
  });

  it('rechaza fecha inexistente', () => {
    expect(extractPlanBlock(withDate('2026-02-30'))).toBeNull();
  });

  it('rechaza fecha muy lejana', () => {
    expect(extractPlanBlock(withDate('2030-01-01'))).toBeNull();
  });
});

describe('CREATION_INTENT_RE', () => {
  it('detecta peticiones de crear', () => {
    expect(CREATION_INTENT_RE.test('hazme un plan para mañana')).toBe(true);
    expect(CREATION_INTENT_RE.test('ponme una nota de llevar agua')).toBe(true);
    expect(CREATION_INTENT_RE.test('créame una meta de ahorro')).toBe(true);
  });

  it('no detecta preguntas normales', () => {
    expect(CREATION_INTENT_RE.test('¿Cómo va mi semana?')).toBe(false);
    expect(CREATION_INTENT_RE.test('Analiza mis gastos del periodo')).toBe(false);
  });
});

describe('bloques recurrentes', () => {
  it('acepta recurring true en time_block', () => {
    const plan = extractPlanBlock(
      '```plan\n{"actions":[{"type":"time_block","category":"Gym","start":"07:00","end":"08:00","recurring":true}]}\n```',
    );
    expect(plan?.actions[0]).toMatchObject({ recurring: true });
  });

  it('rechaza recurring no booleano', () => {
    const plan = extractPlanBlock(
      '```plan\n{"actions":[{"type":"time_block","category":"Gym","start":"07:00","end":"08:00","recurring":"si"}]}\n```',
    );
    expect(plan).toBeNull();
  });

  it('describe el bloque recurrente', () => {
    expect(
      describeAction({ type: 'time_block', category: 'Gym', start: '07:00', end: '08:00', recurring: true }),
    ).toContain('cada semana');
  });
});
describe('describeAction', () => {
  it('describe bloques, metas y notas', () => {
    expect(
      describeAction({ type: 'time_block', category: 'Trabajo', start: '09:00', end: '10:30' }),
    ).toContain('09:00');
    expect(
      describeAction({
        type: 'goal',
        title: 'Leer',
        target_type: 'count',
        target_value: 20,
        frequency: 'once',
      }),
    ).toContain('solo hoy');
    expect(describeAction({ type: 'note', text: 'Llamar' })).toContain('Llamar');
  });
});
