-- Create storage bucket for reference videos
INSERT INTO storage.buckets (id, name, public) VALUES ('reference-videos', 'reference-videos', true);

-- Create storage policies for reference video uploads
CREATE POLICY "Authenticated users can upload reference videos" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'reference-videos');

CREATE POLICY "Anyone can view reference videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'reference-videos');

CREATE POLICY "Authenticated users can update reference videos" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'reference-videos');

CREATE POLICY "Authenticated users can delete reference videos" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'reference-videos');