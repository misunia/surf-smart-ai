import { Card, CardContent } from "@/components/ui/card";
import { Upload, Eye, Target, MessageSquare } from "lucide-react";
import poseAnalysisImage from "@/assets/pose-analysis-demo.jpg";

const FeatureSection = () => {
  const features = [
    {
      icon: Upload,
      title: "Easy Video Upload",
      description: "Drag & drop MP4 videos or record directly. Automatically trim to focus on your bottom turn moments.",
      color: "text-primary"
    },
    {
      icon: Eye,
      title: "AI Pose Analysis",
      description: "Advanced computer vision detects your body position and movement patterns during the critical turn phases.",
      color: "text-accent"
    },
    {
      icon: Target,
      title: "Visual Feedback",
      description: "See exactly where to improve with overlay graphics showing ideal vs. actual body positioning.",
      color: "text-primary-light"
    },
    {
      icon: MessageSquare,
      title: "Instant Coaching",
      description: "Get personalized tips and drills based on your specific technique analysis and improvement areas.",
      color: "text-accent-light"
    }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-foreground">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload your surf video and let our AI coach analyze your bottom turn technique in seconds
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Features List */}
          <div className="space-y-8">
            {features.map((feature, index) => (
              <div key={index} className="flex gap-4 group">
                <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-card shadow-wave flex items-center justify-center ${feature.color} group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-card-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Demo Image */}
          <div className="relative">
            <Card className="overflow-hidden shadow-depth hover:shadow-wave transition-all duration-500">
              <CardContent className="p-0">
                <img 
                  src={poseAnalysisImage} 
                  alt="AI pose analysis demonstration showing surfer with skeleton overlay"
                  className="w-full h-auto"
                />
                {/* Overlay Elements */}
                <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-sm font-medium text-primary">Pose Detection Active</div>
                  <div className="text-xs text-muted-foreground">Analyzing body position...</div>
                </div>
                
                <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Shoulder Angle</div>
                  <div className="text-lg font-bold text-accent">42°</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Process Steps */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center group">
            <div className="w-16 h-16 bg-gradient-ocean rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <span className="text-2xl font-bold text-primary-foreground">1</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Upload Video</h3>
            <p className="text-muted-foreground">Drop your surf session MP4 file</p>
          </div>
          
          <div className="text-center group">
            <div className="w-16 h-16 bg-gradient-wave rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <span className="text-2xl font-bold text-primary-foreground">2</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">AI Analysis</h3>
            <p className="text-muted-foreground">Get instant pose detection feedback</p>
          </div>
          
          <div className="text-center group">
            <div className="w-16 h-16 bg-gradient-sunset rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <span className="text-2xl font-bold text-accent-foreground">3</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Improve</h3>
            <p className="text-muted-foreground">Apply personalized coaching tips</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;