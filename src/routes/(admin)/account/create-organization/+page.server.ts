import { fail, redirect } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
  const { user } = await safeGetSession()
  if (!user) {
    redirect(303, '/login/sign_in')
  }
}

interface FormErrors {
  name?: string
  slug?: string
  _?: string
}

export const actions: Actions = {
  default: async ({ request, locals: { safeGetSession, supabaseServiceRole }, cookies }) => {
    const { user } = await safeGetSession()
    if (!user) {
      return fail(401, { errors: { _: 'Unauthorized' } as FormErrors })
    }

    const formData = await request.formData()
    const name = formData.get('name') as string
    const slug = formData.get('slug') as string
    const businessType = formData.get('businessType') as string

    // Validate inputs
    const errors: FormErrors = {}
    
    if (!name || name.trim().length < 2) {
      errors.name = 'Organization name must be at least 2 characters'
    }

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      errors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens'
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, { errors })
    }

    // Check if slug is already taken
    const { data: existingOrg } = await supabaseServiceRole
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingOrg) {
      return fail(400, { errors: { slug: 'This URL is already taken' } as FormErrors })
    }

    // Create organization
    const { data: newOrg, error: orgError } = await supabaseServiceRole
      .from('organizations')
      .insert({
        name: name.trim(),
        slug: slug.toLowerCase(),
        subscription_status: 'trialing',
        subscription_plan: 'free'
      })
      .select()
      .single()

    if (orgError) {
      console.error('Error creating organization:', orgError)
      return fail(500, { errors: { _: 'Failed to create organization' } as FormErrors })
    }

    // Add user as owner of the organization
    const { error: memberError } = await supabaseServiceRole
      .from('organization_members')
      .insert({
        organization_id: newOrg.id,
        user_id: user.id,
        role: 'owner'
      })

    if (memberError) {
      console.error('Error adding organization member:', memberError)
      // Try to clean up the organization
      await supabaseServiceRole
        .from('organizations')
        .delete()
        .eq('id', newOrg.id)
      
      return fail(500, { errors: { _: 'Failed to set up organization membership' } as FormErrors })
    }

    // Store business type in profile if provided
    if (businessType) {
      await supabaseServiceRole
        .from('profiles')
        .update({ company_name: businessType })
        .eq('id', user.id)
    }

    // Set the organization cookie
    cookies.set('current_org_id', newOrg.id, { 
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    })

    // Redirect to dashboard
    redirect(303, '/account')
  }
}