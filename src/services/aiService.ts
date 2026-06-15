import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { SYSTEM_PROMPT, createArtifactTool } from './ai/config';

export async function chatCompletion({
  messages,
  apiKey,
  modelName,
  projectContext
}: {
  messages: any[],
  apiKey: string,
  modelName: string,
  projectContext?: string
}) {
  const google = createGoogleGenerativeAI({
    apiKey,
  });

  const fullSystemPrompt = projectContext
    ? `${SYSTEM_PROMPT}\n\n### PROJECT CONTEXT\nBelow is the current file tree of the project:\n${projectContext}\n\nMaintain this structure when creating or updating files.`
    : SYSTEM_PROMPT;

  const result = await streamText({
    model: google(modelName),
    system: fullSystemPrompt,
    messages,
    tools: {
      create_artifact: tool({
        description: createArtifactTool.description,
        parameters: createArtifactTool.parameters,
        // @ts-ignore
        execute: async (args: any) => {
          return { success: true, ...args };
        },
      }),
    },
  });

  return result;
}
