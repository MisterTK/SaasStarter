import { createVertex } from "@ai-sdk/google-vertex"
import modelsConfig from "$lib/config/gemini-models.json"
import { setupGoogleCloudCredentials } from "./setup-credentials"

export interface VertexAIConfig {
  projectId?: string
  location?: string
  googleAuthOptions?: {
    credentials?: {
      client_email: string
      private_key: string
    }
    credentialsFilePath?: string
  }
}

export interface ModelInfo {
  name: string
  description: string
  maxTokens: number
  costPerMillion?: number
}

export interface ModelsConfig {
  defaultModel: string
  models: Record<string, ModelInfo>
}

export function createVertexAI(config: VertexAIConfig = {}) {
  // Setup credentials if running in Vercel
  const credentials = setupGoogleCloudCredentials()

  // Build auth options
  let googleAuthOptions = config.googleAuthOptions
  if (!googleAuthOptions && credentials) {
    googleAuthOptions = {
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
    }
  }

  // Get project ID from config, env, or credentials
  const projectId =
    config.projectId ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    credentials?.project_id

  if (!projectId) {
    throw new Error(
      "Google Cloud Project ID is required. Set GOOGLE_CLOUD_PROJECT or provide projectId in config.",
    )
  }

  return createVertex({
    project: projectId,
    location:
      config.location || process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
    googleAuthOptions,
  })
}

// Load configuration from JSON file
const { defaultModel, models } = modelsConfig as ModelsConfig

export const DEFAULT_MODEL = defaultModel
export const DEFAULT_LOCATION = "us-central1"
export const VERTEX_AI_MODELS = models

export type VertexAIModel = keyof typeof models
