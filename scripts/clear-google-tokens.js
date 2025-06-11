import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.PRIVATE_SUPABASE_SERVICE_ROLE

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function clearGoogleTokens() {
  try {
    // First, let's see what tokens exist
    const { data: tokens, error: fetchError } = await supabase
      .from('google_tokens')
      .select('organization_id, user_id, created_at, expires_at')

    if (fetchError) {
      console.error('Error fetching tokens:', fetchError)
      return
    }

    console.log('Found tokens:', tokens)

    if (tokens && tokens.length > 0) {
      // Delete all google tokens
      const { error: deleteError } = await supabase
        .from('google_tokens')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows

      if (deleteError) {
        console.error('Error deleting tokens:', deleteError)
      } else {
        console.log(`Successfully deleted ${tokens.length} token(s)`)
      }
    } else {
      console.log('No tokens found to delete')
    }
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

clearGoogleTokens()