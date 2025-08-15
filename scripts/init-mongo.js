// MongoDB initialization script for Docker
db = db.getSiblingDB('intellidoc');

// Create a user for the application
db.createUser({
  user: 'intellidoc_user',
  pwd: 'intellidoc_password',
  roles: [
    {
      role: 'readWrite',
      db: 'intellidoc'
    }
  ]
});

// Create collections with indexes for better performance
db.createCollection('users');
db.users.createIndex({ "email": 1 }, { unique: true });

db.createCollection('documents');
db.documents.createIndex({ "user_id": 1 });
db.documents.createIndex({ "upload_date": -1 });
db.documents.createIndex({ "processing_status": 1 });
db.documents.createIndex({ "filename": "text" });

db.createCollection('chats');
db.chats.createIndex({ "user_id": 1 });
db.chats.createIndex({ "document_id": 1 });
db.chats.createIndex({ "updated_at": -1 });

print('IntelliDoc database initialized successfully!');