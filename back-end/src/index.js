const fastify = require('fastify')({ logger: true });
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
dotenv.config();

// Default configuration
const DEFAULT_PORT = 3001;
const DEFAULT_PRIVATE_KEY_PATH = path.join(__dirname, '../keys/private.key');
const DEFAULT_PUBLIC_KEY_PATH = path.join(__dirname, '../keys/public.key');
const DEFAULT_TOKEN_EXPIRY = '1h';

// Get configuration from environment variables or use defaults
const PORT = process.env.PORT || DEFAULT_PORT;
const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH || DEFAULT_PRIVATE_KEY_PATH;
const PUBLIC_KEY_PATH = process.env.PUBLIC_KEY_PATH || DEFAULT_PUBLIC_KEY_PATH;
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || DEFAULT_TOKEN_EXPIRY;

// Create keys directory if it doesn't exist
const keysDir = path.dirname(PRIVATE_KEY_PATH);
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

// Generate RSA key pair if they don't exist
if (!fs.existsSync(PRIVATE_KEY_PATH) || !fs.existsSync(PUBLIC_KEY_PATH)) {
  const { generateKeyPairSync } = require('crypto');
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);
  
  console.log(`Generated new RSA key pair at ${keysDir}`);
}

// Read the private and public keys
const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');

// Enable CORS
fastify.register(require('@fastify/cors'), {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// Generate JWT token endpoint
fastify.post('/api/token', async (request, reply) => {
  try {
    const { userId, name, customClaims = {} } = request.body || {};
    
    if (!userId) {
      return reply.code(400).send({ error: 'userId is required' });
    }

    // Create payload with standard claims
    const payload = {
      sub: userId,
      name: name || userId,
      iat: Math.floor(Date.now() / 1000),
      ...customClaims
    };

    // Generate the JWT token
    const token = jwt.sign(payload, privateKey, { 
      algorithm: 'RS256',
      expiresIn: TOKEN_EXPIRY,
      keyid: 'cHVibGxjOmFLZDZaZ1pqTkhWcFRqUmhRa0pGV1daTlltVnFNMEZ1WVdkd1ltOU8' // Example key ID
    });

    return { token };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Failed to generate token' });
  }
});

// Get public key endpoint
fastify.get('/api/public-key', async (request, reply) => {
  return { publicKey };
});

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server is running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();