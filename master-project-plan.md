# Master Project Plan: Architecture-Aware UI & UX Optimization

## 1. Architecture & Schema (from System Architect)

### Executive objective
Perform a full UI/UX optimization across `admin`, `staff`, and `patient` while preserving FSD-lite boundaries and shifting to a server-first App Router model.

### Current architecture diagnosis
- Route entry points in `src/app/*` are inconsistent in server orchestration depth.
- `src/app/staff/dashboard/page.tsx` is currently thin and delegates almost all work to a client component.
- Shared primitives exist (`src/shared/ui/button.tsx`, `src/shared/ui/card.tsx`, `src/shared/ui/input.tsx`) but are too minimal and stylistically fragmented.
- Domain UI logic is mostly in `src/features/*` as expected, but reusable visual patterns (status badges, stat cards, loading/empty states) are duplicated.

### Structural audit: promotion targets
Promote to `src/shared/ui/*`:
- `StatusBadge` pattern reused in staff/admin status displays.
- `StatCard` KPI tile pattern.
- `EmptyState`, `LoadingState`, `Skeleton`, and `AsyncState` wrappers.
- `Field` and `FormFeedback` wrappers for consistent form semantics.

Promote to `src/widgets/*`:
- `StaffDashboardHeader` (page-level composition concern).
- `AppointmentSchedulePanel` / dashboard section blocks.
- `ReceptionistControlCenter` and similar multi-feature compositions.

Keep in `src/features/*`:
- Domain workflows, data transforms, mutation handlers, role-specific business behavior.

### Data-flow map: current bottlenecks
Current staff dashboard flow:
1. `src/app/staff/dashboard/page.tsx` mounts a client component.
2. Client resolves session/role and may call profile provisioning.
3. Client then triggers multiple API fetches (`appointments`, `providers`, `types`, `availability`, `patient search`).

Bottlenecks:
- Late auth/data gating in browser.
- Waterfall-like startup cost and larger hydration footprint.
- Inconsistent loading/empty/error behavior across features.

### Server-first target flow
1. Server `page.tsx` authenticates and resolves role.
2. Server prefetches role-scoped dashboard payload in parallel.
3. Server renders shell/widgets + passes serializable `initialData` to a small client island.
4. Client island handles only interactivity (filters, modals, optimistic updates, mutations).

### Note on schema
No database schema migration is required for this UI/UX overhaul. This is a component-boundary, design-token, and render-strategy refactor.

## 2. UI/UX Specs (from UI Expert)

### Design Token Manifesto (`src/styles/globals.css`)
Use semantic HSL tokens only.

```css
:root {
  --background: 210 20% 98%;
  --foreground: 222 47% 11%;
  --surface: 0 0% 100%;
  --surface-muted: 210 20% 96%;
  --border: 214 20% 88%;
  --ring: 195 90% 40%;

  --primary: 185 78% 24%;
  --primary-foreground: 0 0% 100%;
  --secondary: 92 43% 33%;
  --secondary-foreground: 0 0% 100%;

  --text-strong: 222 47% 11%;
  --text-muted: 215 16% 40%;
  --text-subtle: 215 14% 56%;

  --success: 142 72% 30%;
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 40%;
  --warning-foreground: 222 47% 11%;
  --critical: 0 72% 45%;
  --critical-foreground: 0 0% 100%;
  --info: 199 89% 42%;
  --info-foreground: 0 0% 100%;

  --radius-sm: 0.375rem;
  --radius-md: 0.625rem;
  --radius-lg: 0.875rem;
}
```

Tailwind mapping rule:
- Map semantic tokens in `tailwind.config.ts` using `hsl(var(--token) / <alpha-value>)`.
- Stop introducing hardcoded `bg-blue-*`, `text-gray-*` in new code.

### Shared primitive standards
`Button`:
- Variants: `primary|secondary|outline|ghost|danger|success|warning`.
- Sizes: `xs|sm|md|lg|icon`.
- Support `loading`, icon slots, focus rings, 48px touch minimum for md+.

`Card`:
- Slot API: `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`.
- Props: `density`, `status`.

`Input` + `Field`:
- `validationState`, icon slots, proper `aria-invalid` and `aria-describedby`.
- `Field` wrapper centralizes label/hint/error.

### Dashboard UX specs (admin/staff)
- Three-zone desktop layout: filters rail, dense main content, action rail.
- Tablet: two-zone.
- Mobile: single column with sticky action bar.
- Data density rules:
- Compact cards (`p-3`/`p-4`) for KPI areas.
- Table row height 44px desktop, 52px tablet/mobile.
- Tabular numeric fonts for KPI metrics.

