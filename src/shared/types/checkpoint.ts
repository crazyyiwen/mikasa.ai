/**
 * Checkpoint Types
 */

export interface Checkpoint {
  userId: string;
  sessionId: string;
  checkPointId: string;
  description: string;
  question: string;
  answer: string;
  createdBy: string;
  modifiedBy: string;
  createTimeStamp: Date;
  metadata?: {
    modelUsed: string;
    tokensUsed: number;
    duration: number;
    filesModified?: string[];
  };
}
