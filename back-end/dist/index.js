"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("@fastify/cors"));
// Load environment variables from .env file
dotenv_1.default.config();
// Default configuration
const DEFAULT_PORT = 3001;
const DEFAULT_TOKEN_EXPIRY = '1h';
const DEFAULT_KID = 'bytechef-default-kid';
// Get configuration from environment variables or use defaults
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || DEFAULT_TOKEN_EXPIRY;
const BYTECHEF_PRIVATE_KEY = process.env.BYTECHEF_PRIVATE_KEY;
const BYTECHEF_KID = process.env.BYTECHEF_KID || DEFAULT_KID;
// Check if private key is provided
if (!BYTECHEF_PRIVATE_KEY) {
    console.error('Error: BYTECHEF_PRIVATE_KEY environment variable is required');
    process.exit(1);
}
// Create Fastify server
const server = (0, fastify_1.default)({ logger: true });
// Enable CORS
server.register(cors_1.default, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
});
// Health check endpoint
server.get('/health', async (request, reply) => {
    return { status: 'ok' };
});
// Generate JWT token endpoint
server.get('/api/token', async (request, reply) => {
    try {
        const { externalUserId, name, customClaims = {} } = request.body || {};
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
        // Use type assertion to bypass TypeScript's type checking
        const token = jsonwebtoken_1.default.sign(payload, BYTECHEF_PRIVATE_KEY, {
            algorithm: 'RS256',
            expiresIn: TOKEN_EXPIRY,
            kid: BYTECHEF_KID
        });
        return { token };
    }
    catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Failed to generate token' });
    }
});
// Start the server
const start = async () => {
    try {
        await server.listen({ port: PORT, host: '127.0.0.1' });
        console.log(`Server is running on port ${PORT}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
