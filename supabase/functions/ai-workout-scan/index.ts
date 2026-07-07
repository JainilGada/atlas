import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Anthropic from "npm:@anthropic-ai/sdk"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Exercise {
  name: string
  category: string
  sets?: number
  reps?: number
  duration_min?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { imageBase64, mediaType } = await req.json()
    if (!imageBase64 || !mediaType) {
      return new Response(JSON.stringify({ error: 'imageBase64 and mediaType are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const client = new Anthropic({ apiKey: Deno.env.get('AI_API_KEY') })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `Extract all exercises from this gym whiteboard or workout photo.

Return a JSON array of exercises. Each exercise object must have:
- name (string): exercise name
- category (string): one of: running, cycling, swimming, walking, hiit, strength, yoga, other
- sets (number, optional): number of sets
- reps (number, optional): reps per set
- duration_min (number, optional): duration in minutes if time-based

Only return the raw JSON array, no explanation. Example:
[{"name":"Squat","category":"strength","sets":4,"reps":10},{"name":"Row 500m","category":"other","duration_min":2}]

If no exercises are visible or it's not a workout photo, return: []`,
          },
        ],
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]'

    // Parse JSON safely
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    let exercises: Exercise[] = []
    if (jsonMatch) {
      try {
        exercises = JSON.parse(jsonMatch[0])
      } catch {
        exercises = []
      }
    }

    return new Response(JSON.stringify({ exercises }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
