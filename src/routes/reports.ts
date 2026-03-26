import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { redisService } from '../services/redis.js';
import { verifyDeviceIntegrity, verifyTimeBuffer } from '../services/tier1-checks.js';
import { runParallelVerification } from '../services/tier2-ai.js';
import { calculateTrustScore } from '../services/scoring-engine.js';
import { sendPriorityAlert, sendPendingReviewAlert } from '../services/websocket.js';
import crypto from 'crypto';

interface SubmitReportBody {
  image: string;
  gps_lat: number;
  gps_lng: number;
  digipin: string;
  description: string;
  capture_timestamp: string;
  submission_timestamp: string;
  attestation_token: string;
  client_phash: string;
}

export async function submitReportHandler(
  request: FastifyRequest<{ Body: SubmitReportBody }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const ip = request.ip;
    const device_id = request.headers['x-device-id'] as string || 'unknown';
    console.log('Received request from:', ip, device_id);

    const rateLimit = await redisService.checkRateLimit(ip, device_id);
    console.log('Rate limit check:', rateLimit);
    if (!rateLimit.allowed) {
      return reply.status(400).send({ error: 'Could not verify authenticity of the report.' });
    }

    const isDuplicate = await redisService.checkDuplicate(request.body.client_phash);
    console.log('Duplicate check:', isDuplicate);
    if (isDuplicate) {
      return reply.status(400).send({ error: 'Could not verify authenticity of the report.' });
    }

    const deviceIntegrity = await verifyDeviceIntegrity(request.body.attestation_token);
    console.log('Device integrity:', deviceIntegrity);
    if (!deviceIntegrity.is_valid) {
      return reply.status(400).send({ error: 'Could not verify authenticity of the report.' });
    }

    const timeBuffer = verifyTimeBuffer(request.body);
    console.log('Time buffer:', timeBuffer);
    if (!timeBuffer.is_valid) {
      return reply.status(400).send({ error: 'Could not verify authenticity of the report.' });
    }

    const labels = ['trash', 'smoke', 'urban', 'construction', 'water', 'park', 'industrial'];
    const verificationResult = await runParallelVerification(request.body, labels);
    console.log('Verification result:', verificationResult);
    
    const scoringResult = calculateTrustScore(verificationResult);
    console.log('Scoring result:', scoringResult);

    const reportId = crypto.randomUUID();

    if (scoringResult.status === 'VERIFIED_PRIORITY') {
      await redisService.setReportStatus(reportId, 'VERIFIED_PRIORITY');
      sendPriorityAlert(reportId, request.body);
      return reply.status(200).send({
        status: 'VERIFIED_PRIORITY',
        report_id: reportId,
        trust_score: scoringResult.trust_score,
      });
    } else if (scoringResult.status === 'PENDING_REVIEW') {
      await redisService.setReportStatus(reportId, 'PENDING_REVIEW');
      sendPendingReviewAlert(reportId, request.body);
      return reply.status(200).send({
        status: 'PENDING_REVIEW',
        report_id: reportId,
        trust_score: scoringResult.trust_score,
      });
    } else {
      return reply.status(400).send({ error: 'Could not verify authenticity of the report.' });
    }
  } catch (err) {
    console.error('Error in submitReportHandler:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  }
}
