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

  setVisible(visible) {
    set({ visible, error: null, view: 'list' });
  },

  setView(view) {
    set({ view, error: null });
  },

  async refreshList() {
    set({ loading: true, error: null });
    const res = await nuiFetch('listCharacters');
    if (!res?.ok) {
      set({ loading: false, error: res?.error || 'Не удалось загрузить персонажей' });
      return;
    }
    set({
      loading: false,
      characters: res.characters || [],
      maxSlots: res.maxSlots || 3,
    });
  },

  async createCharacter(payload) {
    set({ loading: true, error: null });
    const res = await nuiFetch('createCharacter', payload);
    if (!res?.ok) {
      set({ loading: false, error: res?.error || 'Ошибка создания' });
      return false;
    }
    await get().refreshList();
    set({ loading: false, view: 'list', selectedId: res.character?.id || null });
    return true;
  },

  async selectCharacter(id) {
    set({ loading: true, error: null, selectedId: id });
    const res = await nuiFetch('selectCharacter', { id });
    if (!res?.ok) {
      set({ loading: false, error: res?.error || 'Ошибка выбора' });
      return false;
    }
    set({ loading: false, visible: false });
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
    await nuiFetch('close');
    set({ visible: false });
  },
}));
