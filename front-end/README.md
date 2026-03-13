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

4. Configure environment variables:
  - Create or modify the `.env.local` file with the following variables if you need other values than defaults:

  - `NEXT_PUBLIC_BACKEND_APP_BASE_URL`: The URL of the backend API token endpoint (default: 'http://localhost:3001')
  - `NEXT_PUBLIC_BYTECHEF_APP_BASE_URL`: The URL of the ByteChef API (default: 'http://localhost:5173')

  - Adjust the URLs if your backend or ByteChef instance is running on different ports

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

The sample app depends on `@bytechef/embedded-react` via a local `file:` reference. When you modify the SDK source code, changes do **not** propagate automatically — you must rebuild the SDK and reinstall it in the sample app.

### After making changes to the SDK

```bash
# 1. Build the SDK
cd <repo-root>/sdks/frontend/embedded/library/react
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
cd <repo-root>/sdks/frontend/embedded/library/react
npm run watch

# Terminal 2 — After each rebuild, reinstall in the sample app
cd <repo-root>/../bytechef-samples/bytechef-embedded-sample-app/front-end
npm install --install-links
```

Note: even with watch mode, you still need to re-run `npm install --install-links` in the sample app after each rebuild since `file:` dependencies are copied at install time.

## Troubleshooting

- If you encounter CORS issues, ensure that the backend is running and properly configured to allow requests from the frontend origin
- If authentication fails, check that your JWT token is being generated correctly with the proper private key and KID
- If you get `Module not found: Can't resolve '@bytechef/embedded-react'`, run `npm install --install-links` in the front-end directory — do not use plain `npm install` as it creates symlinks that Turbopack cannot resolve
- For any other issues, check the console logs in both the backend and frontend applications
