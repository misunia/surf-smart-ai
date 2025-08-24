import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeatureSection from "@/components/FeatureSection";
import VideoUpload from "@/components/VideoUpload";
import FeedbackDashboard from "@/components/FeedbackDashboard";
import ValidationSurvey from "@/components/ValidationSurvey";
import { UserDashboard } from "@/components/UserDashboard";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show dashboard for authenticated users
  if (user) {
    return (
      <div className="min-h-screen">
        <Header />
        <UserDashboard />
      </div>
    );
  }

  // Show marketing page for non-authenticated users
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <FeatureSection />
      <VideoUpload />
      <FeedbackDashboard />
      <ValidationSurvey />
    </div>
  );
};

export default Index;
