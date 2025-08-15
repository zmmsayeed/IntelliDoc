from datetime import datetime
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash

class User:
    def __init__(self, db):
        self.collection = db.users
    
    def create_user(self, email, password, name):
        import logging
        logging.info("Starting password hashing")
        hashed_password = generate_password_hash(password)
        logging.info("Password hashing completed")
        user_data = {
            'email': email.lower(),
            'password': hashed_password,
            'name': name,
            'created_at': datetime.utcnow(),
            'is_active': True,
            'role': 'user'
        }
        logging.info("Inserting user into database")
        result = self.collection.insert_one(user_data)
        logging.info(f"User inserted with ID: {result.inserted_id}")
        return str(result.inserted_id)
    
    def find_by_email(self, email):
        return self.collection.find_one({'email': email.lower()})
    
    def find_by_id(self, user_id):
        return self.collection.find_one({'_id': ObjectId(user_id)})
    
    def verify_password(self, user, password):
        return check_password_hash(user['password'], password)
    
    def update_user(self, user_id, update_data):
        return self.collection.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': update_data}
        )
    
    def delete_user(self, user_id):
        return self.collection.delete_one({'_id': ObjectId(user_id)})
    
    def get_user_stats(self, user_id):
        pipeline = [
            {
                '$match': {'_id': ObjectId(user_id)}
            },
            {
                '$lookup': {
                    'from': 'documents',
                    'localField': '_id',
                    'foreignField': 'user_id',
                    'as': 'documents'
                }
            },
            {
                '$project': {
                    'name': 1,
                    'email': 1,
                    'created_at': 1,
                    'document_count': {'$size': '$documents'},
                    'total_size': {'$sum': '$documents.size'}
                }
            }
        ]
        result = list(self.collection.aggregate(pipeline))
        return result[0] if result else None