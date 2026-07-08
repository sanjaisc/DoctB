const MAX_ENTRIES = 100;

interface ErrorEntry {
  id: string;
  message: string;
  route?: string;
  stack?: string;
  timestamp: string;
}

class ErrorBuffer {
  private entries: ErrorEntry[] = [];

  push(error: Error, route?: string): void {
    const entry: ErrorEntry = {
      id: crypto.randomUUID(),
      message: error.message,
      route,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };
    this.entries.unshift(entry);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(0, MAX_ENTRIES);
    }
  }

  getRecent(count = 50): ErrorEntry[] {
    return this.entries.slice(0, count);
  }

  clear(): void {
    this.entries = [];
  }
}

export const errorBuffer = new ErrorBuffer();
