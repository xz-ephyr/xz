import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

let google: any = null;

export async function getChatStream(messages: { role: 'user' | 'assistant'; content: string }[], apiKey: string, modelName: string) {
  // Initialize provider once if not already initialized
  if (!google) {
    google = createGoogleGenerativeAI({
      apiKey: apiKey,
    });
  }

  // Call the model and return a stream
  const result = await streamText({
    model: google(modelName),
    messages: messages,
  });

  return result.textStream;
}
