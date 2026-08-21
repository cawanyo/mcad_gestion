import { NextRequest } from 'next/server';
import { realtimeEmitter } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send initial connected message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`)
      );

      // 2. Listener for real-time broadcast events
      const onRealtimeEvent = (eventData: any) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`)
          );
        } catch (err) {
          // Stream might be closed
        }
      };

      realtimeEmitter.on('realtime_event', onRealtimeEvent);

      // 3. Heartbeat ping every 15s to keep the SSE connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'PING', timestamp: Date.now() })}\n\n`)
          );
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // 4. Cleanup when client disconnects
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        realtimeEmitter.off('realtime_event', onRealtimeEvent);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    },
  });
}
