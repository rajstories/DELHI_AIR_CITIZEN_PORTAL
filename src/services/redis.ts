const mockStore = new Map<string, any>();

export class RedisService {
  private readonly RATE_LIMIT_WINDOW = 3600;
  private readonly RATE_LIMIT_MAX = 5;
  private readonly PHASH_WINDOW = 3600;

  async checkRateLimit(ip: string, device_id: string): Promise<{ allowed: boolean; remaining: number }> {
    const key = `rate:${ip}:${device_id}`;
    const current = (mockStore.get(key) || 0) + 1;
    mockStore.set(key, current);
    return { allowed: current <= this.RATE_LIMIT_MAX, remaining: this.RATE_LIMIT_MAX - current };
  }

  async checkDuplicate(hash: string): Promise<boolean> {
    const key = `phash:${hash}`;
    const exists = mockStore.has(key);
    if (!exists) {
      mockStore.set(key, true);
    }
    return exists;
  }

  async setReportStatus(report_id: string, status: string, ttl: number = 86400): Promise<void> {
    mockStore.set(`report:${report_id}:status`, status);
  }

  async getReportStatus(report_id: string): Promise<string | null> {
    return mockStore.get(`report:${report_id}:status`) || null;
  }

  async close(): Promise<void> {
    mockStore.clear();
  }
}

export const redisService = new RedisService();
