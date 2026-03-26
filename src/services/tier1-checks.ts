import { ReportPayload, DeviceIntegrityResult, TimeBufferResult } from '../types.js';

export async function verifyDeviceIntegrity(token: string): Promise<DeviceIntegrityResult> {
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const isValid = token.length > 0;
  
  return {
    is_valid: isValid,
    is_rooted: false,
    is_spoofed_camera: false,
  };
}

export function verifyTimeBuffer(payload: ReportPayload): TimeBufferResult {
  const captureTime = new Date(payload.capture_timestamp).getTime();
  const submissionTime = new Date(payload.submission_timestamp).getTime();
  const bufferMinutes = (submissionTime - captureTime) / (1000 * 60);
  
  return {
    is_valid: bufferMinutes <= 15 && bufferMinutes >= 0,
    buffer_minutes: Math.round(bufferMinutes * 100) / 100,
  };
}
