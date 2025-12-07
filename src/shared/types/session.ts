/**
 * Session Types
 */

export interface Session {
  sessionId: string;
  userId: string;
  startTime: Date;
  lastActivity: Date;
  metadata: Record<string, any>;
}
