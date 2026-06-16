import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import {
  SYSTEM_PROMPT,
  createArtifactTool,
  readFileTool,
  writeFileTool,
  editFileTool,
  writeToPlanTool,
} from './ai/config';
import { FileSystemService } from './FileSystemService';
// @ts-ignore
import { join } from '@tauri-apps/api/path';

export async function chatCompletion({
  messages,
  apiKey,
  modelName,
  projectContext,
  projectPath,
}: {
  messages: any[];
  apiKey: string;
  modelName: string;
  projectContext?: string;
  projectPath?: string;
}) {
  const google = createGoogleGenerativeAI({
    apiKey,
  });

  const fullSystemPrompt = projectContext
    ? `${SYSTEM_PROMPT}\n\n### PROJECT CONTEXT\nBelow is the current file tree of the project:\n${projectContext}\n\nMaintain this structure when creating or updating files.`
    : SYSTEM_PROMPT;

  // Normalize messages: @ai-sdk/react v3 sends UIMessage format (with id/parts).
  // streamText expects CoreMessage format ({ role, content }).
  const normalizedMessages = messages.map((m: any) => {
    const role = m.role as 'user' | 'assistant' | 'system';
    // If parts array exists, extract text content from it
    if (Array.isArray(m.parts) && m.parts.length > 0) {
      const text = m.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text ?? '')
        .join('');
      if (text) return { role, content: text };
    }
    return { role, content: m.content ?? '' };
  });

  const result = streamText({
    model: google(modelName),
    system: fullSystemPrompt,
    messages: normalizedMessages,
    tools: {
      create_artifact: tool({
        description: createArtifactTool.description,
        parameters: createArtifactTool.parameters,
        // @ts-ignore
        execute: async (args: any) => {
          return { success: true, ...args };
        },
      }),
      read_file: tool({
        description: readFileTool.description,
        parameters: readFileTool.parameters,
        // @ts-ignore
        execute: async ({ file_path }: { file_path: string }) => {
          if (!projectPath) {
            return { error: 'Not in project mode. Cannot read files.' };
          }
          try {
            const sanitizedPath = file_path.replace(/^(\.\.[/\\])+/, '');
            const fullPath = await join(projectPath, sanitizedPath);
            const content = await FileSystemService.getFileContent(fullPath);
            return { content, file_path };
          } catch (e: any) {
            return { error: `Failed to read file: ${e.message || e}` };
          }
        },
      }),
      write_file: tool({
        description: writeFileTool.description,
        parameters: writeFileTool.parameters,
        // @ts-ignore
        execute: async ({ file_path, content }: { file_path: string; content: string }) => {
          if (!projectPath) {
            return { success: true, is_artifact: true, title: file_path, content };
          }
          try {
            const sanitizedPath = file_path.replace(/^(\.\.[/\\])+/, '');
            const fullPath = await join(projectPath, sanitizedPath);
            await FileSystemService.saveFile(fullPath, content);
            return { success: true, file_path, content };
          } catch (e: any) {
            return { error: `Failed to write file: ${e.message || e}` };
          }
        },
      }),
      edit_file: tool({
        description: editFileTool.description,
        parameters: editFileTool.parameters,
        // @ts-ignore
        execute: async ({
          file_path,
          target_content,
          replacement_content,
        }: {
          file_path: string;
          target_content: string;
          replacement_content: string;
        }) => {
          if (!projectPath) {
            return { error: 'Not in project mode. Cannot edit files.' };
          }
          try {
            const sanitizedPath = file_path.replace(/^(\.\.[/\\])+/, '');
            const fullPath = await join(projectPath, sanitizedPath);
            const currentContent = await FileSystemService.getFileContent(fullPath);
            if (!currentContent.includes(target_content)) {
              return {
                error: `Target content not found in the file: ${file_path}. Please check the file contents and provide the exact match.`,
              };
            }
            const updatedContent = currentContent.replace(target_content, replacement_content);
            await FileSystemService.saveFile(fullPath, updatedContent);
            return { success: true, file_path, content: updatedContent };
          } catch (e: any) {
            return { error: `Failed to edit file: ${e.message || e}` };
          }
        },
      }),
      write_to_plan: tool({
        description: writeToPlanTool.description,
        parameters: writeToPlanTool.parameters,
        // @ts-ignore
        execute: async ({ filename, content }: { filename: string; content: string }) => {
          if (projectPath) {
            try {
              const fullPath = await join(projectPath, filename);
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

  return result;
}
