import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Vercel API Route: Check if user is admin
 * POST /api/check-admin
 * 
 * SEGURANÇA: Email do admin está em variável de ambiente,
 * não exposto no código frontend
 */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ isAdmin: false })
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ADMIN_EMAIL) {
      console.error('Missing environment variables')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    })

    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return res.status(401).json({ isAdmin: false })
    }

    // VERIFICAÇÃO SEGURA: Email do admin vem do backend
    const isAdmin = user.email === ADMIN_EMAIL

    return res.json({ isAdmin })

  } catch (error) {
    console.error('Error checking admin status:', error)
    return res.status(500).json({ isAdmin: false })
  }
}
