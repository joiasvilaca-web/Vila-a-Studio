
export interface ProcessingState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}

export interface ImageResult {
  original: string;
  processed?: string;
}

export type ImageSize = '1K' | '2K' | '4K';
export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:3' | '3:4';
