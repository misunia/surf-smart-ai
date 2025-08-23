import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { extractFramesFromVideo } from '@/utils/frameExtraction';
import { poseDetector, calculateSurfMetrics, type FramePoseAnalysis } from '@/utils/poseDetection';
import { Play, Upload, Trash2, FileVideo, Link } from 'lucide-react';

interface ReferenceVideo {
  id: string;
  title: string;
  surfer_name: string;
  video_url: string;
  wave_type: string;
  technique: string;
  quality_score: number;
  analysis_data?: any;
  created_at: string;
}

export const ReferenceLibrary = () => {
  const [referenceVideos, setReferenceVideos] = useState<ReferenceVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    surfer_name: '',
    video_url: '',
    wave_type: 'beach_break',
    quality_score: 9
  });
  const { toast } = useToast();

  useEffect(() => {
    loadReferenceVideos();
  }, []);

  const loadReferenceVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('reference_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferenceVideos(data || []);
    } catch (error) {
      console.error('Error loading reference videos:', error);
      toast({
        title: "Error loading videos",
        description: "Failed to load reference videos",
        variant: "destructive"
      });
    }
  };

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        setSelectedFile(file);
        setFormData({ ...formData, video_url: '' }); // Clear URL when file is selected
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a video file",
          variant: "destructive"
        });
      }
    }
  }, [formData, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      setFormData({ ...formData, video_url: '' }); // Clear URL when file is selected
    }
  };

  const uploadFileToStorage = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${file.name}`;
    
    const { data, error } = await supabase.storage
      .from('reference-videos')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('reference-videos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const processVideoFile = async (file: File): Promise<any> => {
    setUploadProgress(10);
    
    try {
      // Extract frames directly from file
      const frames = await extractFramesFromVideo(file, 8);
      setUploadProgress(50);

      // Initialize pose detector
      await poseDetector.initialize();
      setUploadProgress(60);

      // Analyze each frame
      const frameAnalyses: FramePoseAnalysis[] = [];
      const allMetrics = {
        bodyRotation: [],
        stanceWidth: [],
        kneeFlexion: []
      };

      for (let i = 0; i < frames.length; i++) {
        try {
          const poseResult = await poseDetector.detectPose(frames[i].canvas);
          
          if (poseResult && poseResult.keypoints.length > 0) {
            const metrics = calculateSurfMetrics(poseResult.keypoints);
            
            allMetrics.bodyRotation.push(metrics.bodyRotation);
            allMetrics.stanceWidth.push(metrics.stanceWidth);
            allMetrics.kneeFlexion.push(metrics.kneeFlexion);

            frameAnalyses.push({
              frameNumber: frames[i].frameNumber,
              timestamp: frames[i].timestamp,
              poses: [poseResult],
              metrics
            });
          }
        } catch (error) {
          console.error(`Error analyzing frame ${i}:`, error);
        }
      }

      setUploadProgress(90);

      // Calculate aggregate statistics
      const calculateStats = (values: number[]) => {
        if (values.length === 0) return { avg: 0, std: 0, min: 0, max: 0 };
        
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
        const std = Math.sqrt(variance);
        
        return {
          avg,
          std,
          min: Math.min(...values),
          max: Math.max(...values)
        };
      };

      const analysisData = {
        frameAnalyses,
        aggregateMetrics: {
          bodyRotation: calculateStats(allMetrics.bodyRotation),
          stanceWidth: calculateStats(allMetrics.stanceWidth),
          kneeFlexion: calculateStats(allMetrics.kneeFlexion)
        },
        totalFrames: frames.length,
        successfulAnalyses: frameAnalyses.length
      };

      setUploadProgress(100);
      return analysisData;

    } catch (error) {
      console.error('Error processing video file:', error);
      if (error instanceof Error) {
        throw new Error(`Video processing failed: ${error.message}`);
      } else {
        throw new Error('Video processing failed: Unknown error occurred');
      }
    }
  };

  const processVideoAndExtractMetrics = async (videoUrl: string): Promise<any> => {
    setUploadProgress(10);
    
    try {
      // Create video element to download the video
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          console.log('Video metadata loaded successfully');
          resolve(null);
        };
        video.onerror = (error) => {
          console.error('Video loading error:', error);
          reject(new Error('Failed to load video. Please check the URL and CORS settings.'));
        };
        video.onabort = () => {
          reject(new Error('Video loading was aborted'));
        };
        
        // Add timeout
        setTimeout(() => {
          reject(new Error('Video loading timeout. Please try again.'));
        }, 10000);
      });

      setUploadProgress(30);

      // Convert video to blob for frame extraction
      const response = await fetch(videoUrl, {
        mode: 'cors',
        headers: {
          'Accept': 'video/*'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const file = new File([blob], 'reference-video.mp4', { type: 'video/mp4' });

      setUploadProgress(50);

      // Extract frames
      const frames = await extractFramesFromVideo(file, 8);
      setUploadProgress(70);

      // Initialize pose detector
      await poseDetector.initialize();

      // Analyze each frame
      const frameAnalyses: FramePoseAnalysis[] = [];
      const allMetrics = {
        bodyRotation: [],
        stanceWidth: [],
        kneeFlexion: []
      };

      for (let i = 0; i < frames.length; i++) {
        try {
          const poseResult = await poseDetector.detectPose(frames[i].canvas);
          
          if (poseResult && poseResult.keypoints.length > 0) {
            const metrics = calculateSurfMetrics(poseResult.keypoints);
            
            allMetrics.bodyRotation.push(metrics.bodyRotation);
            allMetrics.stanceWidth.push(metrics.stanceWidth);
            allMetrics.kneeFlexion.push(metrics.kneeFlexion);

            frameAnalyses.push({
              frameNumber: frames[i].frameNumber,
              timestamp: frames[i].timestamp,
              poses: [poseResult],
              metrics
            });
          }
        } catch (error) {
          console.error(`Error analyzing frame ${i}:`, error);
        }
      }

      setUploadProgress(90);

      // Calculate aggregate statistics
      const calculateStats = (values: number[]) => {
        if (values.length === 0) return { avg: 0, std: 0, min: 0, max: 0 };
        
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
        const std = Math.sqrt(variance);
        
        return {
          avg,
          std,
          min: Math.min(...values),
          max: Math.max(...values)
        };
      };

      const analysisData = {
        frameAnalyses,
        aggregateMetrics: {
          bodyRotation: calculateStats(allMetrics.bodyRotation),
          stanceWidth: calculateStats(allMetrics.stanceWidth),
          kneeFlexion: calculateStats(allMetrics.kneeFlexion)
        },
        totalFrames: frames.length,
        successfulAnalyses: frameAnalyses.length
      };

      setUploadProgress(100);
      return analysisData;

    } catch (error) {
      console.error('Error processing video:', error);
      if (error instanceof Error) {
        throw new Error(`Video processing failed: ${error.message}`);
      } else {
        throw new Error('Video processing failed: Unknown error occurred');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUploadProgress(0);

    try {
      let videoUrl = formData.video_url;
      let analysisData;

      if (selectedFile) {
        // Upload file to storage first
        videoUrl = await uploadFileToStorage(selectedFile);
        // Process the uploaded file directly
        analysisData = await processVideoFile(selectedFile);
      } else {
        // Validate URL
        new URL(formData.video_url);
        // Process video from URL
        analysisData = await processVideoAndExtractMetrics(formData.video_url);
      }

      // Save to database
      const { error } = await supabase
        .from('reference_videos')
        .insert({
          title: formData.title,
          surfer_name: formData.surfer_name,
          video_url: videoUrl,
          wave_type: formData.wave_type,
          technique: 'bottom_turn',
          quality_score: formData.quality_score,
          analysis_data: analysisData
        });

      if (error) throw error;

      toast({
        title: "Reference video added",
        description: `Successfully analyzed ${analysisData.successfulAnalyses} frames from ${formData.title}`
      });

      setFormData({
        title: '',
        surfer_name: '',
        video_url: '',
        wave_type: 'beach_break',
        quality_score: 9
      });
      setSelectedFile(null);

      await loadReferenceVideos();

    } catch (error) {
      console.error('Error adding reference video:', error);
      toast({
        title: "Error adding video",
        description: error instanceof Error ? error.message : "Failed to add reference video",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const deleteReferenceVideo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reference_videos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Video deleted",
        description: "Reference video removed from library"
      });

      await loadReferenceVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: "Error deleting video",
        description: "Failed to delete reference video",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Professional Reference Library</h2>
        <Badge variant="outline">
          {referenceVideos.length} Reference Videos
        </Badge>
      </div>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Add Professional Bottom Turn Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Video metadata fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Video Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Perfect Bottom Turn - Pipeline"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="surfer_name">Professional Surfer</Label>
                <Input
                  id="surfer_name"
                  value={formData.surfer_name}
                  onChange={(e) => setFormData({ ...formData, surfer_name: e.target.value })}
                  placeholder="e.g., Kelly Slater"
                  required
                />
              </div>
            </div>

            {/* Upload method tabs */}
            <Tabs defaultValue="url" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Video URL
                </TabsTrigger>
                <TabsTrigger value="file" className="flex items-center gap-2">
                  <FileVideo className="h-4 w-4" />
                  Upload File
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="url" className="space-y-2">
                <Label htmlFor="video_url">Video URL</Label>
                <Input
                  id="video_url"
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => {
                    setFormData({ ...formData, video_url: e.target.value });
                    setSelectedFile(null); // Clear file when URL is entered
                  }}
                  placeholder="https://example.com/video.mp4"
                  required={!selectedFile}
                />
              </TabsContent>
              
              <TabsContent value="file" className="space-y-2">
                <Label>Upload Video File</Label>
                <div
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive 
                      ? 'border-primary bg-primary/10' 
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2">
                    <FileVideo className="h-8 w-8 mx-auto text-muted-foreground" />
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium">Drop video file here or click to browse</p>
                        <p className="text-xs text-muted-foreground">Supports MP4, MOV, AVI, and other video formats</p>
                      </div>
                    )}
                  </div>
                  {selectedFile && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setSelectedFile(null)}
                    >
                      Remove File
                    </Button>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="wave_type">Wave Type</Label>
                <Select value={formData.wave_type} onValueChange={(value) => setFormData({ ...formData, wave_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beach_break">Beach Break</SelectItem>
                    <SelectItem value="point_break">Point Break</SelectItem>
                    <SelectItem value="reef_break">Reef Break</SelectItem>
                    <SelectItem value="river_mouth">River Mouth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="quality_score">Quality Score (1-10)</Label>
                <Input
                  id="quality_score"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.quality_score}
                  onChange={(e) => setFormData({ ...formData, quality_score: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing video...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading || (!formData.video_url && !selectedFile)} 
              className="w-full"
            >
              {loading ? 'Analyzing Video...' : 'Add Reference Video'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Reference Videos List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {referenceVideos.map((video) => (
          <Card key={video.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg line-clamp-2">{video.title}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteReferenceVideo(video.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{video.surfer_name}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{video.wave_type}</Badge>
                <Badge variant="outline">Score: {video.quality_score}/10</Badge>
              </div>
              
              {video.analysis_data && (
                <div className="text-xs space-y-1">
                  <div>Frames analyzed: {video.analysis_data.successfulAnalyses}/{video.analysis_data.totalFrames}</div>
                  {video.analysis_data.aggregateMetrics && (
                    <div className="space-y-1">
                      <div>Avg Body Rotation: {video.analysis_data.aggregateMetrics.bodyRotation?.avg?.toFixed(1)}°</div>
                      <div>Avg Stance Width: {video.analysis_data.aggregateMetrics.stanceWidth?.avg?.toFixed(2)}</div>
                      <div>Avg Knee Flexion: {video.analysis_data.aggregateMetrics.kneeFlexion?.avg?.toFixed(1)}°</div>
                    </div>
                  )}
                </div>
              )}
              
              <Button variant="outline" size="sm" className="w-full" asChild>
                <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                  <Play className="h-4 w-4 mr-2" />
                  Watch Video
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {referenceVideos.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No reference videos yet</h3>
            <p className="text-muted-foreground">Add professional bottom turn videos to build the training dataset.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};