# UI/UX Optimization Plan (FSD-lite + Next.js)

## 1. UX Logic Summary

This plan prioritizes speed and reliability for high-frequency clinic workflows:
- `admin` and `staff` dashboards should optimize glanceability so staff can identify queue pressure, no-shows, and pending actions in under 5 seconds.
- Shared primitives should carry visual semantics (status, density, validation, loading) so screens are consistent without repeating utility class strings.
- Forms should provide inline, localized feedback (using `next-intl` keys) and avoid disruptive patterns (`alert`) that break workflow.

Constraints respected:
- Keep FSD-lite layering (`app`, `features`, `entities`, `shared`).
- Keep `next-intl` + `useTranslations` for all user-facing copy.
- No new global state library.

---

## 2. Shared/UI Primitives Audit (Button, Card, Input)

### Current Findings
- `src/shared/ui/button.tsx`: hardcoded palette (`blue-600`, `red-600`) and limited variants/sizes.
- `src/shared/ui/card.tsx`: single container with fixed `p-4 rounded shadow bg-white`, no header/content/footer slots.
- `src/shared/ui/input.tsx`: no size variants, no invalid/success states, no helper/error binding.
- `src/shared/ui/textarea.tsx`: same issue as input.
- `src/shared/ui/table.tsx`: naming mismatch vs common table semantics (e.g., `TableHeader` currently renders `<th>`).

### Target API (Concrete)

#### `Button`
```tsx
// src/shared/ui/button.tsx
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'warning';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  shortcutHint?: string; // e.g. "Ctrl+Enter"
}
```
Behavior rules:
- `loading` disables interactions and shows spinner slot.
- Minimum touch target: `min-h-12` (48px) for `md` and above.
- Focus style must be token-based (`ring-[hsl(var(--ring))]`).

#### `Card`
```tsx
// src/shared/ui/card.tsx
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  density?: 'comfortable' | 'compact';
  interactive?: boolean;
  status?: 'default' | 'success' | 'warning' | 'critical' | 'info';
}

export function Card(...)
export function CardHeader(...)
export function CardTitle(...)
export function CardDescription(...)
export function CardContent(...)
export function CardFooter(...)
```
Behavior rules:
- `status` adds semantic border/accent stripe for at-a-glance scanning.
- `compact` density for dashboards/tables, `comfortable` for forms/details.

#### `Input`
```tsx
// src/shared/ui/input.tsx
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputSize?: 'sm' | 'md' | 'lg';
  validationState?: 'default' | 'error' | 'success';
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

// New composition helper:
export function Field(props: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
})
```
Behavior rules:
- `aria-invalid`, `aria-describedby`, and error IDs generated consistently.
- Label/hint/error lives in `Field`, not re-implemented per form.

### FSD Placement
- `src/shared/ui/button.tsx`
- `src/shared/ui/card.tsx`
- `src/shared/ui/input.tsx`
- `src/shared/ui/field.tsx` (new)
- `src/shared/ui/form-feedback.tsx` (new: inline form-level success/error)

---

## 3. Design Token Manifesto (`globals.css` + Tailwind)

### Problem
Current token set is too small and not mapped to semantic states needed in clinical operations.

### Token Naming System (HSL-friendly CSS vars)
Define in `src/styles/globals.css`:

```css
:root {
  /* Base surfaces */
  --background: 210 20% 98%;
  --foreground: 222 47% 11%;
  --surface: 0 0% 100%;
  --surface-muted: 210 20% 96%;
  --border: 214 20% 88%;
  --ring: 195 90% 40%;

  /* Brand */
  --primary: 185 78% 24%;
  --primary-foreground: 0 0% 100%;
  --secondary: 92 43% 33%;
  --secondary-foreground: 0 0% 100%;

  /* Text */
  --text-strong: 222 47% 11%;
  --text-muted: 215 16% 40%;
  --text-subtle: 215 14% 56%;

  /* Status */
  --success: 142 72% 30%;
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 40%;
  --warning-foreground: 222 47% 11%;
  --critical: 0 72% 45%;
  --critical-foreground: 0 0% 100%;
  --info: 199 89% 42%;
  --info-foreground: 0 0% 100%;

  /* Data viz */
  --chart-1: 199 89% 42%;
  --chart-2: 142 72% 30%;
  --chart-3: 38 92% 40%;
  --chart-4: 0 72% 45%;

  /* Radius + spacing */
  --radius-sm: 0.375rem;
  --radius-md: 0.625rem;
  --radius-lg: 0.875rem;
}
```

