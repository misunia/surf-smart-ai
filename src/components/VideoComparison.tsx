import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { extractFramesFromVideo } from '@/utils/frameExtraction';
import { Upload, Play, Pause, RotateCcw, Users, Camera } from 'lucide-react';

interface ReferenceVideo {
  id: string;
  title: string;
  surfer_name: string;
  video_url: string;
  technique: string;
}

interface VideoFrame {
  frameNumber: number;
  timestamp: number;
  imageData: string;
  phase: string;
}

interface VideoComparisonProps {
  referenceVideo: ReferenceVideo;
}

export const VideoComparison = ({ referenceVideo }: VideoComparisonProps) => {
  const [userVideo, setUserVideo] = useState<File | null>(null);
  const [referenceFrames, setReferenceFrames] = useState<VideoFrame[]>([]);
  const [userFrames, setUserFrames] = useState<VideoFrame[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const phases = [
    { name: 'Approach', color: 'bg-blue-500', description: 'Approaching the wave face' },
    { name: 'Setup', color: 'bg-yellow-500', description: 'Setting up body position' },
    { name: 'Compression', color: 'bg-orange-500', description: 'Compressing into the turn' },
    { name: 'Drive', color: 'bg-red-500', description: 'Driving through the bottom' },
    { name: 'Exit', color: 'bg-green-500', description: 'Exiting toward the lip' }
  ];

  const extractMatchingFrames = async (videoFile: File, isReference: boolean = false) => {
    const numFrames = 10; // Extract 10 frames for 5 phases (2 per phase)
    const extractedFrames = await extractFramesFromVideo(videoFile, numFrames);
    
    const matchedFrames: VideoFrame[] = [];
    
    phases.forEach((phase, index) => {
      // Take 2 frames per phase
      const frameIndex1 = index * 2;
      const frameIndex2 = index * 2 + 1;
      
      if (extractedFrames[frameIndex1]) {
        matchedFrames.push({
          frameNumber: extractedFrames[frameIndex1].frameNumber,
          timestamp: extractedFrames[frameIndex1].timestamp,
          imageData: extractedFrames[frameIndex1].imageData,
          phase: phase.name
        });
      }
      
      if (extractedFrames[frameIndex2]) {
        matchedFrames.push({
          frameNumber: extractedFrames[frameIndex2].frameNumber,
          timestamp: extractedFrames[frameIndex2].timestamp,
          imageData: extractedFrames[frameIndex2].imageData,
          phase: phase.name
        });
      }
    });
    
    return matchedFrames;
  };

  const processVideos = async () => {
    if (!userVideo) return;
    
    setLoading(true);
    setProgress(0);

    try {
      // Extract reference video frames
      setProgress(20);
      const refResponse = await fetch(referenceVideo.video_url, { mode: 'cors' });
      if (!refResponse.ok) throw new Error('Failed to fetch reference video');
      
      const refBlob = await refResponse.blob();
      const refFile = new File([refBlob], 'reference.mp4', { type: 'video/mp4' });
      
      setProgress(40);
      const refFrames = await extractMatchingFrames(refFile, true);
      setReferenceFrames(refFrames);
      
      setProgress(70);
      // Extract user video frames to match reference timing
      const userFrames = await extractMatchingFrames(userVideo, false);
      setUserFrames(userFrames);
      
      setProgress(100);
      
      toast({
        title: "Comparison ready",
        description: `Videos synchronized with ${phases.length} key phases`
      });
      
    } catch (error) {
      console.error('Error processing videos:', error);
      toast({
        title: "Error",
        description: "Failed to process videos for comparison",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setUserVideo(file);
    } else {
      toast({
        title: "Invalid file",
        description: "Please select a video file",
        variant: "destructive"
      });
    }
  };

  const playComparison = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    
    setIsPlaying(true);
    let phaseIndex = 0;
    
    const interval = setInterval(() => {
      if (phaseIndex >= phases.length) {
        setIsPlaying(false);
        clearInterval(interval);
        return;
      }
      
      setCurrentPhase(phaseIndex);
      phaseIndex++;
    }, 2000); // 2 seconds per phase
  };

  const resetComparison = () => {
    setCurrentPhase(0);
    setIsPlaying(false);
  };

  const getFramesForPhase = (frames: VideoFrame[], phaseName: string) => {
    return frames.filter(frame => frame.phase === phaseName);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Video Comparison: {referenceVideo.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Compare your technique with {referenceVideo.surfer_name}'s professional execution
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!userVideo ? (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Upload Your Video</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your {referenceVideo.technique} video to compare with the reference
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Select Video File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium">Selected: {userVideo.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(userVideo.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              <Button 
                onClick={processVideos} 
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                {loading ? 'Processing...' : 'Analyze Comparison'}
              </Button>
            </div>
          )}
          
          {loading && (
            <div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">
                {progress < 30 ? 'Loading videos...' :
                 progress < 60 ? 'Extracting reference frames...' :
                 progress < 90 ? 'Matching user video...' : 'Finalizing comparison...'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {referenceFrames.length > 0 && userFrames.length > 0 && (
        <div className="space-y-6">
          {/* Playback Controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-4">
                <Button onClick={playComparison} variant="outline">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? 'Pause' : 'Play'} Comparison
                </Button>
                <Button onClick={resetComparison} variant="outline">
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Phase:</span>
                  <Badge className={`${phases[currentPhase]?.color} text-white`}>
                    {phases[currentPhase]?.name || 'Complete'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Phase Navigation */}
          <div className="grid grid-cols-5 gap-2">
            {phases.map((phase, index) => (
              <Button
                key={phase.name}
                variant={currentPhase === index ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPhase(index)}
                className="text-xs"
              >
                {phase.name}
              </Button>
            ))}
          </div>

          {/* Video Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reference Video */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Professional Reference</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {referenceVideo.surfer_name} - {phases[currentPhase]?.name} Phase
                </p>
              </CardHeader>
              <CardContent>
                {(() => {
                  const phaseFrames = getFramesForPhase(referenceFrames, phases[currentPhase]?.name || '');
                  const displayFrame = phaseFrames[0];
                  
                  return displayFrame ? (
                    <div className="space-y-4">
                      <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={displayFrame.imageData} 
                          alt={`Reference ${phases[currentPhase]?.name}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Frame #{displayFrame.frameNumber}</p>
                        <p>Time: {displayFrame.timestamp.toFixed(1)}s</p>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                      <p className="text-muted-foreground">No frame available</p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* User Video */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Technique</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Your {referenceVideo.technique} - {phases[currentPhase]?.name} Phase
                </p>
              </CardHeader>
              <CardContent>
                {(() => {
                  const phaseFrames = getFramesForPhase(userFrames, phases[currentPhase]?.name || '');
                  const displayFrame = phaseFrames[0];
                  
                  return displayFrame ? (
                    <div className="space-y-4">
                      <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={displayFrame.imageData} 
                          alt={`Your ${phases[currentPhase]?.name}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Frame #{displayFrame.frameNumber}</p>
                        <p>Time: {displayFrame.timestamp.toFixed(1)}s</p>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                      <p className="text-muted-foreground">No frame available</p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Phase Description */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Badge className={`${phases[currentPhase]?.color} text-white mb-2`}>
                  {phases[currentPhase]?.name} Phase
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {phases[currentPhase]?.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};