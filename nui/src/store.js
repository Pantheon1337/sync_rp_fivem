import { create } from 'zustand';
import { nuiFetch } from './nui';
import { defaultAppearance, mergeAppearance } from './appearanceDefaults';

export const useSyncStore = create((set, get) => ({
  visible: false,
  view: 'list', // list | create | appearance
  characters: [],
  maxSlots: 3,
  loading: false,
  error: null,
  selectedId: null,
  isNewAccount: false,
  mustSelect: false,
  forceCreate: false,
  appearanceCharacter: null,
  appearance: null,

  openShell({ isNewAccount = false, mustSelect = false, forceCreate = false } = {}) {
    set({
      visible: true,
      error: null,
      isNewAccount,
      mustSelect,
      forceCreate,
      view: forceCreate || isNewAccount ? 'create' : 'list',
    });
  },

  openAppearance(character, appearance) {
    const base = defaultAppearance(character?.gender);
    set({
      visible: true,
      mustSelect: true,
      view: 'appearance',
      appearanceCharacter: character,
      appearance: mergeAppearance(base, appearance || {}),
      error: null,
      forceCreate: false,
      isNewAccount: false,
    });
  },

  setAppearance(appearance) {
    set({ appearance });
  },

  setVisible(visible) {
    set({ visible, error: null, view: 'list' });
  },

  setView(view) {
    const { forceCreate, characters } = get();
    if (view === 'list' && forceCreate && characters.length === 0) {
      return;
    }
    set({ view, error: null });
  },

  async refreshList() {
    set({ loading: true, error: null });
    const res = await nuiFetch('listCharacters');
    if (!res?.ok) {
      set({ loading: false, error: res?.error || 'Не удалось загрузить персонажей' });
      return;
    }
    const characters = res.characters || [];
    const empty = characters.length === 0;
    const prev = get();
    if (prev.view === 'appearance') {
      set({
        loading: false,
        characters,
        maxSlots: res.maxSlots || 3,
      });
      return;
    }
    const isNewAccount = !!(res.isNewAccount || empty || prev.isNewAccount);
    const forceCreate = empty && (prev.forceCreate || isNewAccount || prev.mustSelect);
    let view = prev.view;
    if (empty) {
      view = 'create';
    } else if (prev.forceCreate && !empty) {
      view = 'list';
    }
    set({
      loading: false,
      characters,
      maxSlots: res.maxSlots || 3,
      isNewAccount: empty ? isNewAccount : false,
      forceCreate: empty ? forceCreate : false,
      view,
    });
  },

  async createCharacter(payload) {
    set({ loading: true, error: null });
    const res = await nuiFetch('createCharacter', payload);
    if (!res?.ok) {
      const raw = String(res?.error || '').trim();
      const useless = !raw || raw === 'error' || raw === '[object Object]' || raw === 'empty';
      set({
        loading: false,
        error: useless
          ? 'Не удалось создать персонажа. В консоли FX ищите строку [sync_characters] create failed'
          : raw,
      });
      return false;
    }
    const character = res.character;
    if (!character?.id) {
      set({ loading: false, error: 'Сервер не вернул персонажа' });
      return false;
    }
    // Open appearance first so refreshList cannot yank view back to list/create.
    get().openAppearance(character, character.appearance || null);
    set({ loading: false, selectedId: character.id, forceCreate: false, isNewAccount: false });
    try {
      await get().refreshList();
    } catch {
      /* list refresh is best-effort after create */
    }
    // Keep appearance view even if list refresh tried to change it.
    if (get().view !== 'appearance') {
      get().openAppearance(character, character.appearance || null);
    }
    return true;
  },

  async selectCharacter(id) {
    set({ loading: true, error: null, selectedId: id });
    const res = await nuiFetch('selectCharacter', { id });
    if (res?.needsAppearance && res.character) {
      set({ loading: false });
      get().openAppearance(res.character, res.character.appearance);
      return false;
    }
    if (!res?.ok) {
      set({ loading: false, error: res?.error || 'Ошибка выбора' });
      return false;
    }
    set({
      loading: false,
      visible: false,
      mustSelect: false,
      view: 'list',
      appearanceCharacter: null,
      appearance: null,
    });
    return true;
  },

  async saveAppearance() {
    const { appearanceCharacter, appearance } = get();
    if (!appearanceCharacter?.id || !appearance) {
      set({ error: 'Нет данных внешности' });
      return false;
    }
    set({ loading: true, error: null });
    const res = await nuiFetch('saveAppearance', {
      characterId: appearanceCharacter.id,
      appearance,
    });
    if (!res?.ok) {
      set({ loading: false, error: res?.error || 'Ошибка сохранения внешности' });
      return false;
    }
    set({
      loading: false,
      visible: false,
      mustSelect: false,
      view: 'list',
      appearanceCharacter: null,
      appearance: null,
    });
    return true;
  },

  async deleteCharacter(id) {
    set({ loading: true, error: null });
    const res = await nuiFetch('deleteCharacter', { id });
    if (!res?.ok) {
      set({ loading: false, error: res?.error || 'Ошибка удаления' });
      return false;
    }
    await get().refreshList();
    set({ loading: false });
    return true;
  },

  async close() {
    if (get().mustSelect) {
      set({ error: 'Сначала выберите или создайте персонажа' });
      return false;
    }
    await nuiFetch('close');
    set({ visible: false });
    return true;
  },
}));
