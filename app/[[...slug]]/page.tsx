import { Metadata } from 'next';
import ThreadPage from './ThreadPage';
import type { ThreadMessage, Board } from '@/lib/thread/types';

export const metadata: Metadata = {
  title: 'Threads',
  description: 'Public message board',
};

export const revalidate = 30; // ISR - revalidate every 30 seconds

export default async function Page({
  params,
}: {
  params: { slug?: string[] };
}) {
  const boardSlug = params.slug?.[0] || 'general'; // default to 'general'

  // TODO: Fetch initial data from database based on boardSlug
  // For now, return empty arrays - client will fetch on mount
  const initialMessages: ThreadMessage[] = [];
  const initialBoards: Board[] = [];

  return (
    <ThreadPage
      boardSlug={boardSlug}
      initialMessages={initialMessages}
      initialBoards={initialBoards}
    />
  );
}
