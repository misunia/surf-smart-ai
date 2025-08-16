import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ValidationSurvey = () => {
  const [ratings, setRatings] = useState({
    helpful: 0,
    accuracy: 0,
    willUseAgain: 0
  });
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const questions = [
    {
      id: "helpful",
      label: "How helpful was this feedback?",
      description: "Rate the usefulness of the AI coaching tips"
    },
    {
      id: "accuracy",
      label: "How accurate was the pose analysis?",
      description: "Did the AI correctly identify your technique?"
    },
    {
      id: "willUseAgain",
      label: "Would you use this tool again?",
      description: "Likelihood to use for future surf sessions"
    }
  ];

  const handleStarClick = (questionId: string, rating: number) => {
    setRatings(prev => ({
      ...prev,
      [questionId]: rating
    }));
  };

  const handleSubmit = () => {
    if (Object.values(ratings).some(rating => rating === 0)) {
      toast({
        title: "Please complete all ratings",
        description: "Rate all aspects before submitting",
        variant: "destructive"
      });
      return;
    }

    setSubmitted(true);
    toast({
      title: "Thank you for your feedback!",
      description: "Your input helps us improve the AI coach",
    });
  };

  const StarRating = ({ rating, onRate, questionId }: { rating: number; onRate: (id: string, rating: number) => void; questionId: string }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRate(questionId, star)}
          className="transition-colors duration-200 hover:scale-110 transform"
        >
          <Star
            className={`h-6 w-6 ${
              star <= rating 
                ? "fill-accent text-accent" 
                : "text-muted-foreground hover:text-accent/50"
            }`}
          />
        </button>
      ))}
    </div>
  );

  if (submitted) {
    return (
      <section className="py-24 bg-muted/50">
        <div className="container mx-auto px-6">
          <Card className="max-w-2xl mx-auto shadow-wave text-center">
            <CardContent className="p-12">
              <div className="w-16 h-16 bg-gradient-sunset rounded-full flex items-center justify-center mx-auto mb-6">
                <Send className="h-8 w-8 text-accent-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Feedback Submitted!</h3>
              <p className="text-muted-foreground mb-6">
                Thank you for helping us improve SurfPilot. Your feedback is invaluable 
                for making better AI coaching tools for the surf community.
              </p>
              <Button variant="hero" onClick={() => window.location.reload()}>
                Analyze Another Video
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 bg-muted/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Help Us Improve</h2>
          <p className="text-xl text-muted-foreground">
            Quick feedback to make SurfPilot even better
          </p>
        </div>

        <Card className="max-w-4xl mx-auto shadow-wave">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              How was your experience?
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-8">
              {/* Rating Questions */}
              {questions.map((question) => (
                <div key={question.id} className="space-y-3">
                  <div>
                    <Label className="text-lg font-semibold">{question.label}</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {question.description}
                    </p>
                  </div>
                  <StarRating
                    rating={ratings[question.id as keyof typeof ratings]}
                    onRate={handleStarClick}
                    questionId={question.id}
                  />
                </div>
              ))}

              {/* Text Feedback */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">
                  What would you improve? (Optional)
                </Label>
                <Textarea
                  placeholder="Share any suggestions or additional feedback..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-6">
                <Button 
                  variant="hero" 
                  size="lg" 
                  onClick={handleSubmit}
                  className="px-12"
                >
                  <Send className="mr-2 h-5 w-5" />
                  Submit Feedback
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default ValidationSurvey;