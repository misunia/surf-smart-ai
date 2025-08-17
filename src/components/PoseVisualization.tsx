import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Pause, SkipBack, SkipForward, Eye, AlertTriangle } from 'lucide-react';

interface PoseFrame {
  frameNumber: number;
  timestamp: number;
  imageData?: string; // base64 frame image
  poses: Array<{
    keypoints: Array<{ x: number; y: number; confidence: number; name: string }>;
    confidence: number;
  }>;
  metrics: {
    bodyRotation: number;
    centerOfGravity: { x: number; y: number };
    stanceWidth: number;
    kneeFlexion: number;
  };
  poseDetectionError?: string; // Error message when pose detection fails
}

interface PoseVisualizationProps {
  frames: PoseFrame[];
  videoUrl?: string;
}

const PoseVisualization: React.FC<PoseVisualizationProps> = ({ frames, videoUrl }) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPoseOverlay, setShowPoseOverlay] = useState(true);

  const currentFrame = frames[currentFrameIndex];

  const handleNext = () => {
    setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
  };

  const handlePrevious = () => {
    setCurrentFrameIndex((prev) => (prev - 1 + frames.length) % frames.length);
  };

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      const interval = setInterval(() => {
        setCurrentFrameIndex((prev) => {
          const next = (prev + 1) % frames.length;
          if (next === 0) {
            setIsPlaying(false);
            clearInterval(interval);
          }
          return next;
        });
      }, 200);
    }
  };

  const drawPoseKeypoints = (keypoints: Array<{ x: number; y: number; confidence: number; name: string }>) => {
    if (!keypoints || keypoints.length === 0) return null;

    // Define pose connections for drawing skeleton
    const connections = [
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_elbow'],
      ['left_elbow', 'left_wrist'],
      ['right_shoulder', 'right_elbow'],
      ['right_elbow', 'right_wrist'],
      ['left_shoulder', 'left_hip'],
      ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'],
      ['left_hip', 'left_knee'],
      ['left_knee', 'left_ankle'],
      ['right_hip', 'right_knee'],
      ['right_knee', 'right_ankle']
    ];

    return (
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Draw connections */}
        {connections.map(([start, end], index) => {
          const startPoint = keypoints.find(kp => kp.name === start);
          const endPoint = keypoints.find(kp => kp.name === end);
          
          if (startPoint && endPoint && startPoint.confidence > 0.5 && endPoint.confidence > 0.5) {
            return (
              <line
                key={index}
                x1={startPoint.x}
                y1={startPoint.y}
                x2={endPoint.x}
                y2={endPoint.y}
                stroke="hsl(var(--accent))"
                strokeWidth="0.5"
                opacity="0.8"
              />
            );
          }
          return null;
        })}
        
        {/* Draw keypoints */}
        {keypoints.map((keypoint, index) => {
          if (keypoint.confidence > 0.5) {
            return (
              <circle
                key={index}
                cx={keypoint.x}
                cy={keypoint.y}
                r="1"
                fill="hsl(var(--primary))"
                stroke="hsl(var(--primary-foreground))"
                strokeWidth="0.2"
              />
            );
          }
          return null;
        })}
        
        {/* Center of gravity indicator */}
        {currentFrame?.metrics?.centerOfGravity && (
          <circle
            cx={currentFrame.metrics.centerOfGravity.x}
            cy={currentFrame.metrics.centerOfGravity.y}
            r="2"
            fill="hsl(var(--destructive))"
            opacity="0.8"
          />
        )}
      </svg>
    );
  };

  if (!frames || frames.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">No pose data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Frame Viewer */}
      <Card className="shadow-wave">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pose Analysis Frames</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPoseOverlay(!showPoseOverlay)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPoseOverlay ? 'Hide' : 'Show'} Pose
              </Button>
              <Badge variant="secondary">
                Frame {currentFrameIndex + 1} / {frames.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden mb-4">
            {/* Real frame image or placeholder */}
            {currentFrame?.imageData ? (
              <img 
                src={currentFrame.imageData} 
                alt={`Frame ${currentFrameIndex + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-ocean">
                <div className="text-center text-primary-foreground">
                  <p className="text-sm mb-2">Frame {currentFrameIndex + 1}</p>
                  <p className="text-xs opacity-75">
                    Timestamp: {currentFrame?.timestamp?.toFixed(2)}s
                  </p>
                </div>
              </div>
            )}
            
            {/* Pose overlay */}
            {showPoseOverlay && currentFrame?.poses?.[0]?.keypoints && (
              drawPoseKeypoints(currentFrame.poses[0].keypoints)
            )}
          </div>

          {/* Pose Detection Error Alert */}
          {currentFrame?.poseDetectionError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Pose Detection Failed:</strong> {currentFrame.poseDetectionError}
              </AlertDescription>
            </Alert>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevious}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handlePlay}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Frame Metrics */}
      <Card className="shadow-wave">
        <CardHeader>
          <CardTitle>Frame {currentFrameIndex + 1} Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Body Rotation</p>
              <p className="text-lg font-semibold text-primary">
                {currentFrame?.metrics?.bodyRotation?.toFixed(1)}°
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Stance Width</p>
              <p className="text-lg font-semibold text-primary">
                {currentFrame?.metrics?.stanceWidth?.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Knee Flexion</p>
              <p className="text-lg font-semibold text-primary">
                {currentFrame?.metrics?.kneeFlexion?.toFixed(1)}°
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Pose Confidence</p>
              <p className="text-lg font-semibold text-primary">
                {((currentFrame?.poses?.[0]?.confidence || 0) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PoseVisualization;