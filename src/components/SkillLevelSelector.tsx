import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, TrendingUp, Award, Crown } from "lucide-react";

interface SkillLevel {
  value: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface SkillLevelSelectorProps {
  onSkillLevelSelect: (skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'pro') => void;
  selectedSkillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'pro';
}

const SkillLevelSelector = ({ onSkillLevelSelect, selectedSkillLevel }: SkillLevelSelectorProps) => {
  const skillLevels: SkillLevel[] = [
    {
      value: 'beginner',
      label: 'Beginner',
      description: 'Learning to catch waves and stand up',
      icon: <User className="h-5 w-5" />,
      color: 'bg-blue-500/10 text-blue-600 border-blue-200'
    },
    {
      value: 'intermediate',
      label: 'Intermediate', 
      description: 'Comfortable riding waves, learning turns',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'bg-green-500/10 text-green-600 border-green-200'
    },
    {
      value: 'advanced',
      label: 'Advanced',
      description: 'Executing complex maneuvers with confidence',
      icon: <Award className="h-5 w-5" />,
      color: 'bg-orange-500/10 text-orange-600 border-orange-200'
    },
    {
      value: 'pro',
      label: 'Professional',
      description: 'Competition level or coaching others',
      icon: <Crown className="h-5 w-5" />,
      color: 'bg-purple-500/10 text-purple-600 border-purple-200'
    }
  ];

  return (
    <Card className="shadow-wave">
      <CardHeader>
        <CardTitle className="text-center">Select Your Skill Level</CardTitle>
        <p className="text-center text-muted-foreground">
          This helps us provide personalized analysis and feedback
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {skillLevels.map((level) => (
          <Button
            key={level.value}
            variant={selectedSkillLevel === level.value ? "default" : "outline"}
            className={`w-full h-auto p-4 justify-start ${
              selectedSkillLevel === level.value ? '' : 'hover:bg-muted/50'
            }`}
            onClick={() => onSkillLevelSelect(level.value)}
          >
            <div className="flex items-center gap-4 w-full">
              <div className={`p-2 rounded-lg ${level.color}`}>
                {level.icon}
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold">{level.label}</div>
                <div className="text-sm text-muted-foreground">{level.description}</div>
              </div>
              {selectedSkillLevel === level.value && (
                <Badge className="bg-primary text-primary-foreground">Selected</Badge>
              )}
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};

export default SkillLevelSelector;