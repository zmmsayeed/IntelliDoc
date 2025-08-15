from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required
from app.models.user import User
import re
import logging

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/test', methods=['GET', 'POST'])
def test():
    logging.info("Test endpoint called")
    return jsonify({'message': 'Test endpoint working'}), 200

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    return len(password) >= 8

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        logging.info("Register endpoint called")
        data = request.get_json()
        logging.info(f"Received data: {data}")
        
        if not data or not all(k in data for k in ('email', 'password', 'name')):
            logging.error("Missing required fields in request data")
            return jsonify({'error': 'Missing required fields'}), 400
        
        email = data['email'].strip()
        password = data['password']
        name = data['name'].strip()
        logging.info(f"Processing registration for email: {email}, name: {name}")
        
        if not validate_email(email):
            logging.error(f"Invalid email format: {email}")
            return jsonify({'error': 'Invalid email format'}), 400
        
        if not validate_password(password):
            logging.error("Password validation failed - too short")
            return jsonify({'error': 'Password must be at least 8 characters long'}), 400
        
        if not name:
            logging.error("Name is empty")
            return jsonify({'error': 'Name is required'}), 400
        
        logging.info("Creating User model instance")
        user_model = User(current_app.db)
        logging.info("User model created successfully")
        
        logging.info(f"Checking if user exists with email: {email}")
        existing_user = user_model.find_by_email(email)
        if existing_user:
            logging.warning(f"User already exists with email: {email}")
            return jsonify({'error': 'User already exists'}), 409
        
        logging.info("Creating new user")
        user_id = user_model.create_user(email, password, name)
        logging.info(f"User created successfully with ID: {user_id}")
        
        logging.info("Creating access and refresh tokens")
        access_token = create_access_token(identity=user_id)
        refresh_token = create_refresh_token(identity=user_id)
        logging.info("Tokens created successfully")
        
        logging.info("Registration completed successfully")
        return jsonify({
            'message': 'User registered successfully',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': user_id,
                'email': email,
                'name': name
            }
        }), 201
        
    except Exception as e:
        logging.error(f"Registration failed with exception: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data or not all(k in data for k in ('email', 'password')):
            return jsonify({'error': 'Missing email or password'}), 400
        
        email = data['email'].strip()
        password = data['password']
        
        user_model = User(current_app.db)
        user = user_model.find_by_email(email)
        
        if not user or not user_model.verify_password(user, password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user.get('is_active', True):
            return jsonify({'error': 'Account is deactivated'}), 401
        
        access_token = create_access_token(identity=str(user['_id']))
        refresh_token = create_refresh_token(identity=str(user['_id']))
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'name': user['name'],
                'role': user.get('role', 'user')
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    try:
        current_user_id = get_jwt_identity()
        new_token = create_access_token(identity=current_user_id)
        return jsonify({'access_token': new_token}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        current_user_id = get_jwt_identity()
        user_model = User(current_app.db)
        
        user = user_model.find_by_id(current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        stats = user_model.get_user_stats(current_user_id)
        
        return jsonify({
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'name': user['name'],
                'role': user.get('role', 'user'),
                'created_at': user['created_at'].isoformat(),
                'document_count': stats.get('document_count', 0) if stats else 0,
                'total_size': stats.get('total_size', 0) if stats else 0
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        user_model = User(current_app.db)
        user = user_model.find_by_id(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        update_data = {}
        if 'name' in data and data['name'].strip():
            update_data['name'] = data['name'].strip()
        
        if update_data:
            user_model.update_user(current_user_id, update_data)
        
        updated_user = user_model.find_by_id(current_user_id)
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': {
                'id': str(updated_user['_id']),
                'email': updated_user['email'],
                'name': updated_user['name'],
                'role': updated_user.get('role', 'user')
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500