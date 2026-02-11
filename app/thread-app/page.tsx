import { Metadata } from 'next';
import ThreadPage from './ThreadPage';
import type { ThreadMessage, Board } from '@/lib/thread/types';

export const metadata: Metadata = {
  title: 'Threads',
  description: 'Public message board',
};

export const revalidate = 30; // ISR - revalidate every 30 seconds

export default async function Page() {
  // TODO: Fetch initial data from database
  // For now, return empty arrays - client will fetch on mount
  const initialMessages: ThreadMessage[] = [];
  const initialBoards: Board[] = [];

  return (
    <ThreadPage
      initialMessages={initialMessages}
      initialBoards={initialBoards}
    />
  );
}
