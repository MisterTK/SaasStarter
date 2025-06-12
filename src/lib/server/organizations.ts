import { error } from "@sveltejs/kit"
import type { Cookies } from "@sveltejs/kit"

export async function getOrganizationId(
  locals: App.Locals,
  cookies: Cookies,
): Promise<string> {
  const { user } = await locals.safeGetSession()
  if (!user) {
    throw error(401, "Unauthorized")
  }

  // For now, get from cookies. In production, you might want to
  // check user's organization membership from database
  const orgId = cookies.get("current_org_id")
  if (!orgId) {
    throw error(400, "No organization selected")
  }

  return orgId
}
