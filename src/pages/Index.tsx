import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeatureSection from "@/components/FeatureSection";
import VideoUpload from "@/components/VideoUpload";
import FeedbackDashboard from "@/components/FeedbackDashboard";
import ValidationSurvey from "@/components/ValidationSurvey";

const Index = () => {
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
