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

## Troubleshooting

- If you encounter CORS issues, ensure that the backend is running and properly configured to allow requests from the frontend origin
- If authentication fails, check that your JWT token is being generated correctly with the proper private key and KID
- For any other issues, check the console logs in both the backend and frontend applications
