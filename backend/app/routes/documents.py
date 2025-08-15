from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app.models.document import Document
from app.services.document_processor import DocumentProcessor
import os
import uuid
from datetime import datetime
import mimetypes

documents_bp = Blueprint('documents', __name__)

ALLOWED_EXTENSIONS = {
    'pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'bmp'
}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_size(filepath):
    return os.path.getsize(filepath) if os.path.exists(filepath) else 0

@documents_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_document():
    try:
        current_user_id = get_jwt_identity()
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'error': 'File type not supported',
                'allowed_types': list(ALLOWED_EXTENSIONS)
            }), 400
        
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        
        upload_folder = current_app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)
        
        filepath = os.path.join(upload_folder, unique_filename)
        file.save(filepath)
        
        file_size = get_file_size(filepath)
        content_type = mimetypes.guess_type(filepath)[0] or 'application/octet-stream'
        
        document_model = Document(current_app.db)
        document_id = document_model.create_document(
            user_id=current_user_id,
            filename=filename,
            filepath=filepath,
            content_type=content_type,
            size=file_size
        )
        
        # Return immediately with basic document info
        print(f"Document uploaded successfully: {document_id}")
        document = document_model.find_by_id(document_id)
        
        # Start background processing using threading
        import threading
        
        # Capture the Flask app instance before the thread
        app_instance = current_app._get_current_object()
        chroma_client = current_app.chroma
        websocket_notifications = getattr(current_app, 'websocket_notifications', None)
        
        def process_document_async():
            # Set up application context for background thread
            with app_instance.app_context():
                try:
                    print(f"Starting async document processing for document {document_id}")
                    
                    if not chroma_client:
                        print("ChromaDB client not initialized, marking as failed")
                        processing_result = {
                            'status': 'failed',
                            'error': 'ChromaDB client not initialized'
                        }
                    else:
                        # Notify frontend that processing started
                        if websocket_notifications:
                            websocket_notifications.notify_user(
                                current_user_id, 
                                'document_processing', 
                                {'document_id': document_id, 'status': 'processing'}
                            )
                        
                        processor = DocumentProcessor(chroma_client)
                        print("DocumentProcessor created successfully")
                        
                        processing_result = processor.process_document(
                            document_id, filepath, content_type, current_user_id
                        )
                        print(f"Document processing completed with status: {processing_result.get('status')}")
                    
                    # Update document with processing results
                    update_data = {
                        'processing_status': processing_result['status'],
                        'extracted_text': processing_result.get('extracted_text'),
                        'summary': processing_result.get('summary'),
                        'key_insights': processing_result.get('key_insights', []),
                        'metadata': processing_result.get('processing_metadata', {}),
                        'embeddings_stored': processing_result['status'] == 'completed'
                    }
                    
                    if processing_result['status'] == 'failed':
                        update_data['error'] = processing_result.get('error')
                    
                    document_model.update_document(document_id, update_data)
                    print(f"Document {document_id} updated with processing results")
                    
                    # Get updated document to send complete data to frontend
                    updated_document = document_model.find_by_id(document_id)
                    
                    # Notify frontend that processing completed
                    if websocket_notifications:
                        websocket_notifications.notify_user(
                            current_user_id, 
                            'document_processing_complete', 
                            {
                                'document_id': document_id, 
                                'status': processing_result['status'],
                                'summary': processing_result.get('summary'),
                                'error': processing_result.get('error'),
                                'document': {
                                    'id': document_id,
                                    'filename': updated_document['filename'],
                                    'size': updated_document['size'],
                                    'content_type': updated_document['content_type'],
                                    'processing_status': updated_document['processing_status'],
                                    'upload_date': updated_document['upload_date'].isoformat(),
                                    'processed_date': updated_document['processed_date'].isoformat() if updated_document.get('processed_date') else None,
                                    'summary': updated_document.get('summary'),
                                    'key_insights': updated_document.get('key_insights', []),
                                    'metadata': updated_document.get('metadata', {})
                                }
                            }
                        )
                        
                        # Also send a specific document update event
                        websocket_notifications.notify_user(
                            current_user_id,
                            'document_status_updated',
                            {
                                'document_id': document_id,
                                'new_status': updated_document['processing_status'],
                                'document': {
                                    'id': document_id,
                                    'processing_status': updated_document['processing_status'],
                                    'summary': updated_document.get('summary'),
                                    'processed_date': updated_document['processed_date'].isoformat() if updated_document.get('processed_date') else None
                                }
                            }
                        )
                        
                except Exception as proc_error:
                    print(f"Error during async document processing: {proc_error}")
                    import traceback
                    print(f"Async processing traceback: {traceback.format_exc()}")
                    
                    # Update with error status
                    document_model.update_document(document_id, {
                        'processing_status': 'failed',
                        'error': f'Processing failed: {str(proc_error)}'
                    })
                    
                    # Notify frontend of error
                    if websocket_notifications:
                        websocket_notifications.notify_user(
                            current_user_id, 
                            'document_processing_error', 
                            {'document_id': document_id, 'error': str(proc_error)}
                        )
        
        # Start processing in background thread
        processing_thread = threading.Thread(target=process_document_async)
        processing_thread.daemon = True
        processing_thread.start()
        
        # Return immediately with upload success
        return jsonify({
            'success': True,
            'message': 'Document uploaded successfully',
            'document': {
                'id': document_id,
                'filename': document['filename'],
                'size': document['size'],
                'content_type': document['content_type'],
                'processing_status': 'processing',  # Show as processing initially
                'upload_date': document['upload_date'].isoformat(),
                'summary': None,  # Will be updated when processing completes
                'key_insights': [],
                'metadata': {}
            }
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Upload error: {str(e)}")
        print(f"Upload traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Upload failed'
        }), 500

@documents_bp.route('/', methods=['GET'])
@jwt_required()
def get_documents():
    try:
        current_user_id = get_jwt_identity()
        skip = int(request.args.get('skip', 0))
        limit = min(int(request.args.get('limit', 20)), 100)
        
        document_model = Document(current_app.db)
        documents = document_model.find_by_user_id(current_user_id, skip, limit)
        
        document_list = []
        for doc in documents:
            document_list.append({
                'id': str(doc['_id']),
                'filename': doc['filename'],
                'size': doc['size'],
                'content_type': doc['content_type'],
                'processing_status': doc['processing_status'],
                'upload_date': doc['upload_date'].isoformat(),
                'processed_date': doc['processed_date'].isoformat() if doc['processed_date'] else None,
                'summary': doc.get('summary'),
                'tags': doc.get('tags', []),
                'metadata': doc.get('metadata', {})
            })
        
        total_count = document_model.get_user_document_count(current_user_id)
        
        return jsonify({
            'documents': document_list,
            'total': total_count,
            'skip': skip,
            'limit': limit
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/<document_id>', methods=['GET'])
@jwt_required()
def get_document(document_id):
    try:
        current_user_id = get_jwt_identity()
        document_model = Document(current_app.db)
        
        document = document_model.find_by_id(document_id)
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        if str(document['user_id']) != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        return jsonify({
            'document': {
                'id': str(document['_id']),
                'filename': document['filename'],
                'size': document['size'],
                'content_type': document['content_type'],
                'processing_status': document['processing_status'],
                'upload_date': document['upload_date'].isoformat(),
                'processed_date': document['processed_date'].isoformat() if document['processed_date'] else None,
                'extracted_text': document.get('extracted_text'),
                'summary': document.get('summary'),
                'key_insights': document.get('key_insights', []),
                'tags': document.get('tags', []),
                'metadata': document.get('metadata', {})
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/<document_id>', methods=['DELETE'])
@jwt_required()
def delete_document(document_id):
    try:
        current_user_id = get_jwt_identity()
        document_model = Document(current_app.db)
        
        document = document_model.find_by_id(document_id)
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        if str(document['user_id']) != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        if document.get('filepath') and os.path.exists(document['filepath']):
            os.remove(document['filepath'])
        
        processor = DocumentProcessor(current_app.chroma)
        processor.delete_document_data(document_id)
        
        document_model.delete_document(document_id)
        
        return jsonify({'message': 'Document deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/search', methods=['POST'])
@jwt_required()
def search_documents():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({'error': 'Query is required'}), 400
        
        query = data['query'].strip()
        if not query:
            return jsonify({'error': 'Query cannot be empty'}), 400
        
        document_id = data.get('document_id')
        limit = min(int(data.get('limit', 10)), 50)
        
        processor = DocumentProcessor(current_app.chroma)
        results = processor.search_documents(query, current_user_id, document_id, limit)
        
        return jsonify({
            'query': query,
            'results': {
                'documents': results['documents'],
                'metadatas': results['metadatas'],
                'similarities': [1 - d for d in results['distances']]
            },
            'count': len(results['documents'])
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/<document_id>/tags', methods=['POST'])
@jwt_required()
def add_tag(document_id):
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'tag' not in data:
            return jsonify({'error': 'Tag is required'}), 400
        
        tag = data['tag'].strip().lower()
        if not tag:
            return jsonify({'error': 'Tag cannot be empty'}), 400
        
        document_model = Document(current_app.db)
        document = document_model.find_by_id(document_id)
        
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        if str(document['user_id']) != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        document_model.add_tag(document_id, tag)
        
        return jsonify({'message': 'Tag added successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/<document_id>/tags/<tag>', methods=['DELETE'])
@jwt_required()
def remove_tag(document_id, tag):
    try:
        current_user_id = get_jwt_identity()
        document_model = Document(current_app.db)
        
        document = document_model.find_by_id(document_id)
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        if str(document['user_id']) != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        document_model.remove_tag(document_id, tag.lower())
        
        return jsonify({'message': 'Tag removed successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/test-websocket', methods=['POST'])
@jwt_required()
def test_websocket():
    """Test endpoint to manually trigger WebSocket notification"""
    try:
        current_user_id = get_jwt_identity()
        
        if hasattr(current_app, 'websocket_notifications'):
            # Test room-based notification
            current_app.websocket_notifications.notify_user(
                current_user_id,
                'test_notification',
                {
                    'message': 'This is a test WebSocket notification to your room',
                    'test_data': 'Hello from backend!'
                }
            )
            
            # Also test broadcast to all connected clients
            from flask_socketio import emit
            current_app.websocket_notifications.socketio.emit('broadcast_test', {
                'message': 'This is a broadcast test to ALL connected clients',
                'user_id': current_user_id,
                'timestamp': 'now'
            })
            
            return jsonify({'message': 'Both room and broadcast WebSocket notifications sent'}), 200
        else:
            return jsonify({'error': 'WebSocket notifications not available'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500