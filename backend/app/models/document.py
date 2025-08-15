from datetime import datetime
from bson import ObjectId

class Document:
    def __init__(self, db):
        self.collection = db.documents
    
    def create_document(self, user_id, filename, filepath, content_type, size, extracted_text=None):
        document_data = {
            'user_id': ObjectId(user_id),
            'filename': filename,
            'filepath': filepath,
            'content_type': content_type,
            'size': size,
            'extracted_text': extracted_text,
            'processing_status': 'pending',
            'upload_date': datetime.now(),
            'processed_date': None,
            'metadata': {},
            'tags': [],
            'summary': None,
            'key_insights': [],
            'embeddings_stored': False
        }
        result = self.collection.insert_one(document_data)
        return str(result.inserted_id)
    
    def find_by_id(self, document_id):
        return self.collection.find_one({'_id': ObjectId(document_id)})
    
    def find_by_user_id(self, user_id, skip=0, limit=50):
        return list(self.collection.find(
            {'user_id': ObjectId(user_id)}
        ).sort('upload_date', -1).skip(skip).limit(limit))
    
    def update_document(self, document_id, update_data):
        if 'processed_date' not in update_data and 'processing_status' in update_data and update_data['processing_status'] == 'completed':
            update_data['processed_date'] = datetime.now()
        
        return self.collection.update_one(
            {'_id': ObjectId(document_id)},
            {'$set': update_data}
        )
    
    def delete_document(self, document_id):
        return self.collection.delete_one({'_id': ObjectId(document_id)})
    
    def search_documents(self, user_id, query, skip=0, limit=20):
        search_filter = {
            'user_id': ObjectId(user_id),
            '$or': [
                {'filename': {'$regex': query, '$options': 'i'}},
                {'extracted_text': {'$regex': query, '$options': 'i'}},
                {'summary': {'$regex': query, '$options': 'i'}},
                {'tags': {'$regex': query, '$options': 'i'}}
            ]
        }
        return list(self.collection.find(search_filter).sort('upload_date', -1).skip(skip).limit(limit))
    
    def get_processing_stats(self, user_id=None):
        match_filter = {}
        if user_id:
            match_filter['user_id'] = ObjectId(user_id)
        
        pipeline = [
            {'$match': match_filter},
            {
                '$group': {
                    '_id': '$processing_status',
                    'count': {'$sum': 1},
                    'total_size': {'$sum': '$size'}
                }
            }
        ]
        return list(self.collection.aggregate(pipeline))
    
    def get_documents_by_status(self, status, user_id=None):
        match_filter = {'processing_status': status}
        if user_id:
            match_filter['user_id'] = ObjectId(user_id)
        
        return list(self.collection.find(match_filter))
    
    def add_tag(self, document_id, tag):
        return self.collection.update_one(
            {'_id': ObjectId(document_id)},
            {'$addToSet': {'tags': tag}}
        )
    
    def remove_tag(self, document_id, tag):
        return self.collection.update_one(
            {'_id': ObjectId(document_id)},
            {'$pull': {'tags': tag}}
        )
    
    def get_user_document_count(self, user_id):
        return self.collection.count_documents({'user_id': ObjectId(user_id)})