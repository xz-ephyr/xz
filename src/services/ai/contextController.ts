export interface ProjectContext {
  name: string;
  path: string;
  files: string;
}

export function getSmartSystemPrompt(basePrompt: string, projectContext?: ProjectContext) {
  if (!projectContext) return basePrompt;

  return `${basePrompt}

## Rroject Context

You are inside a project named "${projectContext.name}" located at \`${projectContext.path}\`.

The following files and directories exist in this project:

${projectContext.files}

Use this information to answer questions about the project's structure, codebase, and files. When the user asks about their project, refer to this context.`;
}
