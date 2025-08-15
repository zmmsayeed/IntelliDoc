from flask_socketio import emit, join_room, leave_room, disconnect
from flask_jwt_extended import decode_token, get_jwt_identity
from flask import request
from functools import wraps
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def authenticated_only(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        try:
            token = request.headers.get('Authorization')
            if token and token.startswith('Bearer '):
                token = token.split(' ')[1]
                decode_token(token)
                return f(*args, **kwargs)
            else:
                disconnect()
        except Exception as e:
            logger.error(f"WebSocket authentication failed: {e}")
            disconnect()
    return wrapped

def init_socketio_events(socketio):
    
    @socketio.on('connect')
    def handle_connect(auth):
        try:
            if auth and 'token' in auth:
                token = auth['token']
                decoded_token = decode_token(token)
                user_id = decoded_token['sub']
                room_name = f'user_{user_id}'
                join_room(room_name)
                emit('connected', {'status': 'success', 'message': 'Connected to IntelliDoc'})
                logger.info(f"User {user_id} connected via WebSocket and joined room {room_name}")
            else:
                emit('error', {'message': 'Authentication required'})
                disconnect()
        except Exception as e:
            logger.error(f"WebSocket connection error: {e}")
            emit('error', {'message': 'Authentication failed'})
            disconnect()
    
    @socketio.on('disconnect')
    def handle_disconnect():
        logger.info("Client disconnected from WebSocket")
    
    @socketio.on('join_document_room')
    def handle_join_document_room(data):
        try:
            if 'document_id' in data:
                document_id = data['document_id']
                join_room(f'document_{document_id}')
                emit('joined_room', {'document_id': document_id})
                logger.info(f"Client joined document room: {document_id}")
        except Exception as e:
            logger.error(f"Error joining document room: {e}")
            emit('error', {'message': 'Failed to join document room'})
    
    @socketio.on('leave_document_room')
    def handle_leave_document_room(data):
        try:
            if 'document_id' in data:
                document_id = data['document_id']
                leave_room(f'document_{document_id}')
                emit('left_room', {'document_id': document_id})
                logger.info(f"Client left document room: {document_id}")
        except Exception as e:
            logger.error(f"Error leaving document room: {e}")
    
    @socketio.on('join_chat_room')
    def handle_join_chat_room(data):
        try:
            if 'chat_id' in data:
                chat_id = data['chat_id']
                join_room(f'chat_{chat_id}')
                emit('joined_chat_room', {'chat_id': chat_id})
                logger.info(f"Client joined chat room: {chat_id}")
        except Exception as e:
            logger.error(f"Error joining chat room: {e}")
            emit('error', {'message': 'Failed to join chat room'})
    
    @socketio.on('leave_chat_room')
    def handle_leave_chat_room(data):
        try:
            if 'chat_id' in data:
                chat_id = data['chat_id']
                leave_room(f'chat_{chat_id}')
                emit('left_chat_room', {'chat_id': chat_id})
                logger.info(f"Client left chat room: {chat_id}")
        except Exception as e:
            logger.error(f"Error leaving chat room: {e}")

class WebSocketNotifications:
    def __init__(self, socketio):
        self.socketio = socketio
    
    def notify_user(self, user_id, event_type, data):
        """General method to send notifications to a specific user"""
        notification_data = {
            **data,
            'timestamp': datetime.utcnow().isoformat()
        }
        room_name = f'user_{user_id}'
        
        logger.info(f"Sending WebSocket notification to {room_name}: {event_type}")
        logger.info(f"Notification data keys: {list(notification_data.keys())}")
        
        # Check if there are any clients in the room
        try:
            participants = list(self.socketio.server.manager.get_participants(namespace='/', room=room_name))
            room_clients = len(participants)
            logger.info(f"Number of clients in room {room_name}: {room_clients}")
            if room_clients == 0:
                logger.warning(f"No clients connected to room {room_name}! Notification may not be received.")
        except Exception as e:
            logger.warning(f"Could not get room participant count: {e}")
        
        self.socketio.emit(event_type, notification_data, room=room_name)
        
        logger.info(f"WebSocket notification sent to room {room_name}")
    
    def notify_document_processing_started(self, user_id, document_id, document_name):
        self.socketio.emit('document_processing_started', {
            'document_id': document_id,
            'document_name': document_name,
            'status': 'processing',
            'timestamp': datetime.utcnow().isoformat()
        }, room=f'user_{user_id}')
    
    def notify_document_processing_completed(self, user_id, document_id, document_name, summary=None):
        self.socketio.emit('document_processing_completed', {
            'document_id': document_id,
            'document_name': document_name,
            'status': 'completed',
            'summary': summary,
            'timestamp': datetime.utcnow().isoformat()
        }, room=f'user_{user_id}')
    
    def notify_document_processing_failed(self, user_id, document_id, document_name, error=None):
        self.socketio.emit('document_processing_failed', {
            'document_id': document_id,
            'document_name': document_name,
            'status': 'failed',
            'error': error,
            'timestamp': datetime.utcnow().isoformat()
        }, room=f'user_{user_id}')
    
    def notify_new_chat_message(self, chat_id, message):
        self.socketio.emit('new_chat_message', {
            'chat_id': chat_id,
            'message': message,
            'timestamp': datetime.utcnow().isoformat()
        }, room=f'chat_{chat_id}')
    
    def notify_document_updated(self, user_id, document_id, update_type, data=None):
        self.socketio.emit('document_updated', {
            'document_id': document_id,
            'update_type': update_type,
            'data': data,
            'timestamp': datetime.utcnow().isoformat()
        }, room=f'user_{user_id}')
    
    def notify_system_alert(self, user_id, alert_type, message):
        self.socketio.emit('system_alert', {
            'alert_type': alert_type,
            'message': message,
            'timestamp': datetime.utcnow().isoformat()
        }, room=f'user_{user_id}')
    
    def broadcast_system_maintenance(self, message, scheduled_time=None):
        self.socketio.emit('system_maintenance', {
            'message': message,
            'scheduled_time': scheduled_time,
            'timestamp': datetime.utcnow().isoformat()
        }, broadcast=True)