-- Apply after creating the tables and leaderboard view from the supplied schema.
-- The browser uses only the Supabase anon/publishable key; never put a service-role
-- key in a VITE_ variable.

CREATE OR REPLACE FUNCTION public.create_team(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    created_team_id uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication is required to create a team';
    END IF;
    IF nullif(trim(p_name), '') IS NULL THEN
        RAISE EXCEPTION 'A team name is required';
    END IF;

    INSERT INTO public.teams (name)
    VALUES (trim(p_name))
    RETURNING id INTO created_team_id;

    INSERT INTO public.team_members (team_id, user_id)
    VALUES (created_team_id, auth.uid());

    RETURN created_team_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_team(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_team(text) TO authenticated;

DROP POLICY IF EXISTS "Users can join teams as themselves" ON public.team_members;
CREATE POLICY "Users can join teams as themselves"
ON public.team_members FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Team members can create submissions" ON public.submissions;
CREATE POLICY "Team members can create submissions"
ON public.submissions FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.team_members tm
        WHERE tm.team_id = submissions.team_id
          AND tm.user_id = (SELECT auth.uid())
    )
);

-- A security-invoker view would inherit the private submissions policy and hide
-- other teams' completed entries. The view exposes only the intended scoreboard
-- columns, while its owner reads the underlying data.
ALTER VIEW public.leaderboard SET (security_invoker = false);
GRANT SELECT ON public.leaderboard TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('algorithm-submissions', 'algorithm-submissions', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Team members can upload algorithms" ON storage.objects;
CREATE POLICY "Team members can upload algorithms"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'algorithm-submissions'
    AND EXISTS (
        SELECT 1
        FROM public.team_members tm
        WHERE tm.team_id::text = (storage.foldername(name))[1]
          AND tm.user_id = (SELECT auth.uid())
    )
);

DROP POLICY IF EXISTS "Team members can download algorithms" ON storage.objects;
CREATE POLICY "Team members can download algorithms"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'algorithm-submissions'
    AND EXISTS (
        SELECT 1
        FROM public.team_members tm
        WHERE tm.team_id::text = (storage.foldername(name))[1]
          AND tm.user_id = (SELECT auth.uid())
    )
);

DROP POLICY IF EXISTS "Team members can remove algorithms" ON storage.objects;
CREATE POLICY "Team members can remove algorithms"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'algorithm-submissions'
    AND EXISTS (
        SELECT 1
        FROM public.team_members tm
        WHERE tm.team_id::text = (storage.foldername(name))[1]
          AND tm.user_id = (SELECT auth.uid())
    )
);
