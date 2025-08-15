from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from pymongo import MongoClient
import chromadb
from dotenv import load_dotenv
from datetime import timedelta
import os
import logging

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def create_app():
    app = Flask(__name__)
    
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-here')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)  # 7 days instead of default 15 minutes
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)  # 30 days
    app.config['MONGODB_URI'] = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/intellidoc')
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
    
    CORS(app, origins=["http://localhost:3000"])
    
    jwt = JWTManager(app)
    
    socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000")
    
    try:
        mongo_client = MongoClient(app.config['MONGODB_URI'])
        app.db = mongo_client.get_default_database()
        print("Connected to MongoDB successfully")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        app.db = None
    
    try:
        # Disable ChromaDB telemetry completely
        os.environ["ANONYMIZED_TELEMETRY"] = "False"
        os.environ["CHROMA_SERVER_AUTHN_CREDENTIALS_FILE"] = ""
        os.environ["CHROMA_SERVER_AUTHN_PROVIDER"] = ""
        os.environ["CHROMA_POSTHOG_DISABLED"] = "True"
        
        # Create ChromaDB client with all telemetry disabled
        chroma_settings = chromadb.Settings(
            anonymized_telemetry=False,
            allow_reset=True,
            is_persistent=False
        )
        
        chroma_client = chromadb.Client(settings=chroma_settings)
        app.chroma = chroma_client
        print("ChromaDB initialized successfully")
    except Exception as e:
        print(f"Failed to initialize ChromaDB: {e}")
        app.chroma = None
    
    from app.routes.auth import auth_bp
    from app.routes.documents import documents_bp
    from app.routes.chat import chat_bp
    from app.routes.analytics import analytics_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(documents_bp, url_prefix='/api/documents')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    
    from app.services.websocket_service import init_socketio_events, WebSocketNotifications
    init_socketio_events(socketio)
    app.websocket_notifications = WebSocketNotifications(socketio)
    
    return app, socketio