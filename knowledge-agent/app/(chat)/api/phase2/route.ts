import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { myProvider } from '@/lib/ai/providers';
import { generateObject } from 'ai';
import { buildPhase2SystemPrompt, buildPhase2UserPrompt } from './prompt';
import { Phase2ResponseSchema } from './schema';
import { getDocumentsById } from '@/lib/db/queries';
import { chunkMarkdownDocument, mergePhase2Results, estimateTokenCount } from './utils';

export async function POST(request: Request) {
	console.log('🚀 Phase 2 API POST endpoint called');
	console.time('⏱️ Total Phase2 Processing Time');
	
	try {
		console.log('🔐 Checking authentication...');
		const session = await auth();
		if (!session?.user) {
			console.error('❌ No valid session found');
			return new ChatSDKError('unauthorized:api').toResponse();
		}
		console.log('✅ Authentication successful. User ID:', session.user.id);

		console.log('📥 Parsing request body...');
		const body = (await request.json()) as { 
			documentId?: string; 
			rawContext?: string; 
			stream?: boolean;
		};
		console.log('📋 Request body keys:', Object.keys(body));
		console.log('📋 Document ID provided:', !!body?.documentId);
		console.log('📋 Raw context provided:', !!body?.rawContext);
		console.log('📋 Streaming requested:', !!body?.stream);
		
		if (!body?.documentId && !body?.rawContext) {
			console.error('❌ Neither documentId nor rawContext provided');
			return new ChatSDKError('bad_request:api', 'documentId or rawContext required').toResponse();
		}

		let rawContextMarkdown = body.rawContext || '';
		
		if (!rawContextMarkdown && body.documentId) {
			console.log('📖 Fetching document from database. Document ID:', body.documentId);
			const docs = await getDocumentsById({ id: body.documentId });
			const [doc] = docs;
			console.log('📖 Documents retrieved:', docs.length);
			
			if (!doc) {
				console.error('❌ Document not found:', body.documentId);
				return new ChatSDKError('not_found:document').toResponse();
			}
			
			if (doc.userId !== session.user.id) {
				console.error('❌ Document access forbidden. Document owner:', doc.userId, 'Session user:', session.user.id);
				return new ChatSDKError('forbidden:document').toResponse();
			}
			
			rawContextMarkdown = doc.content ?? '';
			console.log('✅ Document content retrieved. Length:', rawContextMarkdown.length, 'characters');
		}

		if (!rawContextMarkdown.trim()) {
			console.error('❌ Empty markdown content provided');
			return new ChatSDKError('bad_request:api', 'Empty markdown').toResponse();
		}
		
		console.log('📊 Raw context markdown stats:');
		console.log('  - Length:', rawContextMarkdown.length, 'characters');
		console.log('  - Lines:', rawContextMarkdown.split('\n').length);
		console.log('  - Has frontmatter:', rawContextMarkdown.startsWith('---'));
		
		// Preview first 200 chars for debugging
		console.log('📝 Content preview:', rawContextMarkdown.substring(0, 200) + '...');

		// Check if document needs chunking
		console.log('📏 Analyzing document size for chunking decision...');
		const estimatedTokens = estimateTokenCount(rawContextMarkdown);
		console.log('📏 Token estimation complete:');
		console.log('  - Estimated tokens:', estimatedTokens.toLocaleString());
		console.log('  - Threshold for chunking: 150,000 tokens');
		console.log('  - Needs chunking:', estimatedTokens > 150000);
		
		if (estimatedTokens > 150000) {
			console.log('🔪 Document is large, using chunking strategy');
			console.time('⏱️ Document Chunking Time');
			
			const chunks = chunkMarkdownDocument(rawContextMarkdown);
			
			console.timeEnd('⏱️ Document Chunking Time');
			console.log('✅ Document chunking complete:');
			console.log('  - Total chunks created:', chunks.length);
			
			// Log chunk details
			chunks.forEach((chunk, index) => {
				const chunkTokens = estimateTokenCount(chunk.content);
				console.log(`  - Chunk ${index + 1}: ${chunkTokens.toLocaleString()} tokens, ${chunk.content.length.toLocaleString()} chars`);
			});
			
			// If streaming is requested, return SSE stream
			if (body.stream) {
				console.log('🌊 Streaming mode enabled - setting up SSE stream');
				const encoder = new TextEncoder();
				const stream = new ReadableStream({
					async start(controller) {
						console.log('🔄 Stream started - beginning chunk processing');
						console.time('⏱️ Streaming Processing Time');
						
						try {
							const results: any[] = [];
							
							console.log('🤖 Building Phase 2 system prompt...');
							const system = buildPhase2SystemPrompt();
							console.log('✅ System prompt built. Length:', system.length, 'characters');
							
							// Send initial progress
							console.log('📤 Sending initial chunking progress to client...');
							const initialProgress = {
								type: 'progress',
								phase: 'chunking',
								message: `Document split into ${chunks.length} chunks (${estimatedTokens.toLocaleString()} tokens)`,
								totalChunks: chunks.length,
								currentChunk: 0,
								progress: 0
							};
							console.log('📤 Initial progress data:', initialProgress);
							controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialProgress)}\n\n`));
							
							// Process chunks sequentially
							console.log('🔄 Starting sequential chunk processing...');
							for (let i = 0; i < chunks.length; i++) {
								console.log(`\n🧩 === PROCESSING CHUNK ${i + 1}/${chunks.length} ===`);
								console.time(`⏱️ Chunk ${i + 1} Processing Time`);
								
								const chunk = chunks[i];
								const chunkTokens = estimateTokenCount(chunk.content);
								console.log(`📊 Chunk ${i + 1} details:`);
								console.log(`  - Chunk index: ${chunk.chunkIndex}`);
								console.log(`  - Total chunks in document: ${chunk.totalChunks}`);
								console.log(`  - Content length: ${chunk.content.length.toLocaleString()} chars`);
								console.log(`  - Estimated tokens: ${chunkTokens.toLocaleString()}`);
								console.log(`  - Has frontmatter: ${!!chunk.frontmatter}`);
								
								// Send chunk start progress
								console.log(`📤 Sending processing start progress for chunk ${i + 1}...`);
								const processingProgress = {
									type: 'progress',
									phase: 'processing',
									message: `Processing chunk ${i + 1}/${chunks.length} (${chunkTokens.toLocaleString()} tokens)`,
									totalChunks: chunks.length,
									currentChunk: i + 1,
									progress: Math.round((i / chunks.length) * 100)
								};
								console.log(`📤 Processing progress data:`, processingProgress);
								controller.enqueue(encoder.encode(`data: ${JSON.stringify(processingProgress)}\n\n`));
								
								console.log(`🔗 Building chunk context for chunk ${i + 1}...`);
								const chunkContext = `\n\nCHUNK PROCESSING CONTEXT:
This is chunk ${chunk.chunkIndex + 1} of ${chunk.totalChunks} from a large document.
- Focus on generating cards for the content in this specific chunk
- Maintain consistency with the overall document structure  
- Be thorough within this chunk's scope
- The final results will be merged with other chunks\n\n`;
								console.log(`🔗 Chunk context built. Length: ${chunkContext.length} characters`);

								console.log(`💬 Building user prompt for chunk ${i + 1}...`);
								const prompt = buildPhase2UserPrompt({ 
									rawContextMarkdown: chunk.content,
									chunkContext,
									frontmatter: chunk.frontmatter
								});
								console.log(`💬 User prompt built. Total length: ${prompt.length} characters`);

								try {
									console.log(`🤖 Calling LLM for chunk ${i + 1}...`);
									console.time(`⏱️ LLM Call for Chunk ${i + 1}`);
									
									const { object } = await generateObject({
										model: myProvider.languageModel('phase2-model'),
										system,
										prompt,
										schema: Phase2ResponseSchema,
									});
									
									console.timeEnd(`⏱️ LLM Call for Chunk ${i + 1}`);
									console.log(`✅ LLM response received for chunk ${i + 1}`);
									console.log(`🔍 LLM response type:`, typeof object);
									console.log(`🔍 LLM response keys:`, Object.keys(object || {}));

									console.log(`✅ Validating LLM response against schema for chunk ${i + 1}...`);
									const parsed = Phase2ResponseSchema.safeParse(object);
									
									if (parsed.success) {
										console.log(`✅ Schema validation passed for chunk ${i + 1}`);
										console.log(`📊 Chunk ${i + 1} results:`);
										console.log(`  - Cards generated: ${parsed.data.card_count}`);
										console.log(`  - Is complete: ${parsed.data.complete}`);
										console.log(`  - Exhaustiveness notes length: ${parsed.data.exhaustiveness_notes?.length || 0} chars`);
										
										// Log card titles for debugging
										if (parsed.data.cards && parsed.data.cards.length > 0) {
											console.log(`📝 Card titles generated in chunk ${i + 1}:`);
											parsed.data.cards.forEach((card, cardIndex) => {
												console.log(`    ${cardIndex + 1}. "${card.title}" (audience: ${card.audience})`);
											});
										}
										
										results.push(parsed.data);
										
										// Send chunk completion progress
										console.log(`📤 Sending completion progress for chunk ${i + 1}...`);
										const completionProgress = {
											type: 'progress',
											phase: 'completed',
											message: `Chunk ${i + 1} completed: ${parsed.data.card_count} cards generated`,
											totalChunks: chunks.length,
											currentChunk: i + 1,
											progress: Math.round(((i + 1) / chunks.length) * 100),
											cardsInChunk: parsed.data.card_count
										};
										console.log(`📤 Completion progress data:`, completionProgress);
										controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionProgress)}\n\n`));
									} else {
										console.error(`❌ Schema validation failed for chunk ${i + 1}:`);
										console.error('Validation errors:', parsed.error);
										console.error('Raw object received:', JSON.stringify(object, null, 2));
										
										const errorProgress = {
											type: 'error',
											message: `Chunk ${i + 1} validation failed`,
											details: parsed.error
										};
										console.log(`📤 Sending validation error progress:`, errorProgress);
										controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorProgress)}\n\n`));
									}
								} catch (error: any) {
									console.error(`❌ Error processing chunk ${i + 1}:`, error);
									console.error('Error type:', typeof error);
									console.error('Error message:', error.message);
									console.error('Error stack:', error.stack);
									
									const errorProgress = {
										type: 'error',
										message: `Error processing chunk ${i + 1}: ${error.message}`,
										phase: 'processing'
									};
									console.log(`📤 Sending processing error progress:`, errorProgress);
									controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorProgress)}\n\n`));
								}
								
								console.timeEnd(`⏱️ Chunk ${i + 1} Processing Time`);
								
								// Add delay between chunks (except for the last chunk)
								if (i < chunks.length - 1) {
									console.log(`⏸️ Adding rate limit delay before chunk ${i + 2}...`);
									
									// Send waiting progress
									const waitingProgress = {
										type: 'progress',
										phase: 'waiting',
										message: 'Waiting 30 seconds to respect rate limits...',
										totalChunks: chunks.length,
										currentChunk: i + 1,
										progress: Math.round(((i + 1) / chunks.length) * 100),
										waitTime: 30
									};
									console.log(`📤 Sending waiting progress:`, waitingProgress);
									controller.enqueue(encoder.encode(`data: ${JSON.stringify(waitingProgress)}\n\n`));
									
									console.log(`⏱️ Starting 30-second rate limit delay...`);
									await new Promise(resolve => setTimeout(resolve, 30000));
									console.log(`✅ Rate limit delay completed. Proceeding to chunk ${i + 2}`);
								}
							}
							
							console.log(`\n🔄 === CHUNK PROCESSING COMPLETE ===`);
							console.log(`📊 Processing summary:`);
							console.log(`  - Total chunks processed: ${chunks.length}`);
							console.log(`  - Successful results: ${results.length}`);
							console.log(`  - Failed chunks: ${chunks.length - results.length}`);
							
							if (results.length === 0) {
								console.error(`❌ No chunks processed successfully!`);
								const noResultsError = {
									type: 'error',
									message: 'Failed to process any chunks successfully'
								};
								console.log(`📤 Sending no results error:`, noResultsError);
								controller.enqueue(encoder.encode(`data: ${JSON.stringify(noResultsError)}\n\n`));
							} else {
								// Merge results
								console.log(`🔀 Merging results from ${results.length} successful chunks...`);
								console.time('⏱️ Results Merging Time');
								
								const mergingProgress = {
									type: 'progress',
									phase: 'merging',
									message: 'Merging results from all chunks...',
									totalChunks: chunks.length,
									currentChunk: chunks.length,
									progress: 100
								};
								console.log(`📤 Sending merging progress:`, mergingProgress);
								controller.enqueue(encoder.encode(`data: ${JSON.stringify(mergingProgress)}\n\n`));
								
								const mergedResult = mergePhase2Results(results);
								
								console.timeEnd('⏱️ Results Merging Time');
								console.log(`✅ Results merged successfully:`);
								console.log(`  - Total cards before merge: ${results.reduce((sum, r) => sum + r.card_count, 0)}`);
								console.log(`  - Total cards after deduplication: ${mergedResult.card_count}`);
								console.log(`  - Cards removed as duplicates: ${results.reduce((sum, r) => sum + r.card_count, 0) - mergedResult.card_count}`);
								console.log(`  - Final complete status: ${mergedResult.complete}`);
								
								// Send final result
								console.log(`📤 Sending final completion result...`);
								const completionResult = {
									type: 'complete',
									data: mergedResult,
									message: `Processing complete: ${mergedResult.card_count} total cards generated`
								};
								console.log(`📤 Final completion data:`, {
									...completionResult,
									data: { 
										...completionResult.data, 
										cards: `[${completionResult.data.cards.length} cards]` // Don't log full cards for brevity
									}
								});
								controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionResult)}\n\n`));
							}
							
							console.timeEnd('⏱️ Streaming Processing Time');
							console.log(`🔚 Closing SSE stream`);
							controller.close();
						} catch (error: any) {
							console.error(`💥 FATAL ERROR in streaming processing:`, error);
							console.error('Fatal error type:', typeof error);
							console.error('Fatal error message:', error.message);
							console.error('Fatal error stack:', error.stack);
							
							const fatalError = {
								type: 'error',
								message: `Fatal error: ${error.message}`
							};
							console.log(`📤 Sending fatal error:`, fatalError);
							controller.enqueue(encoder.encode(`data: ${JSON.stringify(fatalError)}\n\n`));
							
							console.log(`🔚 Closing SSE stream due to fatal error`);
							controller.close();
						}
					}
				});
				
				console.log(`🌊 Returning streaming response with SSE headers`);
				return new Response(stream, {
					headers: {
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache',
						'Connection': 'keep-alive',
					},
				});
			} else {
				// Non-streaming version (original logic)
				console.log('📦 Non-streaming mode - processing chunks sequentially');
				console.time('⏱️ Non-streaming Processing Time');
				
				const results: any[] = [];
				
				console.log('🤖 Building Phase 2 system prompt for non-streaming...');
				const system = buildPhase2SystemPrompt();
				console.log('✅ System prompt built for non-streaming. Length:', system.length, 'characters');
				
				// Process chunks sequentially with delay to respect rate limits
				console.log('🔄 Starting non-streaming sequential chunk processing...');
				for (let i = 0; i < chunks.length; i++) {
					console.log(`\n🧩 === NON-STREAMING CHUNK ${i + 1}/${chunks.length} ===`);
					console.time(`⏱️ Non-streaming Chunk ${i + 1} Processing Time`);
					
					const chunk = chunks[i];
					const chunkTokens = estimateTokenCount(chunk.content);
					console.log(`📊 Non-streaming chunk ${i + 1} details:`);
					console.log(`  - Chunk index: ${chunk.chunkIndex}`);
					console.log(`  - Total chunks in document: ${chunk.totalChunks}`);
					console.log(`  - Content length: ${chunk.content.length.toLocaleString()} chars`);
					console.log(`  - Estimated tokens: ${chunkTokens.toLocaleString()}`);
					console.log(`  - Has frontmatter: ${!!chunk.frontmatter}`);
					
					console.log(`🔗 Building chunk context for non-streaming chunk ${i + 1}...`);
					const chunkContext = `\n\nCHUNK PROCESSING CONTEXT:
