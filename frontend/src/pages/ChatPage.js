import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, InputGroup, Badge } from 'react-bootstrap';
import Layout from '../components/common/Layout';
import { apiService } from '../services/api';
import { wsService } from '../services/websocket';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const ChatPage = () => {
  const { id: chatId } = useParams();
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get('document');

  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    initializeChat();
  }, [chatId, documentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    try {
      // Load chats list
      const chatsResponse = await apiService.getChats();
      setChats(chatsResponse.chats || []);

      if (chatId) {
        // Load existing chat
        const chatResponse = await apiService.getChat(chatId);
        setCurrentChat(chatResponse.chat);
        setMessages(chatResponse.chat.messages || []);
        
        // Join chat room for real-time updates
        wsService.joinChatRoom(chatId);
      } else if (documentId) {
        // Create new chat for document
        const response = await apiService.createChat(documentId, 'Chat about Document');
        setCurrentChat(response.chat);
        setMessages([]);
        
        // Update URL without page reload
        window.history.pushState({}, '', `/chat/${response.chat.id}`);
        
        // Join chat room
        wsService.joinChatRoom(response.chat.id);
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      toast.error('Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending || !currentChat) return;

    const message = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    // Add user message to UI immediately
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      metadata: {}
    };
    
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await apiService.sendMessage(currentChat.id, message);
      
      // Update with actual messages from server
      setMessages(prev => {
        // Remove the temporary user message and add the server response
        const withoutTemp = prev.filter(msg => msg.id !== userMessage.id);
        return [...withoutTemp, ...response.messages];
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      
      // Remove the temporary message on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setSending(false);
    }
  };

  const handleCreateNewChat = async () => {
    try {
      const response = await apiService.createChat(null, 'New Chat');
      setCurrentChat(response.chat);
      setMessages([]);
      
      // Update chats list
      const chatsResponse = await apiService.getChats();
      setChats(chatsResponse.chats || []);
      
      // Update URL
      window.history.pushState({}, '', `/chat/${response.chat.id}`);
      
      // Join chat room
      wsService.joinChatRoom(response.chat.id);
      
      toast.success('New chat created');
    } catch (error) {
      console.error('Failed to create chat:', error);
      toast.error('Failed to create chat');
    }
  };

  const formatMessageTime = (timestamp) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  if (loading) {
    return (
      <Layout>
        <Container fluid className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center animate-fade-in">
            <div className="loading-spinner mx-auto mb-3"></div>
            <h5 className="text-muted">Loading chat...</h5>
          </div>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container fluid className="p-0">
        <Row className="g-0" style={{ height: 'calc(100vh - 70px)' }}>
          {/* Chat Sidebar */}
          <Col lg={3} md={4} className="border-end bg-white">
            <Card className="border-0 h-100 rounded-0">
              <Card.Header className="bg-gradient-primary text-white border-0">
                <div className="d-flex align-items-center justify-content-between">
                  <h5 className="mb-0 fw-semibold">
                    <i className="fas fa-comments me-2"></i>
                    Chats
                  </h5>
                  <Button
                    onClick={handleCreateNewChat}
                    variant="light"
                    size="sm"
                    className="rounded-pill"
                  >
                    <i className="fas fa-plus me-1"></i>
                    New
                  </Button>
                </div>
              </Card.Header>
              
              <Card.Body className="p-0" style={{ overflowY: 'auto' }}>
                {chats.length === 0 ? (
                  <div className="p-4 text-center">
                    <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                         style={{ width: '60px', height: '60px' }}>
                      <i className="fas fa-comment-slash text-muted fs-4"></i>
                    </div>
                    <h6 className="text-muted mb-2">No chats yet</h6>
                    <p className="text-muted small">Start a new conversation to get started</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {chats.map((chat) => (
                      <Button
                        key={chat.id}
                        onClick={() => {
                          setCurrentChat(chat);
                          setMessages(chat.messages || []);
                          window.history.pushState({}, '', `/chat/${chat.id}`);
                          wsService.leaveChatRoom(currentChat?.id);
                          wsService.joinChatRoom(chat.id);
                        }}
                        variant={currentChat?.id === chat.id ? 'primary' : 'light'}
                        className={`w-100 text-start p-3 mb-2 border-0 rounded-3 ${
                          currentChat?.id === chat.id ? 'shadow-sm' : 'hover-shadow'
                        }`}
                      >
                        <div className="d-flex align-items-start">
                          <div className={`rounded-2 d-flex align-items-center justify-content-center me-3 ${
                            currentChat?.id === chat.id ? 'bg-white bg-opacity-20' : 'bg-primary bg-opacity-10'
                          }`} style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                            <i className={`fas ${chat.document_id ? 'fa-file-alt' : 'fa-comment-dots'} ${
                              currentChat?.id === chat.id ? 'text-white' : 'text-primary'
                            }`}></i>
                          </div>
                          <div className="flex-grow-1 overflow-hidden">
                            <div className={`fw-semibold text-truncate ${
                              currentChat?.id === chat.id ? 'text-white' : 'text-dark'
                            }`} style={{ fontSize: '0.9rem' }}>
                              {chat.title}
                            </div>
                            <small className={`d-block ${
                              currentChat?.id === chat.id ? 'text-white opacity-75' : 'text-muted'
                            }`}>
                              {formatMessageTime(chat.updated_at)}
                            </small>
                            {chat.message_count > 0 && (
                              <Badge bg={currentChat?.id === chat.id ? 'light' : 'primary'} 
                                     className={`mt-1 ${currentChat?.id === chat.id ? 'text-primary' : 'text-white'}`}>
                                {chat.message_count} messages
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Chat Area */}
          <Col lg={9} md={8} className="d-flex flex-column bg-light">
            {currentChat ? (
              <>
                {/* Chat Header */}
                <Card className="border-0 rounded-0 border-bottom">
                  <Card.Body className="py-3">
                    <div className="d-flex align-items-center">
                      <div className="bg-gradient-primary rounded-3 d-flex align-items-center justify-content-center me-3" 
                           style={{ width: '50px', height: '50px' }}>
                        <i className={`fas ${currentChat.document_id ? 'fa-file-alt' : 'fa-comment-dots'} text-white fs-5`}></i>
                      </div>
                      <div>
                        <h4 className="mb-1 fw-bold text-dark">{currentChat.title}</h4>
                        {currentChat.document_id && (
                          <small className="text-muted">
                            <i className="fas fa-file-text me-1"></i>
                            Document-based conversation
                          </small>
                        )}
                      </div>
                    </div>
                  </Card.Body>
                </Card>

                {/* Messages */}
                <div className="flex-grow-1 p-4" style={{ overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
                  {messages.length === 0 ? (
                    <div className="d-flex align-items-center justify-content-center h-100">
                      <div className="text-center">
                        <div className="bg-gradient-info rounded-circle d-inline-flex align-items-center justify-content-center mb-4" 
                             style={{ width: '100px', height: '100px' }}>
                          <i className="fas fa-comments text-white" style={{ fontSize: '2.5rem' }}></i>
                        </div>
                        <h4 className="text-dark fw-bold mb-3">Start a conversation</h4>
                        <p className="text-muted lead">
                          Ask questions about your documents or start a general chat with AI
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message, index) => (
                        <div key={message.id || index} className={`d-flex mb-4 ${message.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                          <div className={`d-flex ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} align-items-start`} style={{ maxWidth: '70%' }}>
                            <div className={`rounded-circle d-flex align-items-center justify-content-center ${message.role === 'user' ? 'ms-3' : 'me-3'}`} 
                                 style={{ width: '40px', height: '40px', minWidth: '40px', 
                                         backgroundColor: message.role === 'user' ? '#0d6efd' : '#6c757d' }}>
                              <i className={`fas ${message.role === 'user' ? 'fa-user' : 'fa-robot'} text-white`}></i>
                            </div>
                            <div className={`p-3 rounded-3 ${message.role === 'user' ? 'bg-primary text-white' : 'bg-white text-dark'}`}>
                              <p className="mb-2 lh-base" style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
                              <div className={`d-flex align-items-center justify-content-between small ${message.role === 'user' ? 'text-white-50' : 'text-muted'}`}>
                                <span>{formatMessageTime(message.timestamp)}</span>
                                {message.metadata?.confidence && (
                                  <Badge bg="light" text="dark" className="ms-2">
                                    {Math.round(message.metadata.confidence * 100)}% confidence
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {sending && (
                        <div className="d-flex justify-content-start mb-4">
                          <div className="d-flex flex-row align-items-start" style={{ maxWidth: '70%' }}>
                            <div className="rounded-circle d-flex align-items-center justify-content-center me-3" 
                                 style={{ width: '40px', height: '40px', minWidth: '40px', backgroundColor: '#6c757d' }}>
                              <i className="fas fa-robot text-white"></i>
                            </div>
                            <div className="p-3 rounded-3 bg-white text-dark">
                              <div className="d-flex align-items-center">
                                <div className="loading-spinner me-2"></div>
                                <span className="text-muted">AI is thinking...</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Message Input */}
                <Card className="border-0 rounded-0 border-top">
                  <Card.Body className="py-3">
                    <Form onSubmit={handleSendMessage}>
                      <InputGroup size="lg">
                        <Form.Control
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          placeholder="Type your message here..."
                          disabled={sending}
                          className="border-2 rounded-start-3"
                        />
                        <Button
                          type="submit"
                          disabled={!inputMessage.trim() || sending}
                          className="btn-gradient-primary px-4 rounded-end-3"
                        >
                          {sending ? (
                            <div className="loading-spinner"></div>
                          ) : (
                            <i className="fas fa-paper-plane"></i>
                          )}
                        </Button>
                      </InputGroup>
                    </Form>
                  </Card.Body>
                </Card>
              </>
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100">
                <div className="text-center">
                  <div className="bg-gradient-secondary rounded-circle d-inline-flex align-items-center justify-content-center mb-4" 
                       style={{ width: '120px', height: '120px' }}>
                    <i className="fas fa-comments text-white" style={{ fontSize: '3rem' }}></i>
                  </div>
                  <h3 className="fw-bold text-dark mb-3">Welcome to AI Chat</h3>
                  <p className="text-muted lead mb-4">
                    Select an existing chat or create a new one to start conversing with AI
                  </p>
                  <Button
                    onClick={handleCreateNewChat}
                    className="btn-gradient-primary px-4 py-2 rounded-pill"
                    size="lg"
                  >
                    <i className="fas fa-plus me-2"></i>
                    Start New Chat
                  </Button>
                </div>
              </div>
            )}
          </Col>
        </Row>
      </Container>
    </Layout>
  );
};

export default ChatPage;