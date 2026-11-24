export interface DetailLoader {
  execute(championId: number): Promise<unknown>;
}

export class PrefetchChampionDetails {
  private queue: number[] = [];
  private readonly inflight = new Set<number>();
  private pumping = false;

  constructor(
    private readonly loader: DetailLoader,
    private readonly concurrency = 5,
  ) {}

  enqueue(ids: number[]): void {
    for (const id of ids) this.add(id);
    void this.pump();
  }

  prioritize(id: number): void {
    this.queue = this.queue.filter((item) => item !== id);
    this.queue.unshift(id);
    void this.pump();
  }

  private add(id: number): void {
    if (this.inflight.has(id) || this.queue.includes(id)) return;
    this.queue.push(id);
  }

  private async pump(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;
    const workers = Array.from({ length: this.concurrency }, () => this.worker());
    await Promise.all(workers);
    this.pumping = false;
  }

  private async worker(): Promise<void> {
    for (;;) {
      const id = this.queue.shift();
      if (id === undefined) return;
      this.inflight.add(id);
      try {
        await this.loader.execute(id);
      } catch {
        // keep going so one failure does not stop the rest
      } finally {
        this.inflight.delete(id);
      }
    }
  }
}
