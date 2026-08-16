const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const apiKeyLine = env.split('\n').find(l => l.startsWith('ANTHROPIC_API_KEY='));
const apiKey = apiKeyLine ? apiKeyLine.split('=')[1].replace(/"/g, '').trim() : '';
const anthropic = new Anthropic({ apiKey });
anthropic.models.list().then(res => console.log('MODELS:', res.data.map(m => m.id))).catch(err => console.error('ERROR:', err.message));
