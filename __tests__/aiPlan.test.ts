import {
  extractPlanBlock,
  stripPlanBlock,
  describeAction,
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
