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
import { turnAnalyzer, TurnResult } from "@/utils/TurnAnalyzer";
import PoseVisualization from "./PoseVisualization";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PoseKeypoint } from "@/utils/poseDetection";

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
  const [turnResults, setTurnResults] = useState<TurnResult[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Helper function to generate mock pose keypoints for testing
  const generateMockPoseKeypoints = (frameIndex: number): PoseKeypoint[] => {
    // Generate realistic surf pose progression that simulates a bottom turn
    const totalFrames = 10;
    const progress = frameIndex / totalFrames; // 0 to 1
    
    // Simulate bottom turn progression: approach -> compression -> drive -> exit
    let kneeFlexion, torsoLean, rotation;
    
    if (progress < 0.3) {
      // Approach phase - neutral stance
      kneeFlexion = 160 + Math.sin(progress * Math.PI) * 10; // 150-170 degrees
      torsoLean = 5 + Math.random() * 5; // Slight lean
      rotation = 5 + Math.random() * 5; // Minimal rotation
    } else if (progress < 0.7) {
      // Compression phase - deep compression, lean, rotation
      const compressionProgress = (progress - 0.3) / 0.4;
      kneeFlexion = 160 - compressionProgress * 75; // 160 -> 85 degrees (deep compression)
      torsoLean = 5 + compressionProgress * 25; // 5 -> 30 degrees (lean into turn)
      rotation = 5 + compressionProgress * 20; // 5 -> 25 degrees (shoulders lead)
    } else {
      // Extension/exit phase - extending out of turn
      const exitProgress = (progress - 0.7) / 0.3;
      kneeFlexion = 85 + exitProgress * 60; // 85 -> 145 degrees (extending)
      torsoLean = 30 - exitProgress * 20; // 30 -> 10 degrees (straightening up)
      rotation = 25 - exitProgress * 15; // 25 -> 10 degrees (reducing rotation)
    }
    
    // Add some natural variation
    kneeFlexion += (Math.random() - 0.5) * 5;
    torsoLean += (Math.random() - 0.5) * 3;
    rotation += (Math.random() - 0.5) * 3;
    
    // Calculate positions based on angles
    const hipY = 50;
    const kneeY = 70;
    const ankleY = 90;
    const shoulderY = 30;
    
    // Simulate stance width variation during turn
    const stanceWidth = 0.3 + progress * 0.2; // Wider stance during compression
    const centerX = 50;
    
    return [
      // Shoulders - affected by torso lean
      { x: centerX - 15 - torsoLean * 0.3, y: shoulderY, confidence: 0.9, name: 'left_shoulder' },
      { x: centerX + 15 + torsoLean * 0.3, y: shoulderY, confidence: 0.9, name: 'right_shoulder' },
      
      // Hips - center of rotation
      { x: centerX - 10, y: hipY, confidence: 0.8, name: 'left_hip' },
      { x: centerX + 10, y: hipY, confidence: 0.8, name: 'right_hip' },
      
      // Knees - affected by compression and stance width
      { x: centerX - 10 - stanceWidth * 20, y: kneeY, confidence: 0.7, name: 'left_knee' },
      { x: centerX + 10 + stanceWidth * 20, y: kneeY, confidence: 0.7, name: 'right_knee' },
      
      // Ankles - follow knee positioning
      { x: centerX - 12 - stanceWidth * 25, y: ankleY, confidence: 0.6, name: 'left_ankle' },
      { x: centerX + 12 + stanceWidth * 25, y: ankleY, confidence: 0.6, name: 'right_ankle' }
    ];
  };

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

      let poseDetectorReady = false;
      try {
        await poseDetector.initialize();
        poseDetectorReady = true;
        console.log('✅ Pose detector initialized successfully');
      } catch (error) {
        console.warn('⚠️ Pose detector failed to initialize:', error);
        toast({
          title: "Pose detection unavailable",
          description: "Continuing with basic analysis",
          variant: "destructive"
        });
      }

      // Step 3: Analyze each frame
      const frameAnalysisResults: FramePoseAnalysis[] = [];
      const detectedTurns: TurnResult[] = [];
      
      // Reset turn analyzer for new video
      turnAnalyzer.reset();
      
      console.log(`🎬 Starting frame analysis for ${frames.length} frames`);
      
      const framesToProcess = Math.min(frames.length, 10); // Reduce to 10 frames for faster processing
      
      for (let i = 0; i < framesToProcess; i++) {
        const frame = frames[i];
        
        setAnalysisStep(`Analyzing frame ${i + 1}/${framesToProcess}...`);

        console.log(`🔍 Processing frame ${i + 1}/${framesToProcess}...`);
        
        let poseDetectionError = null;
        let poseResult = null;
        let metrics = null;
        let turnResult: TurnResult | null = null;
        
        if (poseDetectorReady) {
          try {
            // Add timeout to pose detection to prevent hanging
            const poseDetectionPromise = poseDetector.detectPose(frame.canvas);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Pose detection timeout')), 3000) // Reduced timeout
            );
            
            poseResult = await Promise.race([poseDetectionPromise, timeoutPromise]);
            
            if (poseResult && poseResult.keypoints.length > 0) {
              metrics = calculateSurfMetrics(poseResult.keypoints);
              
              // Process frame through turn analyzer with real pose data
              turnResult = turnAnalyzer.processFrame(poseResult.keypoints);
              if (turnResult) {
                detectedTurns.push(turnResult);
                console.log(`🏄 Turn detected at frame ${i + 1}:`, {
                  bottomScore: turnResult.bottom_turn.score,
                  topScore: turnResult.top_turn.score,
                  totalScore: turnResult.bottom_turn.score + turnResult.top_turn.score
                });
              }
            } else {
              poseDetectionError = 'No human pose detected in frame';
            }
          } catch (error: any) {
            poseDetectionError = `Pose detection failed: ${error.message}`;
            console.warn(`⚠️ Frame ${i + 1} pose detection error:`, error.message);
          }
        } else {
          // Generate mock pose data if pose detector isn't available
          const mockKeypoints = generateMockPoseKeypoints(i);
          metrics = calculateSurfMetrics(mockKeypoints);
          
          // Process mock data through turn analyzer
          turnResult = turnAnalyzer.processFrame(mockKeypoints);
          if (turnResult) {
            detectedTurns.push(turnResult);
            console.log(`🏄 Mock turn detected at frame ${i + 1}:`, {
              bottomScore: turnResult.bottom_turn.score,
              topScore: turnResult.top_turn.score,
              totalScore: turnResult.bottom_turn.score + turnResult.top_turn.score,
              state: turnAnalyzer.getCurrentState()
            });
          }
          
          poseDetectionError = 'Using simulated pose data (pose detector unavailable)';
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
        
        // Add turn result to frame data if detected
        if (turnResult) {
          (frameData as any).turnResult = turnResult;
        }
        
        frameAnalysisResults.push(frameData);
        
        // Update progress more frequently
        if (i % 2 === 0 || i === framesToProcess - 1) {
          toast({
            title: `Processing frames... ${i + 1}/${framesToProcess}`,
            description: `${frameAnalysisResults.filter(f => f.poses.length > 0).length} poses detected so far`
          });
        }
      }
      
      const framesWithPoses = frameAnalysisResults.filter(f => f.poses.length > 0).length;
      console.log(`🎯 Frame analysis complete: ${frameAnalysisResults.length} frames total, ${framesWithPoses} with poses, ${detectedTurns.length} turns detected`);
      
      // Log turn analyzer final state
      console.log(`🏄 TurnAnalyzer final state: ${turnAnalyzer.getCurrentState()}`);
      console.log(`🏄 All detected turns:`, detectedTurns.map(turn => ({
        bottomScore: turn.bottom_turn.score,
        topScore: turn.top_turn.score,
        total: turn.bottom_turn.score + turn.top_turn.score
      })));

      setFrameAnalysis(frameAnalysisResults);
      setTurnResults(detectedTurns);
      
      setAnalysisStep('Creating analysis session...');
      
      // Show immediate results to user
      toast({
        title: "Frame analysis complete!",
        description: `Processed ${frameAnalysisResults.length} frames, detected ${detectedTurns.length} turns`
      });

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
      
      // Upload video to storage with retry mechanism
      const fileName = `${user.id}/${session.id}-${videoFile.name}`;
      let uploadData = null;
      let uploadError = null;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          setAnalysisStep(`Uploading video... (attempt ${attempt}/${maxRetries})`);
          
          const result = await supabase.storage
            .from('surf-videos')
            .upload(fileName, videoFile);
          
          uploadData = result.data;
          uploadError = result.error;
          
          if (!uploadError) {
            break; // Success, exit retry loop
          }
          
          if (attempt < maxRetries) {
            toast({
              title: `Upload attempt ${attempt} failed`,
              description: `Retrying in ${attempt * 2} seconds...`,
              variant: "destructive"
            });
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          }
        } catch (error: any) {
          uploadError = { message: error.message || 'Network error during upload' };
          
          if (attempt < maxRetries) {
            toast({
              title: `Upload attempt ${attempt} failed`,
              description: `Network error. Retrying in ${attempt * 2} seconds...`,
              variant: "destructive"
            });
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          }
        }
      }
      
      if (uploadError) {
        throw new Error(`Upload failed after ${maxRetries} attempts: ${uploadError.message}`);
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
      console.log('🚀 Invoking analyze-surf-video function...');
      console.log('📊 Sending frame analysis data:', {
        sessionId: session.id,
        frameCount: frameAnalysisResults.length,
        turnCount: detectedTurns.length,
        skillLevel
      });
      
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-surf-video', {
        body: {
          sessionId: session.id,
          videoPath: uploadData.path,
          frameAnalysis: frameAnalysisResults,
          turnResults: detectedTurns,
          skillLevel
        }
      });

      console.log('📥 Analysis function response:', { analysisData, analysisError });

      if (analysisError) {
        console.error('Analysis error:', analysisError);
        setAnalysisError(`Analysis failed: ${analysisError.message}`);
        toast({
          title: "Analysis failed",
          description: analysisError.message || "Please try again",
          variant: "destructive"
        });
      } else {
        console.log('✅ Analysis completed successfully');
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
        {/* Show extracted frames if analysis is complete */}
        {frameAnalysis.length > 0 && (
          <div className="mt-8">
            <Card className="shadow-wave">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🏄 Turn Analysis Results 
                  <Badge variant="secondary">{turnResults.length} turns detected</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Current analyzer state: {turnAnalyzer.getCurrentState()}
                </p>
              </CardHeader>
              <CardContent>
                {turnResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {turnResults.map((turn, index) => (
                      <Card key={index} className="border-2">
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-3">Turn {index + 1}</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                              <span className="text-sm font-medium">Bottom Turn:</span>
                              <span className="font-bold text-blue-600">
                                {turn.bottom_turn.score}/10
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                              <span className="text-sm font-medium">Top Turn:</span>
                              <span className="font-bold text-green-600">
                                {turn.top_turn.score}/10
                              </span>
                            </div>
                            <div className="pt-2 border-t border-gray-200">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold">Total Score:</span>
                                <span className="text-lg font-bold text-primary">
                                  {turn.bottom_turn.score + turn.top_turn.score}/20
                                </span>
                              </div>
                            </div>
                            
                            {/* Turn Details */}
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>Compression: {turn.bottom_turn.snapshot.knee.toFixed(1)}°</div>
                              <div>Torso Lean: {turn.bottom_turn.snapshot.torso.toFixed(1)}°</div>
                              <div>Rotation: {turn.bottom_turn.snapshot.rot.toFixed(1)}°</div>
                              <div>Frames: BT({turn.bottom_turn.frames}) TT({turn.top_turn.frames})</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No complete turns detected yet.</p>
                    <p className="text-sm mt-2">
                      Current state: {turnAnalyzer.getCurrentState()}
                    </p>
                    <p className="text-xs mt-1">
                      The analyzer looks for: compression → lean → rotation → extension sequence
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <PoseVisualization frames={frameAnalysis} videoUrl={videoUrl} />
          </div>
        )}
      </div>
    </section>
  );
};

export default VideoUpload;