import type { Phase2Response } from './schema';

// Conservative token estimation: ~4 chars per token
const CHARS_PER_TOKEN = 4;
const MAX_TOKENS_PER_CHUNK = 150000; // Leave buffer for system prompt and response
const MAX_CHARS_PER_CHUNK = MAX_TOKENS_PER_CHUNK * CHARS_PER_TOKEN;

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

interface DocumentChunk {
  content: string;
  chunkIndex: number;
  totalChunks: number;
  frontmatter?: string;
}

export function chunkMarkdownDocument(markdown: string): DocumentChunk[] {
  const estimatedTokens = estimateTokenCount(markdown);
  
  if (estimatedTokens <= MAX_TOKENS_PER_CHUNK) {
    return [{
      content: markdown,
      chunkIndex: 0,
      totalChunks: 1
    }];
  }

  const chunks: DocumentChunk[] = [];
  let frontmatter = '';
  let remainingContent = markdown;

  // Extract frontmatter (between first two --- lines)
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (frontmatterMatch) {
    frontmatter = `---\n${frontmatterMatch[1]}\n---\n`;
    remainingContent = frontmatterMatch[2];
  }

  // Split by major sections while preserving structure
  const sections = splitIntoSections(remainingContent);
  const totalChunks = Math.ceil(estimatedTokens / MAX_TOKENS_PER_CHUNK);
  
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (const section of sections) {
    const sectionWithFrontmatter = frontmatter + currentChunk + section;
    
    if (estimateTokenCount(sectionWithFrontmatter) > MAX_TOKENS_PER_CHUNK && currentChunk) {
      // Current chunk is full, save it and start new one
      chunks.push({
        content: frontmatter + currentChunk.trim(),
        chunkIndex,
        totalChunks,
        frontmatter: frontmatter || undefined
      });
      
      chunkIndex++;
      currentChunk = section;
    } else {
      currentChunk += section;
    }
  }
  
  // Add the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: frontmatter + currentChunk.trim(),
      chunkIndex,
      totalChunks: chunks.length + 1,
      frontmatter: frontmatter || undefined
    });
  }

  // Update totalChunks for all chunks
  const actualTotalChunks = chunks.length;
  chunks.forEach(chunk => {
    chunk.totalChunks = actualTotalChunks;
  });

  return chunks;
}

function splitIntoSections(content: string): string[] {
  // Split by major headings (# and ##) while preserving the heading with its content
  const sections: string[] = [];
  const lines = content.split('\n');
  let currentSection = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // If we hit a major heading and have accumulated content, save the current section
    if (line.match(/^##?\s+/) && currentSection.trim()) {
      sections.push(currentSection);
      currentSection = line + '\n';
    } else {
      currentSection += line + '\n';
    }
  }
  
  // Add the last section
  if (currentSection.trim()) {
    sections.push(currentSection);
  }
  
  return sections;
}

export function mergePhase2Results(results: Phase2Response[]): Phase2Response {
  const allCards = results.flatMap(result => result.cards);
  
  // Remove duplicate cards based on title similarity
  const uniqueCards = allCards.filter((card, index, arr) => {
    return !arr.slice(0, index).some(existingCard => 
      areTitlesSimilar(card.title, existingCard.title)
    );
  });
  
  const exhaustivenessNotes = results
    .map((result, index) => `Chunk ${index + 1}: ${result.exhaustiveness_notes}`)
    .filter(note => note.trim())
    .join('\n\n');
  
  return {
    cards: uniqueCards,
    exhaustiveness_notes: exhaustivenessNotes,
    complete: results.every(result => result.complete),
    card_count: uniqueCards.length
  };
}

function areTitlesSimilar(title1: string, title2: string): boolean {
  // Simple similarity check - normalize and compare
  const normalize = (title: string) => 
    title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  
  const norm1 = normalize(title1);
  const norm2 = normalize(title2);
  
  // Check if titles are identical or one contains the other
  return norm1 === norm2 || 
         norm1.includes(norm2) || 
         norm2.includes(norm1);
}

export function createChunkPrompt(chunk: DocumentChunk): string {
  let chunkContext = '';
  
  if (chunk.totalChunks > 1) {
    chunkContext = `\n\nCHUNK PROCESSING CONTEXT:
This is chunk ${chunk.chunkIndex + 1} of ${chunk.totalChunks} from a large document.
- Focus on generating cards for the content in this specific chunk
- Maintain consistency with the overall document structure
- Be thorough within this chunk's scope
- The final results will be merged with other chunks\n\n`;
  }
  
  return chunkContext;
}
