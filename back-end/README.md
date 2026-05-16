# ByteChef Embedded Sample App Backend

This is a small TypeScript server built with Fastify that provides JWT token generation for the ByteChef Embedded Sample App.

## Features

- JWT token generation with RSA256 signing
- Environment variable based configuration
- Configurable token expiry
- CORS enabled for all origins
- Health check endpoint
- TypeScript for type safety

## Prerequisites

- Node.js 14.x or higher
- npm or yarn

## Installation

1. Clone the repository
2. Navigate to the back-end directory

```bash
cd backend-end
```
   
3. Install dependencies:

```bash
npm install
```

4. Build the TypeScript code:

```bash
npm run build
```

## Configuration

The server can be configured using environment variables or the `.env` file:

- `PORT`: The port on which the server will run (default: 3001)
- `TOKEN_EXPIRY`: The expiry time for generated tokens (default: 1h)
- `BYTECHEF_PRIVATE_KEY`: The private key used for signing JWT tokens (required, obtained from Signing Keys settings)
- `BYTECHEF_KID`: The key ID to include in the JWT header (required, obtained from Signing Keys settings)

## Getting the Private Key and KID

To obtain the private key and KID required for JWT token generation:

1. Navigate to `/embedded/settings/signing-keys` in your ByteChef application
2. Click **New Signing Key**, give it a name, and click **Save**
3. The private key is displayed once — copy it to the `BYTECHEF_PRIVATE_KEY` entry in your `.env` file before closing the dialog
4. After closing, copy the new key's **Key Id** from the table into `BYTECHEF_KID`

> Use **Signing Keys** (not **API Keys**) for this sample. Signing Keys produce an RSA keypair and a `kid` so this back-end can mint RS256-signed JWTs for end-user sessions. API Keys are a separate concept — single-secret bearer tokens for server-to-server admin API calls, with no private key or `kid`.

## Running the Server

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

The backend server will start on http://localhost:3001 (or the port specified in your `.env` file).

## API Endpoints

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "ok"
}
```

### Generate JWT Token

```
POST /api/token
```

Request Body:
```json
{
  "externalUserId": "123456789",
  "name": "John Doe",
  "customClaims": {
    "role": "admin",
    "permissions": ["read", "write"]
  }
}
```

Response:
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Using the JWT Token

The generated JWT token can be used in the Authorization header for API requests:

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Integration with Front-end

Update the front-end code to fetch a token from this server instead of using a hardcoded token. For example:

```typescript
const fetchToken = async (): Promise<string> => {
  const response = await fetch('http://localhost:3001/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      externalUserId: '123456789',
      name: 'John Doe'
    })
  });

  const data = await response.json();
  return data.token;
};

// Then use the token in your API calls
const token = await fetchToken();
fetch('http://localhost:9555/api/embedded/v1/automation/workflows', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-ENVIRONMENT': 'development'
  }
});
```
