import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { convertToModelMessages, streamText, stepCountIs, tool } from 'ai';
import {
  SYSTEM_PROMPT,
  createArtifactTool,
  readFileTool,
  writeFileTool,
  editFileTool,
  writeToPlanTool,
} from './ai/config';
import { FileSystemService } from './FileSystemService';
import { resolveProjectPath } from '../lib/projectPaths';
import { API_KEYS, getModelDefinition } from '../config/models';

let cachedProviders: { google: ReturnType<typeof createGoogleGenerativeAI>; groq: ReturnType<typeof createGroq> } | null = null;

export function refreshProviders() {
  cachedProviders = null;
}

function getProviders() {
  if (!cachedProviders) {
    cachedProviders = {
      google: createGoogleGenerativeAI({ apiKey: localStorage.getItem(API_KEYS.google) || '' }),
      groq: createGroq({ apiKey: localStorage.getItem(API_KEYS.groq) || '' }),
    };
  }
  return cachedProviders;
}

export function getAIErrorMessage(error: unknown) {
  if (error == null) return 'The AI request failed for an unknown reason.';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return 'The AI request failed and the error could not be serialized.';
  }
}

export async function chatCompletion({
  messages,
  modelName,
  projectContext,
  projectPath,
  isThinkingEnabled,
  abortSignal,
}: {
  messages: any[];
  modelName: string;
  projectContext?: string;
  projectPath?: string;
  isThinkingEnabled?: boolean;
  abortSignal?: AbortSignal;
}) {
  const providers = getProviders();

  const getLanguageModel = (name: string) => {
    const def = getModelDefinition(name);
    if (!def) return providers.google('gemini-3.5-flash');

    if (def.provider === 'google') return providers.google(def.id);
    if (def.provider === 'groq') return providers.groq(def.id);
    return providers.google('gemini-3.5-flash');
  };

  const fallbackChain = [
    modelName,
    'gemini-3.5-flash',
    'llama-3.1-8b-instant',
  ];

  const uniqueChain = Array.from(new Set(fallbackChain));

  const fullSystemPrompt = projectContext
    ? `${SYSTEM_PROMPT}\n\n### PROJECT CONTEXT\nBelow is the current file tree of the project:\n${projectContext}\n\nMaintain this structure when creating or updating files.`
    : SYSTEM_PROMPT;

  const normalizedMessages = await convertToModelMessages(
    messages.filter((m: any) => m.role !== 'system')
  );

  const getStreamResult = (modelIdx: number): any => {
    const currentModelName = uniqueChain[modelIdx];
    const currentModel = getLanguageModel(currentModelName);
    const def = getModelDefinition(currentModelName);
    const shouldApplyThinking = isThinkingEnabled && def?.supportsThinking;

    let providerOptions: any = undefined;
    if (shouldApplyThinking) {
      providerOptions = {};
      if (def?.provider === 'google') {
        providerOptions.google = { thinkingConfig: { thinkingBudget: 1024 } };
      }
    }

    try {
      return streamText({
        model: currentModel,
        system: fullSystemPrompt,
        messages: normalizedMessages,
        providerOptions,
        abortSignal,
        maxRetries: 2,
        stopWhen: stepCountIs(5),
        onError({ error }) {
          console.error(`AI stream failed for ${currentModelName}:`, getAIErrorMessage(error));
        },
        tools: {
          create_artifact: tool({
            description: createArtifactTool.description,
            parameters: createArtifactTool.parameters,
            // @ts-expect-error - dynamic types
            execute: async (args: any) => ({
              success: true,
              type: args.type || 'markdown',
              title: args.title || 'Untitled Artifact',
              content: args.content || '',
            }),
          }),
          read_file: tool({
            description: readFileTool.description,
            parameters: readFileTool.parameters,
            // @ts-expect-error - dynamic types
            execute: async ({ file_path }: { file_path: string }) => {
              if (!projectPath) return { error: 'Not in project mode.' };
              try {
                const fullPath = await resolveProjectPath(projectPath, file_path);
                if (!fullPath) return { error: `Path escapes project: ${file_path}.` };
                const content = await FileSystemService.getFileContent(fullPath);
                return { content, file_path };
              } catch (e: any) {
                return { error: `Failed to read: ${e.message || e}` };
              }
            },
          }),
          write_file: tool({
            description: writeFileTool.description,
            parameters: writeFileTool.parameters,
            // @ts-expect-error - dynamic types
            execute: async ({ file_path, content }: { file_path: string; content: string }) => {
              if (!projectPath)
                return { success: true, is_artifact: true, title: file_path, content };
              try {
                const fullPath = await resolveProjectPath(projectPath, file_path);
                if (!fullPath) return { error: `Path escapes project: ${file_path}.` };
                await FileSystemService.saveFile(fullPath, content);
                return { success: true, file_path, content };
              } catch (e: any) {
                return { error: `Failed to write: ${e.message || e}` };
              }
            },
          }),
          edit_file: tool({
            description: editFileTool.description,
            parameters: editFileTool.parameters,
            // @ts-expect-error - dynamic types
            execute: async ({
              file_path,
              target_content,
              replacement_content,
            }: {
              file_path: string;
              target_content: string;
              replacement_content: string;
            }) => {
              if (!projectPath) return { error: 'Not in project mode.' };
              try {
                const fullPath = await resolveProjectPath(projectPath, file_path);
                if (!fullPath) return { error: `Path escapes project: ${file_path}.` };
                const currentContent = await FileSystemService.getFileContent(fullPath);
                if (!currentContent.includes(target_content))
                  return { error: `Target content not found in ${file_path}.` };
                const updatedContent = currentContent.replace(target_content, replacement_content);
                await FileSystemService.saveFile(fullPath, updatedContent);
                return { success: true, file_path, content: updatedContent };
              } catch (e: any) {
                return { error: `Failed to edit: ${e.message || e}` };
              }
            },
          }),
          write_to_plan: tool({
            description: writeToPlanTool.description,
            parameters: writeToPlanTool.parameters,
            // @ts-expect-error - dynamic types
            execute: async ({ filename, content }: { filename: string; content: string }) => {
              if (projectPath) {
                try {
                  const fullPath = await resolveProjectPath(projectPath, filename);
                  if (!fullPath) return { error: `Path escapes project: ${filename}.` };
                  await FileSystemService.saveFile(fullPath, content);
                  return { success: true, filename, content };
                } catch (e: any) {
                  return { error: `Failed to write plan: ${e.message || e}` };
                }
              }
              return { success: true, is_artifact: true, title: filename, content };
            },
          }),
        },
      });
    } catch (error) {
      if (modelIdx < uniqueChain.length - 1) {
        console.warn(`Model ${uniqueChain[modelIdx]} failed to initialize, trying fallback...`);
        return getStreamResult(modelIdx + 1);
      }
      throw error;
    }
  };

  return getStreamResult(0);
}
