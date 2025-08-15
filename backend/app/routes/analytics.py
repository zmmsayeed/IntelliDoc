from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.document import Document
from app.models.chat import Chat
from app.models.user import User
from app.services.vector_service import VectorService
from datetime import datetime, timedelta
from bson import ObjectId

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    try:
        current_user_id = get_jwt_identity()
        
        document_model = Document(current_app.db)
        chat_model = Chat(current_app.db)
        user_model = User(current_app.db)
        
        user_stats = user_model.get_user_stats(current_user_id)
        processing_stats = document_model.get_processing_stats(current_user_id)
        
        processing_summary = {
            'pending': 0,
            'completed': 0,
            'failed': 0,
            'total_size': 0
        }
        
        for stat in processing_stats:
            status = stat['_id']
            count = stat['count']
            size = stat.get('total_size', 0)
            
            if status in processing_summary:
                processing_summary[status] = count
            processing_summary['total_size'] += size
        
        processing_summary['total_documents'] = sum([
            processing_summary['pending'],
            processing_summary['completed'],
            processing_summary['failed']
        ])
        
        chat_count = chat_model.get_user_chat_count(current_user_id)
        
        vector_service = VectorService(current_app.chroma)
        vector_stats = vector_service.get_collection_stats()
        
        recent_documents = document_model.find_by_user_id(current_user_id, 0, 5)
        recent_doc_list = []
        for doc in recent_documents:
            recent_doc_list.append({
                'id': str(doc['_id']),
                'filename': doc['filename'],
                'processing_status': doc['processing_status'],
                'upload_date': doc['upload_date'].isoformat(),
                'size': doc['size']
            })
        
        return jsonify({
            'user_stats': {
                'total_documents': user_stats.get('document_count', 0) if user_stats else 0,
                'total_storage_used': user_stats.get('total_size', 0) if user_stats else 0,
                'account_created': user_stats['created_at'].isoformat() if user_stats else None,
                'total_chats': chat_count
            },
            'processing_stats': processing_summary,
            'vector_stats': vector_stats,
            'recent_documents': recent_doc_list,
            'system_health': {
                'mongodb_connected': current_app.db is not None,
                'chromadb_connected': current_app.chroma is not None,
                'services_running': True
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/documents/stats', methods=['GET'])
@jwt_required()
def get_document_stats():
    try:
        current_user_id = get_jwt_identity()
        document_model = Document(current_app.db)
        
        days = int(request.args.get('days', 7))
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        pipeline = [
            {
                '$match': {
                    'user_id': ObjectId(current_user_id),
                    'upload_date': {'$gte': start_date, '$lte': end_date}
                }
            },
            {
                '$group': {
                    '_id': {
                        'year': {'$year': '$upload_date'},
                        'month': {'$month': '$upload_date'},
                        'day': {'$dayOfMonth': '$upload_date'}
                    },
                    'count': {'$sum': 1},
                    'total_size': {'$sum': '$size'},
                    'completed': {
                        '$sum': {'$cond': [{'$eq': ['$processing_status', 'completed']}, 1, 0]}
                    },
                    'failed': {
                        '$sum': {'$cond': [{'$eq': ['$processing_status', 'failed']}, 1, 0]}
                    }
                }
            },
            {
                '$sort': {'_id': 1}
            }
        ]
        
        daily_stats = list(document_model.collection.aggregate(pipeline))
        
        content_type_pipeline = [
            {
                '$match': {'user_id': ObjectId(current_user_id)}
            },
            {
                '$group': {
                    '_id': '$content_type',
                    'count': {'$sum': 1},
                    'total_size': {'$sum': '$size'}
                }
            },
            {
                '$sort': {'count': -1}
            }
        ]
        
        content_type_stats = list(document_model.collection.aggregate(content_type_pipeline))
        
        return jsonify({
            'daily_stats': daily_stats,
            'content_type_stats': content_type_stats,
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': days
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/search/trends', methods=['GET'])
@jwt_required()
def get_search_trends():
    try:
        current_user_id = get_jwt_identity()
        chat_model = Chat(current_app.db)
        
        days = int(request.args.get('days', 30))
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        pipeline = [
            {
                '$match': {
                    'user_id': ObjectId(current_user_id),
                    'updated_at': {'$gte': start_date, '$lte': end_date}
                }
            },
            {
                '$unwind': '$messages'
            },
            {
                '$match': {
                    'messages.role': 'user',
                    'messages.timestamp': {'$gte': start_date, '$lte': end_date}
                }
            },
            {
                '$group': {
                    '_id': {
                        'year': {'$year': '$messages.timestamp'},
                        'month': {'$month': '$messages.timestamp'},
                        'day': {'$dayOfMonth': '$messages.timestamp'}
                    },
                    'question_count': {'$sum': 1},
                    'unique_chats': {'$addToSet': '$_id'}
                }
            },
            {
                '$project': {
                    '_id': 1,
                    'question_count': 1,
                    'active_chats': {'$size': '$unique_chats'}
                }
            },
            {
                '$sort': {'_id': 1}
            }
        ]
        
        search_trends = list(chat_model.collection.aggregate(pipeline))
        
        popular_topics_pipeline = [
            {
                '$match': {
                    'user_id': ObjectId(current_user_id),
                    'updated_at': {'$gte': start_date}
                }
            },
            {
                '$unwind': '$messages'
            },
            {
                '$match': {
                    'messages.role': 'user',
                    'messages.timestamp': {'$gte': start_date}
                }
            },
            {
                '$project': {
                    'content': '$messages.content',
                    'length': {'$strLenCP': '$messages.content'}
                }
            },
            {
                '$match': {
                    'length': {'$gte': 5}
                }
            },
            {
                '$limit': 100
            }
        ]
        
        recent_questions = list(chat_model.collection.aggregate(popular_topics_pipeline))
        
        return jsonify({
            'search_trends': search_trends,
            'recent_questions': [q['content'][:100] + '...' if len(q['content']) > 100 else q['content'] for q in recent_questions[-10:]],
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': days
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/performance', methods=['GET'])
@jwt_required()
def get_performance_metrics():
    try:
        current_user_id = get_jwt_identity()
        document_model = Document(current_app.db)
        chat_model = Chat(current_app.db)
        
        avg_processing_time_pipeline = [
            {
                '$match': {
                    'user_id': ObjectId(current_user_id),
                    'processing_status': 'completed',
                    'processed_date': {'$exists': True},
                    'upload_date': {'$exists': True}
                }
            },
            {
                '$project': {
                    'processing_time': {
                        '$subtract': ['$processed_date', '$upload_date']
                    }
                }
            },
            {
                '$group': {
                    '_id': None,
                    'avg_processing_time': {'$avg': '$processing_time'},
                    'min_processing_time': {'$min': '$processing_time'},
                    'max_processing_time': {'$max': '$processing_time'},
                    'count': {'$sum': 1}
                }
            }
        ]
        
        processing_performance = list(document_model.collection.aggregate(avg_processing_time_pipeline))
        
        chat_response_pipeline = [
            {
                '$match': {
                    'user_id': ObjectId(current_user_id)
                }
            },
            {
                '$unwind': '$messages'
            },
            {
                '$match': {
                    'messages.role': 'assistant',
                    'messages.metadata.confidence': {'$exists': True}
                }
            },
            {
                '$group': {
                    '_id': None,
                    'avg_confidence': {'$avg': '$messages.metadata.confidence'},
                    'high_confidence_count': {
                        '$sum': {'$cond': [{'$gte': ['$messages.metadata.confidence', 0.7]}, 1, 0]}
                    },
                    'total_responses': {'$sum': 1}
                }
            }
        ]
        
        chat_performance = list(chat_model.collection.aggregate(chat_response_pipeline))
        
        vector_service = VectorService(current_app.chroma)
        vector_stats = vector_service.get_collection_stats()
        
        performance_data = {
            'document_processing': {
                'average_time_ms': processing_performance[0]['avg_processing_time'] if processing_performance else 0,
                'min_time_ms': processing_performance[0]['min_processing_time'] if processing_performance else 0,
                'max_time_ms': processing_performance[0]['max_processing_time'] if processing_performance else 0,
                'total_processed': processing_performance[0]['count'] if processing_performance else 0
            },
            'chat_performance': {
                'average_confidence': round(chat_performance[0]['avg_confidence'], 3) if chat_performance else 0.0,
                'high_confidence_responses': chat_performance[0]['high_confidence_count'] if chat_performance else 0,
                'total_responses': chat_performance[0]['total_responses'] if chat_performance else 0,
                'success_rate': round(
                    (chat_performance[0]['high_confidence_count'] / chat_performance[0]['total_responses']) * 100, 2
                ) if chat_performance and chat_performance[0]['total_responses'] > 0 else 0.0
            },
            'vector_database': vector_stats,
            'system_metrics': {
                'uptime': 'Available',
                'status': 'Healthy'
            }
        }
        
        return jsonify(performance_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/export', methods=['POST'])
@jwt_required()
def export_data():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        export_type = data.get('type', 'documents')
        format_type = data.get('format', 'json')
        
        if export_type == 'documents':
            document_model = Document(current_app.db)
            documents = document_model.find_by_user_id(current_user_id, 0, 1000)
            
            export_data = []
            for doc in documents:
                export_data.append({
                    'filename': doc['filename'],
                    'upload_date': doc['upload_date'].isoformat(),
                    'processing_status': doc['processing_status'],
                    'summary': doc.get('summary'),
                    'tags': doc.get('tags', []),
                    'size': doc['size'],
                    'content_type': doc['content_type']
                })
        
        elif export_type == 'chats':
            chat_model = Chat(current_app.db)
            chats = chat_model.find_by_user_id(current_user_id, 0, 1000)
            
            export_data = []
            for chat in chats:
                export_data.append({
                    'title': chat['title'],
                    'created_at': chat['created_at'].isoformat(),
                    'message_count': len(chat['messages']),
                    'messages': chat['messages']
                })
        
        else:
            return jsonify({'error': 'Invalid export type'}), 400
        
        return jsonify({
            'data': export_data,
            'export_type': export_type,
            'format': format_type,
            'exported_at': datetime.utcnow().isoformat(),
            'count': len(export_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500