import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Anthropic from "npm:@anthropic-ai/sdk"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { item, profile } = await req.json()
    if (!item?.name) {
      return new Response(JSON.stringify({ error: 'item.name is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const client = new Anthropic({ apiKey: Deno.env.get('AI_API_KEY') })

    const profileCtx = profile ? [
      profile.dietary_preference && `Dietary preference: ${profile.dietary_preference}`,
      profile.allergies?.length && `Allergies: ${profile.allergies.join(', ')}`,
      profile.weight_kg && `User weight: ${profile.weight_kg} kg`,
    ].filter(Boolean).join('\n') : ''

    const qty = item.quantityHint ?? '1 standard serving (100g or typical restaurant portion)'
    const foodName = item.name.trim().toLowerCase()

    const prompt = `You are a precise nutrition database. Return the calorie count for the exact food and quantity specified. Use USDA/standard nutrition data. Do not adjust for personal preferences.

Food: ${foodName}
Quantity: ${qty}${ profileCtx ? `\n\nNote (do NOT adjust calories for these): ${profileCtx}` : '' }

Respond with ONLY a single integer (kcal). No units, no text — just the number.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '0'
    const kcal = parseInt(raw.replace(/[^0-9]/g, ''), 10)

    return new Response(JSON.stringify({ kcal: isNaN(kcal) ? 0 : kcal }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
