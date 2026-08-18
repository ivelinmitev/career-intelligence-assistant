import { cosineSimilarity } from "@/src/embeddings";
import type { DocumentChunk, EmbeddedChunk } from "@/src/types";

export class InMemoryVectorStore {
  private readonly items: EmbeddedChunk[] = [];

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items.length = 0;
  }

  addMany(entries: EmbeddedChunk[]): void {
    this.items.push(...entries);
  }

  listChunks(): DocumentChunk[] {
    return this.items.map((item) => item.chunk);
  }

  filterChunks(predicate: (chunk: DocumentChunk) => boolean): EmbeddedChunk[] {
    return this.items.filter((item) => predicate(item.chunk));
  }

  search(
    queryEmbedding: number[],
    predicate: (chunk: DocumentChunk) => boolean,
    maxResults: number,
  ): Array<{ chunk: DocumentChunk; score: number }> {
    return this.items
      .filter((item) => predicate(item.chunk))
      .map((item) => ({
        chunk: item.chunk,
        score: cosineSimilarity(queryEmbedding, item.embedding),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, maxResults);
  }
}
