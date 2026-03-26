import { FastifyInstance } from 'fastify';
import ws from '@fastify/websocket';
import { WSMessage, ReportPayload } from '../types.js';

let wsServer: FastifyInstance['websocketServer'] | null = null;

export async function registerWebSocket(server: FastifyInstance): Promise<void> {
  await server.register(ws);
  
  server.get('/ws', { websocket: true }, (connection, req) => {
    wsServer = server.websocketServer;
    console.log('Client connected to WebSocket');
    
    connection.socket.on('close', () => {
      console.log('Client disconnected');
    });
  });
}

export function broadcastToDashboard(message: WSMessage): void {
  if (!wsServer) {
    console.warn('WebSocket server not initialized');
    return;
  }

  const data = JSON.stringify(message);
  
  wsServer.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(data);
    }
  });
}

export function sendPriorityAlert(report_id: string, payload: ReportPayload): void {
  const message: WSMessage = {
    type: 'VERIFIED_PRIORITY',
    report_id,
    timestamp: new Date().toISOString(),
    payload,
  };
  broadcastToDashboard(message);
}

export function sendPendingReviewAlert(report_id: string, payload: ReportPayload): void {
  const message: WSMessage = {
    type: 'PENDING_REVIEW',
    report_id,
    timestamp: new Date().toISOString(),
    payload,
  };
  broadcastToDashboard(message);
}
