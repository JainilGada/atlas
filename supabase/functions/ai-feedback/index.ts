import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Anthropic from "npm:@anthropic-ai/sdk"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { dayLog, profile } = await req.json()

    const client = new Anthropic({ apiKey: Deno.env.get('AI_API_KEY') })

    const profileSection = profile ? `
User profile:
- Goal: ${profile.goal ?? 'not set'}
- Dietary preference: ${profile.dietary_preference ?? 'not specified'}
- Allergies: ${profile.allergies?.join(', ') || 'none'}
- Disliked foods: ${profile.disliked_foods?.join(', ') || 'none'}
- Age: ${profile.age ?? '?'}, Weight: ${profile.weight_kg ?? '?'} kg, Height: ${profile.height_cm ?? '?'} cm
- Activity level: ${profile.activity_level ?? 'not specified'}
- Daily calorie goal (TDEE-based): ${profile.tdee ?? 'unknown'} kcal` : ''

    const mealSection = dayLog.meals?.map((m: { slot: string; items: {name: string; kcal: number}[]; total_kcal: number }) =>
      `${m.slot} (${m.total_kcal} kcal):\n${m.items.map((i: {name: string; kcal: number}) => `  - ${i.name}: ${i.kcal} kcal`).join('\n')}`
    ).join('\n\n') ?? 'No meals logged'

    const workoutSection = dayLog.workouts?.length
      ? dayLog.workouts.map((w: { name: string; category: string; sets?: number; reps?: number; duration_min?: number; kcal_burned?: number }) => {
          const detail = [
            w.duration_min ? `${w.duration_min} min` : '',
            w.sets ? `${w.sets}×${w.reps ?? '?'} sets` : '',
            w.kcal_burned ? `≈${w.kcal_burned} kcal` : '',
          ].filter(Boolean).join(', ')
          return `  - ${w.name} (${w.category})${detail ? ': ' + detail : ''}`
        }).join('\n')
      : 'No workouts logged'

    const prompt = `You are a friendly, knowledgeable nutrition and fitness coach. Provide personalised end-of-day feedback based on the user's food intake and exercise.
${profileSection}

Today's summary:
- Date: ${dayLog.date}
- Calories consumed: ${dayLog.consumed_kcal ?? 0} kcal
- Calories burned (total): ${dayLog.burned_kcal ?? 0} kcal
- Net calories: ${dayLog.net_kcal ?? 0} kcal
- Goal: ${dayLog.goal_kcal ?? 'not set'} kcal
- Balance: ${dayLog.balance != null ? (dayLog.balance > 0 ? '+' : '') + dayLog.balance + ' kcal' : 'unknown'}
- Steps: ${dayLog.steps ?? 'not logged'}
- Water: ${dayLog.water_litres ?? 'not logged'} litres
- Strength training: ${dayLog.strength_duration_min ? `${dayLog.strength_duration_min} min (${dayLog.strength_intensity})` : 'none'}

Workouts:
${workoutSection}

Meals:
${mealSection}

Write concise, warm, actionable feedback (150-250 words). Structure it as:
1. A brief overall assessment of nutrition and activity (1-2 sentences)
2. What went well today (1-2 bullet points, covering food and/or workouts)
3. One or two specific, practical suggestions for tomorrow
4. A short motivating closing line

IMPORTANT: Respect the user's dietary preference — never suggest foods that conflict with it. Never mention allergens. If workouts were logged, acknowledge the effort briefly. Keep suggestions realistic and encouraging, not preachy.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const feedback = message.content[0].type === 'text' ? message.content[0].text : ''

    return new Response(JSON.stringify({ feedback }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
