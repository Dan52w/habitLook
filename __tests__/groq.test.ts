import { GroqProvider, getEffectiveApiKey } from '../src/services/ai/providers/groq';
import { EMBEDDED_GROQ_API_KEY } from '../src/services/ai/embeddedKey';
import { getAiApiKey } from '../src/services/ai/key';

jest.mock('../src/services/ai/key', () => ({
  getAiApiKey: jest.fn(),
}));

// embeddedKey se usa real (vacío en este entorno); los tests de key
// embebida lo reemplazan con jest.doMock + jest.resetModules.

const mockedGetKey = getAiApiKey as jest.Mock;

function mockFetch(status: number, body: unknown) {
  const fetchMock = jest.fn(async () => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('GroqProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('no está configurado sin ninguna key', async () => {
    mockedGetKey.mockResolvedValue(null);
    const provider = new GroqProvider();
    expect(provider.id).toBe('groq');
    await expect(provider.isConfigured()).resolves.toBe(false);
    await expect(getEffectiveApiKey()).resolves.toBeNull();
  });

  it('usa la key del Keychain cuando existe', async () => {
    mockedGetKey.mockResolvedValue('gsk-test');
    await expect(new GroqProvider().isConfigured()).resolves.toBe(true);
    await expect(getEffectiveApiKey()).resolves.toBe('gsk-test');
  });

  it('envía a la API de Groq con Bearer y devuelve la respuesta', async () => {
    mockedGetKey.mockResolvedValue('gsk-test');
    const fetchMock = mockFetch(200, {
      choices: [{ message: { content: 'Hola, soy Groq.' } }],
    });
    const reply = await new GroqProvider().chat([
      { role: 'user', content: 'hola' },
    ]);
    expect(reply).toBe('Hola, soy Groq.');
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const [url, init] = call;
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer gsk-test',
    );
    const body = JSON.parse(init.body as string) as { model: string };
    expect(body.model).toBe('openai/gpt-oss-120b');
    // La key no viaja en el cuerpo, solo en el header.
    expect(init.body as string).not.toContain('gsk-test');
  });

  it('401 → mensaje amable sin filtrar la key', async () => {
    mockedGetKey.mockResolvedValue('gsk-mala');
    mockFetch(401, { error: { message: 'invalid key' } });
    let error: Error | null = null;
    try {
      await new GroqProvider().chat([{ role: 'user', content: 'hola' }]);
    } catch (e) {
      error = e as Error;
    }
    expect(error?.message).toContain('Inténtalo más tarde');
    expect(error?.message).not.toContain('gsk-mala');
  });

  it('429 → mensaje amable de espera', async () => {
    mockedGetKey.mockResolvedValue('gsk-test');
    mockFetch(429, { error: { message: 'rate limit' } });
    await expect(
      new GroqProvider().chat([{ role: 'user', content: 'hola' }]),
    ).rejects.toThrow('muchas solicitudes');
  });

  it('404 de modelo → mensaje amable', async () => {
    mockedGetKey.mockResolvedValue('gsk-test');
    mockFetch(404, { error: { message: 'model not found' } });
    await expect(
      new GroqProvider().chat([{ role: 'user', content: 'hola' }]),
    ).rejects.toThrow('no está disponible en este momento');
  });

  it('respuesta vacía → error amable', async () => {
    mockedGetKey.mockResolvedValue('gsk-test');
    mockFetch(200, { choices: [] });
    await expect(
      new GroqProvider().chat([{ role: 'user', content: 'hola' }]),
    ).rejects.toThrow('Inténtalo de nuevo');
  });

  it('lanza sin key guardada', async () => {
    mockedGetKey.mockResolvedValue(null);
    await expect(
      new GroqProvider().chat([{ role: 'user', content: 'hola' }]),
    ).rejects.toThrow('no está disponible en esta versión');
  });
});

describe('key embebida (wiring)', () => {
  it('la constante existe y es un string', () => {
    expect(typeof EMBEDDED_GROQ_API_KEY).toBe('string');
  });

  it('sin keychain ni embebida, no hay key efectiva', async () => {
    // En este entorno embeddedKey.ts está vacío y el Keychain mockeado
    // devuelve null: no hay key efectiva.
    mockedGetKey.mockResolvedValue(null);
    await expect(getEffectiveApiKey()).resolves.toBeNull();
  });
});
