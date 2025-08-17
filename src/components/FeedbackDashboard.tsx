import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PoseVisualization from "./PoseVisualization";
import MetricsChart from "./MetricsChart";

const FeedbackDashboard = () => {
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [standards, setStandards] = useState<any[]>([]);
  const [frameData, setFrameData] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchLatestAnalysis();
    fetchTechniqueStandards();
  }, []);

  const fetchLatestAnalysis = async () => {
    if (!user) return;
    
    try {
      const { data: sessions, error } = await supabase
        .from('analysis_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      if (sessions && sessions.length > 0) {
        const session = sessions[0];
        const analysisDataObj = typeof session.analysis_data === 'object' ? session.analysis_data as any : {};
        const feedbackDataObj = typeof session.feedback_data === 'object' ? session.feedback_data as any : {};
        
        setAnalysisData({
          overallScore: session.overall_score || 0,
          skillLevel: session.skill_level,
          metrics: analysisDataObj?.metrics || [],
          feedback: feedbackDataObj?.tips || [],
          frameAnalysis: analysisDataObj?.frameAnalysis || [],
          videoUrl: session.video_url
        });

        // Process frame data for visualization - support both new and old data formats
        let processedFrames = [];
        
        if (analysisDataObj?.frameAnalysis && analysisDataObj.frameAnalysis.length > 0) {
          // New format with detailed frame analysis
          processedFrames = analysisDataObj.frameAnalysis.map((frame: any, index: number) => ({
            frameNumber: index + 1,
            timestamp: frame.timestamp || (index * 0.5),
            imageData: frame.imageData, // Include the actual frame image
            bodyRotation: frame.metrics?.bodyRotation || 0,
            stanceWidth: frame.metrics?.stanceWidth || 0.5,
            kneeFlexion: frame.metrics?.kneeFlexion || 45,
            balance: frame.metrics?.balanceScore || 50,
            poses: frame.poses || [],
            metrics: frame.metrics || {}
          }));
        } else if (analysisDataObj?.pose_analysis?.poseProgression) {
          // Fallback: convert old pose_analysis format to new format
          processedFrames = analysisDataObj.pose_analysis.poseProgression.map((frame: any, index: number) => ({
            frameNumber: index + 1,
            timestamp: frame.timestamp || (index * 2),
            bodyRotation: frame.bodyRotation || 0,
            stanceWidth: analysisDataObj.pose_analysis.avgStanceWidth || 0.5,
            kneeFlexion: analysisDataObj.pose_analysis.avgKneeFlexion || 45,
            balance: 50 + (index * 10), // Simulate variation
            poses: [{ 
              keypoints: [], 
              confidence: 0.8 
            }],
            metrics: {
              bodyRotation: frame.bodyRotation || 0,
              centerOfGravity: frame.centerOfGravity || { x: 50, y: 50 },
              stanceWidth: analysisDataObj.pose_analysis.avgStanceWidth || 0.5,
              kneeFlexion: analysisDataObj.pose_analysis.avgKneeFlexion || 45
            }
          }));
        }
        
        setFrameData(processedFrames);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechniqueStandards = async () => {
    try {
      const { data, error } = await supabase
        .from('technique_standards')
        .select('*')
        .eq('technique', 'bottom_turn')
        .eq('wave_type', 'beach_break');

      if (error) throw error;
      setStandards(data || []);
    } catch (error) {
      console.error('Error fetching standards:', error);
    }
  };

  const getIdealRange = (metricName: string, skillLevel: string) => {
    const standard = standards.find(s => 
      s.metric_name.toLowerCase() === metricName.toLowerCase().replace(' ', '_') && 
      s.skill_level === skillLevel
    );
    
    if (standard) {
      return `${standard.ideal_min}-${standard.ideal_max}${standard.units ? ' ' + standard.units : ''}`;
    }
    return "Loading...";
  };

  const getScoreStatus = (score: number, skillLevel: string) => {
    // Adjust expectations based on skill level
    const thresholds = {
      beginner: { excellent: 80, good: 60 },
      intermediate: { excellent: 85, good: 70 },
      advanced: { excellent: 90, good: 80 },
      pro: { excellent: 95, good: 90 }
    };
    
    const levels = thresholds[skillLevel as keyof typeof thresholds] || thresholds.beginner;
    
    if (score >= levels.excellent) return "excellent";
    if (score >= levels.good) return "good";
    return "warning";
  };

  if (loading) {
    return (
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading analysis results...</span>
          </div>
        </div>
      </section>
    );
  }

  if (!analysisData) {
    return (
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">No Analysis Yet</h2>
            <p className="text-xl text-muted-foreground">
              Upload and analyze a video to see your results here
            </p>
          </div>
        </div>
      </section>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-accent";
    if (score >= 75) return "text-primary";
    return "text-destructive";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "excellent":
        return <Badge className="bg-accent text-accent-foreground">Excellent</Badge>;
      case "good":
        return <Badge className="bg-primary text-primary-foreground">Good</Badge>;
      case "warning":
        return <Badge className="bg-destructive text-destructive-foreground">Needs Work</Badge>;
      default:
        return <Badge variant="secondary">Average</Badge>;
    }
  };

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">AI Analysis Results</h2>
            <p className="text-xl text-muted-foreground">
              Your bottom turn analysis - optimized for <span className="capitalize font-semibold">{analysisData.skillLevel}</span> level
            </p>
          </div>

        <div className="max-w-6xl mx-auto">
          {/* Overall Score */}
          <Card className="mb-8 shadow-wave">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Overall Bottom Turn Score</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-gradient-ocean animate-pulse-glow"></div>
                <div className="absolute inset-2 rounded-full bg-card flex items-center justify-center">
                  <span className="text-4xl font-bold text-primary">{analysisData.overallScore}</span>
                </div>
              </div>
              <p className="text-muted-foreground">
                {analysisData.overallScore >= 90 ? "Excellent technique!" : 
                 analysisData.overallScore >= 75 ? "Good technique! Keep practicing." : 
                 "Room for improvement. Focus on the highlighted areas."}
              </p>
            </CardContent>
          </Card>

          {/* Metrics Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {analysisData.metrics.map((metric: any, index: number) => {
              const status = getScoreStatus(metric.score, analysisData.skillLevel);
              const idealRange = getIdealRange(metric.name, analysisData.skillLevel);
              
              return (
                <Card key={index} className="shadow-wave hover:shadow-depth transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      {metric.name}
                      {getStatusBadge(status)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className={`text-2xl font-bold ${getScoreColor(metric.score)}`}>
                          {metric.score}%
                        </span>
                        {metric.score >= 85 ? (
                          <TrendingUp className="h-5 w-5 text-accent" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                      <Progress value={metric.score} className="h-2" />
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ideal for {analysisData.skillLevel}:</span>
                          <span>{idealRange}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pose Visualization */}
          {frameData.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-6">Frame-by-Frame Analysis</h3>
              <PoseVisualization 
                frames={frameData} 
                videoUrl={analysisData.videoUrl}
              />
            </div>
          )}

          {/* Performance Charts */}
          {frameData.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-6">Performance Visualization</h3>
              <MetricsChart 
                frameData={frameData}
                skillLevel={analysisData.skillLevel}
              />
            </div>
          )}

          {/* Feedback Cards */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold mb-6">Personalized Coaching Tips for {analysisData.skillLevel.charAt(0).toUpperCase() + analysisData.skillLevel.slice(1)} Level</h3>
            {analysisData.feedback.map((tip: string, index: number) => (
              <Card key={index} className="shadow-wave hover:shadow-depth transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
                      <Target className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="text-muted-foreground leading-relaxed">
                        {tip}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeedbackDashboard;