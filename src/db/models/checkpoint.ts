/**
 * Checkpoint Model with Vector Search Support
 */

import mongoose, { Schema, Document } from 'mongoose';
import { Checkpoint } from '../../shared/types/checkpoint';

export interface ICheckpoint extends Checkpoint, Document {
  questionEmbedding?: number[];
  answerEmbedding?: number[];
}

const CheckpointSchema = new Schema<ICheckpoint>({
  userId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  checkPointId: { type: String, required: true, unique: true, index: true },
  description: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  createdBy: { type: String, required: true },
  modifiedBy: { type: String, required: true },
  createTimeStamp: { type: Date, default: Date.now, index: true },
  metadata: {
    modelUsed: { type: String },
    tokensUsed: { type: Number },
    duration: { type: Number },
    filesModified: [{ type: String }],
  },
  // Vector embeddings for semantic search
  questionEmbedding: { type: [Number], select: false },
  answerEmbedding: { type: [Number], select: false },
});

// Indexes for efficient querying
CheckpointSchema.index({ userId: 1, sessionId: 1, createTimeStamp: -1 });

// Text search index for fallback
CheckpointSchema.index({ question: 'text', answer: 'text', description: 'text' });

// Vector search index (MongoDB Atlas Vector Search)
// Note: This needs to be created in MongoDB Atlas UI or via API
// {
//   "mappings": {
//     "dynamic": true,
//     "fields": {
//       "questionEmbedding": {
//         "dimensions": 1536,
//         "similarity": "cosine",
//         "type": "knnVector"
//       }
//     }
//   }
// }

export const CheckpointModel = mongoose.model<ICheckpoint>('Checkpoint', CheckpointSchema);
