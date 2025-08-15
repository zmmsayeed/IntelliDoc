# IntelliDoc API Testing Commands

This file contains sample CURL commands to test the IntelliDoc API endpoints. Make sure the backend server is running on http://localhost:5000 before executing these commands.

## Prerequisites

1. Start MongoDB service
2. Start the Flask backend server:
   ```bash
   cd backend
   python app.py
   ```

## Authentication Endpoints

### 1. Register a New User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "name": "Test User"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

**Response will include `access_token` - save this for subsequent requests!**

### 3. Get Profile (Protected Route)
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 4. Update Profile
```bash
curl -X PUT http://localhost:5000/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "name": "Updated Test User"
  }'
```

## Document Endpoints

### 5. Upload a Document
```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -F "file=@/path/to/your/document.pdf"
```

### 6. Get All Documents
```bash
curl -X GET http://localhost:5000/api/documents/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 7. Get All Documents with Pagination
```bash
curl -X GET "http://localhost:5000/api/documents/?skip=0&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 8. Get Specific Document
```bash
curl -X GET http://localhost:5000/api/documents/DOCUMENT_ID_HERE \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 9. Search Documents
```bash
curl -X POST http://localhost:5000/api/documents/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "query": "search terms here",
    "limit": 10
  }'
```

### 10. Search in Specific Document
```bash
curl -X POST http://localhost:5000/api/documents/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "query": "search terms here",
    "document_id": "DOCUMENT_ID_HERE",
    "limit": 5
  }'
```

### 11. Add Tag to Document
```bash
curl -X POST http://localhost:5000/api/documents/DOCUMENT_ID_HERE/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "tag": "important"
  }'
```

### 12. Remove Tag from Document
```bash
curl -X DELETE http://localhost:5000/api/documents/DOCUMENT_ID_HERE/tags/important \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 13. Delete Document
```bash
curl -X DELETE http://localhost:5000/api/documents/DOCUMENT_ID_HERE \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## Chat Endpoints

### 14. Create a New Chat
```bash
curl -X POST http://localhost:5000/api/chat/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "title": "Test Chat"
  }'
```

### 15. Create Chat for Specific Document
```bash
curl -X POST http://localhost:5000/api/chat/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "document_id": "DOCUMENT_ID_HERE",
    "title": "Chat about Document"
  }'
```

### 16. Get All Chats
```bash
curl -X GET http://localhost:5000/api/chat/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 17. Get Specific Chat
```bash
curl -X GET http://localhost:5000/api/chat/CHAT_ID_HERE \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 18. Send Message to Chat
```bash
curl -X POST http://localhost:5000/api/chat/CHAT_ID_HERE/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "message": "What is this document about?"
  }'
```

### 19. Ask Question About Document (Without Creating Chat)
```bash
curl -X POST http://localhost:5000/api/chat/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "question": "What are the key points in this document?",
    "document_id": "DOCUMENT_ID_HERE"
  }'
```

### 20. Update Chat Title
```bash
curl -X PUT http://localhost:5000/api/chat/CHAT_ID_HERE \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "title": "Updated Chat Title"
  }'
```

### 21. Clear Chat Messages
```bash
curl -X POST http://localhost:5000/api/chat/CHAT_ID_HERE/clear \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 22. Delete Chat
```bash
curl -X DELETE http://localhost:5000/api/chat/CHAT_ID_HERE \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## Analytics Endpoints

### 23. Get Dashboard Data
```bash
curl -X GET http://localhost:5000/api/analytics/dashboard \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 24. Get Document Statistics
```bash
curl -X GET http://localhost:5000/api/analytics/documents/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 25. Get Document Statistics for Specific Period
```bash
curl -X GET "http://localhost:5000/api/analytics/documents/stats?days=30" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 26. Get Search Trends
```bash
curl -X GET http://localhost:5000/api/analytics/search/trends \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 27. Get Performance Metrics
```bash
curl -X GET http://localhost:5000/api/analytics/performance \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 28. Export Documents Data
```bash
curl -X POST http://localhost:5000/api/analytics/export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "type": "documents",
    "format": "json"
  }'
```

### 29. Export Chat Data
```bash
curl -X POST http://localhost:5000/api/analytics/export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "type": "chats",
    "format": "json"
  }'
```

## Testing Workflow

1. **Register/Login**: Use commands 1 and 2 to get an access token
2. **Upload Document**: Use command 5 to upload a test document
3. **Wait for Processing**: The document will be processed automatically
4. **Test Chat**: Use commands 14, 18, or 19 to test the chat functionality
5. **Check Analytics**: Use command 23 to see dashboard data

## Sample Test Document

Create a simple test file:
```bash
echo "This is a test document for IntelliDoc. It contains important information about AI and machine learning technologies." > test_document.txt
```

Then upload it using command 5.

## Error Responses

All endpoints may return these common errors:

- **400**: Bad Request - Invalid request data
- **401**: Unauthorized - Invalid or missing token
- **403**: Forbidden - Access denied
- **404**: Not Found - Resource not found
- **500**: Internal Server Error

## Notes

- Replace `YOUR_ACCESS_TOKEN_HERE` with the actual token from login response
- Replace `DOCUMENT_ID_HERE` and `CHAT_ID_HERE` with actual IDs from API responses
- Make sure MongoDB is running before testing
- Some operations may take time due to ML model processing
- WebSocket functionality can be tested using the frontend interface