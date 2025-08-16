import { Button } from "@/components/ui/button";
import { Play, Upload, BarChart3 } from "lucide-react";
import heroImage from "@/assets/hero-surf-coach.jpg";

const HeroSection = () => {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-ocean relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary-light rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-32 right-16 w-48 h-48 bg-accent-light rounded-full blur-3xl animate-wave"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-primary rounded-full blur-2xl animate-pulse-glow"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="text-center lg:text-left">
            <div className="mb-6">
              <span className="inline-block px-4 py-2 bg-accent text-accent-foreground rounded-full text-sm font-medium shadow-coral">
                AI-Powered Surf Coaching
              </span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight text-primary-foreground">
              Perfect Your{" "}
              <span className="bg-gradient-sunset bg-clip-text text-transparent">
                Surf Technique
              </span>
            </h1>
            
            <p className="text-xl text-primary-foreground/90 mb-8 leading-relaxed">
              Upload your surf videos and get instant AI feedback on all your techniques. 
              Master takeoffs, turns, cutbacks and more with visual pose analysis and personalized coaching.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <Button variant="hero" size="lg" className="text-lg px-8">
                <Upload className="mr-2 h-5 w-5" />
                Upload Video
              </Button>
              <Button variant="coral" size="lg" className="text-lg px-8">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-primary-foreground/20">
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">10,000+</div>
                <div className="text-sm text-primary-foreground/80">Videos Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">95%</div>
                <div className="text-sm text-primary-foreground/80">Accuracy Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">24/7</div>
                <div className="text-sm text-primary-foreground/80">AI Coach</div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Hero Image */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl shadow-depth">
              <img 
                src={heroImage} 
                alt="SurfPilot AI analyzing surf technique with pose detection"
                className="w-full h-auto transform hover:scale-105 transition-transform duration-700"
              />
              {/* Overlay UI Elements */}
              <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 shadow-wave">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">AI Analysis Active</span>
                </div>
              </div>
              
              <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 shadow-wave">
                <div className="text-sm">
                  <div className="font-medium text-accent">Technique Score</div>
                  <div className="text-2xl font-bold text-primary">87%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;