### Tailwind Mapping Guidelines
In `tailwind.config.ts`:
- Map colors to `hsl(var(--token) / <alpha-value>)`.
- Add semantic aliases, not hardcoded color names.
- Add typography scale for dense data screens (`xs`, `sm`, `base`, `lg` with tighter leading options).

Example mapping (abbreviated):
```ts
colors: {
  background: 'hsl(var(--background) / <alpha-value>)',
  foreground: 'hsl(var(--foreground) / <alpha-value>)',
  primary: 'hsl(var(--primary) / <alpha-value>)',
  success: 'hsl(var(--success) / <alpha-value>)',
  warning: 'hsl(var(--warning) / <alpha-value>)',
  critical: 'hsl(var(--critical) / <alpha-value>)',
}
```

### Migration Rule
- New code: only semantic tokens/classes.
- Existing code: replace hardcoded `text-gray-*`, `bg-blue-*`, etc., during feature touch work (no massive one-shot rewrite).

---

## 4. Dashboard Glanceability + Data Density (Admin + Staff)

### Critical Path Mapping
Primary high-frequency actions:
1. Confirm current queue pressure (waiting/in-progress/late).
2. Act on appointments (status transitions, scheduling).
3. Resolve exceptions (errors, missing records, no-shows).

### Layout Blueprint
Use a three-zone structure for both `admin` and `staff` pages:
- Left rail: date/provider filters, quick toggles, keyboard hints.
- Main stage: dense list/table timeline of appointments/patients.
- Right action rail: context actions (status change, call patient, edit appointment).

### Concrete Component Additions
- `src/widgets/dashboard/ui/metric-tile.tsx`
  - Props: `{ label, value, delta?, status?, icon?, compact? }`
- `src/widgets/dashboard/ui/status-pill.tsx`
  - Props: `{ status: 'waiting' | 'in-progress' | 'completed' | 'cancelled' | 'no-show' }`
- `src/widgets/dashboard/ui/action-rail.tsx`
  - Props: `{ actions: Array<{ id, label, shortcut?, onClick, variant? }> }`

### Density Standards
- Default card padding for dashboard summaries: `p-3` or `p-4` (not `p-6` unless detail-heavy).
- Table row height: 44px desktop, 52px touch/tablet.
- Numeric metrics use tabular numbers (`font-variant-numeric: tabular-nums`).

### Keyboard Acceleration (no global state needed)
Use local hooks in page/widget scope:
- `useDashboardHotkeys({ onRefresh, onCreate, onMarkArrived })`
- Suggested defaults:
  - `R`: refresh data
  - `N`: new appointment
  - `A`: mark selected patient as arrived

---

## 5. Empty States + Loading Skeleton Consistency

### Problem
Loading/empty/error rendering is currently ad hoc (`text`, spinner divs, mixed card layouts).

### Shared Pattern
Create shared feedback components:
- `src/shared/ui/async-state.tsx`
- `src/shared/ui/skeleton.tsx`
- `src/shared/ui/empty-state.tsx`

Concrete API:
```tsx
export function AsyncState<T>({
  loading,
  error,
  data,
  isEmpty,
  loadingFallback,
  emptyFallback,
  errorFallback,
  children,
}: {
  loading: boolean;
  error?: string | null;
  data?: T;
  isEmpty: (data: T | undefined) => boolean;
  loadingFallback?: React.ReactNode;
  emptyFallback?: React.ReactNode;
  errorFallback?: (error: string) => React.ReactNode;
  children: (data: T) => React.ReactNode;
})
```

```tsx
export function EmptyState(props: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
})
```

```tsx
export function Skeleton(props: {
  className?: string;
  variant?: 'text' | 'avatar' | 'card' | 'table-row';
  count?: number;
})
```

### Translation Rule
All fallback copy must come from `useTranslations` keys (e.g., `admin.dashboard.empty.title`).

---

## 6. Form Validation UX (Auth + Intake)

### Current Gaps
- `alert(...)` is used in auth forms.
- Required rules exist but inline error messaging is inconsistent.
- Success/error states are not visually normalized across forms.

### UX Standard
- Validate on blur + submit (`mode: 'onBlur'`, `reValidateMode: 'onChange'`).
- Show field-level message directly under input.
- Show one form-level summary for server failures.
- Keep user input after server errors.
- Use translated validation keys (`next-intl`) for both client + server errors.

### Concrete Form API Additions
- `src/shared/ui/field.tsx` (label/hint/error wrapper)
- `src/shared/ui/form-feedback.tsx`

