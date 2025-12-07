/**
 * Session Model
 */

import mongoose, { Schema, Document } from 'mongoose';
import { Session } from '../../shared/types/session';

export interface ISession extends Session, Document {}

const SessionSchema = new Schema<ISession>({
  sessionId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  startTime: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  metadata: { type: Schema.Types.Mixed, default: {} },
});

// Update lastActivity on any update
SessionSchema.pre('save', function (next) {
  this.lastActivity = new Date();
  next();
});

export const SessionModel = mongoose.model<ISession>('Session', SessionSchema);
