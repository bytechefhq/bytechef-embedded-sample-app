export function attentionMessage(attentionReason: string | null | undefined): string | null {
  if (!attentionReason) {
    return null;
  }

  const [kind, name] = attentionReason.split(":");

  if (kind === "INPUT_REQUIRED") {
    return `needs the ${name} input`;
  }

  if (kind === "MISSING_CONNECTION") {
    return `needs a ${name} connection`;
  }

  if (kind === "UPDATE_PENDING") {
    return "a newer version is waiting";
  }

  if (kind === "TURNED_OFF_BY_ADMINISTRATOR") {
    return "turned off by your administrator; it comes back when they turn it on again";
  }

  return attentionReason;
}

/**
 * Reads the body of an enable response: a 200 carries {enabled, attentionReason}, an older server answers 204 with no
 * body, which yields null.
 */
export function enableAttentionMessage(responseText: string): string | null {
  if (!responseText.trim()) {
    return null;
  }

  try {
    const body = JSON.parse(responseText) as { attentionReason?: string | null };

    return attentionMessage(body.attentionReason);
  } catch {
    return null;
  }
}
