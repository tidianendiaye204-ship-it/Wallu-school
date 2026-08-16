const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const apiKeyLine = env.split('\n').find(l => l.startsWith('ANTHROPIC_API_KEY='));
const apiKey = apiKeyLine ? apiKeyLine.split('=')[1].replace(/"/g, '').trim() : '';

console.log('Key starts with:', apiKey ? apiKey.substring(0, 10) : 'none');
const anthropic = new Anthropic({ apiKey });
anthropic.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 100,
  system: 'You are an assistant',
  messages: [{ role: 'user', content: 'Hello' }]
}).then(res => console.log('SUCCESS:', res.content[0].text))
  .catch(err => console.error('ERROR:', err.message));
