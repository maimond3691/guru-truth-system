import { tool } from 'ai';
import { z } from 'zod';

export const readGuruCard = tool({
  description: 'Read the full content and metadata of a specific Guru card by ID',
  inputSchema: z.object({
    cardId: z.string().describe('The unique ID of the Guru card to read')
  }),
  execute: async ({ cardId }) => {
    const authToken = process.env.GURU_AUTH_TOKEN;
    
    if (!authToken) {
      throw new Error('GURU_AUTH_TOKEN environment variable is not set');
    }

    try {
      const response = await fetch(`https://api.getguru.com/api/v1/cards/${cardId}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'authorization': `Basic ${authToken}`,
          'User-Agent': 'PeakWatch-KnowledgeAgent/1.0.0'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Card with ID "${cardId}" not found`);
        } else if (response.status === 401) {
          throw new Error('Guru API authentication failed - check GURU_AUTH_TOKEN');
        } else if (response.status === 403) {
          throw new Error('Forbidden access to this card - check permissions');
        }
        throw new Error(`Guru API error: ${response.status} ${response.statusText}`);
      }

      const card = await response.json();
      
      // Clean the HTML content to make it more readable
      const cleanContent = card.content ? 
        card.content
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
          .replace(/<[^>]*>/g, ' ') // Remove HTML tags
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim() : null;

      return {
        id: card.id,
        title: card.preferredPhrase || 'Untitled Card',
        slug: card.slug,
        content: cleanContent,
        htmlContent: card.htmlContent || false,
        verificationState: card.verificationState,
        shareStatus: card.shareStatus,
        cardType: card.cardType,
        commentsEnabled: card.commentsEnabled,
        dateCreated: card.dateCreated,
        lastModified: card.lastModified,
        lastVerified: card.lastVerified,
        nextVerificationDate: card.nextVerificationDate,
        verificationInterval: card.verificationInterval,
        collection: card.collection ? {
          name: card.collection.name,
          id: card.collection.id,
          color: card.collection.color,
          emoji: card.collection.emoji,
          collectionType: card.collection.collectionType
        } : null,
        owner: card.owner ? {
          name: `${card.owner.firstName} ${card.owner.lastName}`,
          email: card.owner.email,
          id: card.owner.id
        } : null,
        originalOwner: card.originalOwner ? {
          name: `${card.originalOwner.firstName} ${card.originalOwner.lastName}`,
          email: card.originalOwner.email,
          id: card.originalOwner.id
        } : null,
        lastModifiedBy: card.lastModifiedBy ? {
          name: `${card.lastModifiedBy.firstName} ${card.lastModifiedBy.lastName}`,
          email: card.lastModifiedBy.email,
          id: card.lastModifiedBy.id
        } : null,
        lastVerifiedBy: card.lastVerifiedBy ? {
          name: `${card.lastVerifiedBy.firstName} ${card.lastVerifiedBy.lastName}`,
          email: card.lastVerifiedBy.email,
          id: card.lastVerifiedBy.id
        } : null,
        verifiers: card.verifiers?.map((verifier: any) => ({
          type: verifier.type,
          id: verifier.id,
          user: verifier.user ? {
            name: `${verifier.user.firstName} ${verifier.user.lastName}`,
            email: verifier.user.email,
            id: verifier.user.id
          } : null
        })) || [],
        folders: card.boards?.map((board: any) => ({
          title: board.title,
          id: board.id,
          slug: board.slug,
          numberOfFacts: board.numberOfFacts
        })) || [],
        attachments: card.highlightedAttachments || [],
        followed: card.followed || false,
        verificationType: card.verificationType
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read Guru card: ${error.message}`);
      }
      throw new Error('Failed to read Guru card: Unknown error occurred');
    }
  },
});