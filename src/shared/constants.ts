/**
 * Application-wide Constants
 */

export const DEFAULT_CONFIG_PATH = '.mikasa.json';
export const DEFAULT_PORT = 3456;
export const DEFAULT_HOST = 'localhost';

export const TEMP_DIR = '.mikasa-temp';
export const AUDIO_FILE_PREFIX = 'mikasa-audio-';

export const DEFAULT_MAX_ITERATIONS = 10;
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_TIMEOUT = 300000; // 5 minutes

export const SUPPORTED_AUDIO_FORMATS = ['wav', 'mp3'] as const;
export const DEFAULT_SAMPLE_RATE = 16000;
export const DEFAULT_CHANNELS = 1;

export const LLM_PROVIDERS = {
  CLAUDE: 'claude',
  OPENSOURCE: 'opensource',
} as const;

export const TOOL_NAMES = {
  FILE: 'file',
  COMMAND: 'command',
  GIT: 'git',
  SEARCH: 'search',
} as const;
