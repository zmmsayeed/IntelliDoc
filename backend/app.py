from app import create_app
import os

app, socketio = create_app()

if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    socketio.run(app, debug=debug_mode, host='0.0.0.0', port=5000)