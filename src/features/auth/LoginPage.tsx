import { useState, useRef, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSession } from './SessionContext'
import { Spinner } from '@/components/ui/spinner'

type Step = 'email' | 'otp'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useSession()
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/checkin'

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startCooldown() {
    setCooldown(60)
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: fnError } = await supabase.functions.invoke('otp-request', {
        body: { email: email.trim().toLowerCase() },
      })
      if (fnError) throw fnError
      setStep('otp')
      startCooldown()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send code. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('otp-verify', {
        body: { email: email.trim().toLowerCase(), otp: otp.trim() },
      })
      if (fnError) throw fnError
      if (!data?.jwt) throw new Error('Invalid response from server')
      login(data.jwt, data.user_id)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (cooldown > 0) return
    setError(null)
    setLoading(true)
    try {
      const { error: fnError } = await supabase.functions.invoke('otp-request', {
        body: { email: email.trim().toLowerCase() },
      })
      if (fnError) throw fnError
      startCooldown()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #EDE9FF 0%, #F7F7FB 50%, #E0E7FF 100%)' }}
    >
      <div className="w-full max-w-sm">
        {step === 'email' ? (
          <div>
            <div className="mb-10">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-7 shadow-lg">
                <span className="text-primary-foreground font-bold text-2xl">A</span>
              </div>
              <h1 className="text-[26px] font-bold text-foreground mb-2 leading-tight">
                Welcome to Atlas
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Sign in with your Gmail to start building better habits.
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  autoFocus
                  autoComplete="email"
                  required
                  pattern=".*@gmail\.com$"
                  title="Only @gmail.com addresses are supported"
                  disabled={loading}
                  className="bg-white border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150 min-h-[44px]"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 min-h-[44px]"
              >
                {loading ? <Spinner className="h-4 w-4" /> : <>Send OTP <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>

            <p className="mt-5 text-xs text-muted-foreground text-center leading-relaxed">
              We'll send a 6-digit code to your inbox. No password needed.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-10">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-7 shadow-lg">
                <span className="text-primary-foreground font-bold text-2xl">A</span>
              </div>
              <h1 className="text-[26px] font-bold text-foreground mb-2 leading-tight">Check your inbox</h1>
              <p className="text-muted-foreground text-sm">
                We sent a 6-digit code to{' '}
                <span className="font-semibold text-foreground">{email}</span>
              </p>
            </div>

            <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  disabled={loading}
                  className="bg-white border border-border rounded-xl px-3 py-2.5 text-center text-2xl tracking-widest text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150 min-h-[56px]"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 min-h-[44px]"
              >
                {loading ? <Spinner className="h-4 w-4" /> : 'Verify code'}
              </button>

              <div className="flex items-center justify-between text-sm pt-1">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                  onClick={() => { setStep('email'); setOtp(''); setError(null) }}
                  disabled={loading}
                >
                  Change email
                </button>
                <button
                  type="button"
                  className="text-primary font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
                  onClick={handleResend}
                  disabled={loading || cooldown > 0}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
