import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const apiKey = req.headers.get('apikey') ?? ''
    const expectedPublishable = (() => {
      try {
        const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}')
        return keys.default ?? ''
      } catch {
        return ''
      }
    })()
    const expectedLegacyAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supplied = apiKey || authHeader.replace(/^Bearer\s+/i, '')
    if (!supplied || (supplied !== expectedPublishable && supplied !== expectedLegacyAnon)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
    const serviceKey = secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!serviceKey) throw new Error('Supabase secret key is not available')

    const supabase = createClient(supabaseUrl, serviceKey)
    const { data: notes, error: notesError } = await supabase.from('repair_notes').select('*').order('created_at', { ascending: true })
    if (notesError) throw notesError
    const { data: photos, error: photosError } = await supabase.from('repair_note_photos').select('*').order('created_at', { ascending: true })
    if (photosError) throw photosError

    return new Response(JSON.stringify({
      backupVersion: 2,
      exportedAt: new Date().toISOString(),
      repairNotes: notes ?? [],
      repairNotePhotos: photos ?? [],
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('[backup-export]', error)
    return new Response(JSON.stringify({ error: 'Repair-note backup export failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
