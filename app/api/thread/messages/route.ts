import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // TODO: Fetch messages from database

    const messages: object[] = [];

    return NextResponse.json(
      {
        messages,
        success: true,
      },
      {
        headers: {
          'Cache-Control': 'max-age=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch messages', success: false },
      { status: 500 }
    );
  }
}
