const isBrowser = typeof window !== 'undefined';
const resourceName =
  isBrowser && window.GetParentResourceName
    ? window.GetParentResourceName()
    : 'sync_nui';

const FETCH_TIMEOUT_MS = 12000;

export async function nuiFetch(event, data = {}) {
  if (!isBrowser) return { ok: false, error: 'no-window' };
  // Browser / Playwright outside FiveM: mock
  if (!window.invokeNative) {
    return mockNui(event, data);
  }

  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl
    ? setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
    : null;

  try {
    const res = await fetch(`https://${resourceName}/${event}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(data ?? {}),
      signal: ctrl ? ctrl.signal : undefined,
    });
    try {
      return await res.json();
    } catch {
      return { ok: false, error: 'bad-json' };
    }
  } catch (err) {
    const aborted = err && err.name === 'AbortError';
    return {
      ok: false,
      error: aborted ? 'Таймаут ответа NUI' : 'Ошибка связи с клиентом',
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** In-memory mock for Vite/Playwright outside FiveM */
const mockState = {
  characters: [
    {
      id: 1,
      slot: 1,
      firstName: 'Иван',
      lastName: 'Петров',
      gender: 'male',
      dateOfBirth: '1990-05-01',
      position: null,
    },
  ],
};

function mockNui(event, data) {
  if (event === 'listCharacters') {
    return {
      ok: true,
      maxSlots: 3,
      isNewAccount: mockState.characters.length === 0,
      characters: mockState.characters.map((c) => ({ ...c })),
    };
  }
  if (event === 'createCharacter') {
    const id = mockState.characters.length
      ? Math.max(...mockState.characters.map((c) => c.id)) + 1
      : 1;
    const character = {
      id,
      slot: mockState.characters.length + 1,
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      position: null,
    };
    mockState.characters.push(character);
    return { ok: true, character };
  }
  if (event === 'selectCharacter') {
    return { ok: true };
  }
  if (event === 'deleteCharacter') {
    mockState.characters = mockState.characters.filter((c) => c.id !== data.id);
    return { ok: true };
  }
  if (event === 'close') {
    return { ok: true };
  }
  if (event === 'previewAppearance') {
    return { ok: true };
  }
  if (event === 'saveAppearance') {
    const ch = mockState.characters.find((c) => c.id === data.characterId);
    if (ch) ch.appearance = data.appearance;
    return { ok: true, character: ch };
  }
  if (event === 'shellReady') {
    return { ok: true };
  }
  if (event === 'getAppearanceLimits') {
    return {
      ok: true,
      limits: {
        components: {
          '0': 46, '1': 210, '2': 80, '3': 200, '4': 200, '5': 110,
          '6': 130, '7': 180, '8': 210, '9': 40, '10': 110, '11': 450,
        },
        textures: {
          '0': 30, '1': 30, '2': 30, '3': 30, '4': 30, '5': 30,
          '6': 30, '7': 30, '8': 30, '9': 30, '10': 30, '11': 40,
        },
        props: { '0': 200, '1': 50, '2': 45, '6': 45, '7': 25 },
        overlays: { '1': 29, '2': 34, '4': 75, '5': 33, '8': 11, '10': 17 },
        hairColors: 64,
        eyeColors: 32,
        headBlend: 46,
      },
    };
  }
  return { ok: false, error: 'mock-unknown' };
}

/** Test helper: empty roster → registration path */
export function __mockResetCharacters(list) {
  mockState.characters = Array.isArray(list) ? list : [];
}

if (isBrowser && !window.invokeNative) {
  window.__syncNuiMock = {
    resetCharacters: __mockResetCharacters,
    getCharacters: () => mockState.characters.map((c) => ({ ...c })),
  };
}

export function onNuiMessage(handler) {
  if (!isBrowser) return () => {};
  const listener = (event) => handler(event.data);
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
