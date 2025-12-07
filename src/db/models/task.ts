/**
 * Task Model
 */

import mongoose, { Schema, Document } from 'mongoose';
import { Task, TaskType, TaskStatus } from '../../shared/types/task';

export interface ITask extends Task, Document {}

const TaskSchema = new Schema<ITask>({
  taskId: { type: String, required: true, unique: true, index: true },
  sessionId: { type: String, required: true, index: true },
  checkPointId: { type: String, required: true },
  type: { type: String, enum: Object.values(TaskType), required: true },
  status: { type: String, enum: Object.values(TaskStatus), required: true },
  goal: { type: String, required: true },
  plan: {
    steps: [
      {
        stepId: String,
        description: String,
        tool: String,
        params: Schema.Types.Mixed,
        dependencies: [String],
        status: String,
      },
    ],
    reasoning: String,
    estimatedSteps: Number,
  },
  execution: {
    currentStep: Number,
    completedSteps: [String],
    failedSteps: [String],
    logs: [
      {
        timestamp: Date,
        level: String,
        message: String,
        data: Schema.Types.Mixed,
      },
    ],
    filesModified: [String],
    commandsRun: [
      {
        command: String,
        exitCode: Number,
        stdout: String,
        stderr: String,
        duration: Number,
      },
    ],
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update updatedAt on any update
TaskSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const TaskModel = mongoose.model<ITask>('Task', TaskSchema);
