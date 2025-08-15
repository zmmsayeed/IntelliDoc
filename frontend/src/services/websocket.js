import { io } from 'socket.io-client';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:5000';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = {};
  }

  connect(token) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      timeout: 20000,
    });

    this.setupEventHandlers();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.reconnectAttempts = 0;
    this.listeners = {};
  }

  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.reconnectAttempts = 0;
      this.emit('connected', { status: 'connected' });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
      this.emit('disconnected', { reason });
      this.handleReconnection();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.emit('connection_error', { error: error.message });
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', { error });
    });

    // Document events
    this.socket.on('document_processing_started', (data) => {
      this.emit('document_processing_started', data);
    });

    this.socket.on('document_processing_completed', (data) => {
      this.emit('document_processing_completed', data);
    });

    this.socket.on('document_processing_failed', (data) => {
      this.emit('document_processing_failed', data);
    });

    this.socket.on('document_updated', (data) => {
      this.emit('document_updated', data);
    });

    // Chat events
    this.socket.on('new_chat_message', (data) => {
      this.emit('new_chat_message', data);
    });

    // System events
    this.socket.on('system_alert', (data) => {
      this.emit('system_alert', data);
    });

    this.socket.on('system_maintenance', (data) => {
      this.emit('system_maintenance', data);
    });
  }

  handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        if (this.socket) {
          this.socket.connect();
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('max_reconnect_attempts', { attempts: this.maxReconnectAttempts });
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket event handler:', error);
        }
      });
    }
  }

  joinDocumentRoom(documentId) {
    if (this.socket?.connected) {
      this.socket.emit('join_document_room', { document_id: documentId });
    }
  }

  leaveDocumentRoom(documentId) {
    if (this.socket?.connected) {
      this.socket.emit('leave_document_room', { document_id: documentId });
    }
  }

  joinChatRoom(chatId) {
    if (this.socket?.connected) {
      this.socket.emit('join_chat_room', { chat_id: chatId });
    }
  }

  leaveChatRoom(chatId) {
    if (this.socket?.connected) {
      this.socket.emit('leave_chat_room', { chat_id: chatId });
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  getConnectionState() {
    if (!this.socket) return 'disconnected';
    return this.socket.connected ? 'connected' : 'connecting';
  }
}

export const wsService = new WebSocketService();
export default wsService;