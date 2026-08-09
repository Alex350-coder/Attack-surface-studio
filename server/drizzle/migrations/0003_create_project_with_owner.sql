-- Resolves ADR-010: a plain `INSERT ... RETURNING` into `projects` fails under RLS for the
-- creating user, because Postgres re-checks the SELECT policy against the returned row before
-- any `project_members` row linking the creator to their brand-new project exists yet (the
-- same `RETURNING`-vs-SELECT-policy conflict `sessions` hits, but here the fix is different:
-- unlike `sessions`, this INSERT has a real ownership relationship we want to record atomically).
--
-- SECURITY DEFINER: runs with the function owner's (table owner's) privileges, so it bypasses
-- RLS entirely for both inserts, then returns the fresh project row -- mirroring the precedent
-- set by `app_is_project_member` in migration 0002.
CREATE OR REPLACE FUNCTION create_project_with_owner(
  p_name text,
  p_slug text,
  p_scope jsonb,
  p_created_by uuid
)
RETURNS projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_project projects;
BEGIN
  INSERT INTO projects (name, slug, scope, created_by)
  VALUES (p_name, p_slug, p_scope, p_created_by)
  RETURNING * INTO new_project;

  INSERT INTO project_members (project_id, user_id, role)
  VALUES (new_project.id, p_created_by, 'owner');

  RETURN new_project;
END;
$$;
