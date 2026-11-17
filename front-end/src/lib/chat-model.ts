import "server-only";

import { anthropic } from "@ai-sdk/anthropic";

const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5";

export function getChatModel() {
  return anthropic(process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL);
}
