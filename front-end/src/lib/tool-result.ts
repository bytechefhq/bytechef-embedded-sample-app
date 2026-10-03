const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/**
 * MCP tools resolve to `{content: [{type: "text", text: "<json>"}]}`, so the server's actual payload is a JSON
 * string inside the single text part. Returns that parsed payload, or the result unchanged when it has any
 * other shape.
 */
export const unwrapToolResult = (result: unknown): unknown => {
  if (typeof result === "string") {
    return parseJson(result) ?? result;
  }

  if (isRecord(result) && Array.isArray(result.content)) {
    const texts = result.content.flatMap((part) =>
      isRecord(part) && part.type === "text" && typeof part.text === "string" ? [part.text] : [],
    );

    if (texts.length === 1 && texts.length === result.content.length) {
      return parseJson(texts[0]) ?? texts[0];
    }
  }

  return result;
};

/**
 * Returns the `setupUrl` of a `connection_required` result: the page where the user connects the account a
 * tool needs. Only http(s) URLs are accepted, so a tool result can never smuggle a `javascript:` link into the
 * page.
 */
export const findSetupUrl = (payload: unknown): string | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const { setupUrl } = payload;

  return typeof setupUrl === "string" && /^https?:\/\//i.test(setupUrl) ? setupUrl : undefined;
};
