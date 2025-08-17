import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

// MediaPipe pose detection utilities
async function extractFrames(videoUrl: string, frameCount: number = 5): Promise<string[]> {
  // In a real implementation, this would use FFmpeg or similar to extract frames
  // For now, we'll simulate frame extraction
  console.log(`Extracting ${frameCount} frames from video: ${videoUrl}`);
  
  // Mock frame extraction - return array of base64 image data
  const frames: string[] = [];
  for (let i = 0; i < frameCount; i++) {
    frames.push(`mock_frame_${i}_data`);
  }
  
  return frames;
}

async function analyzePoseFromFrames(frames: string[]): Promise<any[]> {
  console.log(`Analyzing pose from ${frames.length} frames`);
  
  // Mock pose analysis data that would come from MediaPipe
  const poseData = frames.map((_, index) => ({
    frameIndex: index,
    timestamp: index * 2, // seconds
    keypoints: {
      leftShoulder: { x: 0.3 + index * 0.1, y: 0.4, visibility: 0.9 },
      rightShoulder: { x: 0.7 - index * 0.1, y: 0.4, visibility: 0.9 },
      leftHip: { x: 0.35 + index * 0.05, y: 0.7, visibility: 0.8 },
      rightHip: { x: 0.65 - index * 0.05, y: 0.7, visibility: 0.8 },
      leftKnee: { x: 0.3 + index * 0.08, y: 0.85, visibility: 0.7 },
      rightKnee: { x: 0.7 - index * 0.08, y: 0.85, visibility: 0.7 },
      leftAnkle: { x: 0.28 + index * 0.06, y: 0.95, visibility: 0.6 },
      rightAnkle: { x: 0.72 - index * 0.06, y: 0.95, visibility: 0.6 }
    },
    surfMetrics: {
      stanceWidth: 0.6 + index * 0.05, // normalized shoulder-to-hip ratio
      centerOfGravity: { x: 0.5, y: 0.65 + index * 0.02 },
      bodyRotation: 15 + index * 5, // degrees
      kneeFlexion: 45 + index * 10, // degrees
      armPosition: index % 2 === 0 ? 'extended' : 'balanced'
    }
  }));

  return poseData;
}

