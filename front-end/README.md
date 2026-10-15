# ByteChef Embedded Sample App Frontend

This is a Next.js application that uses integrations and embeds the ByteChef workflow builder

## Prerequisites

- Node.js 14.x or higher
- npm or yarn

## Installation

1. Clone the repository
2. Navigate to the frontend directory:

   ```bash
   cd front-end
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Configure environment variables (see [Configuration](#configuration)).

## Configuration

Create a `.env.local` file in `front-end/` (it is gitignored). Every variable is optional; set only the ones whose default
does not fit. The `NEXT_PUBLIC_*` variables are read in `src/lib/config.ts`, `BYTECHEF_PLATFORM_API_KEY` in
`src/lib/server-config.ts`; `OPENAI_API_KEY` is read where it is used.

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_BYTECHEF_APP_BASE_URL` | `http://localhost:8080` | Your ByteChef instance. Use `https://app.bytechef.io` for **ByteChef Cloud**; for a **self-hosted** instance use its URL (`http://localhost:8080` for a default local install). |
| `NEXT_PUBLIC_BACKEND_APP_BASE_URL` | `http://localhost:3001` | This sample's back-end, which signs the connected-user JWT (`POST /api/token`). |
| `NEXT_PUBLIC_BYTECHEF_ENVIRONMENT` | `DEVELOPMENT` | ByteChef environment every call targets: `DEVELOPMENT`, `STAGING` or `PRODUCTION`. Sent as the `X-ENVIRONMENT` header; integrations, connections and workflows are separate per environment. |
| `NEXT_PUBLIC_BYTECHEF_EXTERNAL_USER_ID` | `1234567890` | Your app's id for the demo user. It becomes the JWT `sub` claim, so ByteChef scopes this user's connections and workflows to it. Change it to simulate a different end user. |
| `NEXT_PUBLIC_BYTECHEF_MCP_SERVER_URL` | *(empty)* | URL of a ByteChef MCP Server. Only needed for the **Chat MCP** page. |
| `OPENAI_API_KEY` | *(none)* | OpenAI API key for the **Chat MCP** and **Chat Component Kit** pages. |
| `BYTECHEF_PLATFORM_API_KEY` | *(none)* | Embedded API key of a ByteChef administrator, used server-side only by the **Automation Code Playground** and **Integration Code Playground** pages to deploy code workflows. See [Code playgrounds](#code-playgrounds). Never prefix it with `NEXT_PUBLIC_`. |

Example for ByteChef Cloud:

```bash
NEXT_PUBLIC_BYTECHEF_APP_BASE_URL=https://app.bytechef.io
NEXT_PUBLIC_BYTECHEF_ENVIRONMENT=DEVELOPMENT
```

Restart `npm run dev` after changing `.env.local`: `NEXT_PUBLIC_*` values are inlined when Next.js compiles the app.

### Code playgrounds

The **Automation Code Playground** and **Integration Code Playground** pages deploy a JavaScript code workflow you edit in
the page, then let you run it - a catalog code project is provisioned as a reference for the demo user, a code
integration is connected and has its workflow enabled on the demo user's integration instance. Both starters include a
workflow started by the Gmail **New Email** trigger and one that calls the Gmail **Search Email** action through a
declared connection, so connect a Gmail account first. Deploying is an administrator operation, so these pages call
`POST /api/embedded/v1/automation-project-code-workflows/deploy` and
`POST /api/embedded/v1/integration-code-workflows/deploy?enable=true` from Next.js route handlers
(`src/app/api/code-playground/`) with a platform API key instead of the connected-user JWT. The key stays on the
server; without it both pages show these setup steps instead of the editor.

1. Sign in to ByteChef as an administrator and switch to the environment set in `NEXT_PUBLIC_BYTECHEF_ENVIRONMENT`
   (an API key belongs to the environment it was created in).
2. Open **Embedded › Settings › API Keys** (`/embedded/settings/api-keys`) and create a key. It is an Embedded API key
   owned by your user, so it carries your administrator role. An organization key from **Settings › Organization ›
   Admin API Keys** does not work: the deploy endpoints reject it with `401`.
3. Add it to `.env.local` and restart the front-end:

   ```bash
   BYTECHEF_PLATFORM_API_KEY=<your API key>
   ```

A code integration is keyed by its component, so deploying the Integration Code Playground's starter (built on
`googleMail`) and the standalone `bytechef-embedded-integration-sample-code-workflow-javascript` sample update the same
code integration. A visual Gmail integration you already have is left alone: the deploy creates or updates a separate
code integration next to it, and the playground picks the one whose description matches the source.