### Empty/loading/error consistency
Create shared async primitives:
- `src/shared/ui/async-state.tsx`
- `src/shared/ui/skeleton.tsx`
- `src/shared/ui/empty-state.tsx`

All fallback copy must be translated through `useTranslations`.

### Form UX upgrades
- Replace disruptive alerts with inline translated feedback.
- Use field-level + form-level validation messaging.
- Standardize auth and intake forms using shared `Field` and `FormFeedback`.

## 3. Security & RLS (from Security Review)

### Mandatory guardrails for this refactor
1. Preserve strict server/client data boundaries.
- Never push sensitive role/PII decisions to client-only logic.
- Keep authorization gating in server page/routes.

2. Do not leak backend internals via UI errors.
- UI must show generic translated error messages.
- Internal details remain in logs/Sentry only.

3. i18n safety rules.
- Translation content treated as untrusted input.
- Avoid raw HTML translation rendering.

4. Empty/loading states must be neutral.
- Do not reveal protected resource existence before auth checks complete.

### Security checks to include in implementation
- Add CI check for hardcoded dynamic backend error passthrough to UI.
- Add callback redirect validation tests (`next` must be internal-only path).
- Add auth/hydration checks to ensure no sensitive pre-auth rendering flashes.

## 4. QA Test Suite (from QA Engine)

### Highest priority risks
1. Boundary regressions when moving components across `shared/ui`, `widgets`, `features`.
2. Hydration/layout shifts from provider and auth state transitions.
3. i18n regressions and hardcoded string drift.
4. Inconsistent async states after refactor.

### Test matrix by phase
Phase 1 (primitives/tokens):
- Vitest contracts for `Button`, `Card`, `Input`, `Field`, `AsyncState`.
- Cypress smoke on `/staff/login`, `/staff/dashboard`, `/admin`.

Phase 2 (feature migrations):
- Cypress flow tests for staff and admin daily workflows.
- Visual checks for loading/empty/error variants.

Phase 3 (i18n hardening):
- Locale parity tests (`en`, `es`) for auth, dashboard, intake.
- Static scan/test to fail on hardcoded UI literals in migrated scope.

### Exit gates
- No hydration warnings in critical routes.
- No hardcoded strings in migrated files.
- No broken import boundaries.
- All critical staff/admin flows pass.

## 5. Implementation Roadmap

### Phase 1: Update `shared/ui` primitives (accessibility + responsiveness)
- Implement semantic token set in `src/styles/globals.css`.
- Map semantic colors in `tailwind.config.ts`.
- Upgrade `Button`, `Card`, `Input`; add `Field`, `FormFeedback`, `AsyncState`, `Skeleton`, `EmptyState`.
- Keep backward-compatible props where possible to reduce migration risk.

### Phase 2: Refactor `src/features` to new primitives
- Migrate `StaffDashboard` and `AdminLayout` compositions to shared primitives.
- Introduce dashboard widgets in `src/widgets/*` where compositions span multiple features.
- Standardize status chips, KPI blocks, and async state presentation.

### Phase 3: Standardize `next-intl`
- Replace hardcoded UI strings with translation keys.
- Ensure parity in `src/messages/en.json` and `src/messages/es.json`.
- Remove ad hoc text fallbacks in auth/intake/dashboard components.

## 6. Code Prototype: Server-First `StaffDashboard`

### `src/app/staff/dashboard/page.tsx` (Server Component)
```tsx
import { redirect } from 'next/navigation';
import { getCurrentStaffProfile } from '@/features/admin-dashboard/api/admin-auth';
import { getStaffDashboardData } from '@/features/staff/api/get-staff-dashboard-data';
import { StaffDashboardShell } from '@/widgets/staff-dashboard/StaffDashboardShell';

export const dynamic = 'force-dynamic';

export default async function StaffDashboardPage() {
  const { profile } = await getCurrentStaffProfile();

  if (!profile) {
    redirect('/staff/login');
  }

  const initialData = await getStaffDashboardData({
    staffProfileId: profile.id,
    role: profile.role,
  });

  return <StaffDashboardShell profile={profile} initialData={initialData} />;
}
```

