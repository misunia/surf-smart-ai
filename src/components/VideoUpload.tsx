import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, Play, Scissors, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import SkillLevelSelector from "./SkillLevelSelector";
import { supabase } from "@/integrations/supabase/client";

const VideoUpload = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'pro' | null>(null);
  const [showSkillSelector, setShowSkillSelector] = useState(false);
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

    setIsAnalyzing(true);
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Create analysis session in database
      const { data: session, error } = await supabase
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

      if (error) throw error;

      // Simulate AI analysis
      setTimeout(async () => {
        // Update session with mock results
        await supabase
          .from('analysis_sessions')
          .update({
            status: 'completed',
            overall_score: Math.floor(Math.random() * 30) + 70, // 70-100
            analysis_data: {
              metrics: [
                { name: "Turn Completion", score: Math.floor(Math.random() * 20) + 80 },
                { name: "Body Rotation", score: Math.floor(Math.random() * 25) + 75 },
                { name: "Weight Distribution", score: Math.floor(Math.random() * 30) + 70 },
                { name: "Rail Engagement", score: Math.floor(Math.random() * 20) + 80 }
              ]
            },
            feedback_data: {
              tips: [
                "Focus on completing your turn arc for better flow",
                "Your body rotation timing is good for " + skillLevel + " level"
              ]
            }
          })
          .eq('id', session.id);

        setIsAnalyzing(false);
        toast({
          title: "Analysis complete!",
          description: "Check your technique feedback below",
        });
      }, 3000);
    } catch (error) {
      setIsAnalyzing(false);
      toast({
        title: "Analysis failed",
        description: "Please try again",
        variant: "destructive"
      });
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
                             Analyzing...
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
                    <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Video preview will appear here</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default VideoUpload;