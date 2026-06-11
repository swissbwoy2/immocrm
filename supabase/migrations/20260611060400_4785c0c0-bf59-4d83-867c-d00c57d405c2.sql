
-- Restrict anonymous INSERT policies to service_role only

-- agent_badges
DROP POLICY IF EXISTS "System can insert badges" ON public.agent_badges;
CREATE POLICY "Service role can insert badges"
ON public.agent_badges FOR INSERT TO service_role WITH CHECK (true);

-- apporteurs
DROP POLICY IF EXISTS "System can insert apporteurs" ON public.apporteurs;
CREATE POLICY "Service role can insert apporteurs"
ON public.apporteurs FOR INSERT TO service_role WITH CHECK (true);

-- conversation_agents
DROP POLICY IF EXISTS "System can insert conversation_agents" ON public.conversation_agents;
CREATE POLICY "Service role can insert conversation_agents"
ON public.conversation_agents FOR INSERT TO service_role WITH CHECK (true);

-- notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
ON public.notifications FOR INSERT TO service_role WITH CHECK (true);

-- proprietaires
DROP POLICY IF EXISTS "System can insert proprietaires" ON public.proprietaires;
CREATE POLICY "Service role can insert proprietaires"
ON public.proprietaires FOR INSERT TO service_role WITH CHECK (true);

-- visit_reminders
DROP POLICY IF EXISTS "System can insert reminders" ON public.visit_reminders;
CREATE POLICY "Service role can insert reminders"
ON public.visit_reminders FOR INSERT TO service_role WITH CHECK (true);
