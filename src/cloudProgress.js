import { supabase } from './supabase.js'

// Progress saved to the player's account in Supabase (table `progress`, see
// supabase/02-progress.sql), so it follows them to every device. The browser keeps its
// own copy too (progress.js), which is what the game reads while playing.

// The progress saved to this account, or null if there is none yet (or it can't be read).
export async function loadCloudProgress(userId) {
  const { data, error } = await supabase.from('progress').select('data').eq('user_id', userId).maybeSingle()
  if (error) {
    console.warn('Could not load progress from the account:', error.message)
    return null
  }
  return data?.data ?? null
}

// Saves the progress to the account. If it fails (for example offline), the browser still
// has it, and it is sent again the next time the page opens.
export async function saveCloudProgress(userId, progress) {
  const { error } = await supabase
    .from('progress')
    .upsert({ user_id: userId, data: progress, updated_at: new Date().toISOString() })
  if (error) console.warn('Could not save progress to the account:', error.message)
}
