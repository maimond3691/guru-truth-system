import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: 'File size should be less than 10MB',
    })
    // Update the file type based on the kind of files you want to accept
    .refine(
      (file) =>
        [
          'image/jpeg',
          'image/png',
          'text/markdown',
          'text/x-markdown',
          'application/markdown',
          'text/plain',
          'application/octet-stream', // some browsers may send this for .md or unknown
        ].includes(file.type),
      {
        message:
          'File type should be JPEG, PNG, Markdown (.md), or Plain Text',
      },
    ),
});

function sanitizeFilename(name: string): string {
  const withoutPath = name.split(/[\\/]/).pop() || 'upload';
  return withoutPath.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function inferExtensionFromContentType(contentType: string | undefined, originalName?: string): string {
  if (!contentType) return '';
  
  // If the original filename already has a markdown extension, preserve it
  if (originalName) {
    const lowerName = originalName.toLowerCase();
    if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) {
      return ''; // Don't add any extension, preserve the original
    }
  }
  
  if (contentType === 'text/markdown' || contentType === 'text/x-markdown' || contentType === 'application/markdown') return '.md';
  if (contentType === 'text/plain' || contentType === 'application/octet-stream') return '.txt';
  if (contentType === 'image/jpeg') return '.jpg';
  if (contentType === 'image/png') return '.png';
  return '';
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename safely; Blob may not have a name
    const maybeFile = formData.get('file') as unknown as { name?: string } | null;
    const originalName = maybeFile?.name || 'upload';
    const safeName = sanitizeFilename(originalName);

    const contentType = (file as any).type as string | undefined;
    const ext = inferExtensionFromContentType(contentType, originalName);
    const finalName = safeName.endsWith(ext) || ext === '' ? safeName : `${safeName}${ext}`;
    const pathname = `uploads/${session.user?.id || 'anonymous'}/${Date.now()}-${finalName}`;

    const fileBuffer = await file.arrayBuffer();

    try {
      const data = await put(pathname, fileBuffer, {
        access: 'public',
        contentType: contentType || undefined,
      });

      return NextResponse.json(data);
    } catch (error: any) {
      // Surface more actionable diagnostics in development
      const message = typeof error?.message === 'string' ? error.message : 'Upload failed';
      const isTokenMissing = message.includes('BLOB_READ_WRITE_TOKEN');
      return NextResponse.json(
        {
          error: isTokenMissing
            ? 'Blob storage not configured: set BLOB_READ_WRITE_TOKEN in your environment.'
            : process.env.NODE_ENV !== 'production'
              ? message
              : 'Upload failed',
        },
        { status: 500 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
