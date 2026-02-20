/**
 * Thread feature types
 */

export interface ThreadMessage {
  id: string;
  user_id: string;
  username: string;
  profile_image_url?: string;
  verified: boolean;
  content: string;
  board_id: string;
  created_at: string;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  created_at: string;
  member_count: number;
}

