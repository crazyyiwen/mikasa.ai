/**
 * Custom Error Classes
 */

export class MikasaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MikasaError';
  }
}

export class ConfigurationError extends MikasaError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class LLMError extends MikasaError {
  constructor(message: string) {
    super(message);
    this.name = 'LLMError';
  }
}

export class ToolExecutionError extends MikasaError {
  constructor(message: string, public readonly toolName: string) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}

export class AgentError extends MikasaError {
  constructor(message: string) {
    super(message);
    this.name = 'AgentError';
  }
}

export class AudioRecordingError extends MikasaError {
  constructor(message: string) {
    super(message);
    this.name = 'AudioRecordingError';
  }
}

export class DatabaseError extends MikasaError {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}
