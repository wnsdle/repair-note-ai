import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getExpectedPublishableKey() {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}')
    return keys.default ?? ''
  } catch {
    return ''
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const apiKey = req.headers.get('apikey') ?? ''
    const expected = getExpectedPublishableKey()
    const legacy = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    if (!apiKey || (apiKey !== expected && apiKey !== legacy)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const payload = await req.json()
    const notes = Array.isArray(payload?.notes) ? payload.notes : []
    const photos = Array.isArray(payload?.photos) ? payload.photos : []

    const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
    const serviceKey = secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!serviceKey) throw new Error('Supabase secret key is not available')
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

    if (notes.length > 0) {
      const { error } = await supabase.from('repair_notes').upsert(notes, { onConflict: 'id' })
      if (error) throw error
    }
    if (photos.length > 0) {
      const { error } = await supabase.from('repair_note_photos').upsert(photos, { onConflict: 'id' })
      if (error) throw error
    }

    return new Response(JSON.stringify({ ok: true, notes: notes.length, photos: photos.length }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('[backup-restore]', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Restore failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
