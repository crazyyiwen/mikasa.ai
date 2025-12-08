/**
 * CLI Session Manager
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateSessionId } from '../../shared/utils/id-generator';

const SESSION_FILE = path.join(os.tmpdir(), '.mikasa-session');

export class SessionManager {
  private sessionId: string;
  private userId: string;

  constructor() {
    this.userId = process.env.USER_ID || os.userInfo().username;
    this.sessionId = this.loadOrCreateSession();
  }

  private loadOrCreateSession(): string {
    // Try to load existing session
    if (fs.existsSync(SESSION_FILE)) {
      try {
        const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
        // Check if session is still valid (less than 24 hours old)
        const sessionAge = Date.now() - new Date(sessionData.timestamp).getTime();
        if (sessionAge < 24 * 60 * 60 * 1000) {
          return sessionData.sessionId;
        }
      } catch (error) {
        // Ignore errors and create new session
      }
    }

    // Create new session
    const newSessionId = generateSessionId();
    this.sessionId = newSessionId;
    this.saveSession();
    return newSessionId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getUserId(): string {
    return this.userId;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  resetSession(): void {
    this.sessionId = generateSessionId();
    this.saveSession();
  }

  private saveSession(): void {
    try {
      const sessionData = {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
      };
      fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData), 'utf-8');
    } catch (error) {
      // Silently fail if we can't save session
    }
  }
}
