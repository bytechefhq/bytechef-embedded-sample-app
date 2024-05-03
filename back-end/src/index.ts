import fastify from 'fastify';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import cors from '@fastify/cors';

// Load environment variables from .env file
dotenv.config();

// Default configuration
const DEFAULT_PORT = 3001;
const DEFAULT_TOKEN_EXPIRY = '1h';

// Get configuration from environment variables or use defaults
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || DEFAULT_TOKEN_EXPIRY;
const BYTECHEF_PRIVATE_KEY = process.env.BYTECHEF_PRIVATE_KEY;
const BYTECHEF_KID = process.env.BYTECHEF_KID;

// Check if private key is provided
if (!BYTECHEF_PRIVATE_KEY) {
  console.error('Error: BYTECHEF_PRIVATE_KEY environment variable is required');
  process.exit(1);
}

// Create Fastify server
const server = fastify({ logger: true });

// Enable CORS
server.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
});

// Define request body interface for token generation
interface TokenRequestBody {
  externalUserId: string;
  name?: string;
  customClaims?: Record<string, any>;
}

// Health check endpoint
server.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// Generate JWT token endpoint
server.post<{ Body: TokenRequestBody }>('/api/token', async (request, reply) => {
  try {
    const { externalUserId, name, customClaims = {} } = request.body || {};
    console.log(externalUserId)
    if (!externalUserId) {
      return reply.code(400).send({ error: 'externalUserId is required' });
    }

    // Create payload with standard claims
    const payload = {
      sub: externalUserId,
      name: name || externalUserId,
      iat: Math.floor(Date.now() / 1000),
      ...customClaims
    };

    // Generate the JWT token
    const token = jwt.sign(payload, BYTECHEF_PRIVATE_KEY as string, {
      algorithm: 'RS256',
      expiresIn: TOKEN_EXPIRY,
      keyid: BYTECHEF_KID
    } as any);

    return { token };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Failed to generate token' });
  }
});

// Start the server
const start = async (): Promise<void> => {
  try {
    await server.listen({ port: PORT, host: '127.0.0.1' });
    console.log(`Server is running on port ${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
