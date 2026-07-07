import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function hmacHex(key: string, data: string): Promise<string> {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email } = await req.json()

    if (!email || !email.toLowerCase().endsWith('@gmail.com')) {
      return new Response(JSON.stringify({ error: 'Only @gmail.com addresses are supported' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 60-second cooldown
    const { data: recent } = await supabase
      .from('otp_sessions')
      .select('created_at')
      .eq('email', email.toLowerCase())
      .gt('created_at', new Date(Date.now() - 60_000).toISOString())
      .limit(1)
      .maybeSingle()

    if (recent) {
      return new Response(JSON.stringify({ error: 'Please wait 60 seconds before requesting another code' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100_000 + Math.random() * 900_000))
    const jwtSecret = Deno.env.get('JWT_SECRET') ?? ''
    const otpHash = await hmacHex(jwtSecret + ':otp', otp)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await supabase.from('otp_sessions').insert({
      email: email.toLowerCase(),
      otp_hash: otpHash,
      expires_at: expiresAt,
    })

    // Send via Brevo
    const brevoKey = Deno.env.get('BREVO_API_KEY')
    const fromAddress = Deno.env.get('BREVO_FROM') ?? ''

    if (brevoKey) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Atlas', email: fromAddress },
          to: [{ email }],
          subject: `${otp} — your Atlas login code`,
          htmlContent: `<div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2 style="margin-bottom:8px">Your Atlas login code</h2>
            <p style="font-size:48px;font-weight:700;letter-spacing:12px;margin:24px 0">${otp}</p>
            <p style="color:#666">Valid for 10 minutes. Never share this code.</p>
          </div>`,
        }),
      })
      if (!res.ok) console.error('Brevo error', await res.text())
    } else {
      console.log(`[DEV] OTP for ${email}: ${otp}`)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
