import "server-only";

import { anthropic } from "@ai-sdk/anthropic";

// Claude model behind the Chat MCP and Chat Component Kit pages. The Anthropic provider reads ANTHROPIC_API_KEY from
// .env.local; ANTHROPIC_MODEL overrides the default model.
const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5";

export function getChatModel() {
  return anthropic(process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL);
}
