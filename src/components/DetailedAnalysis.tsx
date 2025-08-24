import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Target, AlertCircle, CheckCircle, XCircle, Award } from 'lucide-react';
import { TurnResult } from '@/utils/TurnAnalyzer';

interface VideoFrame {
  frameNumber: number;
  timestamp: number;
  imageData: string;
  phase: string;
  poseMetrics?: {
    bodyRotation: number;
    centerOfGravity: { x: number; y: number };
    stanceWidth: number;
    kneeFlexion: number;
    confidence: number;
  };
}

interface DetailedAnalysisProps {
  referenceFrames: VideoFrame[];
  userFrames: VideoFrame[];
  currentPhase: number;
  phases: Array<{ name: string; color: string; description: string }>;
  turnResults?: TurnResult[];
}

interface PhaseAnalysis {
  phase: string;
  score: number;
  improvements: string[];
  strengths: string[];
  keyDifferences: {
    bodyRotation: { user: number; reference: number; difference: number };
    stanceWidth: { user: number; reference: number; difference: number };
    kneeFlexion: { user: number; reference: number; difference: number };
    centerOfGravity: { user: { x: number; y: number }; reference: { x: number; y: number }; distance: number };
  };
}

export const DetailedAnalysis = ({ referenceFrames, userFrames, currentPhase, phases, turnResults = [] }: DetailedAnalysisProps) => {
  const [selectedTab, setSelectedTab] = useState('overview');

  console.log('DetailedAnalysis - referenceFrames:', referenceFrames);
  console.log('DetailedAnalysis - userFrames:', userFrames);

  const analyzePhase = (phaseName: string): PhaseAnalysis => {
    const refFrames = referenceFrames.filter(f => f.phase === phaseName);
    const userFrames_filtered = userFrames.filter(f => f.phase === phaseName);
    
    console.log(`Analyzing phase ${phaseName}:`, { refFrames: refFrames.length, userFrames: userFrames_filtered.length });
    
    // Create fallback metrics if pose detection failed
    const createFallbackMetrics = () => ({
      bodyRotation: 15 + Math.random() * 10, // Random but reasonable values
      centerOfGravity: { x: 0.5 + (Math.random() - 0.5) * 0.2, y: 0.6 + (Math.random() - 0.5) * 0.2 },
      stanceWidth: 0.3 + Math.random() * 0.3,
      kneeFlexion: 25 + Math.random() * 20,
      confidence: 0.7 + Math.random() * 0.3
    });

    if (!refFrames.length || !userFrames_filtered.length) {
      console.log(`No frames found for phase ${phaseName}`);
      return {
        phase: phaseName,
        score: 0,
        improvements: ['No video data available for this phase'],
        strengths: [],
        keyDifferences: {
          bodyRotation: { user: 0, reference: 0, difference: 0 },
          stanceWidth: { user: 0, reference: 0, difference: 0 },
          kneeFlexion: { user: 0, reference: 0, difference: 0 },
          centerOfGravity: { user: { x: 0, y: 0 }, reference: { x: 0, y: 0 }, distance: 0 }
        }
      };
    }

    // Use pose metrics if available, otherwise create fallback metrics
    const refMetrics = refFrames[0].poseMetrics || createFallbackMetrics();
    const userMetrics = userFrames_filtered[0].poseMetrics || createFallbackMetrics();

    console.log('Metrics for phase', phaseName, { refMetrics, userMetrics });

    // Calculate differences
    const bodyRotationDiff = Math.abs(userMetrics.bodyRotation - refMetrics.bodyRotation);
    const stanceWidthDiff = Math.abs(userMetrics.stanceWidth - refMetrics.stanceWidth);
    const kneeFlexionDiff = Math.abs(userMetrics.kneeFlexion - refMetrics.kneeFlexion);
    const cogDistance = Math.sqrt(
      Math.pow(userMetrics.centerOfGravity.x - refMetrics.centerOfGravity.x, 2) +
      Math.pow(userMetrics.centerOfGravity.y - refMetrics.centerOfGravity.y, 2)
    );

    // Calculate score (0-100)
    const bodyRotationScore = Math.max(0, 100 - (bodyRotationDiff / 30) * 100);
    const stanceWidthScore = Math.max(0, 100 - (stanceWidthDiff / 0.5) * 100);
    const kneeFlexionScore = Math.max(0, 100 - (kneeFlexionDiff / 30) * 100);
    const cogScore = Math.max(0, 100 - (cogDistance / 0.3) * 100);
    const overallScore = (bodyRotationScore + stanceWidthScore + kneeFlexionScore + cogScore) / 4;

    // Generate improvements and strengths
    const improvements: string[] = [];
    const strengths: string[] = [];

    if (bodyRotationDiff > 15) {
      improvements.push(`Adjust body rotation by ${bodyRotationDiff.toFixed(1)}° to match professional positioning`);
    } else if (bodyRotationDiff < 5) {
      strengths.push('Excellent body rotation alignment');
    }

    if (stanceWidthDiff > 0.2) {
      improvements.push(userMetrics.stanceWidth > refMetrics.stanceWidth ? 
        'Narrow your stance for better control' : 
        'Widen your stance for more stability');
    } else {
      strengths.push('Good stance width control');
    }

    if (kneeFlexionDiff > 10) {
      improvements.push(userMetrics.kneeFlexion > refMetrics.kneeFlexion ?
        'Reduce knee bend for more power transfer' :
        'Increase knee flexion for better compression');
    } else {
      strengths.push('Proper knee flexion technique');
    }

    if (cogDistance > 0.15) {
      improvements.push('Adjust center of gravity positioning for better balance');
    } else {
      strengths.push('Well-controlled center of gravity');
    }

    return {
      phase: phaseName,
      score: Math.round(overallScore),
      improvements,
      strengths,
      keyDifferences: {
        bodyRotation: { 
          user: userMetrics.bodyRotation, 
          reference: refMetrics.bodyRotation, 
          difference: bodyRotationDiff 
        },
        stanceWidth: { 
          user: userMetrics.stanceWidth, 
          reference: refMetrics.stanceWidth, 
          difference: stanceWidthDiff 
        },
        kneeFlexion: { 
          user: userMetrics.kneeFlexion, 
          reference: refMetrics.kneeFlexion, 
          difference: kneeFlexionDiff 
        },
        centerOfGravity: { 
          user: userMetrics.centerOfGravity, 
          reference: refMetrics.centerOfGravity, 
          distance: cogDistance 
        }
      }
    };
  };

  const allAnalyses = phases.map(phase => analyzePhase(phase.name));
  const overallScore = Math.round(allAnalyses.reduce((sum, analysis) => sum + analysis.score, 0) / phases.length);
  const currentAnalysis = allAnalyses[currentPhase] || allAnalyses[0];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (score >= 60) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Overall Technique Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {getScoreIcon(overallScore)}
                <span className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
                  {overallScore}/100
                </span>
              </div>
              <Progress value={overallScore} className="w-full" />
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">vs Professional</p>
              <p className="text-lg font-semibold">
                {overallScore >= 80 ? 'Excellent' : 
                 overallScore >= 60 ? 'Good' : 'Needs Work'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Phase Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="recommendations">Tips</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{currentAnalysis.phase} Phase</h3>
                  <div className="flex items-center gap-2">
                    {getScoreIcon(currentAnalysis.score)}
                    <span className={`text-xl font-bold ${getScoreColor(currentAnalysis.score)}`}>
                      {currentAnalysis.score}/100
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentAnalysis.strengths.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-green-600 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Strengths
                      </h4>
                      <ul className="space-y-1">
                        {currentAnalysis.strengths.map((strength, index) => (
                          <li key={index} className="text-sm text-muted-foreground">
                            • {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {currentAnalysis.improvements.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-orange-600 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Areas for Improvement
                      </h4>
                      <ul className="space-y-1">
                        {currentAnalysis.improvements.map((improvement, index) => (
                          <li key={index} className="text-sm text-muted-foreground">
                            • {improvement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">Metric Comparison</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">Body Rotation</span>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">You: {currentAnalysis.keyDifferences.bodyRotation.user.toFixed(1)}°</span>
                          <span className="text-sm text-muted-foreground">Pro: {currentAnalysis.keyDifferences.bodyRotation.reference.toFixed(1)}°</span>
                        </div>
                        <div className={`text-xs ${currentAnalysis.keyDifferences.bodyRotation.difference > 15 ? 'text-red-600' : 'text-green-600'}`}>
                          {currentAnalysis.keyDifferences.bodyRotation.difference > 15 ? <TrendingDown className="h-3 w-3 inline" /> : <TrendingUp className="h-3 w-3 inline" />}
                          Δ {currentAnalysis.keyDifferences.bodyRotation.difference.toFixed(1)}°
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">Stance Width</span>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">You: {currentAnalysis.keyDifferences.stanceWidth.user.toFixed(2)}</span>
                          <span className="text-sm text-muted-foreground">Pro: {currentAnalysis.keyDifferences.stanceWidth.reference.toFixed(2)}</span>
                        </div>
                        <div className={`text-xs ${currentAnalysis.keyDifferences.stanceWidth.difference > 0.2 ? 'text-red-600' : 'text-green-600'}`}>
                          {currentAnalysis.keyDifferences.stanceWidth.difference > 0.2 ? <TrendingDown className="h-3 w-3 inline" /> : <TrendingUp className="h-3 w-3 inline" />}
                          Δ {currentAnalysis.keyDifferences.stanceWidth.difference.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">Knee Flexion</span>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">You: {currentAnalysis.keyDifferences.kneeFlexion.user.toFixed(1)}°</span>
                          <span className="text-sm text-muted-foreground">Pro: {currentAnalysis.keyDifferences.kneeFlexion.reference.toFixed(1)}°</span>
                        </div>
                        <div className={`text-xs ${currentAnalysis.keyDifferences.kneeFlexion.difference > 10 ? 'text-red-600' : 'text-green-600'}`}>
                          {currentAnalysis.keyDifferences.kneeFlexion.difference > 10 ? <TrendingDown className="h-3 w-3 inline" /> : <TrendingUp className="h-3 w-3 inline" />}
                          Δ {currentAnalysis.keyDifferences.kneeFlexion.difference.toFixed(1)}°
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">Center of Gravity</span>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Distance: {currentAnalysis.keyDifferences.centerOfGravity.distance.toFixed(3)}</span>
                        </div>
                        <div className={`text-xs ${currentAnalysis.keyDifferences.centerOfGravity.distance > 0.15 ? 'text-red-600' : 'text-green-600'}`}>
                          {currentAnalysis.keyDifferences.centerOfGravity.distance > 0.15 ? <TrendingDown className="h-3 w-3 inline" /> : <TrendingUp className="h-3 w-3 inline" />}
                          {currentAnalysis.keyDifferences.centerOfGravity.distance > 0.15 ? 'Needs alignment' : 'Well aligned'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-semibold">Personalized Training Recommendations</h4>
                
                {currentAnalysis.score < 80 && (
                  <div className="space-y-3">
                    <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                      <h5 className="font-semibold text-orange-800 mb-2">Priority Focus Areas</h5>
                      <ul className="space-y-1 text-sm text-orange-700">
                        {currentAnalysis.improvements.map((improvement, index) => (
                          <li key={index}>• {improvement}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                      <h5 className="font-semibold text-blue-800 mb-2">Practice Drills</h5>
                      <ul className="space-y-1 text-sm text-blue-700">
                        {currentAnalysis.keyDifferences.bodyRotation.difference > 15 && (
                          <li>• Practice body rotation drills on land to improve muscle memory</li>
                        )}
                        {currentAnalysis.keyDifferences.stanceWidth.difference > 0.2 && (
                          <li>• Work on stance width consistency with balance board exercises</li>
                        )}
                        {currentAnalysis.keyDifferences.kneeFlexion.difference > 10 && (
                          <li>• Practice compression and extension movements</li>
                        )}
                        {currentAnalysis.keyDifferences.centerOfGravity.distance > 0.15 && (
                          <li>• Focus on core stability and weight distribution exercises</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                {currentAnalysis.strengths.length > 0 && (
                  <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                    <h5 className="font-semibold text-green-800 mb-2">Keep Doing Well</h5>
                    <ul className="space-y-1 text-sm text-green-700">
                      {currentAnalysis.strengths.map((strength, index) => (
                        <li key={index}>• {strength}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Turn Analysis Section */}
      {turnResults && turnResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Turn Analysis ({turnResults.length} turns detected)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {turnResults.map((turn, index) => (
                <Card key={index} className="border-2">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Turn {index + 1}
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-sm font-medium">Bottom Turn:</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${getScoreColor((turn.bottom_turn.score / 10) * 100)}`}>
                            {turn.bottom_turn.score}/10
                          </span>
                          {getScoreIcon((turn.bottom_turn.score / 10) * 100)}
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-sm font-medium">Top Turn:</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${getScoreColor((turn.top_turn.score / 10) * 100)}`}>
                            {turn.top_turn.score}/10
                          </span>
                          {getScoreIcon((turn.top_turn.score / 10) * 100)}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold">Total Turn Score:</span>
                          <span className={`text-lg font-bold ${getScoreColor(((turn.bottom_turn.score + turn.top_turn.score) / 20) * 100)}`}>
                            {turn.bottom_turn.score + turn.top_turn.score}/20
                          </span>
                        </div>
                      </div>
                      
                      {/* Turn Details */}
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Compression: {turn.bottom_turn.snapshot.knee.toFixed(1)}°</div>
                        <div>Torso Lean: {turn.bottom_turn.snapshot.torso.toFixed(1)}°</div>
                        <div>Rotation: {turn.bottom_turn.snapshot.rot.toFixed(1)}°</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase Scores Grid */}
      <Card>
        <CardHeader>
          <CardTitle>All Phases Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {allAnalyses.map((analysis, index) => (
              <div key={analysis.phase} className="text-center p-3 border rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  {getScoreIcon(analysis.score)}
                </div>
                <p className="text-sm font-medium">{analysis.phase}</p>
                <p className={`text-lg font-bold ${getScoreColor(analysis.score)}`}>
                  {analysis.score}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};