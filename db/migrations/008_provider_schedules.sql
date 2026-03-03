-- Migration: 008_provider_schedules.sql
-- Purpose: Provider weekly schedules and time blocks (for availability and Google Calendar sync).

-- ── Provider weekly schedule ──────────────────────────────────
-- Each row represents one working day for a provider.
-- day_of_week: 0 = Sunday, 1 = Monday, ... 6 = Saturday
CREATE TABLE IF NOT EXISTS public.provider_schedules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  day_of_week   integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time    time NOT NULL DEFAULT '08:00',
  end_time      time NOT NULL DEFAULT '17:00',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- One entry per provider per day
  UNIQUE (provider_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.provider_schedules ENABLE ROW LEVEL SECURITY;

-- All staff can view schedules (needed for booking availability)
CREATE POLICY "Staff can view provider schedules"
  ON public.provider_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
    )
  );

-- Admins can manage schedules
CREATE POLICY "Admins can manage provider schedules"
  ON public.provider_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid() AND sp.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid() AND sp.role = 'admin'
    )
  );

-- Providers can update their own schedule
CREATE POLICY "Providers can update own schedule"
  ON public.provider_schedules FOR UPDATE
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

REVOKE ALL ON public.provider_schedules FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_schedules TO authenticated;


-- ── Provider time blocks ──────────────────────────────────────
-- Blocked-off periods: lunch, meetings, vacation, Google Calendar events, etc.
CREATE TABLE IF NOT EXISTS public.provider_time_blocks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  start_time      timestamptz NOT NULL,
  end_time        timestamptz NOT NULL,
  reason          text,
  is_all_day      boolean NOT NULL DEFAULT false,
  google_calendar_event_id text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Sanity check: end must be after start
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_time_blocks_provider_start
  ON public.provider_time_blocks (provider_id, start_time);

-- Enable RLS
ALTER TABLE public.provider_time_blocks ENABLE ROW LEVEL SECURITY;

-- All staff can view time blocks (needed for booking availability)
CREATE POLICY "Staff can view time blocks"
  ON public.provider_time_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid()
    )
  );

-- Admins + owners can manage time blocks
CREATE POLICY "Admins can manage time blocks"
  ON public.provider_time_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid() AND sp.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.id = auth.uid() AND sp.role = 'admin'
    )
  );

CREATE POLICY "Providers can manage own time blocks"
  ON public.provider_time_blocks FOR ALL
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

REVOKE ALL ON public.provider_time_blocks FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_time_blocks TO authenticated;


-- ── Seed default schedules for existing providers ─────────────
-- Insert Mon-Fri 8am-5pm for all dentists and hygienists
INSERT INTO public.provider_schedules (provider_id, day_of_week, start_time, end_time, is_active)
SELECT
  sp.id,
  d.day,
  '08:00'::time,
  '17:00'::time,
  true
FROM public.staff_profiles sp
CROSS JOIN (VALUES (1), (2), (3), (4), (5)) AS d(day)  -- Mon through Fri
WHERE sp.role IN ('dentist', 'hygienist')
ON CONFLICT (provider_id, day_of_week) DO NOTHING;
