import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Loader2, Waves } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if we're sure the user is not authenticated
    // Add a small delay to prevent premature redirects during auth state changes
    const timeoutId = setTimeout(() => {
      if (!loading && !user) {
        console.log('🚪 AuthGuard: No auth found, redirecting to /auth');
        navigate('/auth', { replace: true });
      }
    }, 100); // Small delay to prevent race conditions
    
    return () => clearTimeout(timeoutId);
  }, [user, loading, navigate]);

  // Don't redirect immediately, give auth time to settle
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

  // Show loading state briefly while auth settles
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-ocean">
        <div className="text-center text-white">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Waves className="h-8 w-8 animate-bounce" />
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <p className="text-lg font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;