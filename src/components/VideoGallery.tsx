import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Calendar, TrendingUp, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnalysisSession {
  id: string;
  video_url: string;
  skill_level: string;
  overall_score: number;
  status: string;
  created_at: string;
  analysis_data?: any;
}

export const VideoGallery = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserSessions();
    }
  }, [user]);

  const fetchUserSessions = async () => {
    if (!user) return;

    try {
      // Optimized query - only select necessary fields to avoid timeout
      const { data, error } = await supabase
        .from('analysis_sessions')
        .select('id, video_url, skill_level, overall_score, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20); // Limit to prevent large data loads

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error loading videos",
        description: "Failed to load your video gallery",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Your Video Gallery</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <Play className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
        <p className="text-muted-foreground mb-4">
          Upload your first surf video to get started with AI analysis
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Video Gallery</h2>
        <Badge variant="secondary">{sessions.length} video{sessions.length !== 1 ? 's' : ''}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session) => (
          <Card key={session.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge 
                  variant="secondary" 
                  className={`${getStatusColor(session.status)} text-white`}
                >
                  {session.status}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {formatDate(session.created_at)}
                </div>
              </div>
              <CardTitle className="text-lg">Surf Analysis</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {session.skill_level.charAt(0).toUpperCase() + session.skill_level.slice(1)} Level
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Video Preview */}
              {session.video_url && (
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <video 
                    src={session.video_url} 
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                </div>
              )}

              {/* Score Display */}
              {session.overall_score && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Score:</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className={`font-bold ${getScoreColor(session.overall_score)}`}>
                      {session.overall_score.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <Button 
                className="w-full" 
                variant={session.status === 'completed' ? 'default' : 'secondary'}
                disabled={session.status !== 'completed'}
              >
                {session.status === 'completed' ? 'View Analysis' : 'Processing...'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};