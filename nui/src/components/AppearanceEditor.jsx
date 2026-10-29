import { useEffect, useState } from 'react';
import { useSyncStore } from '../store';
import { defaultAppearance, mergeAppearance } from '../appearanceDefaults';
import { nuiFetch } from '../nui';

const TABS = [
  { id: 'face', label: 'Лицо' },
  { id: 'hair', label: 'Волосы' },
  { id: 'top', label: 'Одежда' },
  { id: 'bottom', label: 'Низ / обувь' },
  { id: 'props', label: 'Аксессуары' },
];

function Stepper({ label, value, min, max, step = 1, onChange }) {
  return (
    <label className="block text-sm text-sync-muted">
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className="font-mono text-xs text-sync-subtle">{value}</span>
      </span>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          className="sync-btn sync-btn-ghost px-3 py-1"
          onClick={() => onChange(Math.max(min, Number(value) - step))}
        >
          −
        </button>
        <input
          className="w-full"
          style={{ accentColor: '#3b82f6' }}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <button
          type="button"
          className="sync-btn sync-btn-ghost px-3 py-1"
          onClick={() => onChange(Math.min(max, Number(value) + step))}
        >
          +
        </button>
      </div>
    </label>
  );
}

export function AppearanceEditor() {
  const character = useSyncStore((s) => s.appearanceCharacter);
  const appearance = useSyncStore((s) => s.appearance);
  const setAppearance = useSyncStore((s) => s.setAppearance);
  const saveAppearance = useSyncStore((s) => s.saveAppearance);
  const loading = useSyncStore((s) => s.loading);
  const [tab, setTab] = useState('face');

  useEffect(() => {
    if (!appearance) return;
    const t = setTimeout(() => {
      nuiFetch('previewAppearance', { appearance });
    }, 80);
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
    patch({
      components: {
        [key]: { ...cur, [field]: value },
      },
    });
  }

  function setProp(id, field, value) {
    const key = String(id);
    const cur = appearance.props[key] || { drawable: -1, texture: 0 };
    patch({
      props: {
        [key]: { ...cur, [field]: value },
      },
    });
  }

  function setOverlay(id, field, value) {
    const key = String(id);
    const cur = appearance.overlays[key] || { index: 255, opacity: 1 };
    patch({
      overlays: {
        [key]: { ...cur, [field]: value },
      },
    });
  }

  function setFaceFeature(index, value) {
    const next = appearance.faceFeatures.slice();
    next[index] = value;
    patch({ faceFeatures: next });
  }

  function resetDefaults() {
    setAppearance(defaultAppearance(character.gender));
  }

  return (
    <div className="sync-glass animate-panel-in flex max-h-[78vh] flex-col p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-sync-text">Внешность</h2>
          <p className="mt-1 text-sm text-sync-muted">
            {character.firstName} {character.lastName} — настройте вид, затем войдите в город.
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
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4 overflow-y-auto pr-1">
        {tab === 'face' && (
          <>
            <Stepper
              label="Форма лица A"
              value={appearance.headBlend.shapeFirst}
              min={0}
              max={45}
              onChange={(v) => patch({ headBlend: { shapeFirst: v } })}
            />
            <Stepper
              label="Форма лица B"
              value={appearance.headBlend.shapeSecond}
              min={0}
              max={45}
              onChange={(v) => patch({ headBlend: { shapeSecond: v } })}
            />
            <Stepper
              label="Смешение форм"
              value={appearance.headBlend.shapeMix}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => patch({ headBlend: { shapeMix: v } })}
            />
            <Stepper
              label="Тон кожи A"
              value={appearance.headBlend.skinFirst}
              min={0}
              max={45}
              onChange={(v) => patch({ headBlend: { skinFirst: v } })}
            />
            <Stepper
              label="Тон кожи B"
              value={appearance.headBlend.skinSecond}
              min={0}
              max={45}
              onChange={(v) => patch({ headBlend: { skinSecond: v } })}
            />
            <Stepper
              label="Смешение кожи"
              value={appearance.headBlend.skinMix}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => patch({ headBlend: { skinMix: v } })}
            />
            <Stepper
              label="Цвет глаз"
              value={appearance.eyeColor}
              min={0}
              max={31}
              onChange={(v) => patch({ eyeColor: v })}
            />
            <Stepper
              label="Нос (ширина)"
              value={appearance.faceFeatures[0]}
              min={-1}
              max={1}
              step={0.1}
              onChange={(v) => setFaceFeature(0, v)}
            />
            <Stepper
              label="Скулы"
              value={appearance.faceFeatures[8]}
              min={-1}
              max={1}
              step={0.1}
              onChange={(v) => setFaceFeature(8, v)}
            />
            <Stepper
              label="Губы"
              value={appearance.faceFeatures[12]}
              min={-1}
              max={1}
              step={0.1}
              onChange={(v) => setFaceFeature(12, v)}
            />
          </>
        )}

        {tab === 'hair' && (
          <>
            <Stepper
              label="Причёска"
              value={appearance.components['2']?.drawable || 0}
              min={0}
              max={80}
              onChange={(v) => setComponent(2, 'drawable', v)}
            />
            <Stepper
              label="Цвет волос"
              value={appearance.hairColor}
              min={0}
              max={63}
              onChange={(v) => patch({ hairColor: v })}
            />
            <Stepper
              label="Мелирование"
              value={appearance.hairHighlight}
              min={0}
              max={63}
              onChange={(v) => patch({ hairHighlight: v })}
            />
            <Stepper
              label="Брови"
              value={appearance.overlays['2']?.index ?? 255}
              min={0}
              max={33}
              onChange={(v) => setOverlay(2, 'index', v)}
            />
            <Stepper
              label="Цвет бровей"
              value={appearance.overlays['2']?.color || 0}
              min={0}
              max={63}
              onChange={(v) => setOverlay(2, 'color', v)}
            />
            {character.gender !== 'female' && (
              <>
                <Stepper
                  label="Борода"
                  value={appearance.overlays['1']?.index ?? 255}
                  min={0}
                  max={28}
                  onChange={(v) => setOverlay(1, 'index', v)}
                />
                <Stepper
                  label="Цвет бороды"
                  value={appearance.overlays['1']?.color || 0}
                  min={0}
                  max={63}
                  onChange={(v) => setOverlay(1, 'color', v)}
                />
              </>
            )}
          </>
        )}

        {tab === 'top' && (
          <>
            <Stepper
              label="Верх (куртка / футболка)"
              value={appearance.components['11']?.drawable || 0}
              min={0}
              max={400}
              onChange={(v) => setComponent(11, 'drawable', v)}
            />
            <Stepper
              label="Текстура верха"
              value={appearance.components['11']?.texture || 0}
              min={0}
              max={40}
              onChange={(v) => setComponent(11, 'texture', v)}
            />
            <Stepper
              label="Торс / руки"
              value={appearance.components['3']?.drawable || 0}
              min={0}
              max={200}
              onChange={(v) => setComponent(3, 'drawable', v)}
            />
            <Stepper
              label="Майка / undershirt"
              value={appearance.components['8']?.drawable || 0}
              min={0}
              max={200}
              onChange={(v) => setComponent(8, 'drawable', v)}
            />
            <Stepper
              label="Маска"
              value={appearance.components['1']?.drawable || 0}
              min={0}
              max={200}
              onChange={(v) => setComponent(1, 'drawable', v)}
            />
          </>
        )}

        {tab === 'bottom' && (
          <>
            <Stepper
              label="Штаны"
              value={appearance.components['4']?.drawable || 0}
              min={0}
              max={200}
              onChange={(v) => setComponent(4, 'drawable', v)}
            />
            <Stepper
              label="Текстура штанов"
              value={appearance.components['4']?.texture || 0}
              min={0}
              max={40}
              onChange={(v) => setComponent(4, 'texture', v)}
            />
            <Stepper
              label="Обувь"
              value={appearance.components['6']?.drawable || 0}
              min={0}
              max={120}
              onChange={(v) => setComponent(6, 'drawable', v)}
            />
            <Stepper
              label="Текстура обуви"
              value={appearance.components['6']?.texture || 0}
              min={0}
              max={40}
              onChange={(v) => setComponent(6, 'texture', v)}
            />
            <Stepper
              label="Сумка / парашют"
              value={appearance.components['5']?.drawable || 0}
              min={0}
              max={100}
              onChange={(v) => setComponent(5, 'drawable', v)}
            />
          </>
        )}

        {tab === 'props' && (
          <>
            <Stepper
              label="Головной убор (−1 = нет)"
              value={appearance.props['0']?.drawable ?? -1}
              min={-1}
              max={180}
              onChange={(v) => setProp(0, 'drawable', v)}
            />
            <Stepper
              label="Очки (−1 = нет)"
              value={appearance.props['1']?.drawable ?? -1}
              min={-1}
              max={40}
              onChange={(v) => setProp(1, 'drawable', v)}
            />
            <Stepper
              label="Серьги (−1 = нет)"
              value={appearance.props['2']?.drawable ?? -1}
              min={-1}
              max={40}
              onChange={(v) => setProp(2, 'drawable', v)}
            />
            <Stepper
              label="Часы (−1 = нет)"
              value={appearance.props['6']?.drawable ?? -1}
              min={-1}
              max={40}
              onChange={(v) => setProp(6, 'drawable', v)}
            />
            <Stepper
              label="Браслет (−1 = нет)"
              value={appearance.props['7']?.drawable ?? -1}
              min={-1}
              max={20}
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
