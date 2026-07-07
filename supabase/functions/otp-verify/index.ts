import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { SignJWT } from "npm:jose@5"

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

async function sha256Hex(data: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, otp } = await req.json()

    if (!email || !otp) {
      return new Response(JSON.stringify({ error: 'email and otp required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Find the latest valid, unused session with < 5 attempts
    const { data: session } = await supabase
      .from('otp_sessions')
      .select('*')
      .eq('email', email.toLowerCase())
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!session) {
      return new Response(JSON.stringify({ error: 'No valid code found. Please request a new one.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (session.attempt_count >= 5) {
      await supabase.from('otp_sessions').update({ used_at: new Date().toISOString() }).eq('id', session.id)
      return new Response(JSON.stringify({ error: 'Too many attempts. Please request a new code.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Increment attempt count first
    await supabase.from('otp_sessions').update({ attempt_count: session.attempt_count + 1 }).eq('id', session.id)

    // Verify hash
    const jwtSecret = Deno.env.get('JWT_SECRET') ?? ''
    const expectedHash = await hmacHex(jwtSecret + ':otp', String(otp))
    if (expectedHash !== session.otp_hash) {
      const remaining = 4 - session.attempt_count
      if (remaining <= 0) {
        await supabase.from('otp_sessions').update({ used_at: new Date().toISOString() }).eq('id', session.id)
        return new Response(JSON.stringify({ error: 'Too many attempts. Please request a new code.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: `Incorrect code. ${remaining} attempt(s) left.` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Mark OTP used
    await supabase.from('otp_sessions').update({ used_at: new Date().toISOString() }).eq('id', session.id)

    // Upsert user row
    const { data: user, error: userErr } = await supabase
      .from('users')
      .upsert({ email: email.toLowerCase() }, { onConflict: 'email' })
      .select('id')
      .single()
    if (userErr) throw userErr

    const userId = user.id
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // Sign JWT compatible with Supabase PostgREST (auth.uid() = sub)
    const secret = new TextEncoder().encode(jwtSecret)
    const jwt = await new SignJWT({ role: 'authenticated', session_id: sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(secret)

    // Store token hash
    const tokenHash = await sha256Hex(jwt)
    await supabase.from('sessions').insert({
      id: sessionId,
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      last_active_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ jwt, user_id: userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
