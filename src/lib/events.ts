import { EventEmitter } from 'events';

declare global {
  var globalEventEmitter: EventEmitter | undefined;
}

// Global singleton for Event Emitter across Next.js dev & prod server instances
const emitter = globalThis.globalEventEmitter || new EventEmitter();
emitter.setMaxListeners(200);

if (process.env.NODE_ENV !== 'production') {
  globalThis.globalEventEmitter = emitter;
}

export const realtimeEmitter = emitter;

export function broadcastUpdate(type: string, payload: any = {}) {
  try {
    realtimeEmitter.emit('realtime_event', {
      type,
      payload,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('Broadcast error:', err);
  }
}
