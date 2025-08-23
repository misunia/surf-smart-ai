import { useState } from 'react';
import VideoUpload from './VideoUpload';
import { VideoGallery } from './VideoGallery';
import { TestUpload } from './TestUpload';
import { ReferenceLibrary } from './ReferenceLibrary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Grid, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const UserDashboard = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* User Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Surf Analysis Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Upload videos and track your surfing progress.
          </p>
        </div>
        <Card className="w-fit">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <CardTitle className="text-sm">Account</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-2">{user?.email}</p>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
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