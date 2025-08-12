import {
  customProvider,
} from 'ai';
import { openai } from '@ai-sdk/openai';

export const myProvider = customProvider({
  languageModels: {
    'chat-model': openai('gpt-4o'),
    'chat-model-reasoning': openai('o1-mini'),
    'title-model': openai('gpt-4o-mini'),
    'artifact-model': openai('gpt-4o'),
  },
  imageModels: {
    'small-model': openai.image('dall-e-3'),
  },
});
