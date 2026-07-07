import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Anthropic from "npm:@anthropic-ai/sdk"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GymExercise {
  name: string
  category: string
  sets: number
  reps?: number
  duration_sec?: number
  rest_sec: number
  cue: string
  muscles: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { goal, duration_min, equipment, fitnessLevel } = await req.json()

    const client = new Anthropic({ apiKey: Deno.env.get('AI_API_KEY') })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `Generate a gym workout plan with these parameters:
- Goal: ${goal || 'general fitness'}
- Duration: ${duration_min || 30} minutes
- Equipment: ${equipment || 'full gym'}
- Fitness level: ${fitnessLevel || 'intermediate'}

Return a JSON array of exercises. Each exercise MUST have:
- name (string): exercise name
- category (string): one of: running, cycling, swimming, walking, hiit, strength, yoga, other
- sets (number): number of sets
- reps (number, optional): reps per set (omit for time-based)
- duration_sec (number, optional): seconds per set for time-based exercises
- rest_sec (number): rest time in seconds between sets (30-120)
- cue (string): ONE key form tip, max 12 words, imperative voice
- muscles (string): primary muscles targeted, e.g. "Quads, Glutes"

Fit the total estimated time within ${duration_min || 30} minutes. Include 4-7 exercises.
Only return the raw JSON array, nothing else.

Example:
[{"name":"Barbell Squat","category":"strength","sets":4,"reps":8,"rest_sec":90,"cue":"Drive knees out, chest tall, heels planted","muscles":"Quads, Glutes, Hamstrings"}]`,
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]'

    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    let exercises: GymExercise[] = []
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