This is chunk ${chunk.chunkIndex + 1} of ${chunk.totalChunks} from a large document.
- Focus on generating cards for the content in this specific chunk
- Maintain consistency with the overall document structure  
- Be thorough within this chunk's scope
- The final results will be merged with other chunks\n\n`;
					console.log(`🔗 Chunk context built for non-streaming. Length: ${chunkContext.length} characters`);

					console.log(`💬 Building user prompt for non-streaming chunk ${i + 1}...`);
					const prompt = buildPhase2UserPrompt({ 
						rawContextMarkdown: chunk.content,
						chunkContext,
						frontmatter: chunk.frontmatter
					});
					console.log(`💬 User prompt built for non-streaming. Total length: ${prompt.length} characters`);

					try {
						console.log(`🤖 Calling LLM for non-streaming chunk ${i + 1}...`);
						console.time(`⏱️ Non-streaming LLM Call for Chunk ${i + 1}`);
						
						const { object } = await generateObject({
							model: myProvider.languageModel('phase2-model'),
							system,
							prompt,
							schema: Phase2ResponseSchema,
						});
						
						console.timeEnd(`⏱️ Non-streaming LLM Call for Chunk ${i + 1}`);
						console.log(`✅ LLM response received for non-streaming chunk ${i + 1}`);
						console.log(`🔍 LLM response type:`, typeof object);
						console.log(`🔍 LLM response keys:`, Object.keys(object || {}));

						console.log(`✅ Validating LLM response against schema for non-streaming chunk ${i + 1}...`);
						const parsed = Phase2ResponseSchema.safeParse(object);
						
						if (parsed.success) {
							console.log(`✅ Schema validation passed for non-streaming chunk ${i + 1}`);
							console.log(`📊 Non-streaming chunk ${i + 1} results:`);
							console.log(`  - Cards generated: ${parsed.data.card_count}`);
							console.log(`  - Is complete: ${parsed.data.complete}`);
							console.log(`  - Exhaustiveness notes length: ${parsed.data.exhaustiveness_notes?.length || 0} chars`);
							
							// Log card titles for debugging
							if (parsed.data.cards && parsed.data.cards.length > 0) {
								console.log(`📝 Card titles generated in non-streaming chunk ${i + 1}:`);
								parsed.data.cards.forEach((card, cardIndex) => {
									console.log(`    ${cardIndex + 1}. "${card.title}" (audience: ${card.audience})`);
								});
							}
							
							results.push(parsed.data);
							console.log(`✅ Non-streaming chunk ${i + 1} completed with ${parsed.data.card_count} cards`);
						} else {
							console.error(`❌ Schema validation failed for non-streaming chunk ${i + 1}:`);
							console.error('Validation errors:', parsed.error);
							console.error('Raw object received:', JSON.stringify(object, null, 2));
						}
					} catch (error: any) {
						console.error(`❌ Error processing non-streaming chunk ${i + 1}:`, error);
						console.error('Error type:', typeof error);
						console.error('Error message:', error?.message);
						console.error('Error stack:', error?.stack);
						// Continue with other chunks
					}
					
					console.timeEnd(`⏱️ Non-streaming Chunk ${i + 1} Processing Time`);
					
					// Add delay between chunks to respect rate limits (except for the last chunk)
					if (i < chunks.length - 1) {
						console.log(`⏸️ Adding rate limit delay before non-streaming chunk ${i + 2}...`);
						console.log(`⏱️ Starting 30-second rate limit delay for non-streaming...`);
						await new Promise(resolve => setTimeout(resolve, 30000));
						console.log(`✅ Rate limit delay completed for non-streaming. Proceeding to chunk ${i + 2}`);
					}
				}
				
				console.log(`\n🔄 === NON-STREAMING CHUNK PROCESSING COMPLETE ===`);
				console.log(`📊 Non-streaming processing summary:`);
				console.log(`  - Total chunks processed: ${chunks.length}`);
				console.log(`  - Successful results: ${results.length}`);
				console.log(`  - Failed chunks: ${chunks.length - results.length}`);
				
				if (results.length === 0) {
					console.error(`❌ No chunks processed successfully in non-streaming mode!`);
					console.timeEnd('⏱️ Non-streaming Processing Time');
					return new ChatSDKError('bad_request:api', 'Failed to process any chunks').toResponse();
				}
				
				// Merge results from all chunks
				console.log(`🔀 Merging results from ${results.length} successful chunks in non-streaming mode...`);
				console.time('⏱️ Non-streaming Results Merging Time');
				
				const mergedResult = mergePhase2Results(results);
				
				console.timeEnd('⏱️ Non-streaming Results Merging Time');
				console.timeEnd('⏱️ Non-streaming Processing Time');
				console.log(`✅ Non-streaming results merged successfully:`);
				console.log(`  - Total cards before merge: ${results.reduce((sum, r) => sum + r.card_count, 0)}`);
				console.log(`  - Total cards after deduplication: ${mergedResult.card_count}`);
				console.log(`  - Cards removed as duplicates: ${results.reduce((sum, r) => sum + r.card_count, 0) - mergedResult.card_count}`);
				console.log(`  - Final complete status: ${mergedResult.complete}`);
				
				console.log(`📤 Returning non-streaming JSON response with ${mergedResult.card_count} cards`);
				return new Response(JSON.stringify(mergedResult), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				});
			}
		} else {
			// Process normally for smaller documents
			console.log('📄 Document is small enough for direct processing (no chunking needed)');
			console.time('⏱️ Small Document Processing Time');
			
			console.log('🤖 Building Phase 2 system prompt for small document...');
			const system = buildPhase2SystemPrompt();
			console.log('✅ System prompt built for small document. Length:', system.length, 'characters');
			
			console.log('💬 Building user prompt for small document...');
			let fm: string | undefined;
			if (rawContextMarkdown.startsWith('---')) {
				const endIndex = rawContextMarkdown.indexOf('---', 3);
				if (endIndex !== -1) {
					fm = rawContextMarkdown.slice(0, endIndex + 3) + '\n';
				}
			}
			const prompt = buildPhase2UserPrompt({ rawContextMarkdown, frontmatter: fm });
			console.log('💬 User prompt built for small document. Total length:', prompt.length, 'characters');

			console.log('🤖 Calling LLM for small document processing...');
			console.time('⏱️ Small Document LLM Call');
			
			const { object } = await generateObject({
				model: myProvider.languageModel('phase2-model'),
				system,
				prompt,
				schema: Phase2ResponseSchema,
			});
			
			console.timeEnd('⏱️ Small Document LLM Call');
			console.log('✅ LLM response received for small document');
			console.log('🔍 LLM response type:', typeof object);
			console.log('🔍 LLM response keys:', Object.keys(object || {}));

			console.log('✅ Validating LLM response against schema for small document...');
			const parsed = Phase2ResponseSchema.safeParse(object);
			
			if (!parsed.success) {
				console.error('❌ Schema validation failed for small document:');
				console.error('Validation errors:', parsed.error);
				console.error('Raw object received:', JSON.stringify(object, null, 2));
				console.timeEnd('⏱️ Small Document Processing Time');
				return new ChatSDKError('bad_request:api', 'Model returned invalid schema').toResponse();
			}
			
			console.log('✅ Schema validation passed for small document');
			console.log('📊 Small document results:');
			console.log('  - Cards generated:', parsed.data.card_count);
			console.log('  - Is complete:', parsed.data.complete);
			console.log('  - Exhaustiveness notes length:', parsed.data.exhaustiveness_notes?.length || 0, 'chars');
			
			// Log card titles for debugging
			if (parsed.data.cards && parsed.data.cards.length > 0) {
				console.log('📝 Card titles generated for small document:');
				parsed.data.cards.forEach((card, cardIndex) => {
					console.log(`    ${cardIndex + 1}. "${card.title}" (audience: ${card.audience})`);
				});
			}
			
			console.timeEnd('⏱️ Small Document Processing Time');
			console.log(`📤 Returning small document JSON response with ${parsed.data.card_count} cards`);
			
			return new Response(JSON.stringify(parsed.data), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		}
	} catch (error: any) {
		console.error('💥 FATAL ERROR in Phase 2 API:', error);
		console.error('Error stack:', error?.stack);
		console.error('Error type:', typeof error);
		console.error('Error constructor:', error?.constructor?.name);
		console.timeEnd('⏱️ Total Phase2 Processing Time');
		console.log('🚨 Phase 2 API call failed with fatal error');
		return new ChatSDKError('bad_request:api').toResponse();
	} finally {
		console.log('🏁 Phase 2 API POST endpoint execution completed');
	}
}

