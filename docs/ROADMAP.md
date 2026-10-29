# SyncRP Roadmap — Stages 0–18

PO: Pantheon Ai. Следующий этап не стартует без подтверждения DoD текущего.

## Dependency graph (упрощённо)

```
0 Architecture
 └─ 1 SyncCore + DB + Identity + Sessions
      └─ 2 Characters + Spawn
           └─ 3 NUI shell + RU locale ✓
                ├─ 4 Economy + ledger + HUD/Bank UI   ← сейчас
                │    ├─ 5 Inventory
                │    ├─ 8 Jobs (needs economy)
                │    ├─ 16 Banks extended (cards, ATM, fees)
                │    ├─ 17 Businesses
                │    └─ 12 Housing / Real estate
                └─ 6 Vehicles + RU plates
                     └─ 7 Garages
                          └─ 9 Admin + bans + audit
                               └─ 10 World / doors / interact
                                    └─ 11 Phone / apps skeleton
                                         └─ 13 Crime / MDT lite
                                              └─ 14 Performance + hardening
                                                   └─ 15 Launch readiness
                                                        └─ 18 Content polish
```

---

## Stage 0 — Planning & architecture

**DoD:** docs + skeleton + PO approve → ✓

---

## Stage 1 — SyncCore runtime foundation

**DoD:** account+session в БД → ✓

---

## Stage 2 — Characters & spawn

**DoD:** create/select/soft-delete + spawn → ✓

---

## Stage 3 — NUI shell ✓ _(PO: базовый функционал достаточен; полировка создания персонажа — позже)_

**Scope:** React NUI, регистрация/вход, appearance tiles, chat overlay, position save.  
**Детали:** [SPRINT3.md](./SPRINT3.md).

---

## Stage 4 — Economy + visuals _(in progress)_

**Depends:** Stage 3.  
**Scope:**

- `sync_economy` — `economy_accounts` + `economy_ledger`; credit/debit/transfer; idempotency
- Деньги: **BIGINT целые рубли (₽)**
- Seed балансов из `characters.cash/bank`
- `sync_hud` — варианты: классический (RP), минималистичный, серверный (макеты PO)
- `sync_bank` — NUI банк: Счета / Перевод / История (макет PO)

**DoD:** нельзя задюпать повторным event; audit ledger; HUD виден после спавна; bank deposit/withdraw; unit tests.  
**Детали:** [SPRINT4.md](./SPRINT4.md).

**Референсы UI:** макеты HUD/банк в store `media/mockups/` (и вложения PO). Чужие закрытые ресурсы не копируем; смотрим паттерны (ledger, ATM flow, property deeds) как идеи, код — свой SyncCore.

---

## Stage 5 — Inventory foundation

**Depends:** Stage 4.  
**Scope:** item defs, stacks, give/move server API.  
**DoD:** no client trust; weight/slot rules + unit tests.

---

## Stage 6 — Vehicles & Russian plates

**Depends:** Stage 2 (+ economy если покупка).  
**Scope:** `sync_vehicles`; plate generator RU; persist props.  
**DoD:** unique plate; spawn/despawn owned vehicle.

---

## Stage 7 — Garages

**Depends:** Stage 6.  
**Scope:** store/retrieve.  
**DoD:** no store-dupe.

---

## Stage 8 — Jobs framework

**Depends:** Stage 4.  
**Scope:** grades, duty, payday via economy.  
**DoD:** payday idempotent; job change audited.

---

## Stage 9 — Admin

**Depends:** Stage 1+ (practically 4+).  
**Scope:** bans; audit; ACE; money/item give only through domain exports + ledger.

---

## Stage 10 — World interaction

**Depends:** Stage 3.  
**Scope:** doors, zones, interact prompts (server-validated).

---

## Stage 11 — Phone skeleton

**Depends:** Stage 3, 4.  
**Scope:** phone NUI shell, 1–2 apps with real routing.

---

## Stage 12 — Housing / Real estate

**Depends:** Stage 4, 7, 10.  
**Scope:**

- Собственность (дом/квартира), ключи, stash → inventory
- Покупка/продажа через economy ledger
- Интерьер / вход (world interact)
- Налог/коммуналка — later spike

**DoD:** ownership checks server-side; нельзя войти чужим без ключа/ордера.  
**Референс-идеи:** deed + key item, garage link, furniture stub — без клона чужих ассетов/логики.

---

## Stage 13 — Crime / MDT lite

**Depends:** Stage 9, 8.  
**Scope:** records, warrants lite.  
**DoD:** RBAC на просмотр.

---

## Stage 14 — Performance & hardening

**Depends:** core domains present.  
**Scope:** profiling, indexes, rate limits, backups.

---

## Stage 15 — Launch readiness

**Depends:** PO feature freeze.  
**DoD:** PO sign-off production.

---

## Stage 16 — Banks extended

**Depends:** Stage 4 (базовый банк уже в Stage 4).  
**Scope:**

- **Постоянный номер счёта** при открытии/первом визите в банк (сейчас в UI stub `**** ----`, не рандом) — хранить в БД, показывать маску `**** 2847`
- ATM точки в мире (interact)
- Карты / комиссии / лимиты снятия / P2P-переводы
- Вклады / сейфы (optional)

**DoD:** номер счёта уникален и стабилен; все движения только через ledger; ATM exploit covered.

---

## Stage 17 — Businesses

**Depends:** Stage 4, 8, 10 (+ 5 inventory для товара).  
**Scope:**

- Типы бизнесов (магазин, автосалон, …) — конфиг + БД
- Счёт типа `business` в economy
- Наём / касса / поставки
- Покупка бизнеса за ₽ с ledger

**DoD:** касса не дюпается; права владельца/сотрудника server-side.  
**Референс-идеи:** boss menu, society account — реализуем на SyncCore, не QB/ESX society.

---

## Stage 18 — Content polish

**Depends:** PO.  
**Scope:** полировка создания персонажа, дополнительные HUD-виджеты (задания/кейсы из макета — только после дизайна экономики наград), локализации, QoL.

---

## Вне скоупа любого этапа без PO

- Смена foundation на QB/ESX/Qbox
- TypeScript runtime без approve
- Полный клон механик Majestic/GTA5RP / чужих закрытых ресурсов
- Копирование ассетов/NUI из платных паков
