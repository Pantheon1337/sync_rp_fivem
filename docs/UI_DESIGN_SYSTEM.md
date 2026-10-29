# SyncRP UI Design System (NUI)

Статус: **Stage 4** — токены в `nui/`; surfaces: characters (`sync_nui`), chat (`sync_chat`), HUD (`sync_hud`), bank (`sync_bank`).

Русский язык — **default** для всего UI.

## Визуальное направление

**Dark glass + синие акценты.** Атмосфера ночного коммерческого RP-клиента: глубина, стекло, холодный свет.

### Запрещённые AI-дефолты

- Purple-on-white / purple→indigo градиентные темы
- Warm cream фон (~`#F4F1EA`) + terracotta + serif «broadsheet»
- Неон-glow ради glow, emoji-иконки как основа UI
- Карточки в hero ради декора

## Палитра (CSS variables)

```css
:root {
  /* Surfaces */
  --sync-bg-deep: #070b12;
  --sync-bg: #0c121c;
  --sync-bg-elevated: #121a27;
  --sync-glass: rgba(16, 24, 40, 0.72);
  --sync-glass-border: rgba(148, 175, 220, 0.18);

  /* Text */
  --sync-text: #e8eef8;
  --sync-text-muted: #8b9bb3;
  --sync-text-subtle: #5c6b82;

  /* Brand accents — blue family only */
  --sync-accent: #3b82f6;
  --sync-accent-hover: #60a5fa;
  --sync-accent-pressed: #2563eb;
  --sync-accent-soft: rgba(59, 130, 246, 0.16);
  --sync-accent-glow: rgba(59, 130, 246, 0.35);

  /* Semantic */
  --sync-success: #34d399;
  --sync-warning: #fbbf24;
  --sync-danger: #f87171;
  --sync-info: #38bdf8;

  /* Radius & blur */
  --sync-radius-sm: 6px;
  --sync-radius-md: 10px;
  --sync-radius-lg: 16px;
  --sync-blur: 16px;

  /* Motion */
  --sync-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --sync-dur-fast: 120ms;
  --sync-dur: 220ms;
}
```

Фон: не плоский один цвет — лёгкий radial/gradient от `--sync-bg-deep` к `--sync-bg` + glass panels. Допустимы subtle noise/grid opacity ≤ 4%.

## Типографика

Не использовать Inter / Roboto / Arial / system-only как единственный голос бренда.

Рекомендация Stage 3 (через Google Fonts или self-host, лицензия OK):

| Роль               | Стек                                   |
| ------------------ | -------------------------------------- |
| Display / brand    | `Manrope` или `Golos Text` (кириллица) |
| UI body            | `Golose Text` / `Manrope` 400–600      |
| Mono (IDs, plates) | `JetBrains Mono`                       |

Размеры: body 14–16px; title 20–28px; brand mark в shell не меньше primary headline соседнего блока.

## Glass panel rules

```css
.sync-glass {
  background: var(--sync-glass);
  border: 1px solid var(--sync-glass-border);
  backdrop-filter: blur(var(--sync-blur));
  border-radius: var(--sync-radius-lg);
}
```

Карточки — только как контейнер взаимодействия (формы, списки слотов персонажа). Не оборачивать каждый абзац в card.

## Компоненты (контракт Stage 3)

| Компонент        | Поведение                                          |
| ---------------- | -------------------------------------------------- |
| `Button primary` | accent fill, hover lighten, focus ring accent-soft |
| `Button ghost`   | transparent + border glass                         |
| `Input`          | dark elevated, focus accent border                 |
| `Modal`          | glass, dim overlay 60% deep bg                     |
| `Toast`          | semantic color bar left                            |

Состояния disabled: opacity 0.45, cursor not-allowed.  
Ошибки — текстом под полем на русском.

## NUI technical rules

- Stack: React + Vite + Tailwind + Zustand (`nui/`).
- Tailwind theme extends CSS variables выше; не плодить произвольные hex в JSX.
- Сообщения NUI → server через resource bridge; никаких секретов в бандле.
- Motion: 2–3 осознанных перехода (shell mount fade, panel slide, button press) — не конфетти.
- Адаптив: NUI часто фиксированный safe area; закладывать scale 0.85–1.0 под разные разрешения.
- a11y: focus visible, contrast text/muted ≥ читаемый на dark glass.

## Brand test

Если убрать логотип SyncRP с первого экрана NUI-shell и экран «может быть любым RP UI» без синего glass-языка — branding слишком слабый. Brand mark + accent должны читаться сразу.

## Контент

- Все user-facing строки: русский primary; i18n ключи с Stage 3 (`ru` default).
- Термины: «персонаж», «счёт», «номер» (plates), не смеси англ. сленга без нужды.
