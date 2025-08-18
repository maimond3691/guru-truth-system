import type { Phase2Response } from './schema';

// Conservative token estimation: ~4 chars per token
const CHARS_PER_TOKEN = 4;
const MAX_TOKENS_PER_CHUNK = 200000; // User requested 200K token limit
const MAX_CHARS_PER_CHUNK = MAX_TOKENS_PER_CHUNK * CHARS_PER_TOKEN;

export function estimateTokenCount(text: string): number {
  const tokens = Math.ceil(text.length / CHARS_PER_TOKEN);
  // Only log for significant estimations to reduce noise
  if (tokens > 1000) {
    console.log(`🧮 Token estimation: ${text.length.toLocaleString()} chars ÷ ${CHARS_PER_TOKEN} = ${tokens.toLocaleString()} tokens`);
  }
  return tokens;
}

interface DocumentChunk {
  content: string;
  chunkIndex: number;
  totalChunks: number;
  frontmatter?: string;
}

export function chunkMarkdownDocument(markdown: string): DocumentChunk[] {
  console.log('🔪 Starting simplified document chunking process...');
  console.log(`📏 Original document length: ${markdown.length.toLocaleString()} characters`);
  
  // Extract frontmatter once and preserve it for all chunks
  let content = markdown;
  let frontmatter: string | undefined;
  
  if (markdown.startsWith('---')) {
    console.log('📋 Frontmatter detected, excluding it from chunks...');
    const endIndex = markdown.indexOf('---', 3);
    if (endIndex !== -1) {
      frontmatter = markdown.slice(0, endIndex + 3) + '\n';
      content = markdown.slice(endIndex + 3).trim();
      console.log(`📋 Frontmatter excluded: ${frontmatter.length} characters`);
      console.log(`📄 Content to chunk: ${content.length.toLocaleString()} characters`);
    }
  }
  
  // Estimate total tokens and determine if chunking is needed
  const totalTokens = estimateTokenCount(content);
  console.log(`🧮 Total content tokens: ${totalTokens.toLocaleString()}`);
  
  if (totalTokens <= MAX_TOKENS_PER_CHUNK) {
    console.log('✅ Content fits in single chunk, no splitting needed');
    const singleChunk: DocumentChunk = {
      content: content,
      chunkIndex: 0,
      totalChunks: 1,
      frontmatter // Preserve frontmatter for prompt construction
    };
    console.log(`✅ Single chunk created: ${estimateTokenCount(singleChunk.content).toLocaleString()} tokens`);
    return [singleChunk];
  }
  
  // Calculate optimal chunk size for even distribution
  const totalChunks = Math.ceil(totalTokens / MAX_TOKENS_PER_CHUNK);
  const targetChunkSize = Math.ceil(content.length / totalChunks);
  
  console.log(`📊 Target chunks: ${totalChunks}`);
  console.log(`📏 Target chunk size: ${targetChunkSize.toLocaleString()} characters (~${estimateTokenCount(content.substring(0, targetChunkSize)).toLocaleString()} tokens)`);
  
  const chunks: DocumentChunk[] = [];
  let startIndex = 0;
  
  for (let i = 0; i < totalChunks; i++) {
    let endIndex = Math.min(startIndex + targetChunkSize, content.length);
    
    // Avoid splitting in the middle of words - find the last space or newline
    if (endIndex < content.length) {
      const lastSpace = content.lastIndexOf(' ', endIndex);
      const lastNewline = content.lastIndexOf('\n', endIndex);
      const lastBreak = Math.max(lastSpace, lastNewline);
      
      if (lastBreak > startIndex) {
        endIndex = lastBreak;
      }
    }
    
    const chunkContent = content.substring(startIndex, endIndex).trim();
    const chunkTokens = estimateTokenCount(chunkContent);
    
    console.log(`💾 Creating chunk ${i + 1}/${totalChunks}: ${chunkContent.length.toLocaleString()} chars, ${chunkTokens.toLocaleString()} tokens`);
    
    chunks.push({
      content: chunkContent,
      chunkIndex: i,
      totalChunks: totalChunks,
      frontmatter // Preserve frontmatter for prompt construction
    });
    
    startIndex = endIndex;
    
    // If we've reached the end, break
    if (startIndex >= content.length) {
      break;
    }
  }
  
  console.log(`✅ Document chunking complete: ${chunks.length} chunks created`);
  chunks.forEach((chunk, index) => {
    const tokens = estimateTokenCount(chunk.content);
    console.log(`  Chunk ${index + 1}: ${tokens.toLocaleString()} tokens`);
  });
  
  return chunks;
}

