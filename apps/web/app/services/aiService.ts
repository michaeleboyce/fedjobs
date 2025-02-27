import { aiService } from '@fedjobs/utils';

export const generateDocument = async (
  model: string,
  prompt: string,
  temperature = 0,
  maxTokens = 4096
) => {
  return aiService.generateText({
    model,
    prompt,
    temperature,
    maxTokens
  });
};

export const createStreamingResponse = async (options: {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  userId: string;
}) => {
  return aiService.createStreamingResponse(options);
};
