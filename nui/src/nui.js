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

function mockNui(event, data) {
  if (event === 'listCharacters') {
    return {
      ok: true,
      maxSlots: 3,
      characters: [
        {
          id: 1,
          slot: 1,
          firstName: 'Иван',
          lastName: 'Петров',
          gender: 'male',
          dateOfBirth: '1990-05-01',
        },
      ],
    };
  }
  if (event === 'createCharacter') {
    return {
      ok: true,
      character: {
        id: 2,
        slot: 2,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
      },
    };
  }
  if (event === 'selectCharacter') {
    return { ok: true };
  }
  if (event === 'deleteCharacter') {
    return { ok: true };
  }
  if (event === 'close') {
    return { ok: true };
  }
  return { ok: false, error: 'mock-unknown' };
}

export function onNuiMessage(handler) {
  if (!isBrowser) return () => {};
  const listener = (event) => handler(event.data);
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