function splitIntoSections(content: string): string[] {
  console.log('✂️ Starting section splitting...');
  console.log(`📄 Total content length: ${content.length.toLocaleString()} characters`);
  
  // Split by major headings (# and ##) while preserving the heading with its content
  const sections: string[] = [];
  const lines = content.split('\n');
  let currentSection = '';
  
  console.log(`📝 Total lines in content: ${lines.length.toLocaleString()}`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // If we hit a major heading and have accumulated content, save the current section
    if (line.match(/^##?\s+/) && currentSection.trim()) {
      const sectionTokens = estimateTokenCount(currentSection);
      console.log(`📤 Section completed: ${sectionTokens.toLocaleString()} tokens, heading: "${line.substring(0, 50)}..."`);
      sections.push(currentSection);
      currentSection = line + '\n';
    } else {
      currentSection += line + '\n';
    }
  }
  
  // Add the last section
  if (currentSection.trim()) {
    const finalSectionTokens = estimateTokenCount(currentSection);
    console.log(`📤 Final section: ${finalSectionTokens.toLocaleString()} tokens`);
    sections.push(currentSection);
  }
  
  console.log(`✅ Section splitting complete: ${sections.length} sections created`);
  sections.forEach((section, index) => {
    const tokens = estimateTokenCount(section);
    const preview = section.substring(0, 100).replace(/\n/g, ' ');
    console.log(`  Section ${index + 1}: ${tokens.toLocaleString()} tokens - "${preview}..."`);
  });
  
  return sections;
}

export function mergePhase2Results(results: Phase2Response[]): Phase2Response {
  console.log(`🔀 Starting to merge ${results.length} Phase2 results...`);
  
  const allCards = results.flatMap(result => result.cards);
  console.log(`📊 Total cards before deduplication: ${allCards.length}`);
  
  // Remove duplicate cards based on title similarity
  console.log('🔍 Checking for duplicate cards based on title similarity...');
  const uniqueCards = allCards.filter((card, index, arr) => {
    const isDuplicate = arr.slice(0, index).some(existingCard => 
      areTitlesSimilar(card.title, existingCard.title)
    );
    
    if (isDuplicate) {
      console.log(`🗑️ Removing duplicate card: "${card.title}"`);
    }
    
    return !isDuplicate;
  });
  
  console.log(`📊 Unique cards after deduplication: ${uniqueCards.length}`);
  console.log(`📊 Duplicates removed: ${allCards.length - uniqueCards.length}`);
  
  console.log('📝 Merging exhaustiveness notes...');
  const exhaustivenessNotes = results
    .map((result, index) => `Chunk ${index + 1}: ${result.exhaustiveness_notes}`)
    .filter(note => note.trim())
    .join('\n\n');
  console.log(`📝 Combined exhaustiveness notes length: ${exhaustivenessNotes.length} characters`);
  
  const allComplete = results.every(result => result.complete);
  console.log(`✅ All chunks marked as complete: ${allComplete}`);
  
  const mergedResult = {
    cards: uniqueCards,
    exhaustiveness_notes: exhaustivenessNotes,
    complete: allComplete,
    card_count: uniqueCards.length
  };
  
  console.log(`✅ Merge complete: ${mergedResult.card_count} final cards`);
  return mergedResult;
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
