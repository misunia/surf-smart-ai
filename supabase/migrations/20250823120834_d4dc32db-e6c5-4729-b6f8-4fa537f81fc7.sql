-- Add INSERT and UPDATE policies for reference_videos table
CREATE POLICY "Authenticated users can insert reference videos" 
ON public.reference_videos 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update reference videos" 
ON public.reference_videos 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete reference videos" 
ON public.reference_videos 
FOR DELETE 
TO authenticated 
USING (true);