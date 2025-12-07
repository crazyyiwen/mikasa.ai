/**
 * Models Route - LLM Model Management
 */

import { Router } from 'express';
import { loadConfig, saveConfig } from '../../shared/utils/config-loader';

const router = Router();

router.get('/models', (req, res) => {
  try {
    const config = loadConfig();
    const models: string[] = [];

    if (config.llm.providers.claude) {
      models.push('claude-sonnet-4-5-20250929');
      models.push('claude-3-opus-20240229');
      models.push('claude-3-sonnet-20240229');
    }

    if (config.llm.providers.opensource) {
      models.push(config.llm.providers.opensource.model);
    }

    res.json({ models });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/models/default', (req, res) => {
  try {
    const { model } = req.body;

    if (!model) {
      return res.status(400).json({ error: 'Model name is required' });
    }

    const config = loadConfig();

    // Update default provider based on model
    if (model.startsWith('claude')) {
      config.llm.defaultProvider = 'claude';
      if (config.llm.providers.claude) {
        config.llm.providers.claude.model = model;
      }
    } else {
      config.llm.defaultProvider = 'opensource';
      if (config.llm.providers.opensource) {
        config.llm.providers.opensource.model = model;
      }
    }

    saveConfig(config);

    res.json({ message: `Default model set to: ${model}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
