-- Add RLS policy to allow users to delete their own analysis sessions
CREATE POLICY "Users can delete own sessions" 
ON public.analysis_sessions 
FOR DELETE 
USING (auth.uid() = user_id);