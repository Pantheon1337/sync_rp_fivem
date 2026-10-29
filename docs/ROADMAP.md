# SyncRP Roadmap — Stages 0–15

PO: Pantheon Ai. Следующий этап не стартует без подтверждения DoD текущего (для Stage 0 — review этого PR).

## Dependency graph (упрощённо)

```
0 Architecture
 └─ 1 SyncCore + DB + Identity + Sessions
      └─ 2 Characters + Spawn
           └─ 3 NUI shell + RU locale
                ├─ 4 Economy + ledger
                │    ├─ 5 Inventory
                │    └─ 8 Jobs (needs economy)
                └─ 6 Vehicles + RU plates
                     └─ 7 Garages
                          └─ 9 Admin + bans + audit
                               └─ 10 World / doors / interact
                                    └─ 11 Phone / apps skeleton
                                         └─ 12 Housing
                                              └─ 13 Crime / MDT lite
                                                   └─ 14 Performance + hardening
                                                        └─ 15 Launch readiness
```

---

## Stage 0 — Planning & architecture _(этот этап)_

**Deliverables:** docs, Cursor rules, repo skeleton, docker MariaDB stub, Sprint 1 plan.  
**DoD:**

- [x] README, AGENTS, ARCHITECTURE, DATABASE, MODULE_CONTRACTS, SECURITY, ROADMAP, TESTING, UI_DESIGN_SYSTEM, SPRINT1
- [x] `.cursor/rules/` для SyncCore
- [x] Skeleton folders + minimal CI/docker
- [x] PO подтвердил архитектуру → Stage 1

**Не входит:** runtime SyncCore, gameplay.

---

## Stage 1 — SyncCore runtime foundation

**Depends:** Stage 0 approved.  
**Scope:** `sync_core`, `sync_db`, `sync_identity`, `sync_sessions`; migrations 001; connect/disconnect lifecycle; Vitest на pure helpers.  
**DoD:** игрок коннектится → account+session в БД; disconnect закрывает session; lint/unit green; FXServer smoke **если** доступен (иначе честный skip в отчёте).  
**Детали:** [SPRINT1.md](./SPRINT1.md).

---

## Stage 2 — Characters & spawn _(in progress)_

**Depends:** Stage 1 (FX F1–F3 OK).  
**Scope:** `sync_characters`, `sync_spawn`; character select flow; slot limits; chat UX до Stage 3 NUI.  
**DoD:** create/select/soft-delete; `sync_core.requireCharacter`; миграция 002; PO smoke.  
**Детали:** [SPRINT2.md](./SPRINT2.md).

---

## Stage 3 — NUI shell

**Depends:** Stage 2.  
**Scope:** React+Vite+Tailwind+Zustand в `nui/`; `sync_nui`; RU strings; design tokens из UI_DESIGN_SYSTEM.  
**DoD:** character UI через NUI; Playwright smoke на static build; тема dark glass + blue.

---

## Stage 4 — Economy

**Depends:** Stage 3 (UI optional для API-first, но UX желателен).  
**Scope:** `sync_economy`; ledger; миграция балансов; idempotent transfer.  
**DoD:** нельзя задюпать повторным event; audit ledger rows; server authority tests.

---

## Stage 5 — Inventory foundation

**Depends:** Stage 4.  
**Scope:** item defs, stacks, give/move server API.  
**DoD:** no client trust; weight/slot rules documented + tested unit-level.

---

## Stage 6 — Vehicles & Russian plates

**Depends:** Stage 2 (+ economy если покупка).  
**Scope:** `sync_vehicles`; plate generator RU; persist props.  
**DoD:** allocate unique plate; spawn/despawn owned vehicle; DB stubs → real DDL.

---

## Stage 7 — Garages

**Depends:** Stage 6.  
**Scope:** `sync_garages`; store/retrieve.  
**DoD:** vehicle state consistent stored/out; exploit store-dupe covered.

---

## Stage 8 — Jobs framework

**Depends:** Stage 4.  
**Scope:** job grades, duty, payday via economy.  
**DoD:** payday idempotent; job change audited.

---

## Stage 9 — Admin

**Depends:** Stage 1+ (practically 4+).  
**Scope:** `sync_admin`; bans; audit log; ACE bridge.  
**DoD:** money/item give only through domain exports + audit.

---

## Stage 10 — World interaction

**Depends:** Stage 3.  
**Scope:** doors, zones, interact prompts (server-validated).  
**DoD:** unauthorized open rejected.

---

## Stage 11 — Phone skeleton

**Depends:** Stage 3, 4.  
**Scope:** phone NUI shell, 1–2 apps stub with real routing.  
**DoD:** не stub-as-done; apps помечены scope.

---

## Stage 12 — Housing

**Depends:** Stage 4, 7, 10.  
**Scope:** property ownership, stash link inventory.  
**DoD:** ownership checks server-side.

---

## Stage 13 — Crime / MDT lite

**Depends:** Stage 9, 8.  
**Scope:** records, warrants lite — без копирования чужих закрытых MDT.  
**DoD:** RBAC на просмотр.

---

## Stage 14 — Performance & hardening

**Depends:** core domains present.  
**Scope:** profiling, index review, rate limits, backup runbooks.  
**DoD:** documented budgets; no critical dupe CVEs open.

---

## Stage 15 — Launch readiness

**Depends:** PO feature freeze.  
**Scope:** checklist, ops docs, monitoring hooks, legal/license keys process (out of repo).  
**DoD:** PO sign-off production.

---

## Вне скоупа любого этапа без PO

- Смена foundation на QB/ESX/Qbox
- TypeScript runtime без approve
- Полный клон механик Majestic/GTA5RP
