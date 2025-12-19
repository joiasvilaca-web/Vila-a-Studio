
export interface ProcessingState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}

export interface ImageResult {
  original: string;
  processed?: string;
}
