import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { registerWebSocket } from './services/websocket.js';
import { submitReportHandler } from './routes/reports.js';

const fastify = Fastify({
  logger: true,
});

async function start(): Promise<void> {
  await fastify.register(cors, {
    origin: true,
  });

  await fastify.register(multipart);

  await registerWebSocket(fastify);

  fastify.post('/api/v1/reports/submit', submitReportHandler);

  fastify.get('/health', async () => ({ status: 'ok' }));

  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server running at http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
