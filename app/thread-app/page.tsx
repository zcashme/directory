import { Metadata } from 'next';
import ThreadPage from './ThreadPage';
import type { ThreadMessage, Board } from '@/lib/thread/types';

export const metadata: Metadata = {
  title: 'Threads',
  description: 'Public message board',
};

export const revalidate = 30; // ISR - revalidate every 30 seconds

export default async function Page() {
  // TODO: Fetch current user from Supabase auth
  // TODO: Fetch initial data from database
  // For now, return empty arrays - client will fetch on mount
  const isLoggedIn = false;
  const userName = 'Guest';
  const userAvatar = undefined;
  const userId = '';
  const initialMessages: ThreadMessage[] = [];
  const initialBoards: Board[] = [];

  return (
    <ThreadPage
      initialMessages={initialMessages}
      initialBoards={initialBoards}
      userName={userName}
      userAvatar={userAvatar}
      userId={userId}
      isLoggedIn={isLoggedIn}
    />
  );
}
