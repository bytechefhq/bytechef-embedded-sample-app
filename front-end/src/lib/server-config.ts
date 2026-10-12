import "server-only";

// Server-only configuration read from .env.local. Never prefix these with NEXT_PUBLIC_: Next.js would inline them
// into the browser bundle. See front-end/README.md for what each variable does.

// Embedded API key of a ByteChef administrator (Embedded > Settings > API Keys), created in the environment named by
// NEXT_PUBLIC_BYTECHEF_ENVIRONMENT. The code playgrounds deploy code workflows with it.
export function getPlatformApiKey(): string | undefined {
  const platformApiKey = process.env.BYTECHEF_PLATFORM_API_KEY?.trim();

  return platformApiKey || undefined;
}

export function isPlatformApiKeyConfigured(): boolean {
  return getPlatformApiKey() !== undefined;
}
