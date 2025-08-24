import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Loader2, Waves } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    // Only check auth after loading is complete
    if (!loading) {
      setHasCheckedAuth(true);
      
      // Give more time for auth to settle, especially on first load
      const timeoutId = setTimeout(() => {
        if (!user) {
          console.log('🚪 AuthGuard: No user found after auth check, redirecting to /auth');
          navigate('/auth', { replace: true });
        }
      }, 1000); // Increased delay to 1 second
      
      return () => clearTimeout(timeoutId);
    }
  }, [user, loading, navigate]);

  // Show loading state while auth is being checked
  if (loading || !hasCheckedAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-ocean">
        <div className="text-center text-white">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Waves className="h-8 w-8 animate-bounce" />
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <p className="text-lg font-medium">Loading SurfCoach AI...</p>
          <p className="text-sm opacity-75 mt-2">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If we have a user, show the protected content
  if (user) {
    return <>{children}</>;
  }

  // Show a brief loading state before redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-ocean">
      <div className="text-center text-white">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Waves className="h-8 w-8 animate-bounce" />
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <p className="text-lg font-medium">Redirecting to sign in...</p>
      </div>
    </div>
  );
};

export default AuthGuard;