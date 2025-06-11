import type { RequestHandler } from "./$types"
import { json } from "@sveltejs/kit"
import { ReviewResponseGenerator } from "$lib/services/ai/response-generator"
import type { VertexAIModel } from "$lib/services/ai/vertex-config"

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const session = await locals.safeGetSession()
    if (!session?.user) {
      return json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const {
      review,
      config,
      model,
      stream = false,
    } = body as {
      review: {
        rating: number
        text: string
        authorName?: string
      }
      config: {
        businessName: string
        businessType?: string
        tone?: "professional" | "friendly" | "casual"
        customInstructions?: string
      }
      model?: VertexAIModel
      stream?: boolean
    }

    if (!review?.text || !review?.rating || !config?.businessName) {
      return json({ error: "Missing required fields" }, { status: 400 })
    }

    const projectId = process.env.GOOGLE_CLOUD_PROJECT
    const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1"

    if (!projectId) {
      return json(
        { error: "Google Cloud project not configured" },
        { status: 500 },
      )
    }

    const generator = new ReviewResponseGenerator({
      projectId,
      location,
    })

    if (stream) {
      const stream = await generator.streamResponse({
        review,
        config,
        model,
      })

      return new Response(stream.toDataStreamResponse().body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    } else {
      const response = await generator.generateResponse({
        review,
        config,
        model,
      })

      return json({ response })
    }
  } catch (error) {
    console.error("Error generating review response:", error)
    return json({ error: "Failed to generate response" }, { status: 500 })
  }
}