```tsx
export function FormFeedback({
  type,
  message,
}: {
  type: 'error' | 'success' | 'info';
  message: string;
})
```

For `react-hook-form` integration:
- `src/shared/lib/forms/getFieldError.ts`
  - Normalizes error object -> translation key string.

### Feature-Specific Recommendations
- `src/app/(auth)/login/LoginForm.tsx`
  - Replace `alert(t('loginError'))` with inline `FormFeedback`.
- `src/app/(auth)/signup/SignUpForm.tsx`
  - Add password guidance + strength hints; inline errors.
- `src/features/patient-intake/ui/patient-intake-form.tsx`
  - Keep `zodResolver`; wrap each input in `Field`; add submission success banner.

---

## 7. Responsive Behavior (Desktop + Mobile)

### Breakpoint Intent
- Mobile (`<768px`): single-column flow, sticky primary action bar at bottom for key actions.
- Tablet (`768-1024px`): two-column, maintain quick actions visible.
- Desktop (`>=1024px`): three-zone layout (filters, main table, action rail).

### Concrete Rules
- Action buttons in operational flows use `min-h-12`.
- Horizontal data tables must support overflow with sticky header and first key column where possible.
- Filter controls collapse into a top sheet/drawer on mobile rather than hidden controls.

### Dashboard Grid Template Suggestion
```css
/* desktop */
grid-template-columns: 260px minmax(0, 1fr) 320px;
/* tablet */
grid-template-columns: 220px minmax(0, 1fr);
/* mobile */
grid-template-columns: 1fr;
```

---

## 8. Implementation Suite

### Install Commands (shadcn/ui)
```bash
npx shadcn-ui@latest add button card input textarea table badge skeleton alert separator
```
Optional for workflow speed:
```bash
npx shadcn-ui@latest add drawer sheet tooltip
```

### Suggested File Plan
- `src/shared/ui/button.tsx` (upgrade API + variants)
- `src/shared/ui/card.tsx` (slot-based card)
- `src/shared/ui/input.tsx` (state/size/icon support)
- `src/shared/ui/field.tsx` (new)
- `src/shared/ui/form-feedback.tsx` (new)
- `src/shared/ui/skeleton.tsx` (new)
- `src/shared/ui/empty-state.tsx` (new)
- `src/shared/ui/async-state.tsx` (new)
- `src/styles/globals.css` (token manifesto)
- `tailwind.config.ts` (semantic token mapping)

### Sample Usage Snippet (Dashboard)
```tsx
<Card density="compact" status="info">
  <CardHeader>
    <CardTitle>{t('todayWaiting')}</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-2xl font-semibold tabular-nums">{waitingCount}</p>
  </CardContent>
</Card>
```

---

## 9. Migration Guidelines (Phased)

### Phase 1: Foundation (1 sprint)
- Add tokens in `globals.css` + Tailwind semantic mapping.
- Upgrade `Button`, `Card`, `Input` APIs with backwards-compatible defaults.
- Add `Field`, `FormFeedback`, `Skeleton`, `EmptyState`, `AsyncState`.

### Phase 2: High-Impact Screens (1-2 sprints)
- Migrate `admin` dashboard pages to new metric tiles + async state wrappers.
- Migrate `staff` dashboards (dentist/receptionist) for consistent status chips and loading/empty/error treatment.

### Phase 3: Form UX (1 sprint)
- Migrate auth forms + patient intake forms to shared field/feedback components.
- Replace all `alert` flows with inline translated feedback.

### Phase 4: Polish + QA
- Validate keyboard shortcuts and focus states.
- Mobile/tablet pass for critical pages (`admin`, `staff`, auth, intake).
- Update Cypress visual/workflow tests for new states.

### Deprecation Guidance
- Mark hardcoded color utilities in primitives as deprecated comments.
- Keep old prop names temporarily; log TODO removal target in `TASKS.md`.
- New components/features must use semantic tokens and shared async/form primitives.

---

## 10. Speed & Accessibility Audit Checklist

- Keyboard:
  - Core dashboard actions reachable via keyboard shortcuts.
  - Full tab order and visible focus rings.
- Touch targets:
  - Primary action buttons >= 48px height.
- Feedback:
  - Loading, empty, error states all represented with consistent components.
- Forms:
  - Every invalid input has `aria-invalid` and linked error text.
  - Server failures shown inline, not modal alert.
- Responsive:
  - Desktop/tablet/mobile tested for `admin` and `staff` critical paths.
- i18n:
  - New labels/messages/errors integrated with `useTranslations` keys.
