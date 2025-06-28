import fastify from 'fastify';
import cors from '@fastify/cors';
import { snippets } from './snippets';

const server = fastify({
  logger: true
});

server.register(cors, {
  origin: true,
  credentials: true
});

server.get('/', async (request, reply) => {
  return { hello: 'world' };
});

server.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

server.get('/api/snippets', async (request, reply) => {
  return {
    success: true,
    data: snippets,
    count: snippets.length
  };
});

const start = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server listening on http://localhost:3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();