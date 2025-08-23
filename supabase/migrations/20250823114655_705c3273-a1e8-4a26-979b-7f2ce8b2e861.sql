-- Create table for professional reference videos and their analysis
CREATE TABLE public.reference_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  surfer_name TEXT NOT NULL,
  video_url TEXT NOT NULL,
  technique TEXT NOT NULL DEFAULT 'bottom_turn',
  skill_level TEXT NOT NULL DEFAULT 'pro',
  wave_type TEXT NOT NULL DEFAULT 'beach_break',
  quality_score NUMERIC NOT NULL CHECK (quality_score >= 0 AND quality_score <= 100),
  analysis_data JSONB,
  frame_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_training_data BOOLEAN DEFAULT true,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.reference_videos ENABLE ROW LEVEL SECURITY;

-- Create policies (admin only for now, can be adjusted later)
CREATE POLICY "Anyone can view reference videos" 
ON public.reference_videos 
FOR SELECT 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_reference_videos_updated_at
BEFORE UPDATE ON public.reference_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for technique metrics standards based on professional data
CREATE TABLE public.technique_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technique TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  pro_average NUMERIC NOT NULL,
  pro_std_deviation NUMERIC NOT NULL,
  excellent_min NUMERIC NOT NULL,
  excellent_max NUMERIC NOT NULL,
  good_min NUMERIC NOT NULL,
  good_max NUMERIC NOT NULL,
  acceptable_min NUMERIC NOT NULL,
  acceptable_max NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(technique, metric_name)
);

-- Enable RLS
ALTER TABLE public.technique_metrics ENABLE ROW LEVEL SECURITY;

-- Create policy for reading technique metrics
CREATE POLICY "Anyone can read technique metrics" 
ON public.technique_metrics 
FOR SELECT 
USING (true);