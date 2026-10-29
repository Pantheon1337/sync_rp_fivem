import { useEffect, useMemo, useState } from 'react';

const PAGE = 30;

/**
 * Visual block grid for drawable/style ids.
 * Optional `thumbs` map: { [id]: imageUrl } — PO will fill later with screenshots.
 */
export function TilePicker({
  label,
  value,
  min = 0,
  max = 20,
  onChange,
  icon = '◆',
  emptyLabel = null,
  thumbs = null,
}) {
  const items = useMemo(() => {
    const list = [];
    const lo = Number(min);
    const hi = Number(max);
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) return list;
    for (let i = lo; i <= hi; i += 1) list.push(i);
    return list;
  }, [min, max]);

  const pages = Math.max(1, Math.ceil(items.length / PAGE));
  const [page, setPage] = useState(0);

  useEffect(() => {
    const idx = Math.max(0, Number(value) - Number(min));
    setPage(Math.min(pages - 1, Math.floor(idx / PAGE)));
  }, [min, max, value, pages]);

  const safePage = Math.min(page, pages - 1);
  const slice = items.slice(safePage * PAGE, safePage * PAGE + PAGE);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-sync-muted">{label}</p>
        <p className="font-mono text-xs text-sync-subtle">
          выбрано {value}
          <span className="text-sync-subtle/80"> · всего {items.length}</span>
        </p>
      </div>
      <div className="sync-scroll grid max-h-56 grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-6">
        {slice.map((n) => {
          const selected = Number(value) === n;
          const isEmpty = emptyLabel != null && n < 0;
          const thumb = thumbs && (thumbs[n] || thumbs[String(n)]);
          return (
            <button
              key={n}
              type="button"
              title={isEmpty ? emptyLabel : `Стиль ${n}`}
              onClick={() => onChange(n)}
              className={`group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-[var(--sync-radius-md)] border transition ${
                selected
                  ? 'border-sync-accent bg-sync-accent/20 shadow-[0_0_0_1px_rgba(59,130,246,0.45)]'
                  : 'border-[var(--sync-glass-border)] bg-[var(--sync-bg-elevated)] hover:border-sync-accent/50 hover:bg-sync-accent/10'
              }`}
            >
              {thumb ? (
                <img
                  src={thumb}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-90"
                  draggable={false}
                />
              ) : (
                <span
                  className={`text-lg leading-none ${selected ? 'text-sync-accent' : 'text-sync-subtle group-hover:text-sync-muted'}`}
                  aria-hidden
                >
                  {isEmpty ? '✕' : icon}
                </span>
              )}
              <span
                className={`relative z-[1] mt-1 rounded bg-black/45 px-1 font-mono text-[10px] ${
                  selected ? 'text-sync-text' : 'text-sync-subtle'
                }`}
              >
                {isEmpty ? 'нет' : n}
              </span>
            </button>
          );
        })}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between gap-2 text-xs text-sync-muted">
          <button
            type="button"
            className="sync-btn sync-btn-ghost px-2 py-1 text-xs"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ← Назад
          </button>
          <span className="font-mono">
            стр. {safePage + 1}/{pages}
          </span>
          <button
            type="button"
            className="sync-btn sync-btn-ghost px-2 py-1 text-xs"
            disabled={safePage >= pages - 1}
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
          >
            Далее →
          </button>
        </div>
      )}
    </div>
  );
}

export function ColorSwatchGrid({ label, value, count = 64, onChange, colors }) {
  const palette = colors || defaultHairPalette(count);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-sync-muted">{label}</p>
        <p className="font-mono text-xs text-sync-subtle">
          #{value} · {palette.length} цветов
        </p>
      </div>
      <div className="sync-scroll grid max-h-40 grid-cols-8 gap-1.5 overflow-y-auto pr-1">
        {palette.map((hex, i) => {
          const selected = Number(value) === i;
          return (
            <button
              key={i}
              type="button"
              title={`Цвет ${i}`}
              onClick={() => onChange(i)}
              className={`aspect-square rounded-md border-2 transition ${
                selected ? 'border-sync-accent scale-105' : 'border-transparent hover:border-white/30'
              }`}
              style={{ background: hex }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function FeatureChips({ label, value, onChange }) {
  const steps = [-1, -0.5, 0, 0.5, 1];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-sync-muted">{label}</p>
        <p className="font-mono text-xs text-sync-subtle">{Number(value).toFixed(1)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {steps.map((s) => {
          const selected = Math.abs(Number(value) - s) < 0.05;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className={`min-w-[3rem] rounded-[var(--sync-radius-md)] border px-3 py-2 font-mono text-xs transition ${
                selected
                  ? 'border-sync-accent bg-sync-accent/20 text-sync-text'
                  : 'border-[var(--sync-glass-border)] bg-[var(--sync-bg-elevated)] text-sync-muted hover:border-sync-accent/40'
              }`}
            >
              {s > 0 ? `+${s}` : s}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function defaultHairPalette(count) {
  const base = [
    '#1a1a1a', '#2b1d14', '#4a2f1b', '#6b3e1f', '#8b5a2b', '#a67c52', '#c4a574',
    '#d4b896', '#e8d5b7', '#f5e6d3', '#ffffff', '#c0c0c0', '#8a8a8a', '#5c5c5c',
    '#3d2314', '#5c3317', '#7a4a1e', '#9c6b3c', '#b8860b', '#daa520', '#ffd700',
    '#f4a460', '#cd853f', '#d2691e', '#8b4513', '#a0522d', '#6b4423', '#3b2f2f',
    '#2f4f4f', '#556b2f', '#6b8e23', '#808000', '#b22222', '#8b0000', '#a52a2a',
    '#dc143c', '#ff4500', '#ff6347', '#ff69b4', '#c71585', '#9400d3', '#4b0082',
    '#000080', '#191970', '#4169e1', '#1e90ff', '#00ced1', '#20b2aa', '#2e8b57',
    '#228b22', '#006400', '#ff1493', '#db7093', '#dda0dd', '#9370db', '#7b68ee',
    '#00fa9a', '#7fff00', '#adff2f', '#ffff00', '#ff8c00', '#ff7f50', '#fa8072',
  ];
  const out = [];
  for (let i = 0; i < count; i += 1) out.push(base[i % base.length]);
  return out;
}
