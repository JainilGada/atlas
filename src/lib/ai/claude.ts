// Claude implementation — all calls go through Edge Functions so the API key
// never reaches the client. This module calls the Supabase Edge Function proxies.
import type { AIProvider, DayLogSummary, UserProfile } from './types'
import { supabase } from '../supabase'

export const claudeProvider: AIProvider = {
  async estimateCalories(item, profile) {
    const { data, error } = await supabase.functions.invoke('ai-estimate', {
      body: { item, profile },
    })
    if (error) throw error
    return (data as { kcal: number }).kcal
  },

  async generateFeedback(dayLog: DayLogSummary, profile: UserProfile) {
    const { data, error } = await supabase.functions.invoke('ai-feedback', {
      body: { dayLog, profile },
    })
    if (error) throw error
    return (data as { feedback: string }).feedback
  },
}
