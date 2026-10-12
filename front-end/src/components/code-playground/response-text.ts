// Pretty-prints a JSON response body, or returns it unchanged when it is not JSON.
export function formatBody(text: string): string {
  if (!text) {
    return "";
  }

  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

// Pulls the human-readable message out of a ByteChef or route error body (`message`, `detail` or `title`), falling back
// to the formatted body.
export function errorMessage(text: string, status: number): string {
  if (!text) {
    return `HTTP ${status}`;
  }

  try {
    const body = JSON.parse(text) as Record<string, unknown>;

    for (const key of ["message", "detail", "title", "error"]) {
      const value = body?.[key];

      if (typeof value === "string" && value.trim()) {
        return `${value} (HTTP ${status})`;
      }
    }
  } catch {
    return `${text} (HTTP ${status})`;
  }

  return formatBody(text);
}

// Reads the first string value of `key: "..."` in a code workflow source, e.g. the project `name` or the integration
// `componentName`. It is a best-effort hint used to find what was just deployed, not a parser.
export function readSourceProperty(source: string, key: string): string | undefined {
  const match = new RegExp(`\\b${key}\\s*:\\s*(["'\`])([^"'\`]+)\\1`).exec(source);

  return match?.[2];
}
