-- Migration: 20260316000200_admin_actions_compat_view.sql
-- Purpose:
--   Provide a backwards-compatible read model for environments where
--   legacy code still queries public.admin_actions, while canonical
--   storage remains public.audit_logs.

BEGIN;

DO $$
DECLARE
  existing_relkind "char";
  audit_logs_exists regclass;
BEGIN
  SELECT to_regclass('public.audit_logs') INTO audit_logs_exists;

  SELECT c.relkind
  INTO existing_relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'admin_actions';

  -- Create the compatibility view only when admin_actions is absent
  -- and canonical audit_logs exists.
  IF existing_relkind IS NULL AND audit_logs_exists IS NOT NULL THEN
    EXECUTE $view$
      CREATE VIEW public.admin_actions AS
      SELECT
        al.id,
        al.user_id AS admin_id,
        al.action,
        al.resource_type AS target_type,
        al.resource_id AS target_id,
        COALESCE(al.metadata ->> 'target_name', al.resource_id) AS target_name,
        al.metadata AS changes,
        COALESCE(al.metadata ->> 'ip_address', al.metadata ->> 'ip') AS ip_address,
        al.created_at
      FROM public.audit_logs al
    $view$;

    GRANT SELECT ON public.admin_actions TO authenticated;
  ELSIF existing_relkind IS NULL AND audit_logs_exists IS NULL THEN
    RAISE NOTICE 'Skipping public.admin_actions compatibility view: public.audit_logs does not exist yet.';
  END IF;
END
$$;

COMMIT;
