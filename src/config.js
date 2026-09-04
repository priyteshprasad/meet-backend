/** Inbox that receives every option tap. Change this, or set MAIL_TO on Render. */
export const MAIL_TO = process.env.MAIL_TO || 'priyteshprasad@gmail.com.com'

export const supabaseUrl = process.env.SUPABASE_URL
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export function requireSupabaseEnv() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy backend/.env.example to backend/.env',
    )
  }
}
