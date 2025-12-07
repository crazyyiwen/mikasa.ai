/**
 * Init Command - Initialize Mikasa in current directory
 */

import { Logger } from '../ui/logger';
import { Spinner } from '../ui/spinner';
import { Prompts } from '../ui/prompts';
import { saveConfig } from '../../shared/utils/config-loader';
import { MikasaConfig } from '../../shared/types';

export async function initCommand(): Promise<void> {
  Logger.header('Initialize Mikasa');

  const spinner = new Spinner();
  spinner.start('Setting up Mikasa configuration...');

  try {
    // Create default configuration
    const config: MikasaConfig = {
      version: '1.0.0',
      server: {
        port: 3456,
        host: 'localhost',
        autoStart: true,
        cors: {
          enabled: true,
          origins: ['http://localhost:3000'],
        },
      },
      llm: {
        defaultProvider: 'claude',
        providers: {
          claude: {
            model: 'claude-sonnet-4-5-20250929',
            maxTokens: 4096,
            temperature: 0.7,
          },
          opensource: {
            endpoint: 'http://localhost:8000/v1/completions',
            model: 'codellama-34b',
          },
        },
      },
      agent: {
        maxIterations: 10,
        maxRetries: 3,
        timeout: 300000,
        enabledTools: ['file', 'command', 'git'],
        safety: {
          allowShellCommands: true,
          allowGitPush: true,
          allowFileDelete: false,
        },
      },
      database: {
        uri: 'mongodb://localhost:27017',
        name: 'mikasa',
        options: {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        },
      },
      audio: {
        format: 'wav',
        sampleRate: 16000,
        channels: 1,
        maxDuration: 120,
        sttProvider: 'whisper',
      },
    };

    spinner.stop();

    // Ask user for customization
    const customize = await Prompts.confirm('Do you want to customize the configuration?', false);

    if (customize) {
      const port = await Prompts.input('Server port', config.server.port.toString());
      config.server.port = parseInt(port);

      const provider = await Prompts.select('Default LLM provider', ['claude', 'opensource']);
      config.llm.defaultProvider = provider as 'claude' | 'opensource';
    }

    spinner.start('Saving configuration...');
    saveConfig(config);
    spinner.succeed('Configuration saved to .mikasa.json');

    Logger.success('\nMikasa initialized successfully!');
    Logger.info('\nNext steps:');
    Logger.log('  1. Set your API keys in .env file (see .env.example)');
    Logger.log('  2. Run "mikasa voice" to start with voice input');
    Logger.log('  3. Or run "mikasa run <prompt>" for text input');
    Logger.newLine();
  } catch (error: any) {
    spinner.fail('Initialization failed');
    Logger.error(error.message);
    process.exit(1);
  }
}
