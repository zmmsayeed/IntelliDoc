from datetime import datetime
from bson import ObjectId

class Chat:
    def __init__(self, db):
        self.collection = db.chats
    
    def create_chat(self, user_id, document_id, title="New Chat"):
        chat_data = {
            'user_id': ObjectId(user_id),
            'document_id': ObjectId(document_id) if document_id else None,
            'title': title,
            'messages': [],
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'is_active': True
        }
        result = self.collection.insert_one(chat_data)
        return str(result.inserted_id)
    
    def find_by_id(self, chat_id):
        return self.collection.find_one({'_id': ObjectId(chat_id)})
    
    def find_by_user_id(self, user_id, skip=0, limit=50):
        return list(self.collection.find(
            {'user_id': ObjectId(user_id), 'is_active': True}
        ).sort('updated_at', -1).skip(skip).limit(limit))
    
    def add_message(self, chat_id, message, role='user', metadata=None):
        message_data = {
            'id': str(ObjectId()),
            'role': role,
            'content': message,
            'timestamp': datetime.utcnow(),
            'metadata': metadata or {}
        }
        
        result = self.collection.update_one(
            {'_id': ObjectId(chat_id)},
            {
                '$push': {'messages': message_data},
                '$set': {'updated_at': datetime.utcnow()}
            }
        )
        return result.modified_count > 0
    
    def update_chat_title(self, chat_id, title):
        return self.collection.update_one(
            {'_id': ObjectId(chat_id)},
            {
                '$set': {
                    'title': title,
                    'updated_at': datetime.utcnow()
                }
            }
        )
    
    def delete_chat(self, chat_id):
        return self.collection.update_one(
            {'_id': ObjectId(chat_id)},
            {'$set': {'is_active': False}}
        )
    
    def get_chat_messages(self, chat_id, limit=100):
        chat = self.collection.find_one(
            {'_id': ObjectId(chat_id)},
            {'messages': {'$slice': -limit}}
        )
        return chat['messages'] if chat else []
    
    def clear_chat_messages(self, chat_id):
        return self.collection.update_one(
            {'_id': ObjectId(chat_id)},
            {
                '$set': {
                    'messages': [],
                    'updated_at': datetime.utcnow()
                }
            }
        )
    
    def get_user_chat_count(self, user_id):
        return self.collection.count_documents({
            'user_id': ObjectId(user_id),
            'is_active': True
        })