import { redirect } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"
import type { Tables } from "$lib/../DatabaseDefinitions"

export const load: PageServerLoad = async ({
  locals: { safeGetSession, supabaseServiceRole },
  cookies,
}) => {
  const { user } = await safeGetSession()
  if (!user) {
    redirect(303, "/login/sign_in")
  }

  // Check if user has an organization
  const { data: orgMemberships } = await supabaseServiceRole
    .from("organization_members")
    .select("organization_id, role, organizations(id, name, slug)")
    .eq("user_id", user.id)
    .single()

  if (!orgMemberships) {
    // User has no organization, redirect to create one
    redirect(303, "/account/create-organization")
  }

  // Store the current organization in cookies
  const currentOrg = orgMemberships.organizations
  cookies.set("current_org_id", currentOrg.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })

  return {
    organization: currentOrg,
    userRole: orgMemberships.role,
  }
}

export const actions = {
  signout: async ({ locals: { supabase, safeGetSession } }) => {
    const { session } = await safeGetSession()
    if (session) {
      await supabase.auth.signOut()
      redirect(303, "/")
    }
  },
}
