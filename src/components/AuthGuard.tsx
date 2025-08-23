import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Loader2, Waves } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if we're absolutely sure there's no auth
    const timeoutId = setTimeout(async () => {
      if (!loading && !user) {
        // Double-check with Supabase directly before redirecting
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log('✅ AuthGuard: Found session, not redirecting');
            return;
          }
        } catch (error) {
          console.error('❌ AuthGuard: Error checking session:', error);
        }
        
        console.log('🚪 AuthGuard: No auth found, redirecting to /auth');
        navigate('/auth', { replace: true });
      } else if (user) {
        console.log('✅ AuthGuard: User authenticated:', user.email);
      }
    }, 5000); // 5 seconds - very conservative

    return () => clearTimeout(timeoutId);
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-ocean">
        <div className="text-center text-white">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Waves className="h-8 w-8 animate-bounce" />
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <p className="text-lg font-medium">Loading SurfCoach AI...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth page
  }

  return <>{children}</>;
};

export default AuthGuard;