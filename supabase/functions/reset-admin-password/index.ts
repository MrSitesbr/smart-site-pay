import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
  if (listError) return new Response(JSON.stringify({ error: listError.message }), { status: 500 })

  const user = users.find(u => u.email === 'walter@ledmkt.com')
  if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { password: '976431853@#Wt', email_confirm: true }
  )

  if (updateError) return new Response(JSON.stringify({ error: updateError.message }), { status: 500 })

  return new Response(JSON.stringify({ message: 'Password reset successfully' }), { status: 200 })
})
