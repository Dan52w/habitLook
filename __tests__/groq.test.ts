import { GroqProvider } from '../src/services/ai/providers/groq';
import { getAiApiKey } from '../src/services/ai/key';

jest.mock('../src/services/ai/key', () => ({
  getAiApiKey: jest.fn(),
}));

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

  it('no está configurado sin API key', async () => {
    mockedGetKey.mockResolvedValue(null);
    const provider = new GroqProvider();
    expect(provider.id).toBe('groq');
    await expect(provider.isConfigured()).resolves.toBe(false);
  });

  it('está configurado con API key en Keychain', async () => {
    mockedGetKey.mockResolvedValue('gsk-test');
    await expect(new GroqProvider().isConfigured()).resolves.toBe(true);
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
    expect(body.model).toBe('llama-3.3-70b-versatile');
    // La key no viaja en el cuerpo, solo en el header.
    expect(init.body as string).not.toContain('gsk-test');
  });

  it('401 → mensaje de key inválida (sin filtrar la key)', async () => {
    mockedGetKey.mockResolvedValue('gsk-mala');
    mockFetch(401, { error: { message: 'invalid key' } });
    await expect(
      new GroqProvider().chat([{ role: 'user', content: 'hola' }]),
    ).rejects.toThrow('no es válida');
  });

  it('429 → mensaje de límite gratuito', async () => {
    mockedGetKey.mockResolvedValue('gsk-test');
    mockFetch(429, { error: { message: 'rate limit' } });
    await expect(
      new GroqProvider().chat([{ role: 'user', content: 'hola' }]),
    ).rejects.toThrow('Límite gratuito');
  });

  it('respuesta vacía → error', async () => {
    mockedGetKey.mockResolvedValue('gsk-test');
    mockFetch(200, { choices: [] });
    await expect(
      new GroqProvider().chat([{ role: 'user', content: 'hola' }]),
    ).rejects.toThrow('vacía');
  });

  it('lanza sin key guardada', async () => {
    mockedGetKey.mockResolvedValue(null);
    await expect(
      new GroqProvider().chat([{ role: 'user', content: 'hola' }]),
    ).rejects.toThrow('Falta la API key');
  });
});
