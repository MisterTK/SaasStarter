import { createVertex } from '@ai-sdk/google-vertex';
import modelsConfig from '$lib/config/gemini-models.json';

export interface VertexAIConfig {
  projectId: string;
  location?: string;
  googleAuthOptions?: {
    credentials?: {
      client_email: string;
      private_key: string;
    };
    credentialsFilePath?: string;
  };
}

export interface ModelInfo {
  name: string;
  description: string;
  maxTokens: number;
  costPerMillion?: number;
}

export interface ModelsConfig {
  defaultModel: string;
  models: Record<string, ModelInfo>;
}

export function createVertexAI(config: VertexAIConfig) {
  const { projectId, location = 'us-central1', googleAuthOptions } = config;
  
  return createVertex({
    project: projectId,
    location,
    googleAuthOptions
  });
}

// Load configuration from JSON file
const { defaultModel, models } = modelsConfig as ModelsConfig;

export const DEFAULT_MODEL = defaultModel;
export const DEFAULT_LOCATION = 'us-central1';
export const VERTEX_AI_MODELS = models;

export type VertexAIModel = keyof typeof models;