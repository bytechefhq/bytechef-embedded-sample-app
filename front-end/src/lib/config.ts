// Runtime configuration read from .env.local. See front-end/README.md for what each variable does.

// URL of this sample's back-end, which signs the connected-user JWT.
export const BACKEND_APP_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_APP_BASE_URL || "http://localhost:3001";

// URL of your ByteChef instance: https://app.bytechef.io for ByteChef Cloud, http://localhost:8080 for a default
// self-hosted install.
export const BYTECHEF_APP_BASE_URL = process.env.NEXT_PUBLIC_BYTECHEF_APP_BASE_URL || "http://localhost:8080";

export type ByteChefEnvironmentType = "DEVELOPMENT" | "STAGING" | "PRODUCTION";

export const BYTECHEF_ENVIRONMENT = (process.env.NEXT_PUBLIC_BYTECHEF_ENVIRONMENT ||
  "DEVELOPMENT") as ByteChefEnvironmentType;

export const BYTECHEF_EXTERNAL_USER_ID = process.env.NEXT_PUBLIC_BYTECHEF_EXTERNAL_USER_ID || "1234567890";

export const BYTECHEF_MCP_SERVER_URL = process.env.NEXT_PUBLIC_BYTECHEF_MCP_SERVER_URL || "";
