import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { myProvider } from '@/lib/ai/providers';
import { generateObject } from 'ai';
import { buildPhase2SystemPrompt, buildPhase2UserPrompt } from './prompt';
import { Phase2ResponseSchema } from './schema';
import { getDocumentsById } from '@/lib/db/queries';
import { chunkMarkdownDocument, mergePhase2Results, estimateTokenCount } from './utils';

export async function POST(request: Request) {
	try {
		const session = await auth();
		if (!session?.user) {
			return new ChatSDKError('unauthorized:api').toResponse();
		}

		const body = (await request.json()) as { 
			documentId?: string; 
			rawContext?: string; 
			stream?: boolean;
		};
		if (!body?.documentId && !body?.rawContext) {
			return new ChatSDKError('bad_request:api', 'documentId or rawContext required').toResponse();
		}

		let rawContextMarkdown = body.rawContext || '';
		if (!rawContextMarkdown && body.documentId) {
			const docs = await getDocumentsById({ id: body.documentId });
			const [doc] = docs;
			if (!doc) return new ChatSDKError('not_found:document').toResponse();
			if (doc.userId !== session.user.id) return new ChatSDKError('forbidden:document').toResponse();
			rawContextMarkdown = doc.content ?? '';
		}

		if (!rawContextMarkdown.trim()) {
			return new ChatSDKError('bad_request:api', 'Empty markdown').toResponse();
		}

		// Check if document needs chunking
		const estimatedTokens = estimateTokenCount(rawContextMarkdown);
		console.log(`Estimated tokens: ${estimatedTokens}`);
		
		if (estimatedTokens > 150000) {
			console.log('Document is large, using chunking strategy');
			const chunks = chunkMarkdownDocument(rawContextMarkdown);
			console.log(`Split into ${chunks.length} chunks`);
			
			// If streaming is requested, return SSE stream
			if (body.stream) {
				const encoder = new TextEncoder();
				const stream = new ReadableStream({
					async start(controller) {
						try {
							const results: any[] = [];
							const system = buildPhase2SystemPrompt();
							
							// Send initial progress
							controller.enqueue(encoder.encode(`data: ${JSON.stringify({
								type: 'progress',
								phase: 'chunking',
								message: `Document split into ${chunks.length} chunks (${estimatedTokens.toLocaleString()} tokens)`,
								totalChunks: chunks.length,
								currentChunk: 0,
								progress: 0
							})}\n\n`));
							
							// Process chunks sequentially
							for (let i = 0; i < chunks.length; i++) {
								const chunk = chunks[i];
								const chunkTokens = estimateTokenCount(chunk.content);
								
								// Send chunk start progress
								controller.enqueue(encoder.encode(`data: ${JSON.stringify({
									type: 'progress',
									phase: 'processing',
									message: `Processing chunk ${i + 1}/${chunks.length} (${chunkTokens.toLocaleString()} tokens)`,
									totalChunks: chunks.length,
									currentChunk: i + 1,
									progress: Math.round((i / chunks.length) * 100)
								})}\n\n`));
								
								const chunkContext = `\n\nCHUNK PROCESSING CONTEXT:
This is chunk ${chunk.chunkIndex + 1} of ${chunk.totalChunks} from a large document.
- Focus on generating cards for the content in this specific chunk
- Maintain consistency with the overall document structure  
- Be thorough within this chunk's scope
- The final results will be merged with other chunks\n\n`;

								const prompt = buildPhase2UserPrompt({ 
									rawContextMarkdown: chunk.content,
									chunkContext 
								});

								try {
									const { object } = await generateObject({
										model: myProvider.languageModel('phase2-model'),
										system,
										prompt,
										schema: Phase2ResponseSchema,
									});

									const parsed = Phase2ResponseSchema.safeParse(object);
									if (parsed.success) {
										results.push(parsed.data);
										
										// Send chunk completion progress
										controller.enqueue(encoder.encode(`data: ${JSON.stringify({
											type: 'progress',
											phase: 'completed',
											message: `Chunk ${i + 1} completed: ${parsed.data.card_count} cards generated`,
											totalChunks: chunks.length,
											currentChunk: i + 1,
											progress: Math.round(((i + 1) / chunks.length) * 100),
											cardsInChunk: parsed.data.card_count
										})}\n\n`));
									} else {
										controller.enqueue(encoder.encode(`data: ${JSON.stringify({
											type: 'error',
											message: `Chunk ${i + 1} validation failed`,
											details: parsed.error
										})}\n\n`));
									}
								} catch (error: any) {
									controller.enqueue(encoder.encode(`data: ${JSON.stringify({
										type: 'error',
										message: `Error processing chunk ${i + 1}: ${error.message}`,
										phase: 'processing'
									})}\n\n`));
								}
								
								// Add delay between chunks (except for the last chunk)
								if (i < chunks.length - 1) {
									// Send waiting progress
									controller.enqueue(encoder.encode(`data: ${JSON.stringify({
										type: 'progress',
										phase: 'waiting',
										message: 'Waiting 30 seconds to respect rate limits...',
										totalChunks: chunks.length,
										currentChunk: i + 1,
										progress: Math.round(((i + 1) / chunks.length) * 100),
										waitTime: 30
									})}\n\n`));
									
									await new Promise(resolve => setTimeout(resolve, 30000));
								}
							}
							
							if (results.length === 0) {
								controller.enqueue(encoder.encode(`data: ${JSON.stringify({
									type: 'error',
									message: 'Failed to process any chunks successfully'
								})}\n\n`));
							} else {
								// Merge results
								controller.enqueue(encoder.encode(`data: ${JSON.stringify({
									type: 'progress',
									phase: 'merging',
									message: 'Merging results from all chunks...',
									totalChunks: chunks.length,
									currentChunk: chunks.length,
									progress: 100
								})}\n\n`));
								
								const mergedResult = mergePhase2Results(results);
								
								// Send final result
								controller.enqueue(encoder.encode(`data: ${JSON.stringify({
									type: 'complete',
									data: mergedResult,
									message: `Processing complete: ${mergedResult.card_count} total cards generated`
								})}\n\n`));
							}
							
							controller.close();
						} catch (error: any) {
							controller.enqueue(encoder.encode(`data: ${JSON.stringify({
								type: 'error',
								message: `Fatal error: ${error.message}`
							})}\n\n`));
							controller.close();
						}
					}
				});
				
				return new Response(stream, {
					headers: {
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache',
						'Connection': 'keep-alive',
					},
				});
			} else {
				// Non-streaming version (original logic)
				const results: any[] = [];
				const system = buildPhase2SystemPrompt();
				
				// Process chunks sequentially with delay to respect rate limits
				for (let i = 0; i < chunks.length; i++) {
					const chunk = chunks[i];
					console.log(`Processing chunk ${i + 1}/${chunks.length}, estimated tokens: ${estimateTokenCount(chunk.content)}`);
					
					const chunkContext = `\n\nCHUNK PROCESSING CONTEXT:
This is chunk ${chunk.chunkIndex + 1} of ${chunk.totalChunks} from a large document.
- Focus on generating cards for the content in this specific chunk
- Maintain consistency with the overall document structure  
- Be thorough within this chunk's scope
- The final results will be merged with other chunks\n\n`;

					const prompt = buildPhase2UserPrompt({ 
						rawContextMarkdown: chunk.content,
						chunkContext 
					});

					try {
						const { object } = await generateObject({
							model: myProvider.languageModel('phase2-model'),
							system,
							prompt,
							schema: Phase2ResponseSchema,
						});

						const parsed = Phase2ResponseSchema.safeParse(object);
						if (parsed.success) {
							results.push(parsed.data);
							console.log(`Chunk ${i + 1} completed with ${parsed.data.card_count} cards`);
						} else {
							console.error(`Chunk ${i + 1} schema validation failed:`, parsed.error);
						}
					} catch (error) {
						console.error(`Error processing chunk ${i + 1}:`, error);
						// Continue with other chunks
					}
					
					// Add delay between chunks to respect rate limits (except for the last chunk)
					if (i < chunks.length - 1) {
						console.log('Waiting 30 seconds before next chunk...');
						await new Promise(resolve => setTimeout(resolve, 30000));
					}
				}
				
				if (results.length === 0) {
					return new ChatSDKError('bad_request:api', 'Failed to process any chunks').toResponse();
				}
				
				// Merge results from all chunks
				const mergedResult = mergePhase2Results(results);
				console.log(`Merged results: ${mergedResult.card_count} total cards`);
				
				return new Response(JSON.stringify(mergedResult), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				});
			}
		} else {
			// Process normally for smaller documents
			const system = buildPhase2SystemPrompt();
			const prompt = buildPhase2UserPrompt({ rawContextMarkdown });

			const { object } = await generateObject({
				model: myProvider.languageModel('phase2-model'),
				system,
				prompt,
				schema: Phase2ResponseSchema,
			});

			const parsed = Phase2ResponseSchema.safeParse(object);
			if (!parsed.success) {
				return new ChatSDKError('bad_request:api', 'Model returned invalid schema').toResponse();
			}

			return new Response(JSON.stringify(parsed.data), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		}
	} catch (error) {
		console.error('Phase 2 API error:', error);
		return new ChatSDKError('bad_request:api').toResponse();
	}
}

