import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, Play, Scissors, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import SkillLevelSelector from "./SkillLevelSelector";
import { supabase } from "@/integrations/supabase/client";
import { extractFramesFromVideo } from "@/utils/frameExtraction";
import { poseDetector, calculateSurfMetrics, FramePoseAnalysis } from "@/utils/poseDetection";
import PoseVisualization from "./PoseVisualization";
import { Alert, AlertDescription } from "@/components/ui/alert";

const VideoUpload = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'pro' | null>(null);
  const [showSkillSelector, setShowSkillSelector] = useState(false);
  const [frameAnalysis, setFrameAnalysis] = useState<FramePoseAnalysis[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileSelect = useCallback((file: File) => {
    if (file.type.startsWith('video/')) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      
      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          toast({
            title: "Video uploaded successfully!",
            description: "Ready for AI analysis",
          });
        }
      }, 200);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload an MP4 video file",
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleSkillLevelSelect = (level: 'beginner' | 'intermediate' | 'advanced' | 'pro') => {
    setSkillLevel(level);
    setShowSkillSelector(false);
    toast({
      title: "Skill level selected!",
      description: `Analysis will be optimized for ${level} level`,
    });
  };

  const startAnalysis = async () => {
    if (!skillLevel) {
      setShowSkillSelector(true);
      toast({
        title: "Select your skill level first",
        description: "This helps us provide personalized feedback",
        variant: "destructive"
      });
      return;
    }

    if (!videoFile) {
      toast({
        title: "No video file",
        description: "Please upload a video first",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisComplete(false);
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Step 1: Extract frames client-side
      setAnalysisStep('Extracting video frames...');
      toast({
        title: "Extracting frames...",
        description: "Processing your video frames"
      });

      const frames = await extractFramesFromVideo(videoFile, 100);
      
      // Step 2: Initialize pose detection
      setAnalysisStep('Initializing AI models...');
      toast({
        title: "Initializing AI analysis...",
        description: "Loading pose detection models"
      });

      await poseDetector.initialize();

      // Step 3: Analyze each frame
      const frameAnalysisResults: FramePoseAnalysis[] = [];
      console.log(`🎬 Starting frame analysis for ${frames.length} frames`);
      
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        
        setAnalysisStep(`Analyzing frame ${i + 1}/${frames.length}...`);
        toast({
          title: `Analyzing frame ${i + 1}/${frames.length}...`,
          description: "Running pose detection"
        });

        console.log(`🔍 Processing frame ${i + 1}/${frames.length}...`);
        
        let poseDetectionError = null;
        let poseResult = null;
        let metrics = null;
        
        try {
          console.log(`🤖 Attempting pose detection on frame ${i + 1}...`);
          poseResult = await poseDetector.detectPose(frame.canvas);
          
          if (poseResult && poseResult.keypoints.length > 0) {
            console.log(`✅ Pose detected on frame ${i + 1} with ${poseResult.keypoints.length} keypoints`);
            metrics = calculateSurfMetrics(poseResult.keypoints);
            console.log(`📊 Surf metrics calculated for frame ${i + 1}:`, {
              bodyRotation: metrics.bodyRotation,
              stanceWidth: metrics.stanceWidth,
              kneeFlexion: metrics.kneeFlexion
            });
          } else {
            poseDetectionError = 'No human pose detected in frame';
            console.log(`⚠️ Frame ${i + 1}: ${poseDetectionError}`);
          }
        } catch (error) {
          poseDetectionError = `Pose detection failed: ${error.message}`;
          console.error(`❌ Frame ${i + 1} pose detection error:`, error);
        }
        
        // Always add frame data, regardless of pose detection success
        const frameData: FramePoseAnalysis = {
          frameNumber: frame.frameNumber,
          timestamp: frame.timestamp,
          imageData: frame.imageData, // Always include the frame image
          poses: poseResult ? [poseResult] : [],
          metrics: metrics || {
            bodyRotation: 0,
            centerOfGravity: { x: 0, y: 0 },
            stanceWidth: 0,
            kneeFlexion: 0
          },
          poseDetectionError: poseDetectionError || undefined
        };
        
        frameAnalysisResults.push(frameData);
        
        if (poseDetectionError) {
          console.log(`📋 Frame ${i + 1} added without pose data: ${poseDetectionError}`);
        } else {
          console.log(`✅ Frame ${i + 1} processed successfully with complete pose data`);
        }
      }
      
      console.log(`🎯 Frame analysis complete: ${frameAnalysisResults.length} frames total`);
      console.log(`📈 Frames with poses: ${frameAnalysisResults.filter(f => f.poses.length > 0).length}`);
      console.log(`⚠️ Frames without poses: ${frameAnalysisResults.filter(f => f.poses.length === 0).length}`);

      setFrameAnalysis(frameAnalysisResults);
      
      setAnalysisStep('Creating analysis session...');
      // Create analysis session in database
      const { data: session, error: sessionError } = await supabase
        .from('analysis_sessions')
        .insert({
          user_id: user.id,
          technique: 'bottom_turn',
          wave_type: 'beach_break',
          skill_level: skillLevel,
          status: 'processing'
        })
        .select()
        .single();

      if (sessionError || !session) {
        throw new Error('Failed to create analysis session');
      }

      setAnalysisStep('Uploading video...');
      // Upload video to storage
      const fileName = `${user.id}/${session.id}-${videoFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('surf-videos')
        .upload(fileName, videoFile);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Update session with video URL
      const { error: updateError } = await supabase
        .from('analysis_sessions')
        .update({ video_url: uploadData.path })
        .eq('id', session.id);

      if (updateError) {
        throw new Error('Failed to update session');
      }

      setAnalysisStep('Running AI analysis...');
      // Start AI analysis with pre-processed frame data
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-surf-video', {
        body: {
          sessionId: session.id,
          videoPath: uploadData.path,
          frameAnalysis: frameAnalysisResults,
          skillLevel
        }
      });

      if (analysisError) {
        console.error('Analysis error:', analysisError);
        setAnalysisError(`Analysis failed: ${analysisError.message}`);
        toast({
          title: "Analysis failed",
          description: analysisError.message || "Please try again",
          variant: "destructive"
        });
      } else {
        setAnalysisComplete(true);
        setAnalysisStep('Analysis complete!');
        toast({
          title: "Analysis complete!",
          description: "Check your technique feedback below",
        });
      }

    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Unknown error occurred');
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section className="py-24 bg-muted/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Upload Your Surf Video</h2>
          <p className="text-xl text-muted-foreground">
            Get instant AI feedback on all your surf techniques
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Skill Level Selector */}
          {showSkillSelector && (
            <div className="lg:col-span-2 mb-6">
              <SkillLevelSelector 
                onSkillLevelSelect={handleSkillLevelSelect}
                selectedSkillLevel={skillLevel || undefined}
              />
            </div>
          )}
          {/* Upload Section */}
          <Card className="shadow-wave">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Video Upload
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!videoFile ? (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors duration-300 cursor-pointer bg-card/50"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => document.getElementById('video-input')?.click()}
                >
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Drop your video here</h3>
                  <p className="text-muted-foreground mb-4">
                    Or click to browse your files
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports MP4 files up to 500MB
                  </p>
                  <input
                    id="video-input"
                    type="file"
                    accept="video/mp4"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {videoFile.name}
                    </span>
                    <CheckCircle className="h-5 w-5 text-accent" />
                  </div>
                  
                  {uploadProgress < 100 ? (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                   ) : (
                     <div className="space-y-3">
                       {skillLevel && (
                         <div className="text-sm text-muted-foreground text-center mb-2">
                           Analysis level: <span className="font-medium capitalize">{skillLevel}</span>
                         </div>
                       )}
                       <Button 
                         variant="wave" 
                         className="w-full" 
                         onClick={startAnalysis}
                         disabled={isAnalyzing}
                       >
                         {isAnalyzing ? (
                           <>
                             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                             {analysisStep || 'Analyzing...'}
                           </>
                         ) : (
                           <>
                             <Play className="mr-2 h-4 w-4" />
                             Start AI Analysis
                           </>
                         )}
                       </Button>
                      
                      <Button variant="outline" className="w-full">
                        <Scissors className="mr-2 h-4 w-4" />
                        Trim Video
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Video Preview */}
          <Card className="shadow-wave">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Video Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {videoUrl ? (
                <div className="relative">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full rounded-lg shadow-depth"
                    poster="/placeholder.svg"
                  >
                    Your browser does not support the video tag.
                  </video>
                  
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <div className="text-center text-primary-foreground">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-foreground mx-auto mb-4"></div>
                        <p className="font-semibold">AI Analysis in Progress</p>
                        <p className="text-sm opacity-90">Detecting pose and analyzing technique...</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <p className="font-semibold">{analysisStep || 'AI Analysis in Progress'}</p>
                    <p className="text-sm opacity-90">Please wait, this may take a few minutes...</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Show extracted frames if analysis is complete */}
        {frameAnalysis.length > 0 && (
          <div className="mt-8">
            <PoseVisualization frames={frameAnalysis} videoUrl={videoUrl} />
          </div>
        )}
      </div>
    </section>
  );
    {/* Analysis Status */}
    {(isAnalyzing || analysisComplete || analysisError) && (
      <div className="mt-8 max-w-4xl mx-auto">
        <Card className="shadow-wave">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isAnalyzing && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>}
              {analysisComplete && <CheckCircle className="h-5 w-5 text-green-600" />}
              {analysisError && <AlertCircle className="h-5 w-5 text-red-600" />}
              Analysis Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isAnalyzing && (
              <div className="space-y-4">
                <p className="text-lg font-medium">{analysisStep}</p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Your video is being processed with AI pose detection. This includes:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Extracting key frames from your video</li>
                    <li>• Running pose detection on each frame</li>
                    <li>• Calculating surf-specific metrics</li>
                    <li>• Generating personalized feedback</li>
                  </ul>
                </div>
              </div>
            )}
            
            {analysisComplete && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Analysis completed successfully! Your results are being saved and will appear in your video gallery.
                </AlertDescription>
              </Alert>
            )}
            
            {analysisError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {analysisError}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    )}
};

export default VideoUpload;