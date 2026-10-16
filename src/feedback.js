import { supabase } from './supabase.js'
import { PUBLIC_PROFILE, REPORT_REASONS, playerCard } from './friends.js'
import { fairyEngineStatus } from './fairy/fairyEngine.js'

// Bug reports and feature ideas from players (table `feedback`, see supabase/12-feedback.sql),
// and what the admin page reads: those, and the player reports (table `reports`, see
// 08-block-report.sql). Only admins can read them. Nothing here throws: problems come back
// as messages for the screen to show.

export const MAX_LENGTH = 1000

// Sends a bug report (`kind` 'bug') or a feature idea ('idea'). `context` (bugs) says where
// the player was; the browser and device are added here, and how the fairy engine has done.
export async function sendFeedback(myId, kind, message, context = '') {
  const text = message.trim()
  if (!text) return 'Please write a few words first.'
  const where =
    kind === 'bug'
      ? [context, fairyEngineStatus(), navigator.userAgent].filter(Boolean).join(' · ').slice(0, 500)
      : null
  const { error } = await supabase
    .from('feedback')
    .insert({ author: myId, kind, message: text.slice(0, MAX_LENGTH), context: where })
  if (error?.message.includes('a lot of feedback'))
    return 'You have sent a lot of feedback this hour. Please try again later.'
  return error?.message ?? null
}

// ---------- The admin page ----------

// Bug reports or ideas (`kind`), 'open' or 'done' (`status`), newest first:
// [{ id, message, context, time, author }].
export async function loadFeedback(kind, status) {
  const { data, error } = await supabase
    .from('feedback')
    .select(`id, message, context, created_at, author:author (${PUBLIC_PROFILE})`)
    .eq('kind', kind)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return { error: error.message }
  return {
    items: data.map((row) => ({
      id: row.id,
      message: row.message,
      context: row.context,
      time: new Date(row.created_at),
      author: playerCard(row.author),
    })),
  }
}

// Player reports, 'open' or 'done', newest first: [{ id, reason, details, time, reporter, reported }].
export async function loadReports(status) {
  const { data, error } = await supabase
    .from('reports')
    .select(
      `id, reason, details, created_at, reporter:reporter (${PUBLIC_PROFILE}), reported:reported (${PUBLIC_PROFILE})`,
    )
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return { error: error.message }
  const reasonText = Object.fromEntries(REPORT_REASONS)
  return {
    items: data.map((row) => ({
      id: row.id,
      reason: reasonText[row.reason] ?? row.reason,
      details: row.details,
      time: new Date(row.created_at),
      reporter: playerCard(row.reporter),
      reported: playerCard(row.reported),
    })),
  }
}

// Marks a bug report, idea (`table` 'feedback') or player report ('reports') done or open.
export async function setStatus(table, id, status) {
  const { error } = await supabase.from(table).update({ status }).eq('id', id)
  return error?.message ?? null
}
