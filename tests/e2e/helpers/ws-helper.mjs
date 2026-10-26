/**
 * WebSocket Helper for Go Dining Hub (/ws/dining)
 * Uses native globalThis.WebSocket available in Node 22
 */
import { CONFIG } from '../config.mjs';

export class DiningWebSocketClient {
  constructor(venueId, room = 'kitchen', tableId = 1) {
    this.venueId = venueId;
    this.room = room;
    this.tableId = tableId;
    this.ws = null;
    this.messages = [];
    this.listeners = [];
    this.isOpen = false;
  }

  async connect(timeoutMs = CONFIG.timeouts.request) {
    const url = `${CONFIG.services.go.wsUrl}/ws/dining?venue_id=${encodeURIComponent(this.venueId)}&room=${encodeURIComponent(this.room)}&table_id=${this.tableId}`;
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.ws) {
          try { this.ws.close(); } catch (_) {}
        }
        reject(new Error(`WebSocket connection timeout to ${url}`));
      }, timeoutMs);

      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          clearTimeout(timer);
          this.isOpen = true;
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          let parsed;
          try {
            parsed = JSON.parse(event.data);
          } catch (_) {
            parsed = event.data;
          }
          this.messages.push(parsed);
          for (const l of this.listeners) l(parsed);
        };

        this.ws.onerror = (err) => {
          clearTimeout(timer);
          reject(err);
        };

        this.ws.onclose = () => {
          this.isOpen = false;
        };
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  send(data) {
    if (!this.isOpen || !this.ws) {
      throw new Error('WebSocket is not open');
    }
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    this.ws.send(payload);
  }

  async waitForMessage(predicate, timeoutMs = CONFIG.timeouts.wsMessage) {
    // Check if message is already in queue
    const existing = this.messages.find(predicate);
    if (existing) return existing;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Timed out waiting for WebSocket message'));
      }, timeoutMs);

      const listener = (msg) => {
        if (predicate(msg)) {
          clearTimeout(timer);
          const idx = this.listeners.indexOf(listener);
          if (idx !== -1) this.listeners.splice(idx, 1);
          resolve(msg);
        }
      };
      this.listeners.push(listener);
    });
  }

  close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.isOpen = false;
    }
  }
}
