import { auth } from '@/app/(auth)/auth';
import { getDocumentsById } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const fileName = searchParams.get('fileName') || 'raw-context.md';

    if (!id) return new ChatSDKError('bad_request:api', 'Missing id').toResponse();

    const docs = await getDocumentsById({ id });
    const [doc] = docs;
    if (!doc) return new ChatSDKError('not_found:document').toResponse();
    if (doc.userId !== session.user.id) return new ChatSDKError('forbidden:document').toResponse();

   
    return new Response(doc.content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return new ChatSDKError('bad_request:api').toResponse();
  }
} 