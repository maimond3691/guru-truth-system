import { tool } from 'ai';
import { z } from 'zod';

export const askGuru = tool({
  description: 'Ask Guru a question and receive an AI-generated answer with sources from Peak Watch knowledge base',
  inputSchema: z.object({
    question: z.string().describe('The question to ask Guru about Peak Watch, content moderation, or related topics'),
    agentId: z.string().optional().describe('Optional Knowledge Agent ID to use specific sources (leave empty for default Guru agent)')
  }),
  execute: async ({ question, agentId }) => {
    const authToken = process.env.GURU_AUTH_TOKEN;
    
    if (!authToken) {
      throw new Error('GURU_AUTH_TOKEN environment variable is not set');
    }

    try {
      const requestBody: any = {
        question: question.trim()
      };

      // Add agentId if provided
      if (agentId) {
        requestBody.agentId = agentId;
      }

      const response = await fetch('https://api.getguru.com/api/v1/answers', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': `Basic ${authToken}`,
          'User-Agent': 'PeakWatch-KnowledgeAgent/1.0.0'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Guru API authentication failed - check GURU_AUTH_TOKEN');
        } else if (response.status === 400) {
          throw new Error('Invalid request to Guru API - check question format');
        } else if (response.status === 403) {
          throw new Error('Forbidden access to Guru API - check permissions');
        } else if (response.status === 404) {
          throw new Error('Guru API endpoint not found');
        }
        throw new Error(`Guru API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Return formatted response
      return {
        question: data.question,
        answer: data.answer,
        answered: data.answered,
        answerId: data.answerId,
        answerDate: data.answerDate,
        sources: data.sources?.map((source: any) => ({
          title: source.title,
          url: source.url,
          documentType: source.documentType,
          verificationState: source.verificationState,
          id: source.id
        })) || [],
        searchAssistant: data.searchAssistant ? {
          name: data.searchAssistant.name,
          isDefault: data.searchAssistant.isDefault
        } : null,
        asker: data.asker ? {
          email: data.asker.email,
          firstName: data.asker.firstName,
          lastName: data.asker.lastName
        } : null
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to ask Guru: ${error.message}`);
      }
      throw new Error('Failed to ask Guru: Unknown error occurred');
    }
  },
});