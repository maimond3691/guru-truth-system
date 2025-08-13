import {
  customProvider,
} from 'ai';
import { openai } from '@ai-sdk/openai';

export const myProvider = customProvider({
  languageModels: {
    'chat-model': openai('gpt-4.1'),
    'chat-model-reasoning': openai('o1-mini'),
    'title-model': openai('gpt-4o-mini'),
    'artifact-model': openai('gpt-4.1'),
    'phase2-model': openai('gpt-4.1'),
  },
  imageModels: {
    'small-model': openai.image('dall-e-3'),
  },
});
