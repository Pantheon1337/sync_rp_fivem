import { useCallback, useEffect, useState } from 'react';
import { useSyncStore } from '../store';
import { defaultAppearance, mergeAppearance } from '../appearanceDefaults';
import { APPEARANCE_LIMITS, mergeAppearanceLimits } from '../appearanceLimits';
import { nuiFetch } from '../nui';
import { TilePicker, ColorSwatchGrid, FeatureChips } from './appearance/TilePicker';

const TABS = [
  { id: 'face', label: 'Лицо', icon: '◉' },
  { id: 'hair', label: 'Волосы', icon: '∿' },
  { id: 'top', label: 'Одежда', icon: '▣' },
  { id: 'bottom', label: 'Низ', icon: '▤' },
  { id: 'props', label: 'Аксесс.', icon: '◈' },
];

export function AppearanceEditor() {
  const character = useSyncStore((s) => s.appearanceCharacter);
  const appearance = useSyncStore((s) => s.appearance);
  const setAppearance = useSyncStore((s) => s.setAppearance);
  const saveAppearance = useSyncStore((s) => s.saveAppearance);
  const loading = useSyncStore((s) => s.loading);
  const [tab, setTab] = useState('face');
  const [limits, setLimits] = useState(() => mergeAppearanceLimits(null));

  const refreshLimits = useCallback(async (model) => {
    const res = await nuiFetch('getAppearanceLimits', { model: model || null });
    if (!res?.ok) return;
    setLimits(mergeAppearanceLimits(res.limits || null));
  }, []);

  useEffect(() => {
    if (!appearance?.model) return;
    let cancelled = false;
    (async () => {
      // Apply freemode first, then read native counts (merge never shrinks floors)
      await nuiFetch('previewAppearance', { appearance });
      if (cancelled) return;
      await refreshLimits(appearance.model);
    })();
    return () => {
      cancelled = true;
    };
    // only re-bind when model/gender ped changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appearance?.model, character?.gender, refreshLimits]);

  useEffect(() => {
    if (!appearance) return;
    const t = setTimeout(() => {
      nuiFetch('previewAppearance', { appearance });
    }, 50);
    return () => clearTimeout(t);
  }, [appearance]);

  if (!character || !appearance) {
    return (
      <div className="sync-glass p-6 text-sync-muted">Загрузка редактора внешности…</div>
    );
  }

  function patch(partial) {
    setAppearance(mergeAppearance(appearance, partial));
  }

  function setComponent(id, field, value) {
    const key = String(id);
    const cur = appearance.components[key] || { drawable: 0, texture: 0 };
    const next = { ...cur, [field]: value };
    if (field === 'drawable') next.texture = 0;
    patch({ components: { [key]: next } });
    if (field === 'drawable') {
      // texture count depends on drawable — refresh after preview settles
      setTimeout(() => refreshLimits(appearance.model), 120);
    }
  }

  function setProp(id, field, value) {
    const key = String(id);
    const cur = appearance.props[key] || { drawable: -1, texture: 0 };
    const next = { ...cur, [field]: value };
    if (field === 'drawable') next.texture = 0;
    patch({ props: { [key]: next } });
  }

  function setOverlay(id, field, value) {
    const key = String(id);
    const cur = appearance.overlays[key] || { index: 255, opacity: 1 };
    patch({ overlays: { [key]: { ...cur, [field]: value } } });
  }

  function setFaceFeature(index, value) {
    const next = appearance.faceFeatures.slice();
    next[index] = value;
    patch({ faceFeatures: next });
  }

  function resetDefaults() {
    setAppearance(defaultAppearance(character.gender));
  }

  const compMax = (id) =>
    Math.max(
      0,
      (limits.components?.[String(id)] ?? APPEARANCE_LIMITS.components[String(id)] ?? 40) - 1,
    );
  const propMax = (id) =>
    Math.max(0, (limits.props?.[String(id)] ?? APPEARANCE_LIMITS.props[String(id)] ?? 20) - 1);
  const overlayMax = (id) =>
    (limits.overlays?.[String(id)] ?? APPEARANCE_LIMITS.overlays[String(id)] ?? 20) - 1;
  const texMax = (id) =>
    Math.max(0, (limits.textures?.[String(id)] ?? APPEARANCE_LIMITS.textures[String(id)] ?? 25) - 1);

  return (
    <div className="sync-glass animate-panel-in flex max-h-[82vh] flex-col p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-sync-text">Внешность</h2>
          <p className="mt-1 text-sm text-sync-muted">
            {character.firstName} {character.lastName} — плитки стилей (скриншоты на плитки добавим
            позже). Листайте страницы, если вариантов много.
          </p>
        </div>
        <button type="button" className="sync-btn sync-btn-ghost" onClick={resetDefaults}>
          Сброс
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`sync-btn ${tab === t.id ? 'sync-btn-primary' : 'sync-btn-ghost'}`}
            onClick={() => setTab(t.id)}
          >
            <span className="mr-1.5 opacity-80">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="sync-scroll mt-4 space-y-5 overflow-y-auto pr-2">
        {tab === 'face' && (
          <>
            <TilePicker
              label="Форма лица A"
              icon="◉"
              value={appearance.headBlend.shapeFirst}
              min={0}
              max={(limits.headBlend || 46) - 1}
              onChange={(v) => patch({ headBlend: { shapeFirst: v } })}
            />
            <TilePicker
              label="Форма лица B"
              icon="◉"
              value={appearance.headBlend.shapeSecond}
              min={0}
              max={(limits.headBlend || 46) - 1}
              onChange={(v) => patch({ headBlend: { shapeSecond: v } })}
            />
            <FeatureChips
              label="Смешение форм"
              value={appearance.headBlend.shapeMix * 2 - 1}
              onChange={(v) => patch({ headBlend: { shapeMix: (v + 1) / 2 } })}
            />
            <TilePicker
              label="Тон кожи A"
              icon="●"
              value={appearance.headBlend.skinFirst}
              min={0}
              max={(limits.headBlend || 46) - 1}
              onChange={(v) => patch({ headBlend: { skinFirst: v } })}
            />
            <TilePicker
              label="Тон кожи B"
              icon="●"
              value={appearance.headBlend.skinSecond}
              min={0}
              max={(limits.headBlend || 46) - 1}
              onChange={(v) => patch({ headBlend: { skinSecond: v } })}
            />
            <FeatureChips
              label="Смешение кожи"
              value={appearance.headBlend.skinMix * 2 - 1}
              onChange={(v) => patch({ headBlend: { skinMix: (v + 1) / 2 } })}
            />
            <TilePicker
              label="Цвет глаз"
              icon="◎"
              value={appearance.eyeColor}
              min={0}
              max={(limits.eyeColors || 32) - 1}
              onChange={(v) => patch({ eyeColor: v })}
            />
            <FeatureChips
              label="Нос (ширина)"
              value={appearance.faceFeatures[0]}
              onChange={(v) => setFaceFeature(0, v)}
            />
            <FeatureChips
              label="Скулы"
              value={appearance.faceFeatures[8]}
              onChange={(v) => setFaceFeature(8, v)}
            />
            <FeatureChips
              label="Губы"
              value={appearance.faceFeatures[12]}
              onChange={(v) => setFaceFeature(12, v)}
            />
          </>
        )}

        {tab === 'hair' && (
          <>
            <TilePicker
              label="Причёска"
              icon="∿"
              value={appearance.components['2']?.drawable || 0}
              min={0}
              max={compMax(2)}
              onChange={(v) => setComponent(2, 'drawable', v)}
            />
            <ColorSwatchGrid
              label="Цвет волос"
              value={appearance.hairColor}
              count={limits.hairColors || 64}
              onChange={(v) => patch({ hairColor: v })}
            />
            <ColorSwatchGrid
              label="Мелирование"
              value={appearance.hairHighlight}
              count={limits.hairColors || 64}
              onChange={(v) => patch({ hairHighlight: v })}
            />
            <TilePicker
              label="Брови"
              icon="⌢"
              value={appearance.overlays['2']?.index ?? 255}
              min={0}
              max={overlayMax(2)}
              onChange={(v) => setOverlay(2, 'index', v)}
            />
            <ColorSwatchGrid
              label="Цвет бровей"
              value={appearance.overlays['2']?.color || 0}
              count={64}
              onChange={(v) => setOverlay(2, 'color', v)}
            />
            {character.gender !== 'female' && (
              <>
                <TilePicker
                  label="Борода"
                  icon="≡"
                  value={appearance.overlays['1']?.index ?? 255}
                  min={0}
                  max={overlayMax(1)}
                  onChange={(v) => setOverlay(1, 'index', v)}
                />
                <ColorSwatchGrid
                  label="Цвет бороды"
                  value={appearance.overlays['1']?.color || 0}
                  count={64}
                  onChange={(v) => setOverlay(1, 'color', v)}
                />
              </>
            )}
          </>
        )}

        {tab === 'top' && (
          <>
            <TilePicker
              label="Верх (куртка / футболка)"
              icon="▣"
              value={appearance.components['11']?.drawable || 0}
              min={0}
              max={compMax(11)}
              onChange={(v) => setComponent(11, 'drawable', v)}
            />
            <TilePicker
              label="Текстура верха"
              icon="▦"
              value={appearance.components['11']?.texture || 0}
              min={0}
              max={texMax(11)}
              onChange={(v) => setComponent(11, 'texture', v)}
            />
            <TilePicker
              label="Торс / руки"
              icon="▢"
              value={appearance.components['3']?.drawable || 0}
              min={0}
              max={compMax(3)}
              onChange={(v) => setComponent(3, 'drawable', v)}
            />
            <TilePicker
              label="Майка"
              icon="▥"
              value={appearance.components['8']?.drawable || 0}
              min={0}
              max={compMax(8)}
              onChange={(v) => setComponent(8, 'drawable', v)}
            />
            <TilePicker
              label="Маска"
              icon="◐"
              value={appearance.components['1']?.drawable || 0}
              min={0}
              max={compMax(1)}
              onChange={(v) => setComponent(1, 'drawable', v)}
            />
          </>
        )}

        {tab === 'bottom' && (
          <>
            <TilePicker
              label="Штаны"
              icon="▤"
              value={appearance.components['4']?.drawable || 0}
              min={0}
              max={compMax(4)}
              onChange={(v) => setComponent(4, 'drawable', v)}
            />
            <TilePicker
              label="Текстура штанов"
              icon="▦"
              value={appearance.components['4']?.texture || 0}
              min={0}
              max={texMax(4)}
              onChange={(v) => setComponent(4, 'texture', v)}
            />
            <TilePicker
              label="Обувь"
              icon="▣"
              value={appearance.components['6']?.drawable || 0}
              min={0}
              max={compMax(6)}
              onChange={(v) => setComponent(6, 'drawable', v)}
            />
            <TilePicker
              label="Текстура обуви"
              icon="▦"
              value={appearance.components['6']?.texture || 0}
              min={0}
              max={texMax(6)}
              onChange={(v) => setComponent(6, 'texture', v)}
            />
            <TilePicker
              label="Сумка"
              icon="◈"
              value={appearance.components['5']?.drawable || 0}
              min={0}
              max={compMax(5)}
              onChange={(v) => setComponent(5, 'drawable', v)}
            />
          </>
        )}

        {tab === 'props' && (
          <>
            <TilePicker
              label="Головной убор"
              icon="▲"
              value={appearance.props['0']?.drawable ?? -1}
              min={-1}
              max={propMax(0)}
              emptyLabel="нет"
              onChange={(v) => setProp(0, 'drawable', v)}
            />
            <TilePicker
              label="Очки"
              icon="◎"
              value={appearance.props['1']?.drawable ?? -1}
              min={-1}
              max={propMax(1)}
              emptyLabel="нет"
              onChange={(v) => setProp(1, 'drawable', v)}
            />
            <TilePicker
              label="Серьги"
              icon="◇"
              value={appearance.props['2']?.drawable ?? -1}
              min={-1}
              max={propMax(2)}
              emptyLabel="нет"
              onChange={(v) => setProp(2, 'drawable', v)}
            />
            <TilePicker
              label="Часы"
              icon="◷"
              value={appearance.props['6']?.drawable ?? -1}
              min={-1}
              max={propMax(6)}
              emptyLabel="нет"
              onChange={(v) => setProp(6, 'drawable', v)}
            />
            <TilePicker
              label="Браслет"
              icon="○"
              value={appearance.props['7']?.drawable ?? -1}
              min={-1}
              max={propMax(7)}
              emptyLabel="нет"
              onChange={(v) => setProp(7, 'drawable', v)}
            />
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3 border-t border-[var(--sync-glass-border)] pt-4">
        <button
          type="button"
          className="sync-btn sync-btn-primary"
          disabled={loading}
          onClick={() => saveAppearance()}
        >
          {loading ? 'Сохранение…' : 'Сохранить и войти'}
        </button>
      </div>
    </div>
  );
}
