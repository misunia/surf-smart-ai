import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, AlertCircle, CheckCircle2 } from "lucide-react";

const FeedbackDashboard = () => {
  const analysisData = {
    overallScore: 87,
    metrics: [
      { name: "Shoulder Rotation", score: 92, ideal: "45-55°", actual: "52°", status: "good" },
      { name: "Knee Bend", score: 78, ideal: "90-120°", actual: "135°", status: "warning" },
      { name: "Board Lean", score: 85, ideal: "30-40°", actual: "38°", status: "good" },
      { name: "Weight Distribution", score: 94, ideal: "60/40", actual: "58/42", status: "excellent" }
    ],
    feedback: [
      {
        type: "improvement",
        title: "Reduce Knee Bend",
        description: "Your knee bend is too extreme at 135°. Try to keep it between 90-120° for better control.",
        icon: AlertCircle,
        priority: "high"
      },
      {
        type: "success",
        title: "Perfect Shoulder Position",
        description: "Excellent shoulder rotation at 52°. This is helping you generate great speed through the turn.",
        icon: CheckCircle2,
        priority: "low"
      },
      {
        type: "tip",
        title: "Weight Distribution",
        description: "Your 58/42 weight distribution is excellent. This is generating optimal board response.",
        icon: Target,
        priority: "medium"
      }
    ]
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-accent";
    if (score >= 75) return "text-primary";
    return "text-destructive";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "excellent":
        return <Badge className="bg-accent text-accent-foreground">Excellent</Badge>;
      case "good":
        return <Badge className="bg-primary text-primary-foreground">Good</Badge>;
      case "warning":
        return <Badge className="bg-destructive text-destructive-foreground">Needs Work</Badge>;
      default:
        return <Badge variant="secondary">Average</Badge>;
    }
  };

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">AI Analysis Results</h2>
          <p className="text-xl text-muted-foreground">
            Your bottom turn technique breakdown with personalized feedback
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Overall Score */}
          <Card className="mb-8 shadow-wave">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Overall Bottom Turn Score</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-gradient-ocean animate-pulse-glow"></div>
                <div className="absolute inset-2 rounded-full bg-card flex items-center justify-center">
                  <span className="text-4xl font-bold text-primary">{analysisData.overallScore}</span>
                </div>
              </div>
              <p className="text-muted-foreground">
                Great technique! Focus on knee bend for improvement.
              </p>
            </CardContent>
          </Card>

          {/* Metrics Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {analysisData.metrics.map((metric, index) => (
              <Card key={index} className="shadow-wave hover:shadow-depth transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {metric.name}
                    {getStatusBadge(metric.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold ${getScoreColor(metric.score)}">
                        {metric.score}%
                      </span>
                      {metric.score >= 85 ? (
                        <TrendingUp className="h-5 w-5 text-accent" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    <Progress value={metric.score} className="h-2" />
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ideal:</span>
                        <span>{metric.ideal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Your:</span>
                        <span className="font-medium">{metric.actual}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Feedback Cards */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold mb-6">Personalized Coaching Tips</h3>
            {analysisData.feedback.map((item, index) => (
              <Card key={index} className="shadow-wave hover:shadow-depth transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                      item.type === 'success' ? 'bg-accent/10 text-accent' :
                      item.type === 'improvement' ? 'bg-destructive/10 text-destructive' :
                      'bg-primary/10 text-primary'
                    }`}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-lg font-semibold">{item.title}</h4>
                        <Badge variant={item.priority === 'high' ? 'destructive' : 'secondary'}>
                          {item.priority} priority
                        </Badge>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeedbackDashboard;