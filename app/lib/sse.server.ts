interface SSEClient {
  shop: string;
  write: (data: string) => void;
  close: () => void;
}

class SSEManager {
  private clients = new Map<string, Set<SSEClient>>();

  add(shop: string, client: SSEClient) {
    if (!this.clients.has(shop)) {
      this.clients.set(shop, new Set());
    }
    this.clients.get(shop)!.add(client);
    return () => {
      const set = this.clients.get(shop);
      if (set) {
        set.delete(client);
        if (set.size === 0) this.clients.delete(shop);
      }
    };
  }

  broadcast(shop: string, event: string, data: unknown) {
    const set = this.clients.get(shop);
    if (!set) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of set) {
      try {
        client.write(payload);
      } catch {
        set.delete(client);
      }
    }
  }
}

export const sseManager = new SSEManager();
