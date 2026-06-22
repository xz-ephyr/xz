export const COT_INSTRUCTIONS = `### COT ALGORITHM
Apply these rules to your internal thought process:
1. Complexity Assessment: Evaluate if the request is "Simple" (one-step, factual, short) or "Complex" (multi-step, creative, structural).
2. For Simple tasks: Minimize chain-of-thought. Provide direct, high-quality answers immediately.
3. For Complex tasks: Use deep, horizontal thinking. Plan, verify, and execute.
4. Token Efficiency: Do not repeat facts in thinking. Only use thinking for reasoning that isn't obvious.
`;

export function getSmartSystemPrompt(basePrompt: string, projectContext?: string) {
  let prompt = `${basePrompt}\n\n${COT_INSTRUCTIONS}`;

  if (projectContext) {
    prompt += `\n\n### PROJECT CONTEXT\n${projectContext}\n\nYou are working inside this project. Use the file tools to read, create, and edit files relative to the project root.`;
  }

  return prompt;
}
