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
    if (!loading && !user) {
      navigate('/auth');
    }
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