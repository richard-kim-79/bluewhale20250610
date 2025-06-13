export interface User {
  id: string;
  username: string;
  email?: string;
  created_at: string;
}

export interface Document {
  id: string;
  title: string;
  summary?: string;
  tags?: string[];
  original_text?: string;
  user_id?: string;
  s3_url?: string;
  file_type?: string;
  created_at: string;
  ai_citation_count: number;
  trust_score: number;
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string;
  last_processed?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  summary: string;
  url?: string;
  embedding_similarity: number;
  tags: string[];
  ai_citation_count: number;
  trust_score: number;
}

export interface SearchResponse {
  results: SearchResult[];
}

export interface UserSimilarity {
  id: string;
  username: string;
  similarity_score: number;
}

export interface UserRecommendation {
  similar_users: UserSimilarity[];
}

export type FeedTab = 'for-you' | 'local' | 'global';

export interface DocumentStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}
