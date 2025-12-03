-- Add RLS policies for email_templates table
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own templates
CREATE POLICY "Users can view their own templates"
ON public.email_templates
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own templates
CREATE POLICY "Users can create their own templates"
ON public.email_templates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update their own templates"
ON public.email_templates
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete their own templates"
ON public.email_templates
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can manage all templates
CREATE POLICY "Admins can manage all templates"
ON public.email_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));