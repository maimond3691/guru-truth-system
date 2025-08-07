import { tool } from 'ai';
import { z } from 'zod';

export const listGuruFolders = tool({
  description: 'List all folders (boards) within a specific Guru collection',
  inputSchema: z.object({
    collectionId: z.string().describe('The ID of the collection to list folders from')
  }),
  execute: async ({ collectionId }) => {
    const authToken = process.env.GURU_AUTH_TOKEN;
    
    if (!authToken) {
      throw new Error('GURU_AUTH_TOKEN environment variable is not set');
    }

    try {
      const response = await fetch(`https://api.getguru.com/api/v1/collections/${collectionId}/boards`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'authorization': `Basic ${authToken}`,
          'User-Agent': 'PeakWatch-KnowledgeAgent/1.0.0'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Collection with ID "${collectionId}" not found`);
        } else if (response.status === 401) {
          throw new Error('Guru API authentication failed - check GURU_AUTH_TOKEN');
        } else if (response.status === 403) {
          throw new Error('Forbidden access to this collection - check permissions');
        }
        throw new Error(`Guru API error: ${response.status} ${response.statusText}`);
      }

      const folders = await response.json();
      
      // Return simplified folder information
      return {
        collectionId,
        folderCount: folders.length,
        folders: folders.map((folder: any) => ({
          id: folder.id,
          title: folder.title,
          slug: folder.slug,
          description: folder.description || null,
          dateCreated: folder.dateCreated,
          lastModified: folder.lastModified,
          itemCount: folder.items?.length || 0,
          numberOfFacts: folder.numberOfFacts || 0,
          collection: folder.collection ? {
            name: folder.collection.name,
            id: folder.collection.id
          } : null,
          owner: folder.owner ? {
            name: `${folder.owner.firstName} ${folder.owner.lastName}`,
            email: folder.owner.email,
            id: folder.owner.id
          } : null,
          // Include basic info about items in the folder
          items: folder.items?.slice(0, 10).map((item: any) => ({
            id: item.id,
            title: item.preferredPhrase || item.title || 'Untitled',
            type: item.cardType || 'CARD',
            verificationState: item.verificationState
          })) || []
        }))
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to list Guru folders: ${error.message}`);
      }
      throw new Error('Failed to list Guru folders: Unknown error occurred');
    }
  },
});