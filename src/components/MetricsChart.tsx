import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

interface MetricsChartProps {
  frameData: Array<{
    frameNumber: number;
    timestamp: number;
    bodyRotation: number;
    stanceWidth: number;
    kneeFlexion: number;
    balance: number;
  }>;
  skillLevel: string;
}

const MetricsChart: React.FC<MetricsChartProps> = ({ frameData, skillLevel }) => {
  // Prepare data for line chart
  const lineChartData = frameData.map((frame, index) => ({
    frame: index + 1,
    timestamp: frame.timestamp,
    bodyRotation: frame.bodyRotation,
    stanceWidth: frame.stanceWidth * 100, // Convert to percentage for better visualization
    kneeFlexion: frame.kneeFlexion,
    balance: frame.balance,
  }));

  // Prepare data for radar chart (average values)
  const averageMetrics = {
    bodyRotation: frameData.reduce((sum, frame) => sum + frame.bodyRotation, 0) / frameData.length,
    stanceWidth: frameData.reduce((sum, frame) => sum + frame.stanceWidth, 0) / frameData.length,
    kneeFlexion: frameData.reduce((sum, frame) => sum + frame.kneeFlexion, 0) / frameData.length,
    balance: frameData.reduce((sum, frame) => sum + frame.balance, 0) / frameData.length,
  };

  const radarData = [
    {
      metric: 'Body Rotation',
      value: Math.min(averageMetrics.bodyRotation / 45 * 100, 100), // Normalize to 0-100
      fullMark: 100,
    },
    {
      metric: 'Stance Width',
      value: Math.min(averageMetrics.stanceWidth * 100, 100),
      fullMark: 100,
    },
    {
      metric: 'Knee Flexion',
      value: Math.min(averageMetrics.kneeFlexion / 90 * 100, 100), // Normalize to 0-100
      fullMark: 100,
    },
    {
      metric: 'Balance',
      value: averageMetrics.balance,
      fullMark: 100,
    },
  ];

  const chartConfig = {
    bodyRotation: {
      label: 'Body Rotation',
      color: 'hsl(var(--primary))',
    },
    stanceWidth: {
      label: 'Stance Width',
      color: 'hsl(var(--accent))',
    },
    kneeFlexion: {
      label: 'Knee Flexion',
      color: 'hsl(var(--primary-light))',
    },
    balance: {
      label: 'Balance',
      color: 'hsl(var(--accent-light))',
    },
  };

  if (!frameData || frameData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">No frame data available for visualization</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Frame-by-frame Timeline */}
      <Card className="shadow-wave">
        <CardHeader>
          <CardTitle>Metrics Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData}>
                <XAxis 
                  dataKey="frame" 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="bodyRotation"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                />
                <Line
                  type="monotone"
                  dataKey="stanceWidth"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(var(--accent))' }}
                />
                <Line
                  type="monotone"
                  dataKey="kneeFlexion"
                  stroke="hsl(var(--primary-light))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(var(--primary-light))' }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--accent-light))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(var(--accent-light))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Performance Radar */}
      <Card className="shadow-wave">
        <CardHeader>
          <CardTitle>Performance Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis 
                  dataKey="metric" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Radar
                  name={`${skillLevel} Performance`}
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsChart;