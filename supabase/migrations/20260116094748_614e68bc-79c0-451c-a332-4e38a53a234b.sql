-- Create table for storing user configurations (GitHub, Jira, AI, Thresholds)
CREATE TABLE public.app_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_type TEXT NOT NULL CHECK (config_type IN ('github', 'jira', 'ai', 'thresholds')),
  config_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(config_type)
);

-- Create table for storing auto-merge history
CREATE TABLE public.auto_merge_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pr_number INTEGER NOT NULL,
  ai_score NUMERIC,
  sonar_issues INTEGER,
  mode TEXT CHECK (mode IN ('less', 'greater')),
  ai_threshold NUMERIC,
  sonar_threshold NUMERIC,
  decision TEXT CHECK (decision IN ('will_merge', 'will_not_merge', 'merged', 'merge_failed', 'disabled')),
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing PR comment IDs (for upsert pattern)
CREATE TABLE public.pr_comment_ids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  pr_number INTEGER NOT NULL,
  comment_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner, repo, pr_number)
);

-- Create table for storing merge conflict resolutions
CREATE TABLE public.merge_conflict_resolutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pr_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  conflict_content TEXT,
  resolution_strategy TEXT CHECK (resolution_strategy IN ('ours', 'theirs', 'manual', 'ai_assisted')),
  resolved_content TEXT,
  has_business_logic BOOLEAN DEFAULT false,
  ai_analysis TEXT,
  status TEXT CHECK (status IN ('pending', 'resolved', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_merge_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_comment_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merge_conflict_resolutions ENABLE ROW LEVEL SECURITY;

-- Allow public access (no auth required for this dashboard app)
-- For GitHub config, Jira config, AI config, thresholds
CREATE POLICY "Allow all access to app_configurations" 
ON public.app_configurations 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all access to auto_merge_history" 
ON public.auto_merge_history 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all access to pr_comment_ids" 
ON public.pr_comment_ids 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all access to merge_conflict_resolutions" 
ON public.merge_conflict_resolutions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_app_configurations_updated_at
BEFORE UPDATE ON public.app_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pr_comment_ids_updated_at
BEFORE UPDATE ON public.pr_comment_ids
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_merge_conflict_resolutions_updated_at
BEFORE UPDATE ON public.merge_conflict_resolutions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();