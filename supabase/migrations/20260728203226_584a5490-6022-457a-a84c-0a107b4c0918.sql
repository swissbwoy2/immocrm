
-- 1) STORIES
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_user_id UUID NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('admin','agent')),
  author_agent_id UUID NULL,
  type TEXT NOT NULL CHECK (type IN ('image','video','text')),
  media_url TEXT NULL,
  media_path TEXT NULL,
  text_content TEXT NULL,
  background_color TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  is_active BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX idx_stories_active_expires ON public.stories(is_active, expires_at);
CREATE INDEX idx_stories_author ON public.stories(author_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stories_select_active_or_own"
  ON public.stories FOR SELECT TO authenticated
  USING (
    (is_active AND expires_at > now())
    OR author_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "stories_insert_admin_agent"
  ON public.stories FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND (
      (author_role = 'admin' AND public.has_role(auth.uid(), 'admin'))
      OR (author_role = 'agent' AND public.has_role(auth.uid(), 'agent'))
    )
  );

CREATE POLICY "stories_update_owner_or_admin"
  ON public.stories FOR UPDATE TO authenticated
  USING (author_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (author_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "stories_delete_owner_or_admin"
  ON public.stories FOR DELETE TO authenticated
  USING (author_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 2) STORY VIEWS
CREATE TABLE public.story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_user_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_user_id)
);
CREATE INDEX idx_story_views_story ON public.story_views(story_id);

GRANT SELECT, INSERT ON public.story_views TO authenticated;
GRANT ALL ON public.story_views TO service_role;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_views_insert_self"
  ON public.story_views FOR INSERT TO authenticated
  WITH CHECK (viewer_user_id = auth.uid());

CREATE POLICY "story_views_select_author_or_self"
  ON public.story_views FOR SELECT TO authenticated
  USING (
    viewer_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.author_user_id = auth.uid())
  );

-- 3) STORY REACTIONS
CREATE TABLE public.story_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);
CREATE INDEX idx_story_reactions_story ON public.story_reactions(story_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_reactions TO authenticated;
GRANT ALL ON public.story_reactions TO service_role;
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_reactions_manage_own"
  ON public.story_reactions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "story_reactions_select_author"
  ON public.story_reactions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.author_user_id = auth.uid())
  );

-- 4) STORY COMMENTS
CREATE TABLE public.story_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_story_comments_story ON public.story_comments(story_id);

GRANT SELECT, INSERT, DELETE ON public.story_comments TO authenticated;
GRANT ALL ON public.story_comments TO service_role;
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_comments_insert_self"
  ON public.story_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "story_comments_select_author_or_self"
  ON public.story_comments FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.author_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.is_active AND s.expires_at > now())
  );

CREATE POLICY "story_comments_delete_owner_or_admin"
  ON public.story_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 5) Storage policies on message-attachments bucket (stories/ prefix)
CREATE POLICY "stories_media_insert_staff"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = 'stories'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'))
  );

CREATE POLICY "stories_media_delete_staff"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = 'stories'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'))
  );
