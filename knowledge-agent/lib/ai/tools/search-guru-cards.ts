import { tool } from 'ai';
import { z } from 'zod';

export const searchGuruCards = tool({
  description: 'Search for Guru cards using text search, filters, and sorting options',
  inputSchema: z.object({
    searchTerms: z.string().optional().describe('Search terms to find in card title, content, and properties'),
    maxResults: z.number().optional().default(10).describe('Maximum number of results to return (1-50)'),
    showArchived: z.boolean().optional().default(false).describe('Whether to include archived cards'),
    sortField: z.enum([
      'lastModified',
      'lastModifiedBy', 
      'boardCount',
      'verificationState',
      'copyCount',
      'viewCount',
      'favoriteCount',
      'dateCreated',
      'verificationInterval',
      'verifier',
      'owner',
      'lastVerifiedBy',
      'lastVerified',
      'popularity',
      'title'
    ]).optional().default('lastModified').describe('Field to sort results by'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort order: ascending or descending')
  }),
  execute: async ({ searchTerms, maxResults = 10, showArchived = false, sortField = 'lastModified', sortOrder = 'desc' }) => {
    const authToken = process.env.GURU_AUTH_TOKEN;
    
    if (!authToken) {
      throw new Error('GURU_AUTH_TOKEN environment variable is not set');
    }

    // Ensure maxResults is within API limits
    const limitedResults = Math.min(Math.max(maxResults, 1), 50);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (searchTerms && !showArchived) {
        params.append('searchTerms', searchTerms);
      }
      
      params.append('showArchived', showArchived.toString());
      params.append('maxResults', limitedResults.toString());
      params.append('sortField', sortField);
      params.append('sortOrder', sortOrder);

      const url = `https://api.getguru.com/api/v1/search/query?${params.toString()}`;

      const response = await fetch(url, {
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
        } else if (response.status === 400) {
          throw new Error('Invalid search parameters');
        } else if (response.status === 403) {
          throw new Error('Forbidden access to Guru API - check permissions');
        }
        throw new Error(`Guru API error: ${response.status} ${response.statusText}`);
      }

      const cards = await response.json();
      
      // Return simplified card information
      return {
        searchTerms: searchTerms || null,
        resultsCount: cards.length,
        maxResults: limitedResults,
        sortedBy: `${sortField} (${sortOrder})`,
        cards: cards.map((card: any) => ({
          id: card.id,
          title: card.preferredPhrase || 'Untitled Card',
          slug: card.slug,
          verificationState: card.verificationState,
          shareStatus: card.shareStatus,
          dateCreated: card.dateCreated,
          lastModified: card.lastModified,
          lastVerified: card.lastVerified,
          nextVerificationDate: card.nextVerificationDate,
          collection: {
            name: card.collection?.name,
            id: card.collection?.id,
            color: card.collection?.color,
            emoji: card.collection?.emoji
          },
          owner: card.owner ? {
            name: `${card.owner.firstName} ${card.owner.lastName}`,
            email: card.owner.email
          } : null,
          lastModifiedBy: card.lastModifiedBy ? {
            name: `${card.lastModifiedBy.firstName} ${card.lastModifiedBy.lastName}`,
            email: card.lastModifiedBy.email
          } : null,
          folders: card.boards?.map((board: any) => ({
            title: board.title,
            id: board.id,
            slug: board.slug
          })) || [],
          // Don't include full content in search results to keep response manageable
          hasContent: !!card.content,
          contentPreview: card.content ? 
            `${card.content.replace(/<[^>]*>/g, '').substring(0, 200)}...` : null
        }))
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to search Guru cards: ${error.message}`);
      }
      throw new Error('Failed to search Guru cards: Unknown error occurred');
    }
  },
});