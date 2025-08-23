import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  videoPath: string;
  className?: string;
  controls?: boolean;
  preload?: string;
}

export const VideoPlayer = ({ videoPath, className, controls = false, preload = "metadata" }: VideoPlayerProps) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getSignedUrl = async () => {
      if (!videoPath) {
        setError('No video path provided');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.storage
          .from('surf-videos')
          .createSignedUrl(videoPath, 3600); // 1 hour expiry

        if (error) {
          console.error('Error getting signed URL:', error);
          setError('Failed to load video');
        } else {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error creating signed URL:', err);
        setError('Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [videoPath]);

  if (loading) {
    return (
      <div className={`bg-muted rounded-lg flex items-center justify-center ${className || 'aspect-video'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`bg-muted rounded-lg flex items-center justify-center ${className || 'aspect-video'}`}>
        <p className="text-muted-foreground text-sm">{error || 'Failed to load video'}</p>
      </div>
    );
  }

  return (
    <video 
      src={signedUrl}
      className={className || "w-full h-full object-cover"}
      controls={controls}
      preload={preload}
      onError={(e) => {
        console.error('Video playback error:', e);
        setError('Video playback failed');
      }}
    />
  );
};