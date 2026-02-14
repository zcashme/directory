import { Metadata } from 'next';
import ThreadPage from './ThreadPage';
import type { ThreadMessage, Board } from '@/lib/thread/types';

export const metadata: Metadata = {
  title: 'Threads',
  description: 'Public message board',
};

export const revalidate = 30; // ISR - revalidate every 30 seconds

interface PageProps {
  params: {
    slug?: string[];
  };
}

export default async function Page({ params }: PageProps) {
  // Extract boardId from slug (first element)
  // If no slug provided, use default board ID
  const boardId = params.slug?.[0] || 'general';

  // TODO: Fetch initial data from database
  // For now, return empty arrays - client will fetch on mount
  const initialMessages: ThreadMessage[] = [];
  const initialBoards: Board[] = [];

  return (
    <ThreadPage
      initialMessages={initialMessages}
      initialBoards={initialBoards}
      initialBoardId={boardId}
    />
  );
}
