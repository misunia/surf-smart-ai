import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const handleAuthChange = (event: string, session: any) => {
      if (!mounted) return;
      
      console.log('🔐 Auth state changed:', event, session?.user?.email);
      
      // Clear any pending loading timeout
      if (timeoutId) clearTimeout(timeoutId);
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Create user profile if it's a new signup
      if (event === 'SIGNED_IN' && session?.user) {
        // Only create profile for new users, not existing ones
        setTimeout(() => {
          createUserProfileIfNotExists(session.user);
        }, 0);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Get initial session with retry logic for rate limiting
    const getInitialSession = async (retryCount = 0) => {
      if (!mounted) return;
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('❌ Error getting session:', error);
          
          // If rate limited, retry after delay
          if (error.message?.includes('rate limit') && retryCount < 3) {
            console.log(`⏰ Rate limited, retrying in ${(retryCount + 1) * 2} seconds...`);
            timeoutId = setTimeout(() => {
              getInitialSession(retryCount + 1);
            }, (retryCount + 1) * 2000);
            return;
          }
        }
        
        console.log('✅ Initial session check:', session?.user?.email || 'No session');
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
      } catch (err) {
        console.error('❌ Unexpected error getting session:', err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Start initial session check
    getInitialSession();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const createUserProfileIfNotExists = async (user: User) => {
    try {
      // First check if profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected for new users
        console.error('Error checking existing profile:', checkError);
        return;
      }
      
      if (existingProfile) {
        console.log('✅ User profile already exists, skipping creation');
        return;
      }
      
      // Create new profile only if it doesn't exist
      console.log('🆕 Creating new user profile for:', user.email);
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          skill_level: 'beginner'
        });
      
      if (error) {
        if (error.code === '23505') {
          console.log('✅ Profile already exists (race condition), ignoring duplicate error');
        } else {
          console.error('❌ Error creating user profile:', error);
        }
      } else {
        console.log('✅ User profile created successfully');
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('❌ Network error in createUserProfileIfNotExists:', error);
        toast({
          title: "Network Error",
          description: "Unable to connect to the server. Please check your internet connection or try again later.",
          variant: "destructive",
        });
      } else {
        console.error('❌ Unexpected error in createUserProfileIfNotExists:', error);
      }
    }
  };

  // Keep the old function name for backward compatibility but make it safe
  const createUserProfile = async (user: User) => {
    try {
      // Check if profile exists first
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (existingProfile) {
        console.log('✅ User profile already exists');
        return;
      }
      
      // Create profile with upsert to handle race conditions
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          skill_level: 'beginner'
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: true
        });
      
      if (error) {
        console.error('Error creating user profile:', error);
      } else {
        console.log('✅ User profile created/updated successfully');
      }
    } catch (error) {
      console.error('❌ Unexpected error creating user profile:', error);
    }
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    signUp,
    signIn,
    signOut,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};