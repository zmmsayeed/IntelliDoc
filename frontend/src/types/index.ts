export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at?: string;
  document_count?: number;
  total_size?: number;
}

export interface AuthResponse {
  message: string;
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface Document {
  id: string;
  filename: string;
  size: number;
  content_type: string;
  processing_status: 'pending' | 'completed' | 'failed';
  upload_date: string;
  processed_date?: string;
  extracted_text?: string;
  summary?: string;
  key_insights?: KeyInsight[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface KeyInsight {
  category: string;
  confidence: number;
}

export interface Chat {
  id: string;
  document_id?: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
  message_count?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    confidence?: number;
    context_used?: string;
    search_results_count?: number;
    context_type?: string;
  };
}

export interface SearchResult {
  documents: string[];
  metadatas: Array<{
    document_id: string;
    chunk_index: number;
    user_id: string;
    chunk_length?: number;
  }>;
  similarities: number[];
}

export interface DashboardData {
  user_stats: {
    total_documents: number;
    total_storage_used: number;
    account_created?: string;
    total_chats: number;
  };
  processing_stats: {
    pending: number;
    completed: number;
    failed: number;
    total_documents: number;
    total_size: number;
  };
  vector_stats: {
    document_count: number;
    chat_count: number;
    embedding_dimension: number;
  };
  recent_documents: Array<{
    id: string;
    filename: string;
    processing_status: string;
    upload_date: string;
    size: number;
  }>;
  system_health: {
    mongodb_connected: boolean;
    chromadb_connected: boolean;
    services_running: boolean;
  };
}

export interface DocumentStats {
  daily_stats: Array<{
    _id: {
      year: number;
      month: number;
      day: number;
    };
    count: number;
    total_size: number;
    completed: number;
    failed: number;
  }>;
  content_type_stats: Array<{
    _id: string;
    count: number;
    total_size: number;
  }>;
  period: {
    start_date: string;
    end_date: string;
    days: number;
  };
}

export interface ApiError {
  error: string;
}

export interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: string;
}

export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}