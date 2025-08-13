import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { myProvider } from '@/lib/ai/providers';
import { generateObject } from 'ai';
import { buildPhase2SystemPrompt, buildPhase2UserPrompt } from '@/lib/phase2/prompt';
import { Phase2ResponseSchema } from '@/lib/phase2/schema';
import { getDocumentsById } from '@/lib/db/queries';

export async function POST(request: Request) {
	try {
		const session = await auth();
		if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

		const body = (await request.json()) as { documentId?: string; rawContext?: string };
		if (!body?.documentId && !body?.rawContext)
			return new ChatSDKError('bad_request:api', 'documentId or rawContext required').toResponse();

		let rawContextMarkdown = body.rawContext || '';
		if (!rawContextMarkdown && body.documentId) {
			const docs = await getDocumentsById({ id: body.documentId });
			const [doc] = docs;
			if (!doc) return new ChatSDKError('not_found:document').toResponse();
			if (doc.userId !== session.user.id) return new ChatSDKError('forbidden:document').toResponse();
			rawContextMarkdown = doc.content ?? '';
		}

		if (!rawContextMarkdown.trim())
			return new ChatSDKError('bad_request:api', 'Empty markdown').toResponse();

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
	} catch (error) {
		return new ChatSDKError('bad_request:api').toResponse();
	}
}

