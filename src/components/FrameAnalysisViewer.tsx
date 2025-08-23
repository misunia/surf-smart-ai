import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { extractFramesFromVideo } from '@/utils/frameExtraction';
import { poseDetector, calculateSurfMetrics, type FramePoseAnalysis } from '@/utils/poseDetection';
import { Play, Download, Eye, Zap } from 'lucide-react';

interface ReferenceVideo {
  id: string;
  title: string;
  surfer_name: string;
  video_url: string;
  technique: string;
  analysis_data?: any;
}

interface CriticalFrame {
  frameNumber: number;
  timestamp: number;
  imageData: string;
  phase: string;
  importance: number;
  metrics: any;
}

interface FrameAnalysisViewerProps {
  video: ReferenceVideo;
}

export const FrameAnalysisViewer = ({ video }: FrameAnalysisViewerProps) => {
  const [frames, setFrames] = useState<CriticalFrame[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFrame, setSelectedFrame] = useState<CriticalFrame | null>(null);
  const { toast } = useToast();

  const identifyCriticalPhases = (frameAnalyses: FramePoseAnalysis[]): CriticalFrame[] => {
    const criticalFrames: CriticalFrame[] = [];
    
    if (frameAnalyses.length === 0) return criticalFrames;

    // Bottom turn phases based on body rotation and stance
    const phases = [
      { name: 'Approach', range: [0, 0.2], description: 'Approaching the wave face' },
      { name: 'Setup', range: [0.2, 0.4], description: 'Setting up body position' },
      { name: 'Compression', range: [0.4, 0.6], description: 'Compressing into the turn' },
      { name: 'Drive', range: [0.6, 0.8], description: 'Driving through the bottom' },
      { name: 'Exit', range: [0.8, 1.0], description: 'Exiting toward the lip' }
    ];

    phases.forEach((phase, index) => {
      const startIdx = Math.floor(phase.range[0] * frameAnalyses.length);
      const endIdx = Math.floor(phase.range[1] * frameAnalyses.length);
      
      // Find the frame with best metrics in this phase
      let bestFrame = frameAnalyses[startIdx];
      let bestScore = 0;
      
      for (let i = startIdx; i < Math.min(endIdx, frameAnalyses.length); i++) {
        const frame = frameAnalyses[i];
        if (frame.metrics) {
          // Score based on pose confidence and metric quality
          const score = (
            (frame.poses[0]?.confidence || 0) * 0.5 +
            (1 - Math.abs(frame.metrics.bodyRotation) / 180) * 0.3 +
            (frame.metrics.kneeFlexion > 10 ? 0.2 : 0) // Reward proper knee bend
          );
          
          if (score > bestScore) {
            bestScore = score;
            bestFrame = frame;
          }
        }
      }

      if (bestFrame && bestFrame.poses[0]) {
        criticalFrames.push({
          frameNumber: bestFrame.frameNumber,
          timestamp: bestFrame.timestamp,
          imageData: '', // Will be filled when extracting frames
          phase: phase.name,
          importance: bestScore,
          metrics: bestFrame.metrics
        });
      }
    });

    return criticalFrames.sort((a, b) => b.importance - a.importance);
  };

  const extractCriticalFrames = async () => {
    setLoading(true);
    setProgress(0);

    try {
      // Fetch video and extract frames
      setProgress(20);
      const response = await fetch(video.video_url, { mode: 'cors' });
      if (!response.ok) throw new Error('Failed to fetch video');
      
      const blob = await response.blob();
      const file = new File([blob], 'video.mp4', { type: 'video/mp4' });
      
      setProgress(40);
      
      // Extract more frames for better analysis (12 frames)
      const extractedFrames = await extractFramesFromVideo(file, 12);
      setProgress(60);

      // Initialize pose detection
      await poseDetector.initialize();
      setProgress(70);

      // Analyze all frames
      const frameAnalyses: FramePoseAnalysis[] = [];
      
      for (let i = 0; i < extractedFrames.length; i++) {
        try {
          const poseResult = await poseDetector.detectPose(extractedFrames[i].canvas);
          
          if (poseResult && poseResult.keypoints.length > 0) {
            const metrics = calculateSurfMetrics(poseResult.keypoints);
            
            frameAnalyses.push({
              frameNumber: extractedFrames[i].frameNumber,
              timestamp: extractedFrames[i].timestamp,
              poses: [poseResult],
              metrics
            });
          }
        } catch (error) {
          console.error(`Error analyzing frame ${i}:`, error);
        }
        
        setProgress(70 + (i / extractedFrames.length) * 20);
      }

      setProgress(90);

      // Identify critical frames
      const critical = identifyCriticalPhases(frameAnalyses);
      
      // Add image data to critical frames
      const criticalWithImages = critical.map(criticalFrame => {
        const originalFrame = extractedFrames.find(f => f.frameNumber === criticalFrame.frameNumber);
        return {
          ...criticalFrame,
          imageData: originalFrame?.imageData || ''
        };
      });

      setFrames(criticalWithImages);
      setProgress(100);
      
      toast({
        title: "Analysis complete",
        description: `Extracted ${criticalWithImages.length} critical maneuver frames`
      });

    } catch (error) {
      console.error('Error extracting critical frames:', error);
      toast({
        title: "Error",
        description: "Failed to extract critical frames",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const getPhaseColor = (phase: string) => {
    const colors = {
      'Approach': 'bg-blue-500',
      'Setup': 'bg-yellow-500', 
      'Compression': 'bg-orange-500',
      'Drive': 'bg-red-500',
      'Exit': 'bg-green-500'
    };
    return colors[phase as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Critical Maneuver Analysis: {video.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Analyzing {video.surfer_name}'s {video.technique} technique frame by frame
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={extractCriticalFrames} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {loading ? 'Analyzing...' : 'Extract Critical Frames'}
            </Button>
            
            {loading && (
              <div className="flex-1">
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-muted-foreground mt-1">
                  {progress < 40 ? 'Loading video...' :
                   progress < 70 ? 'Extracting frames...' :
                   progress < 90 ? 'Analyzing poses...' : 'Finalizing...'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {frames.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Frame Gallery */}
          <Card>
            <CardHeader>
              <CardTitle>Critical Maneuver Frames</CardTitle>
              <p className="text-sm text-muted-foreground">
                Key phases of the bottom turn technique
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {frames.map((frame, index) => (
                  <div 
                    key={index}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      selectedFrame?.frameNumber === frame.frameNumber 
                        ? 'border-primary shadow-lg' 
                        : 'border-muted hover:border-muted-foreground'
                    }`}
                    onClick={() => setSelectedFrame(frame)}
                  >
                    <img 
                      src={frame.imageData} 
                      alt={`${frame.phase} phase`}
                      className="w-full h-24 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <Badge 
                        className={`text-xs ${getPhaseColor(frame.phase)} text-white`}
                        variant="secondary"
                      >
                        {frame.phase}
                      </Badge>
                      <p className="text-xs text-white mt-1">
                        {formatTimestamp(frame.timestamp)}
                      </p>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge variant="outline" className="text-xs bg-white/90">
                        #{frame.frameNumber}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Frame Details */}
          {selectedFrame && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge className={`${getPhaseColor(selectedFrame.phase)} text-white`}>
                    {selectedFrame.phase}
                  </Badge>
                  Phase Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video rounded-lg overflow-hidden">
                  <img 
                    src={selectedFrame.imageData} 
                    alt={`${selectedFrame.phase} phase detail`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-muted-foreground">Timestamp</p>
                    <p>{formatTimestamp(selectedFrame.timestamp)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground">Frame #</p>
                    <p>{selectedFrame.frameNumber}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground">Importance Score</p>
                    <p>{(selectedFrame.importance * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground">Body Rotation</p>
                    <p>{selectedFrame.metrics?.bodyRotation?.toFixed(1)}°</p>
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground">Knee Flexion</p>
                    <p>{selectedFrame.metrics?.kneeFlexion?.toFixed(1)}°</p>
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground">Stance Width</p>
                    <p>{selectedFrame.metrics?.stanceWidth?.toFixed(1)}px</p>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    This frame represents the {selectedFrame.phase.toLowerCase()} phase of the bottom turn, 
                    showing {selectedFrame.phase === 'Compression' ? 'the surfer compressing into the turn with proper knee flexion' :
                             selectedFrame.phase === 'Drive' ? 'maximum drive through the bottom of the wave' :
                             selectedFrame.phase === 'Setup' ? 'proper body positioning for the turn entry' :
                             selectedFrame.phase === 'Approach' ? 'the initial approach to the wave face' :
                             'the exit trajectory toward the lip'}.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};