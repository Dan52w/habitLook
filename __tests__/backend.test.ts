import { BackendProvider } from '../src/services/ai/providers/backend';

jest.mock('../src/services/ai/embeddedSecrets', () => ({
  EMBEDDED_BACKEND_URL: 'https://mi-backend.test',
  EMBEDDED_APP_KEY: 'app-key-test',
}));

function mockFetch(status: number, body: unknown) {
  const fetchMock = jest.fn(async () => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('BackendProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('está configurado con secreto embebido', async () => {
    const provider = new BackendProvider();
    expect(provider.id).toBe('backend');
    await expect(provider.isConfigured()).resolves.toBe(true);
  });

  it('llama al backend con x-app-key y devuelve la respuesta', async () => {
    const fetchMock = mockFetch(200, { reply: 'Hola desde el backend.' });
    const reply = await new BackendProvider().chat([
      { role: 'user', content: 'hola' },
    ]);
    expect(reply).toBe('Hola desde el backend.');
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const [url, init] = call;
    expect(url).toBe('https://mi-backend.test/api/chat');
    expect((init.headers as Record<string, string>)['x-app-key']).toBe(
      'app-key-test',
    );
    const body = JSON.parse(init.body as string) as {
      messages: { role: string; content: string }[];
    };
    expect(body.messages).toEqual([{ role: 'user', content: 'hola' }]);
    // La key de Groq nunca viaja a la app ni en el cuerpo.
    expect(init.body as string).not.toContain('gsk-');
  });

  it('muestra el error amable que devuelve el backend', async () => {
    mockFetch(502, { error: 'La IA no está disponible en este momento. Inténtalo más tarde.' });
    await expect(
      new BackendProvider().chat([{ role: 'user', content: 'hola' }]),
    ).rejects.toThrow('no está disponible en este momento');
  });

  it('429 → mensaje amable de espera', async () => {
    mockFetch(429, { error: 'Demasiadas solicitudes. Espera unos minutos.' });
    await expect(
      new BackendProvider().chat([{ role: 'user', content: 'hola' }]),
    ).rejects.toThrow('muchas solicitudes');
  });

  it('respuesta vacía → error amable', async () => {
    mockFetch(200, { reply: '' });
    await expect(
      new BackendProvider().chat([{ role: 'user', content: 'hola' }]),
    ).rejects.toThrow('Inténtalo de nuevo');
  });
});

describe('BackendProvider sin secreto', () => {
  beforeEach(() => jest.resetModules());

  it('no está configurado sin secreto embebido', async () => {
    jest.doMock('../src/services/ai/embeddedSecrets', () => ({
      EMBEDDED_BACKEND_URL: '',
      EMBEDDED_APP_KEY: '',
    }));
    let mod!: typeof import('../src/services/ai/providers/backend');
    jest.isolateModules(() => {
      mod = require('../src/services/ai/providers/backend');
    });
    await expect(new mod.BackendProvider().isConfigured()).resolves.toBe(false);
    await expect(
      new mod.BackendProvider().chat([{ role: 'user', content: 'hola' }]),
    ).rejects.toThrow('no está disponible en esta versión');
  });
});
