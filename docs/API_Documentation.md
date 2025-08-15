# IntelliDoc API Documentation

## Overview
The IntelliDoc API provides comprehensive document intelligence capabilities including document upload, processing, question-answering, and analytics. The API uses JWT authentication and supports real-time updates via WebSocket.

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## API Endpoints

### Authentication Endpoints

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "access_token": "jwt_token_here",
  "refresh_token": "refresh_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### POST /auth/login
Authenticate user and get access tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "access_token": "jwt_token_here",
  "refresh_token": "refresh_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

#### POST /auth/refresh
Refresh access token using refresh token.

**Headers:**
```
Authorization: Bearer <refresh_token>
```

**Response (200):**
```json
{
  "access_token": "new_jwt_token_here"
}
```

#### GET /auth/profile
Get current user profile information.

**Response (200):**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "created_at": "2024-01-01T00:00:00Z",
    "document_count": 5,
    "total_size": 1048576
  }
}
```

### Document Endpoints

#### POST /documents/upload
Upload and process a new document.

**Request:**
- Content-Type: multipart/form-data
- Body: Form data with 'file' field

**Supported file types:**
- PDF (.pdf)
- Word documents (.doc, .docx)
- Text files (.txt)
- Images (.jpg, .jpeg, .png, .gif, .bmp)

**Response (201):**
```json
{
  "message": "Document uploaded and processed successfully",
  "document": {
    "id": "document_id",
    "filename": "example.pdf",
    "size": 1048576,
    "content_type": "application/pdf",
    "processing_status": "completed",
    "upload_date": "2024-01-01T00:00:00Z",
    "summary": "Document summary here...",
    "key_insights": [
      {
        "category": "financial information",
        "confidence": 0.85
      }
    ],
    "metadata": {
      "text_length": 5000,
      "word_count": 800,
      "chunks_count": 5
    }
  }
}
```

#### GET /documents/
Get list of user's documents.

**Query Parameters:**
- `skip` (integer): Number of documents to skip (default: 0)
- `limit` (integer): Maximum number of documents to return (default: 20, max: 100)

**Response (200):**
```json
{
  "documents": [
    {
      "id": "document_id",
      "filename": "example.pdf",
      "size": 1048576,
      "content_type": "application/pdf",
      "processing_status": "completed",
      "upload_date": "2024-01-01T00:00:00Z",
      "processed_date": "2024-01-01T00:01:00Z",
      "summary": "Document summary...",
      "tags": ["important", "contract"],
      "metadata": {}
    }
  ],
  "total": 1,
  "skip": 0,
  "limit": 20
}
```

#### GET /documents/{document_id}
Get detailed information about a specific document.

**Response (200):**
```json
{
  "document": {
    "id": "document_id",
    "filename": "example.pdf",
    "size": 1048576,
    "content_type": "application/pdf",
    "processing_status": "completed",
    "upload_date": "2024-01-01T00:00:00Z",
    "processed_date": "2024-01-01T00:01:00Z",
    "extracted_text": "Full extracted text content...",
    "summary": "Document summary...",
    "key_insights": [],
    "tags": ["important"],
    "metadata": {}
  }
}
```

#### DELETE /documents/{document_id}
Delete a document and its associated data.

**Response (200):**
```json
{
  "message": "Document deleted successfully"
}
```

#### POST /documents/search
Search documents using semantic similarity.

**Request Body:**
```json
{
  "query": "search query here",
  "document_id": "optional_document_id",
  "limit": 10
}
```

**Response (200):**
```json
{
  "query": "search query here",
  "results": {
    "documents": ["matching text chunk 1", "matching text chunk 2"],
    "metadatas": [
      {
        "document_id": "doc_id",
        "chunk_index": 0,
        "user_id": "user_id"
      }
    ],
    "similarities": [0.85, 0.76]
  },
  "count": 2
}
```

### Chat Endpoints

#### POST /chat/
Create a new chat session.

**Request Body:**
```json
{
  "document_id": "optional_document_id",
  "title": "Chat about document"
}
```

**Response (201):**
```json
{
  "message": "Chat created successfully",
  "chat": {
    "id": "chat_id",
    "document_id": "document_id",
    "title": "Chat about document",
    "created_at": "2024-01-01T00:00:00Z",
    "message_count": 0
  }
}
```

#### GET /chat/
Get list of user's chat sessions.

**Response (200):**
```json
{
  "chats": [
    {
      "id": "chat_id",
      "document_id": "document_id",
      "title": "Chat about document",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:05:00Z",
      "message_count": 4
    }
  ],
  "skip": 0,
  "limit": 20
}
```

#### POST /chat/{chat_id}/messages
Send a message to a chat session.

**Request Body:**
```json
{
  "message": "What is this document about?"
}
```

**Response (200):**
```json
{
  "messages": [
    {
      "id": "message_id",
      "role": "user",
      "content": "What is this document about?",
      "timestamp": "2024-01-01T00:00:00Z",
      "metadata": {}
    },
    {
      "id": "message_id",
      "role": "assistant",
      "content": "This document is about...",
      "timestamp": "2024-01-01T00:00:01Z",
      "metadata": {
        "confidence": 0.85,
        "context_used": "Relevant context..."
      }
    }
  ],
  "chat_id": "chat_id"
}
```

#### POST /chat/ask
Ask a question about a specific document (without creating a chat).

**Request Body:**
```json
{
  "question": "What are the key points?",
  "document_id": "document_id"
}
```

**Response (200):**
```json
{
  "question": "What are the key points?",
  "answer": "The key points are...",
  "confidence": 0.85,
  "context_used": "Relevant context from document...",
  "sources": [
    {
      "document_id": "document_id",
      "chunk_index": 2
    }
  ],
  "document_id": "document_id"
}
```

### Analytics Endpoints

#### GET /analytics/dashboard
Get comprehensive dashboard data.

**Response (200):**
```json
{
  "user_stats": {
    "total_documents": 10,
    "total_storage_used": 10485760,
    "account_created": "2024-01-01T00:00:00Z",
    "total_chats": 5
  },
  "processing_stats": {
    "pending": 0,
    "completed": 9,
    "failed": 1,
    "total_documents": 10,
    "total_size": 10485760
  },
  "vector_stats": {
    "document_count": 45,
    "chat_count": 12,
    "embedding_dimension": 384
  },
  "recent_documents": [
    {
      "id": "document_id",
      "filename": "example.pdf",
      "processing_status": "completed",
      "upload_date": "2024-01-01T00:00:00Z",
      "size": 1048576
    }
  ],
  "system_health": {
    "mongodb_connected": true,
    "chromadb_connected": true,
    "services_running": true
  }
}
```

#### GET /analytics/documents/stats
Get document processing statistics.

**Query Parameters:**
- `days` (integer): Number of days to analyze (default: 7)

**Response (200):**
```json
{
  "daily_stats": [
    {
      "_id": {
        "year": 2024,
        "month": 1,
        "day": 1
      },
      "count": 3,
      "total_size": 3145728,
      "completed": 2,
      "failed": 1
    }
  ],
  "content_type_stats": [
    {
      "_id": "application/pdf",
      "count": 5,
      "total_size": 5242880
    }
  ],
  "period": {
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-01-08T00:00:00Z",
    "days": 7
  }
}
```

## WebSocket Events

### Connection
Connect to WebSocket with authentication:
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events

#### Client to Server Events
- `join_document_room`: Join document-specific room
- `leave_document_room`: Leave document-specific room  
- `join_chat_room`: Join chat-specific room
- `leave_chat_room`: Leave chat-specific room

#### Server to Client Events
- `connected`: Connection established
- `document_processing_started`: Document processing began
- `document_processing_completed`: Document processing finished
- `document_processing_failed`: Document processing failed
- `new_chat_message`: New message in chat
- `document_updated`: Document metadata updated
- `system_alert`: System notification

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request:**
```json
{
  "error": "Invalid request data"
}
```

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "error": "Access denied"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

## Rate Limits
- Authentication endpoints: 5 requests per minute
- Document upload: 10 requests per hour
- Chat messages: 100 requests per hour
- All other endpoints: 1000 requests per hour

## File Size Limits
- Maximum file size: 16MB
- Supported formats: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF, BMP

## Development Notes
- All timestamps are in ISO 8601 format (UTC)
- Document processing is asynchronous with WebSocket notifications
- Vector embeddings are stored in ChromaDB (in-memory)
- MongoDB is used for persistent document and user data storage