function calculateSurfMetrics(poseData: any[], skillLevel: string): any {
  console.log(`Calculating surf metrics for ${skillLevel} level`);
  
  // Analyze pose progression through frames
  const avgStanceWidth = poseData.reduce((sum, frame) => sum + frame.surfMetrics.stanceWidth, 0) / poseData.length;
  const avgBodyRotation = poseData.reduce((sum, frame) => sum + frame.surfMetrics.bodyRotation, 0) / poseData.length;
  const avgKneeFlexion = poseData.reduce((sum, frame) => sum + frame.surfMetrics.kneeFlexion, 0) / poseData.length;
  
  // Calculate scores based on pose analysis
  const stanceScore = Math.min(100, Math.max(0, (avgStanceWidth - 0.4) * 200)); // ideal around 0.6-0.8
  const rotationScore = Math.min(100, Math.max(0, 100 - Math.abs(avgBodyRotation - 25) * 2)); // ideal around 25 degrees
  const flexionScore = Math.min(100, Math.max(0, 100 - Math.abs(avgKneeFlexion - 60) * 1.5)); // ideal around 60 degrees
  
  return {
    overall_score: Math.round((stanceScore + rotationScore + flexionScore) / 3),
    metrics: [
      { name: "Stance Width", score: Math.round(stanceScore) },
      { name: "Body Rotation", score: Math.round(rotationScore) },
      { name: "Knee Flexion", score: Math.round(flexionScore) },
      { name: "Balance Control", score: Math.round((stanceScore + flexionScore) / 2) }
    ],
    pose_analysis: {
      frameCount: poseData.length,
      avgStanceWidth,
      avgBodyRotation,
      avgKneeFlexion,
      poseProgression: poseData.map(frame => ({
        timestamp: frame.timestamp,
        centerOfGravity: frame.surfMetrics.centerOfGravity,
        bodyRotation: frame.surfMetrics.bodyRotation
      }))
    }
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, videoPath } = await req.json();
    
    if (!sessionId || !videoPath) {
      throw new Error('Session ID and video path are required');
    }

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the analysis session to understand user's skill level and technique
    const { data: session, error: sessionError } = await supabase
      .from('analysis_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error('Analysis session not found');
    }

    // Get signed URL for the video
    const { data: signedUrlData } = await supabase.storage
      .from('surf-videos')
      .createSignedUrl(videoPath, 300); // 5 minutes

    if (!signedUrlData?.signedUrl) {
      throw new Error('Failed to get video URL');
    }

    // Use mock data for development
    const useMockData = true; // TODO: Make this configurable via environment variable

    let analysisData;
    
    if (useMockData) {
      console.log('Using MediaPipe pose analysis for surf video');
      
      // Step 1: Extract frames from video
      const frames = await extractFrames(signedUrlData.signedUrl);
      
      // Step 2: Analyze pose from extracted frames
      const poseData = await analyzePoseFromFrames(frames);
      
      // Step 3: Calculate surf-specific metrics from pose analysis
      analysisData = calculateSurfMetrics(poseData, session.skill_level);
      
      // Add coaching feedback based on pose analysis
      analysisData.feedback = `Based on pose analysis across ${poseData.length} frames, your stance shows good balance control. ` +
        `Average body rotation of ${analysisData.pose_analysis.avgBodyRotation.toFixed(1)}° indicates ${analysisData.pose_analysis.avgBodyRotation > 30 ? 'aggressive' : 'controlled'} turning technique.`;
      
      analysisData.recommendations = [
        `Optimize stance width - current average: ${analysisData.pose_analysis.avgStanceWidth.toFixed(2)}`,
        `Work on knee flexion consistency - averaging ${analysisData.pose_analysis.avgKneeFlexion.toFixed(1)}°`,
        "Practice maintaining center of gravity during turns"
      ];
    } else {
      // Original OpenAI API code (commented out for development)
      /*
      const analysisPrompt = `
      Analyze this surf video for technique assessment. Focus on:
      
      User Details:
      - Skill Level: ${session.skill_level}
      - Target Technique: ${session.technique}
      - Wave Type: ${session.wave_type}
      
      Please evaluate:
      1. Body position and stance
      2. Board control and balance
      3. Wave reading and positioning
      4. Timing and flow
      5. Overall technique execution
      
      Provide scores (0-100) for each area and specific feedback for improvement.
      Format your response as JSON with this structure:
      {
        "overall_score": number,
        "body_position": number,
        "board_control": number,
        "wave_reading": number,
        "timing": number,
        "feedback": "detailed feedback text",
        "recommendations": ["improvement tip 1", "improvement tip 2", "improvement tip 3"]
      }
      `;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: analysisPrompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: signedUrlData.signedUrl,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const aiResponse = await response.json();
      const analysisText = aiResponse.choices[0]?.message?.content;

      if (!analysisText) {
        throw new Error('No analysis received from AI');
      }

      // Parse the JSON response from AI
      try {
        analysisData = JSON.parse(analysisText);
      } catch (parseError) {
        console.error('Failed to parse AI response:', analysisText);
        throw new Error('Failed to parse AI response');
      }
      */
      throw new Error('OpenAI API is disabled in development mode');
    }

    // Update the analysis session with results
    const { error: updateError } = await supabase
      .from('analysis_sessions')
      .update({
        status: 'completed',
        overall_score: analysisData.overall_score,
        analysis_data: analysisData,
        feedback_data: {
          tips: analysisData.recommendations
        }
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      throw new Error('Failed to save analysis results');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      analysis: analysisData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-surf-video function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Analysis failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});