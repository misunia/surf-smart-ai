-- Create enum for skill levels
CREATE TYPE public.skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'pro');

-- Create enum for wave types  
CREATE TYPE public.wave_type AS ENUM ('beach_break', 'point_break', 'reef_break');

-- Create enum for surf techniques
CREATE TYPE public.surf_technique AS ENUM ('bottom_turn', 'cutback', 'top_turn', 'tube_ride');

-- Create user profiles table
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  skill_level skill_level NOT NULL DEFAULT 'beginner',
  preferred_wave_type wave_type DEFAULT 'beach_break',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create technique standards table for reference data
CREATE TABLE public.technique_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technique surf_technique NOT NULL,
  wave_type wave_type NOT NULL,
  skill_level skill_level NOT NULL,
  metric_name TEXT NOT NULL,
  ideal_min DECIMAL,
  ideal_max DECIMAL,
  good_min DECIMAL,
  good_max DECIMAL,
  acceptable_min DECIMAL,
  acceptable_max DECIMAL,
  units TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(technique, wave_type, skill_level, metric_name)
);

-- Create analysis sessions table
CREATE TABLE public.analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_url TEXT,
  technique surf_technique NOT NULL,
  wave_type wave_type NOT NULL,
  skill_level skill_level NOT NULL,
  overall_score DECIMAL,
  analysis_data JSONB,
  feedback_data JSONB,
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technique_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for technique_standards (public read access)
CREATE POLICY "Anyone can read technique standards" ON public.technique_standards
  FOR SELECT USING (true);

-- RLS policies for analysis_sessions
CREATE POLICY "Users can view own sessions" ON public.analysis_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.analysis_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.analysis_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Insert curated reference data for beach break bottom turns
INSERT INTO public.technique_standards (technique, wave_type, skill_level, metric_name, ideal_min, ideal_max, good_min, good_max, acceptable_min, acceptable_max, units, description) VALUES
-- Beginner level
('bottom_turn', 'beach_break', 'beginner', 'turn_completion', 60, 80, 40, 85, 20, 90, 'percentage', 'How much of the turn was completed smoothly'),
('bottom_turn', 'beach_break', 'beginner', 'body_rotation', 15, 35, 10, 40, 5, 45, 'degrees', 'Upper body rotation relative to board'),
('bottom_turn', 'beach_break', 'beginner', 'weight_distribution', 40, 60, 30, 70, 20, 80, 'percentage', 'Weight on back foot during turn'),
('bottom_turn', 'beach_break', 'beginner', 'knee_bend', 20, 40, 15, 45, 10, 50, 'degrees', 'Knee flexion during turn'),
('bottom_turn', 'beach_break', 'beginner', 'rail_engagement', 30, 50, 20, 60, 10, 70, 'percentage', 'How well the rail is engaged'),

-- Intermediate level  
('bottom_turn', 'beach_break', 'intermediate', 'turn_completion', 70, 90, 60, 95, 50, 98, 'percentage', 'How much of the turn was completed smoothly'),
('bottom_turn', 'beach_break', 'intermediate', 'body_rotation', 25, 45, 20, 50, 15, 55, 'degrees', 'Upper body rotation relative to board'),
('bottom_turn', 'beach_break', 'intermediate', 'weight_distribution', 50, 70, 45, 75, 40, 80, 'percentage', 'Weight on back foot during turn'),
('bottom_turn', 'beach_break', 'intermediate', 'knee_bend', 30, 50, 25, 55, 20, 60, 'degrees', 'Knee flexion during turn'),
('bottom_turn', 'beach_break', 'intermediate', 'rail_engagement', 50, 70, 40, 75, 30, 80, 'percentage', 'How well the rail is engaged'),

-- Advanced level
('bottom_turn', 'beach_break', 'advanced', 'turn_completion', 80, 95, 75, 98, 70, 100, 'percentage', 'How much of the turn was completed smoothly'),
('bottom_turn', 'beach_break', 'advanced', 'body_rotation', 35, 55, 30, 60, 25, 65, 'degrees', 'Upper body rotation relative to board'),
('bottom_turn', 'beach_break', 'advanced', 'weight_distribution', 60, 80, 55, 85, 50, 90, 'percentage', 'Weight on back foot during turn'),
('bottom_turn', 'beach_break', 'advanced', 'knee_bend', 40, 60, 35, 65, 30, 70, 'degrees', 'Knee flexion during turn'),
('bottom_turn', 'beach_break', 'advanced', 'rail_engagement', 70, 90, 65, 95, 60, 98, 'percentage', 'How well the rail is engaged'),

-- Pro level
('bottom_turn', 'beach_break', 'pro', 'turn_completion', 90, 98, 85, 100, 80, 100, 'percentage', 'How much of the turn was completed smoothly'),
('bottom_turn', 'beach_break', 'pro', 'body_rotation', 45, 65, 40, 70, 35, 75, 'degrees', 'Upper body rotation relative to board'),
('bottom_turn', 'beach_break', 'pro', 'weight_distribution', 70, 90, 65, 95, 60, 98, 'percentage', 'Weight on back foot during turn'),
('bottom_turn', 'beach_break', 'pro', 'knee_bend', 50, 70, 45, 75, 40, 80, 'degrees', 'Knee flexion during turn'),
('bottom_turn', 'beach_break', 'pro', 'rail_engagement', 85, 98, 80, 100, 75, 100, 'percentage', 'How well the rail is engaged');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analysis_sessions_updated_at
  BEFORE UPDATE ON public.analysis_sessions  
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();