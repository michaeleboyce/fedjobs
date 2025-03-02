// File path: apps/web/app/features/generation/utils/modelSelectors.ts
/**
 * Available AI models for generation
 */
export const availableModels = [
    {
      id: 'claude-3-7-sonnet-latest',
      name: 'Claude 3.7 Sonnet',
      provider: 'Anthropic',
      description: 'Fast and capable general purpose model'
    },
    {
      id: 'o3-mini',
      name: 'o3-mini',
      provider: 'OpenAI',
      description: 'Fast reasoning model'
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'OpenAI',
      description: 'Highly capable general purpose model'
    },
    {
        id: 'gpt-4.5-preview',
        name: 'GPT-4.5',
        provider: 'OpenAI',
        description: 'Latest model from OpenAI'
      }
  ];
  
  /**
   * Gets a model by its ID
   */
  export function getModelById(modelId: string) {
    return availableModels.find(model => model.id === modelId);
  }
  
  /**
   * Groups models by provider
   */
  export function groupModelsByProvider() {
    return availableModels.reduce((acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    }, {} as Record<string, typeof availableModels>);
  }