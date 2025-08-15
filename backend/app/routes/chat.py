from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_socketio import emit
from app.models.chat import Chat
from app.models.document import Document
from app.services.document_processor import DocumentProcessor
from app.services.vector_service import VectorService

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/', methods=['POST'])
@jwt_required()
def create_chat():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        document_id = data.get('document_id')
        title = data.get('title', 'New Chat')
        
        if document_id:
            document_model = Document(current_app.db)
            document = document_model.find_by_id(document_id)
            
            if not document or str(document['user_id']) != current_user_id:
                return jsonify({'error': 'Document not found or access denied'}), 404
        
        chat_model = Chat(current_app.db)
        chat_id = chat_model.create_chat(current_user_id, document_id, title)
        
        chat = chat_model.find_by_id(chat_id)
        
        return jsonify({
            'message': 'Chat created successfully',
            'chat': {
                'id': chat_id,
                'document_id': str(chat['document_id']) if chat['document_id'] else None,
                'title': chat['title'],
                'created_at': chat['created_at'].isoformat(),
                'message_count': len(chat['messages'])
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/', methods=['GET'])
@jwt_required()
def get_chats():
    try:
        current_user_id = get_jwt_identity()
        skip = int(request.args.get('skip', 0))
        limit = min(int(request.args.get('limit', 20)), 100)
        
        chat_model = Chat(current_app.db)
        chats = chat_model.find_by_user_id(current_user_id, skip, limit)
        
        chat_list = []
        for chat in chats:
            chat_list.append({
                'id': str(chat['_id']),
                'document_id': str(chat['document_id']) if chat['document_id'] else None,
                'title': chat['title'],
                'created_at': chat['created_at'].isoformat(),
                'updated_at': chat['updated_at'].isoformat(),
                'message_count': len(chat['messages'])
            })
        
        return jsonify({
            'chats': chat_list,
            'skip': skip,
            'limit': limit
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/<chat_id>', methods=['GET'])
@jwt_required()
def get_chat(chat_id):
    try:
        current_user_id = get_jwt_identity()
        chat_model = Chat(current_app.db)
        
        chat = chat_model.find_by_id(chat_id)
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404
        
        if str(chat['user_id']) != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        return jsonify({
            'chat': {
                'id': str(chat['_id']),
                'document_id': str(chat['document_id']) if chat['document_id'] else None,
                'title': chat['title'],
                'created_at': chat['created_at'].isoformat(),
                'updated_at': chat['updated_at'].isoformat(),
                'messages': chat['messages']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/<chat_id>/messages', methods=['POST'])
@jwt_required()
def send_message(chat_id):
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400
        
        message = data['message'].strip()
        if not message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        chat_model = Chat(current_app.db)
        chat = chat_model.find_by_id(chat_id)
        
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404
        
        if str(chat['user_id']) != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        chat_model.add_message(chat_id, message, 'user')
        
        print(f"Creating DocumentProcessor and VectorService for chat {chat_id}")
        try:
            if not current_app.chroma:
                raise Exception("ChromaDB client not initialized")
            
            processor = DocumentProcessor(current_app.chroma)
            vector_service = VectorService(current_app.chroma)
            print("Services created successfully")
        except Exception as service_error:
            print(f"Error creating services: {service_error}")
            import traceback
            print(f"Service creation traceback: {traceback.format_exc()}")
            return jsonify({'error': f'Service initialization failed: {str(service_error)}'}), 500
        
        if chat['document_id']:
            document_model = Document(current_app.db)
            document = document_model.find_by_id(str(chat['document_id']))
            
            if document and document.get('extracted_text'):
                try:
                    print(f"Searching documents for message: {message[:50]}...")
                    search_results = processor.search_documents(
                        message, current_user_id, str(chat['document_id']), 5
                    )
                    print(f"Search completed, found {len(search_results.get('documents', []))} results")
                    
                    # Filter and rank results by relevance (distance/similarity)
                    if search_results['documents'] and search_results['distances']:
                        # Only use chunks with good similarity (distance < 0.8)
                        good_chunks = []
                        for i, distance in enumerate(search_results['distances']):
                            if distance < 0.8 and i < len(search_results['documents']):
                                good_chunks.append(search_results['documents'][i])
                        
                        # Use top 3 good chunks or all if fewer than 3
                        context_chunks = good_chunks[:3] if good_chunks else search_results['documents'][:2]
                        context = ' '.join(context_chunks)
                        
                        print(f"Using {len(context_chunks)} relevant chunks (filtered from {len(search_results['documents'])})")
                    else:
                        context = ' '.join(search_results['documents'][:3])
                    
                    if context.strip():
                        print(f"Generating answer with context length: {len(context)}")
                        qa_result = processor.answer_question(message, context, str(chat['document_id']))
                        answer = qa_result['answer']
                        confidence = qa_result['confidence']
                        
                        metadata = {
                            'confidence': confidence,
                            'context_used': qa_result.get('context_used', ''),
                            'search_results_count': len(search_results['documents'])
                        }
                        print(f"Answer generated successfully with confidence: {confidence}")
                    else:
                        answer = "I couldn't find relevant information in the document to answer your question."
                        metadata = {'confidence': 0.0}
                        print("No context found in search results")
                except Exception as search_error:
                    print(f"Error during document search/QA: {search_error}")
                    import traceback
                    print(f"Search/QA traceback: {traceback.format_exc()}")
                    answer = f"Error processing your question: {str(search_error)}"
                    metadata = {'confidence': 0.0, 'error': str(search_error)}
            else:
                answer = "Document is not available or hasn't been processed yet."
                metadata = {'confidence': 0.0}
                print("Document not found or not processed")
        else:
            try:
                print("Getting relevant chat history...")
                relevant_history = vector_service.get_relevant_chat_history(message, chat_id, 2)
                
                if relevant_history['contexts']:
                    context = ' '.join(relevant_history['contexts'])
                    print(f"Using chat history context, length: {len(context)}")
                    qa_result = processor.answer_question(message, context)
                    answer = qa_result['answer']
                    metadata = {
                        'confidence': qa_result['confidence'],
                        'context_type': 'chat_history'
                    }
                    print(f"Answer from chat history generated with confidence: {qa_result['confidence']}")
                else:
                    answer = "I don't have enough context to provide a specific answer. Could you provide more details or upload a relevant document?"
                    metadata = {'confidence': 0.0}
                    print("No relevant chat history found")
            except Exception as history_error:
                print(f"Error getting chat history: {history_error}")
                import traceback
                print(f"Chat history traceback: {traceback.format_exc()}")
                answer = f"Error accessing chat history: {str(history_error)}"
                metadata = {'confidence': 0.0, 'error': str(history_error)}
        
        chat_model.add_message(chat_id, answer, 'assistant', metadata)
        
        if chat['document_id']:
            try:
                print("Adding chat context to vector database...")
                vector_service.add_chat_context(
                    chat_id, current_user_id, message, answer,
                    context if 'context' in locals() else None
                )
                print("Chat context added successfully")
            except Exception as context_error:
                print(f"Error adding chat context: {context_error}")
                # Don't fail the request for this error, just log it
        
        updated_chat = chat_model.find_by_id(chat_id)
        latest_messages = updated_chat['messages'][-2:]
        
        return jsonify({
            'messages': latest_messages,
            'chat_id': chat_id
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error in send_message: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/<chat_id>', methods=['PUT'])
@jwt_required()
def update_chat(chat_id):
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'title' not in data:
            return jsonify({'error': 'Title is required'}), 400
        
        title = data['title'].strip()
        if not title:
            return jsonify({'error': 'Title cannot be empty'}), 400
        
        chat_model = Chat(current_app.db)
        chat = chat_model.find_by_id(chat_id)
        
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404
        
        if str(chat['user_id']) != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        chat_model.update_chat_title(chat_id, title)
        
        return jsonify({'message': 'Chat updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/<chat_id>', methods=['DELETE'])
@jwt_required()
def delete_chat(chat_id):
    try:
        current_user_id = get_jwt_identity()
        chat_model = Chat(current_app.db)
        
        chat = chat_model.find_by_id(chat_id)
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404
        
        if str(chat['user_id']) != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        vector_service = VectorService(current_app.chroma)
        vector_service.delete_chat_embeddings(chat_id)
        
        chat_model.delete_chat(chat_id)
        
        return jsonify({'message': 'Chat deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/<chat_id>/clear', methods=['POST'])
@jwt_required()
def clear_chat(chat_id):
    try:
        current_user_id = get_jwt_identity()
        chat_model = Chat(current_app.db)
        
        chat = chat_model.find_by_id(chat_id)
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404
        
        if str(chat['user_id']) != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        chat_model.clear_chat_messages(chat_id)
        
        vector_service = VectorService(current_app.chroma)
        vector_service.delete_chat_embeddings(chat_id)
        
        return jsonify({'message': 'Chat cleared successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/ask', methods=['POST'])
@jwt_required()
def ask_question():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'question' not in data:
            return jsonify({'error': 'Question is required'}), 400
        
        question = data['question'].strip()
        if not question:
            return jsonify({'error': 'Question cannot be empty'}), 400
        
        document_id = data.get('document_id')
        
        processor = DocumentProcessor(current_app.chroma)
        
        if document_id:
            document_model = Document(current_app.db)
            document = document_model.find_by_id(document_id)
            
            if not document or str(document['user_id']) != current_user_id:
                return jsonify({'error': 'Document not found or access denied'}), 404
            
            if not document.get('extracted_text'):
                return jsonify({'error': 'Document has not been processed yet'}), 400
            
            search_results = processor.search_documents(question, current_user_id, document_id, 7)
            
            # Filter results by relevance for better QA
            if search_results['documents'] and search_results['distances']:
                good_chunks = []
                for i, distance in enumerate(search_results['distances']):
                    if distance < 0.8 and i < len(search_results['documents']):
                        good_chunks.append(search_results['documents'][i])
                
                context_chunks = good_chunks[:4] if good_chunks else search_results['documents'][:3]
                context = ' '.join(context_chunks)
            else:
                context = ' '.join(search_results['documents'][:3])
            
            if not context.strip():
                return jsonify({
                    'answer': "I couldn't find relevant information in the document to answer your question.",
                    'confidence': 0.0,
                    'context_used': '',
                    'sources': []
                }), 200
            
            qa_result = processor.answer_question(question, context, document_id)
            
            return jsonify({
                'question': question,
                'answer': qa_result['answer'],
                'confidence': qa_result['confidence'],
                'context_used': qa_result.get('context_used', ''),
                'sources': search_results['metadatas'][:3],
                'document_id': document_id
            }), 200
        else:
            return jsonify({
                'error': 'Document ID is required for question answering'
            }), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500