import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const TestUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<{
    auth: boolean;
    storage: boolean;
    database: boolean;
  } | null>(null);

  const runTests = async () => {
    setTesting(true);
    setTestResults(null);
    
    const results = {
      auth: false,
      storage: false,
      database: false
    };

    try {
      // Test 1: Authentication
      if (user) {
        results.auth = true;
        toast({
          title: "✅ Auth Test Passed",
          description: `Logged in as ${user.email}`
        });
      } else {
        toast({
          title: "❌ Auth Test Failed",
          description: "Please sign in first",
          variant: "destructive"
        });
      }

      // Test 2: Database Access
      try {
        const { data, error } = await supabase
          .from('analysis_sessions')
          .select('id')
          .limit(1);
        
        if (!error) {
          results.database = true;
          toast({
            title: "✅ Database Test Passed",
            description: "Successfully connected to database"
          });
        }
      } catch (error) {
        toast({
          title: "❌ Database Test Failed",
          description: "Could not connect to database",
          variant: "destructive"
        });
      }

      // Test 3: Storage Access (bucket via objects list)
      try {
        const { data, error } = await supabase.storage
          .from('surf-videos')
          .list('', { limit: 1 });
        
        if (!error) {
          results.storage = true;
          toast({
            title: "✅ Storage Test Passed",
            description: "surf-videos bucket is accessible"
          });
        } else {
          toast({
            title: "❌ Storage Test Failed",
            description: error.message || "Bucket not accessible",
            variant: "destructive"
          });
        }
      } catch (error: any) {
        toast({
          title: "❌ Storage Test Failed",
          description: error?.message || "Could not access storage",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setTestResults(results);
      setTesting(false);
    }
  };

  const getIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          System Test
        </CardTitle>
        <CardDescription>
          Test authentication, database, and storage connectivity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTests} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            'Run System Tests'
          )}
        </Button>

        {testResults && (
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm">Authentication</span>
              {getIcon(testResults.auth)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Database Access</span>
              {getIcon(testResults.database)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Storage Access</span>
              {getIcon(testResults.storage)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};