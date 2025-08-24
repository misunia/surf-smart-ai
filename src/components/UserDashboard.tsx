import { useState } from 'react';
import VideoUpload from './VideoUpload';
import { VideoGallery } from './VideoGallery';
import { TestUpload } from './TestUpload';
import { ReferenceLibrary } from './ReferenceLibrary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Grid, User } from 'lucide-react';

export const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Dashboard Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Surf Analysis Dashboard</h1>
        <p className="text-xl text-muted-foreground">
          Upload videos, track progress, and improve your surfing with AI
        </p>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Video
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <Grid className="w-4 h-4" />
            My Videos
          </TabsTrigger>
          <TabsTrigger value="references" className="flex items-center gap-2">
            <Grid className="w-4 h-4" />
            Pro References
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            System Test
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <VideoUpload />
        </TabsContent>

        <TabsContent value="gallery" className="space-y-6">
          <VideoGallery />
        </TabsContent>

        <TabsContent value="references" className="space-y-6">
          <ReferenceLibrary />
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <TestUpload />
        </TabsContent>
      </Tabs>
    </div>
  );
};