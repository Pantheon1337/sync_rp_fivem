const isBrowser = typeof window !== 'undefined';
const resourceName =
  isBrowser && window.GetParentResourceName
    ? window.GetParentResourceName()
    : 'sync_nui';

export async function nuiFetch(event, data = {}) {
  if (!isBrowser) return { ok: false, error: 'no-window' };
  // Browser / Playwright outside FiveM: mock
  if (!window.invokeNative) {
    return mockNui(event, data);
  }
  const res = await fetch(`https://${resourceName}/${event}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(data),
  });
  try {
    return await res.json();
  } catch {
    return { ok: false, error: 'bad-json' };
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
