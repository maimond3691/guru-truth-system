import type { ChatMessage } from '@/lib/types';
import { Phase2ResponseSchema } from './schema';
import { generateUUID } from '@/lib/utils';
import { saveDocument, saveMessages } from '@/lib/db/queries';
import { promises as fs } from 'fs';
import path from 'path';

async function saveMarkdownToFile(content: string, filename: string): Promise<string> {
  try {
    // Create output directory in project root
    const outputDir = path.join(process.cwd(), 'phase2-output');
    
    // Ensure directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fullFilename = `${timestamp}_${filename}`;
    const filePath = path.join(outputDir, fullFilename);
    
    // Write file
    await fs.writeFile(filePath, content, 'utf-8');
    
    console.log(`📁 Markdown output saved to: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('❌ Failed to save markdown file:', error);
    throw error;
  }
}

export async function processPhase2FromMarkdown(opts: {
  request: Request;
  chatId: string;
  sessionUserId: string;
  markdown: string;
  writer: { write: (part: any) => void };
}) {
  console.log('📋 Starting Phase 2 service processing...');
  console.time('⏱️ Phase2 Service Total Time');
  
  const { request, chatId, sessionUserId, markdown, writer } = opts;
  
  console.log('🔧 Service options:');
  console.log(`  - Chat ID: ${chatId}`);
  console.log(`  - Session User ID: ${sessionUserId}`);
  console.log(`  - Markdown length: ${markdown.length.toLocaleString()} characters`);

  console.log('🌐 Setting up API URL...');
  const apiUrl = new URL('/api/phase2', (request as any).url);
  console.log(`🌐 API URL: ${apiUrl.toString()}`);
  
  // Forward cookies for authentication
  console.log('🍪 Setting up authentication headers...');
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    headers.cookie = cookieHeader;
    console.log('✅ Authentication cookies forwarded');
  } else {
    console.log('⚠️ No authentication cookies found');
  }

  // Check if document is large enough to benefit from streaming
  console.log('📏 Determining processing strategy...');
  const estimatedTokens = Math.ceil(markdown.length / 4); // ~4 chars per token
  const shouldStream = estimatedTokens > 150000;
  
  console.log('📊 Document analysis:');
  console.log(`  - Estimated tokens: ${estimatedTokens.toLocaleString()}`);
  console.log(`  - Streaming threshold: 150,000 tokens`);
  console.log(`  - Will use streaming: ${shouldStream}`);

  if (shouldStream) {
    // Use streaming for large documents
    console.log('🌊 Using streaming processing for large document...');
    console.time('⏱️ Streaming API Call');
    
    const requestBody = { rawContext: markdown, stream: true };
    console.log('📤 Making streaming API request...');
    console.log(`📤 Request body keys: ${Object.keys(requestBody)}`);
    console.log(`📤 Raw context preview: ${markdown.substring(0, 200)}...`);
    
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    console.timeEnd('⏱️ Streaming API Call');
    console.log(`📥 Streaming API response status: ${resp.status} ${resp.statusText}`);

    if (!resp.ok) {
      console.error('❌ Phase 2 streaming API call failed:', resp.status, resp.statusText);
      console.error('Response headers:', Object.fromEntries(resp.headers.entries()));
      return false;
    }

    if (!resp.body) {
      console.error('❌ No response body for streaming');
      return false;
    }
    
    console.log('✅ Streaming response received, setting up reader...');

    // Send initial progress message
    const progressMsg: ChatMessage = {
      id: generateUUID(),
      role: 'assistant',
      parts: [{ 
        type: 'text', 
        text: `🔄 **Large Document Detected** (${estimatedTokens.toLocaleString()} tokens)\n\nInitiating advanced chunking strategy for optimal processing...` 
      }],
      metadata: { createdAt: new Date().toISOString() },
    };
    writer.write({ type: 'data-appendMessage', data: JSON.stringify(progressMsg), transient: true });

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let finalResult: any = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              
              // Send progress updates as messages
              if (event.type === 'progress') {
                const statusMsg: ChatMessage = {
                  id: generateUUID(),
                  role: 'assistant',
                  parts: [{ 
                    type: 'text', 
                    text: `⚡ **${event.phase.toUpperCase()}**: ${event.message}${event.cardsInChunk ? ` (+${event.cardsInChunk} cards)` : ''}` 
                  }],
                  metadata: { createdAt: new Date().toISOString() },
                };
                writer.write({ type: 'data-updateMessage', data: JSON.stringify(statusMsg), transient: true });
              } else if (event.type === 'complete') {
                finalResult = event.data;
                const completionMsg: ChatMessage = {
                  id: generateUUID(),
                  role: 'assistant',
                  parts: [{ 
                    type: 'text', 
                    text: `✅ **PROCESSING COMPLETE**: ${event.message}` 
                  }],
                  metadata: { createdAt: new Date().toISOString() },
                };
                writer.write({ type: 'data-updateMessage', data: JSON.stringify(completionMsg), transient: true });
                break;
              } else if (event.type === 'error') {
                const errorMsg: ChatMessage = {
                  id: generateUUID(),
                  role: 'assistant',
                  parts: [{ 
                    type: 'text', 
                    text: `❌ **ERROR**: ${event.message}` 
                  }],
                  metadata: { createdAt: new Date().toISOString() },
                };
                writer.write({ type: 'data-appendMessage', data: JSON.stringify(errorMsg), transient: true });
                return false;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading streaming response:', error);
      return false;
    }

    if (!finalResult) {
      console.error('No final result received from streaming');
      return false;
    }

    const parsed = Phase2ResponseSchema.safeParse(finalResult);
    if (!parsed.success) {
      console.error('Phase 2 schema validation failed:', parsed.error);
      return false;
    }

    console.log('✅ Streaming Phase 2 processing complete! Creating markdown output...');
    
    // Create comprehensive markdown output for streaming results
    const processedData = parsed.data;
    const title = 'Phase 2 — LLM Response Output (Chunked Processing)';
    const mdLines: string[] = [];
    
    mdLines.push(`# ${title}`);
    mdLines.push('');
    mdLines.push(`**Generated:** ${new Date().toISOString()}`);
    mdLines.push(`**Processing Mode:** Streaming with chunking`);
    mdLines.push('');
    
    // Raw JSON Response Section
    mdLines.push('## 🔍 Raw LLM Response (JSON)');
    mdLines.push('');
    mdLines.push('```json');
    mdLines.push(JSON.stringify(finalResult, null, 2));
    mdLines.push('```');
    mdLines.push('');
    
    // Processed Data Summary
    mdLines.push('## 📊 Processing Summary');
    mdLines.push('');
    mdLines.push(`- **Total Cards Generated:** ${processedData.card_count || processedData.cards?.length || 0}`);
    mdLines.push(`- **Schema Validation:** ✅ Passed`);
    mdLines.push(`- **Processing Method:** Advanced chunking with streaming`);
    mdLines.push(`- **Exhaustiveness Notes:** ${processedData.exhaustiveness_notes || 'None provided'}`);
    mdLines.push('');
    
    // Individual Cards Section
    if (processedData.cards && processedData.cards.length > 0) {
      mdLines.push('## 📝 Generated Guru Cards');
      mdLines.push('');
      
      processedData.cards.forEach((card: any, i: number) => {
        mdLines.push(`### ${i + 1}. ${card.title || 'Untitled Card'}`);
        mdLines.push('');
        mdLines.push(`**Audience:** ${card.audience || 'Not specified'}`);
        mdLines.push(`**Pain:** ${card.pain || 'Not specified'}`);
        mdLines.push(`**Priority:** ${card.priority || 'Not specified'}`);
        mdLines.push(`**Complexity:** ${card.complexity || 'Not specified'}`);
        mdLines.push('');
        
        if (card.content_markdown) {
          mdLines.push('**Content:**');
          mdLines.push('');
          mdLines.push(card.content_markdown);
        }
        
        mdLines.push('');
        mdLines.push('---');
        mdLines.push('');
      });
    } else {
      mdLines.push('## ⚠️ No Cards Generated');
      mdLines.push('');
      mdLines.push('The LLM response did not contain any cards or the cards array was empty.');
      mdLines.push('');
    }
    
    // Debug Information
    mdLines.push('## 🐛 Debug Information');
    mdLines.push('');
    mdLines.push(`- **Chat ID:** ${chatId}`);
    mdLines.push(`- **User ID:** ${sessionUserId}`);
    mdLines.push(`- **Markdown Length:** ${markdown.length.toLocaleString()} characters`);
    mdLines.push(`- **Processing Method:** Streaming with real-time progress`);
    mdLines.push(`- **Response Status:** Success`);
    mdLines.push('');
    
    const content = mdLines.join('\n');
    
    // Save markdown to file instead of database
    try {
      const filePath = await saveMarkdownToFile(content, 'phase2-streaming-results.md');
      const relativePath = path.relative(process.cwd(), filePath);
      
      // Send a simple confirmation message
      const assistantMsg: ChatMessage = {
        id: generateUUID(),
        role: 'assistant',
        parts: [
          { type: 'text', text: `## ✅ Streaming Phase 2 Processing Complete!\n\n**Generated ${processedData.cards?.length || 0} Guru cards** using advanced chunking strategy.\n\n📁 **Results saved to:** \`${relativePath}\`\n\n**Summary:**\n- Total cards: ${processedData.cards?.length || 0}\n- Processing mode: Streaming with chunking\n- Schema validation: ✅ Passed\n\nCheck the file for complete LLM response, card details, and debug information.` },
        ],
        metadata: { createdAt: new Date().toISOString() },
      };
      
      console.log('📤 Sending streaming file confirmation message...');
      writer.write({ type: 'data-appendMessage', data: JSON.stringify(assistantMsg), transient: true });
      
      console.log('✅ Streaming Phase 2 service processing complete - markdown saved to file');
      return true;
    } catch (error) {
      console.error('❌ Failed to save streaming markdown file:', error);
      
      // Fallback to chat message if file saving fails
      const assistantMsg: ChatMessage = {
        id: generateUUID(),
        role: 'assistant',
        parts: [
          { type: 'text', text: `## ⚠️ Streaming Phase 2 Processing Complete (File Save Failed)\n\n**Generated ${processedData.cards?.length || 0} Guru cards** but couldn't save to file.\n\n**Error:** ${error instanceof Error ? error.message : String(error)}\n\n### 📋 Results:\n\n\`\`\`markdown\n${content}\n\`\`\`` },
        ],
        metadata: { createdAt: new Date().toISOString() },
      };
      
      writer.write({ type: 'data-appendMessage', data: JSON.stringify(assistantMsg), transient: true });
      return true;
    }
  } else {
    // Use regular processing for smaller documents
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ rawContext: markdown }),
    });

    if (!resp.ok) {
      console.error('Phase 2 API call failed:', resp.status, resp.statusText);
      return false;
    }

    const data = await resp.json();
    const parsed = Phase2ResponseSchema.safeParse(data);
    
    if (!parsed.success) {
      console.error('Phase 2 schema validation failed:', parsed.error);
      return false;
    }

    console.log('✅ Phase 2 processing complete! Creating markdown output...');
    
    // Create comprehensive markdown output with all LLM response data
    const title = 'Phase 2 — LLM Response Output';
    const mdLines: string[] = [];
    
    mdLines.push(`# ${title}`);
    mdLines.push('');
    mdLines.push(`**Generated:** ${new Date().toISOString()}`);
    mdLines.push(`**Processing Mode:** Non-streaming`);
    mdLines.push('');
    
    // Raw JSON Response Section
    mdLines.push('## 🔍 Raw LLM Response (JSON)');
    mdLines.push('');
    mdLines.push('```json');
    mdLines.push(JSON.stringify(data, null, 2));
    mdLines.push('```');
    mdLines.push('');
    
    // Processed Data Summary
    const processedData = parsed.data;
    mdLines.push('## 📊 Processing Summary');
    mdLines.push('');
    mdLines.push(`- **Total Cards Generated:** ${processedData.card_count || processedData.cards?.length || 0}`);
    mdLines.push(`- **Schema Validation:** ✅ Passed`);
    mdLines.push(`- **Exhaustiveness Notes:** ${processedData.exhaustiveness_notes || 'None provided'}`);
    mdLines.push('');
    
    // Individual Cards Section
    if (processedData.cards && processedData.cards.length > 0) {
      mdLines.push('## 📝 Generated Guru Cards');
      mdLines.push('');
      
      processedData.cards.forEach((card: any, i: number) => {
        mdLines.push(`### ${i + 1}. ${card.title || 'Untitled Card'}`);
        mdLines.push('');
        mdLines.push(`**Audience:** ${card.audience || 'Not specified'}`);
        mdLines.push(`**Pain:** ${card.pain || 'Not specified'}`);
        mdLines.push(`**Priority:** ${card.priority || 'Not specified'}`);
        mdLines.push(`**Complexity:** ${card.complexity || 'Not specified'}`);
        mdLines.push('');
        
        if (card.content_markdown) {
          mdLines.push('**Content:**');
          mdLines.push('');
          mdLines.push(card.content_markdown);
        }
        
        mdLines.push('');
        mdLines.push('---');
        mdLines.push('');
      });
    } else {
      mdLines.push('## ⚠️ No Cards Generated');
      mdLines.push('');
      mdLines.push('The LLM response did not contain any cards or the cards array was empty.');
      mdLines.push('');
    }
    
    // Debug Information
    mdLines.push('## 🐛 Debug Information');
    mdLines.push('');
    mdLines.push(`- **Chat ID:** ${chatId}`);
    mdLines.push(`- **User ID:** ${sessionUserId}`);
    mdLines.push(`- **Markdown Length:** ${markdown.length.toLocaleString()} characters`);
    mdLines.push(`- **Response Status:** Success`);
    mdLines.push('');
    
    const content = mdLines.join('\n');
    
    // Save markdown to file instead of database
    try {
      const filePath = await saveMarkdownToFile(content, 'phase2-results.md');
      const relativePath = path.relative(process.cwd(), filePath);
      
      // Send a simple confirmation message
      const assistantMsg: ChatMessage = {
        id: generateUUID(),
        role: 'assistant',
        parts: [
          { type: 'text', text: `## ✅ Phase 2 Processing Complete!\n\n**Generated ${processedData.cards?.length || 0} Guru cards** from your markdown content.\n\n📁 **Results saved to:** \`${relativePath}\`\n\n**Summary:**\n- Total cards: ${processedData.cards?.length || 0}\n- Processing mode: Non-streaming\n- Schema validation: ✅ Passed\n\nCheck the file for complete LLM response, card details, and debug information.` },
        ],
        metadata: { createdAt: new Date().toISOString() },
      };
      
      console.log('📤 Sending file confirmation message...');
      writer.write({ type: 'data-appendMessage', data: JSON.stringify(assistantMsg), transient: true });
      
      console.log('✅ Phase 2 service processing complete - markdown saved to file');
      return true;
    } catch (error) {
      console.error('❌ Failed to save markdown file:', error);
      
      // Fallback to chat message if file saving fails
      const assistantMsg: ChatMessage = {
        id: generateUUID(),
        role: 'assistant',
        parts: [
          { type: 'text', text: `## ⚠️ Phase 2 Processing Complete (File Save Failed)\n\n**Generated ${processedData.cards?.length || 0} Guru cards** but couldn't save to file.\n\n**Error:** ${error instanceof Error ? error.message : String(error)}\n\n### 📋 Results:\n\n\`\`\`markdown\n${content}\n\`\`\`` },
        ],
        metadata: { createdAt: new Date().toISOString() },
      };
      
      writer.write({ type: 'data-appendMessage', data: JSON.stringify(assistantMsg), transient: true });
      return true;
    }
  }
} 