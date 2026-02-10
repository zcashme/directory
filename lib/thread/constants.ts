/**
 * Thread feature constants
 */

export const THREAD_CONSTANTS = {
  // Default boards
  DEFAULT_BOARD_ID: 'money',
  DEFAULT_BOARD_NAME: 'money',
  DEFAULT_BOARD_DESCRIPTION: 'Global discussion board for the entire internet',

  // Message limits
  MAX_MESSAGE_LENGTH: 1000,
  MAX_MESSAGE_DISPLAY: 500,

  // Pagination
  MESSAGES_PER_PAGE: 50,
  INFINITE_SCROLL_BUFFER: 500,

  // Timing
  ISR_REVALIDATE: 30, // seconds
  POLL_INTERVAL: 5000, // milliseconds

  // UI
  SIDEBAR_WIDTH: 256, // w-64 = 16rem = 256px
  MAX_CONTENT_WIDTH: 768, // max-w-3xl
};

export const BOARD_DEFAULTS: Record<string, any> = {
  money: {
    id: 'money',
    name: 'money',
    description: 'Global discussion board for the entire internet',
    creator_id: 'system',
    created_at: new Date(0).toISOString(),
    member_count: 0,
  },
};
