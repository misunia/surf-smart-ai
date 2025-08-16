import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

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
      console.log('Using mock data for analysis');
      // Mock analysis data that matches FeedbackDashboard expectations
      analysisData = {
        overall_score: 79,
        metrics: [
          { name: "Turn Completion", score: 89 },
          { name: "Body Rotation", score: 96 },
          { name: "Weight Distribution", score: 77 },
          { name: "Rail Engagement", score: 94 }
        ],
        feedback: "Your bottom turn shows strong rail engagement and excellent body rotation. Focus on maintaining consistent weight distribution throughout the turn.",
        recommendations: [
          "Practice weight transfer drills on smaller waves to improve consistency",
          "Focus on maintaining lower center of gravity during the turn initiation",
          "Work on extending the turn completion for more speed generation"
        ]
      };
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