`enable=true` enables the integration in this environment through its instance configuration, which holds the OAuth app
credentials. When the code integration has no configuration yet, ByteChef creates one, and refuses to enable it when the
component needs OAuth app credentials (Gmail does). The refused deploy is rolled back, so prepare the code integration in
ByteChef once before the first deploy:

1. **Embedded › Integrations › New Code Integration**: pick JavaScript and the **Gmail** component, and give it a name
   that tells it apart from a visual Gmail integration, for example `Gmail Code`.
2. **Embedded › Integration Configurations › New**: pick that code integration, choose its OAuth2 authorization, enter
   the client id and secret of your Google OAuth app (the same ones a visual Gmail configuration uses), and enable it.
3. Deploy from the playground. It finds the code integration by its component, publishes your source as its new version
   and moves the configuration to it, keeping the credentials.

Only one code integration per component can exist for the playground to deploy to: with two, the deploy cannot tell which
one to update and fails.

**Activate a template in place.** Each card on `/automations/templates` has an **Activate** button that opens the SDK's
`useActivationDialog`: connect the accounts the template needs (through the regular connect dialog, against the
integration that backs each component — so the integration must exist with an enabled configuration in this
environment), fill its inputs, and activate. "Edit workflow" copies the template and opens it on `/automations/{uuid}`.

## Running the Frontend

1. For development (with hot reloading):

   ```bash
   npm run dev
   ```

2. For production:

   ```bash
   npm run build
   npm start
   ```

The frontend application will start on http://localhost:3000.

## How It Works

1. The backend generates JWT tokens that authenticate requests to the ByteChef API
2. The frontend fetches a token from the backend and uses it to authenticate with ByteChef
3. The frontend embeds the ByteChef workflow builder using the authenticated connection

## API Endpoints

### Backend

- `GET /health`: Health check endpoint
- `POST /api/token`: Generate a JWT token
  - Request body: `{ "externalUserId": "user123", "name": "User Name" }`
  - Response: `{ "token": "jwt-token-here" }`

## Developing with the Embedded React SDK

The sample app depends on `@bytechef/embedded` via a local `file:` reference. When you modify the SDK source code, changes do **not** propagate automatically — you must rebuild the SDK and reinstall it in the sample app.

### After making changes to the SDK

```bash
# 1. Build the SDK
cd <repo-root>/sdks/frontend/embedded/library
npm run build

# 2. Reinstall the SDK in the sample app (copies the new build)
cd <repo-root>/../bytechef-samples/bytechef-embedded-sample-app/front-end
npm install --install-links

# 3. Clear the Next.js cache and restart
rm -rf .next
npm run dev
```

The `--install-links` flag ensures npm **copies** the package files instead of creating a symlink (symlinks cause module resolution issues with Next.js Turbopack).

### Continuous development workflow

For iterative SDK development, run the SDK build in watch mode in a separate terminal:

```bash
# Terminal 1 — SDK auto-rebuild on changes
cd <repo-root>/sdks/frontend/embedded/library
npm run watch

# Terminal 2 — After each rebuild, reinstall in the sample app
cd <repo-root>/../bytechef-samples/bytechef-embedded-sample-app/front-end
npm install --install-links
```

Note: even with watch mode, you still need to re-run `npm install --install-links` in the sample app after each rebuild since `file:` dependencies are copied at install time.

## Troubleshooting

- If you encounter CORS issues, ensure that the backend is running and properly configured to allow requests from the frontend origin
- If authentication fails, check that your JWT token is being generated correctly with the proper private key and KID
- If you get `Module not found: Can't resolve '@bytechef/embedded'`, run `npm install --install-links` in the front-end directory — do not use plain `npm install` as it creates symlinks that Turbopack cannot resolve
- For any other issues, check the console logs in both the backend and frontend applications
