export interface ChunkingOptions {
  chunkSize: number;
  overlap: number;
}

export const defaultChunkingOptions: ChunkingOptions = {
  chunkSize: 900,
  overlap: 120,
};
