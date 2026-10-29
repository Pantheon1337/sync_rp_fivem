import { create } from 'zustand';
import { nuiFetch } from './nui';

export const useSyncStore = create((set, get) => ({
  visible: false,
  view: 'list', // list | create
  characters: [],
  maxSlots: 3,
  loading: false,
  error: null,
  selectedId: null,
  isNewAccount: false,
  mustSelect: false,
  forceCreate: false,

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
    const wasEmpty = get().characters.length === 0;
    const mustSelect = get().mustSelect;
    const res = await nuiFetch('createCharacter', payload);
    if (!res?.ok) {
      set({ loading: false, error: res?.error || 'Ошибка создания' });
      return false;
    }
    const character = res.character;
    await get().refreshList();
    set({
      loading: false,
      view: 'list',
      selectedId: character?.id || null,
      forceCreate: false,
      isNewAccount: false,
    });
    if ((wasEmpty || mustSelect) && character?.id) {
      return get().selectCharacter(character.id);
    }
    return true;
  },

  async selectCharacter(id) {
    set({ loading: true, error: null, selectedId: id });
    const res = await nuiFetch('selectCharacter', { id });
    if (!res?.ok) {
      set({ loading: false, error: res?.error || 'Ошибка выбора' });
      return false;
    }
    set({ loading: false, visible: false, mustSelect: false });
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
