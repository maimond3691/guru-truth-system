import { Chat } from '@/components/main/chat';
import { DataStreamHandler } from '@/components/data-stream/data-stream-handler';
import { auth } from '../(auth)/auth';
import { redirect } from 'next/navigation';
import { generateUUID } from '@/lib/utils';

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  const id = generateUUID();

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        isReadonly={false}
        session={session}
        autoResume={false}
      />
      <DataStreamHandler />
    </>
  );
}
