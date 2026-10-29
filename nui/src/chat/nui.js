const isBrowser = typeof window !== 'undefined';
const resourceName =
  isBrowser && window.GetParentResourceName
    ? window.GetParentResourceName()
    : 'sync_chat';

export async function nuiFetch(event, data = {}) {
  if (!isBrowser) return { ok: false };
  if (!window.invokeNative) {
    return { ok: true, mock: true };
  }
  const res = await fetch(`https://${resourceName}/${event}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(data ?? {}),
  });
  try {
    return await res.json();
  } catch {
    return { ok: false };
  }
}

export function onNuiMessage(handler) {
  if (!isBrowser) return () => {};
  const listener = (e) => handler(e.data);
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
