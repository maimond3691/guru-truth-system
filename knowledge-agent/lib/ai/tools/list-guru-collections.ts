import { tool } from 'ai';
import { z } from 'zod';

export const listGuruCollections = tool({
  description: 'List all Guru collections available in the Peak Watch knowledge base with their metadata',
  inputSchema: z.object({}), // No parameters needed
  execute: async () => {
    const authToken = process.env.GURU_AUTH_TOKEN;
    
    if (!authToken) {
      throw new Error('GURU_AUTH_TOKEN environment variable is not set');
    }

    try {
      const response = await fetch('https://api.getguru.com/api/v1/collections', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'authorization': `Basic ${authToken}`,
          'User-Agent': 'PeakWatch-KnowledgeAgent/1.0.0'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Guru API authentication failed - check GURU_AUTH_TOKEN');
        } else if (response.status === 403) {
          throw new Error('Forbidden access to Guru API - check permissions');
        }
        throw new Error(`Guru API error: ${response.status} ${response.statusText}`);
      }

      const collections = await response.json();
      
      // Return simplified collection information
      return {
        collections: collections.map((collection: any) => ({
          id: collection.id,
          name: collection.name,
          description: collection.description,
          color: collection.color,
          emoji: collection.emoji || null,
          cardCount: collection.cards,
          folderCount: collection.boards,
          publicCards: collection.publicCards,
          collectionType: collection.collectionType,
          dateCreated: collection.dateCreated,
          slug: collection.slug,
          trustScore: collection.collectionStats?.stats?.['collection-trust-score'] ? {
            trusted: collection.collectionStats.stats['collection-trust-score'].trustedCount,
            needsVerification: collection.collectionStats.stats['collection-trust-score'].needsVerificationCount
          } : null,
          team: collection.team ? {
            name: collection.team.name,
            id: collection.team.id
          } : null
        }))
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to list Guru collections: ${error.message}`);
      }
      throw new Error('Failed to list Guru collections: Unknown error occurred');
    }
  },
});