### `src/widgets/staff-dashboard/StaffDashboardShell.tsx` (Server Composition)
```tsx
import { StaffDashboardClient } from '@/features/staff/ui/StaffDashboardClient';
import { StaffDashboardHeader } from './StaffDashboardHeader';
import type { StaffProfile, StaffDashboardViewModel } from '@/features/staff/model/dashboard.vm';

export function StaffDashboardShell({
  profile,
  initialData,
}: {
  profile: StaffProfile;
  initialData: StaffDashboardViewModel;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <StaffDashboardHeader profile={profile} />
      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <StaffDashboardClient role={profile.role} initialData={initialData} />
      </main>
    </div>
  );
}
```

### `src/features/staff/ui/StaffDashboardClient.tsx` (Client Interactivity Only)
```tsx
'use client';

import { useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { AsyncState } from '@/shared/ui/async-state';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import type { StaffDashboardViewModel, StaffRole } from '@/features/staff/model/dashboard.vm';

export function StaffDashboardClient({
  role,
  initialData,
}: {
  role: StaffRole;
  initialData: StaffDashboardViewModel;
}) {
  const t = useTranslations('staff.dashboard');
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState(initialData.filters);
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return data.items.filter((item) => {
      if (!filters.status || filters.status === 'all') return true;
      return item.status === filters.status;
    });
  }, [data.items, filters.status]);

  const refresh = () => {
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch('/api/staff/dashboard?status=' + encodeURIComponent(filters.status));
        if (!res.ok) throw new Error('refresh_failed');
        const json = await res.json();
        setData(json.data as StaffDashboardViewModel);
      } catch {
        setError(t('errors.refreshFailed'));
      }
    });
  };

  return (
    <AsyncState
      loading={isPending}
      error={error}
      data={filteredItems}
      isEmpty={(items) => !items || items.length === 0}
      loadingFallback={<Skeleton variant="card" count={4} />}
      emptyFallback={
        <EmptyState
          title={t('empty.title')}
          description={t('empty.description')}
          actionLabel={t('actions.refresh')}
          onAction={refresh}
        />
      }
    >
      {(items) => (
        <section className="space-y-4">
          {/* interactive controls, quick actions, and dense list/table */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('titleByRole.' + role)}</h2>
            <button className="rounded bg-primary px-3 py-2 text-primary-foreground" onClick={refresh}>
              {t('actions.refresh')}
            </button>
          </div>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border border-border bg-surface p-4">
                <p className="font-medium">{item.patientName}</p>
                <p className="text-sm text-text-muted">{item.timeLabel}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AsyncState>
  );
}
```

## 7. One-Run Execution Mode

### Goal
Deliver the full overhaul in one coordinated run (single branch, single integration cycle), while still enforcing safety gates before merge.

### Single-Run Scope (all in one branch)
1. Foundation update:
- `src/styles/globals.css` token manifesto.
- `tailwind.config.ts` semantic mapping.
- Upgrade `src/shared/ui/{button,card,input,textarea,table}.tsx`.
- Add `src/shared/ui/{field,form-feedback,async-state,skeleton,empty-state}.tsx`.

2. Feature/UI migration:
- Refactor `staff` and `admin` dashboards to shared primitives + standardized async states.
- Introduce `widgets` for page-level composition where needed.
- Apply server-first split for `src/app/staff/dashboard/page.tsx` and client-island pattern.

3. i18n hardening:
- Replace hardcoded strings in auth, staff, admin, and intake paths.
- Ensure parity in `src/messages/en.json` and `src/messages/es.json`.

4. Test and security gates:
- Run Vitest contracts + Cypress smoke/critical flows.
- Run i18n literal scan and hydration warning checks.
- Verify no boundary violations and no sensitive error leaks in UI.

### One-Run Delivery Sequence
1. Commit block A: tokens + shared primitives + async/form components.
2. Commit block B: staff dashboard server/client split + widget composition.
3. Commit block C: admin dashboard/layout density updates + shared primitive adoption.
4. Commit block D: auth/intake validation UX and i18n hardcoded-string cleanup.
5. Final verification block: tests, security checklist, and polish fixes.

### Hard Stop Gates (must pass before merge)
1. No hydration warnings on `/staff/login`, `/staff/dashboard`, `/admin`.
2. No hardcoded UI strings in migrated files.
3. No FSD boundary violations (`shared` cannot import `features/widgets`).
4. All critical staff/admin/login/intake tests pass.
5. No sensitive backend/provider errors surfaced directly to users.

### Rollback Strategy (inside the same run)
1. If a gate fails, revert only the failing commit block (A/B/C/D), not the whole branch.
2. Re-run affected gate suite.
3. Continue only after the failed gate is green.

## 8. Immediate First Action
Create the one-run branch and execute Commit block A first (`tokens + shared primitives + async/form components`).
