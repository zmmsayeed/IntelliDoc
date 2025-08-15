import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Container, Row, Col, Card, Form, Button, InputGroup, Badge, ProgressBar } from 'react-bootstrap';
import Layout from '../components/common/Layout';
import { apiService } from '../services/api';
import { wsService } from '../services/websocket';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState([]);

  useEffect(() => {
    fetchDocuments();
    setupWebSocketListeners();
  }, []);

  useEffect(() => {
    // Filter documents based on search query
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);
    } else {
      const filtered = documents.filter(doc =>
        doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredDocuments(filtered);
    }
  }, [documents, searchQuery]);

  const setupWebSocketListeners = () => {
    wsService.on('document_processing_completed', (data) => {
      // Refresh documents list when processing completes
      fetchDocuments();
    });

    wsService.on('document_processing_failed', (data) => {
      // Refresh documents list when processing fails
      fetchDocuments();
    });
  };

  const fetchDocuments = async () => {
    try {
      const response = await apiService.getDocuments(0, 50);
      setDocuments(response.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Unsupported file type. Please upload PDF, Word, text, or image files.');
      return;
    }

    // Validate file size (16MB max)
    if (file.size > 16 * 1024 * 1024) {
      toast.error('File size must be less than 16MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await apiService.uploadDocument(file, (progress) => {
        setUploadProgress(progress);
      });

      toast.success(`Document "${file.name}" uploaded successfully!`);
      await fetchDocuments(); // Refresh the list

    } catch (error) {
      const message = error.response?.data?.error || 'Upload failed';
      toast.error(message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.bmp']
    }
  });

  const handleDeleteDocument = async (docId, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      await apiService.deleteDocument(docId);
      toast.success('Document deleted successfully');
      await fetchDocuments();
    } catch (error) {
      const message = error.response?.data?.error || 'Delete failed';
      toast.error(message);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge bg="success" className="rounded-pill">Completed</Badge>;
      case 'failed':
        return <Badge bg="danger" className="rounded-pill">Failed</Badge>;
      case 'pending':
        return <Badge bg="warning" className="rounded-pill">Processing</Badge>;
      default:
        return <Badge bg="primary" className="rounded-pill">{status}</Badge>;
    }
  };

  const getFileIcon = (contentType) => {
    if (contentType?.includes('image')) {
      return '🖼️';
    } else if (contentType?.includes('pdf')) {
      return '📄';
    } else if (contentType?.includes('word')) {
      return '📝';
    } else {
      return '📄';
    }
  };

  return (
    <Layout>
      <Container fluid>
        {/* Header */}
        <Row className="align-items-center mb-4">
          <Col lg={8}>
            <h1 className="display-6 fw-bold text-dark mb-2">
              <i className="fas fa-file-alt me-3 text-gradient-primary"></i>
              Documents
            </h1>
            <p className="text-muted fs-5 mb-0">Manage and analyze your document collection with AI-powered intelligence</p>
          </Col>
          <Col lg={4}>
            <InputGroup className="shadow-sm">
              <InputGroup.Text className="bg-white border-end-0">
                <i className="fas fa-search text-muted"></i>
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-start-0"
              />
            </InputGroup>
          </Col>
        </Row>

        {/* Upload Area */}
        <Card className="mb-4 shadow-sm card-hover border-0">
          <Card.Body className="p-0">
            <div
              {...getRootProps()}
              className={`p-5 text-center border-2 border-dashed rounded-3 m-3 transition-all cursor-pointer ${
                isDragActive 
                  ? 'border-primary bg-primary bg-opacity-10' 
                  : 'border-light hover:border-primary hover:bg-light'
              } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <input {...getInputProps()} disabled={uploading} />
              <div>
                {uploading ? (
                  <div className="animate-fade-in">
                    <div className="bg-gradient-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-4" 
                         style={{ width: '80px', height: '80px' }}>
                      <i className="fas fa-cloud-upload-alt text-white" style={{ fontSize: '2rem' }}></i>
                    </div>
                    <h4 className="text-primary fw-bold mb-3">Uploading Document...</h4>
                    <div className="mb-3">
                      <ProgressBar 
                        now={uploadProgress} 
                        className="mb-2" 
                        style={{ height: '8px' }}
                        variant="primary"
                      />
                      <small className="text-muted fw-medium">{uploadProgress}% complete</small>
                    </div>
                  </div>
                ) : isDragActive ? (
                  <div className="text-primary">
                    <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-4" 
                         style={{ width: '80px', height: '80px' }}>
                      <i className="fas fa-file-import text-primary" style={{ fontSize: '2rem' }}></i>
                    </div>
                    <h4 className="fw-bold mb-2">Drop your document here</h4>
                    <p className="text-muted">Release to upload your file</p>
                  </div>
                ) : (
                  <div>
                    <div className="bg-gradient-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-4" 
                         style={{ width: '80px', height: '80px' }}>
                      <i className="fas fa-cloud-upload-alt text-white" style={{ fontSize: '2rem' }}></i>
                    </div>
                    <h4 className="text-dark fw-bold mb-3">
                      Drag and drop documents here
                    </h4>
                    <p className="text-muted lead mb-3">
                      Or click to browse and select files from your computer
                    </p>
                    <div className="d-flex justify-content-center gap-3 flex-wrap">
                      <Badge bg="light" text="dark" className="px-3 py-2">
                        <i className="fas fa-file-pdf text-danger me-1"></i> PDF
                      </Badge>
                      <Badge bg="light" text="dark" className="px-3 py-2">
                        <i className="fas fa-file-word text-primary me-1"></i> Word
                      </Badge>
                      <Badge bg="light" text="dark" className="px-3 py-2">
                        <i className="fas fa-file-alt text-secondary me-1"></i> Text
                      </Badge>
                      <Badge bg="light" text="dark" className="px-3 py-2">
                        <i className="fas fa-image text-info me-1"></i> Images
                      </Badge>
                    </div>
                    <small className="text-muted d-block mt-3">Maximum file size: 16MB</small>
                  </div>
                )}
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Documents List */}
        <Card className="shadow-sm border-0">
          <Card.Header className="bg-white border-0 pb-0">
            <div className="d-flex align-items-center justify-content-between">
              <h3 className="h5 mb-0 fw-bold text-dark d-flex align-items-center">
                <div className="bg-gradient-info rounded-3 d-flex align-items-center justify-content-center me-3" 
                     style={{ width: '40px', height: '40px' }}>
                  <i className="fas fa-folder-open text-white"></i>
                </div>
                Your Documents
              </h3>
              <Badge bg="primary" className="px-3 py-2 rounded-pill">
                {filteredDocuments.length} {filteredDocuments.length === 1 ? 'document' : 'documents'}
              </Badge>
            </div>
          </Card.Header>
          <Card.Body className="p-4">
            {loading ? (
              <div className="d-flex justify-content-center align-items-center py-5">
                <div className="text-center">
                  <div className="loading-spinner mx-auto mb-3"></div>
                  <h5 className="text-muted">Loading documents...</h5>
                </div>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-5">
                <div className="bg-gradient-secondary rounded-circle d-inline-flex align-items-center justify-content-center mb-4" 
                     style={{ width: '100px', height: '100px' }}>
                  <i className={`fas ${searchQuery ? 'fa-search' : 'fa-file-upload'} text-white`} style={{ fontSize: '2.5rem' }}></i>
                </div>
                <h4 className="text-dark fw-bold mb-3">
                  {searchQuery ? 'No documents match your search' : 'No documents uploaded yet'}
                </h4>
                <p className="text-muted lead mb-4">
                  {searchQuery 
                    ? 'Try adjusting your search terms or upload a new document' 
                    : 'Upload your first document to start analyzing with AI'}
                </p>
                {!searchQuery && (
                  <Button 
                    className="btn-gradient-primary px-4 py-2 rounded-pill"
                    onClick={() => document.querySelector('input[type="file"]')?.click()}
                  >
                    <i className="fas fa-plus me-2"></i>
                    Upload Document
                  </Button>
                )}
              </div>
            ) : (
              <Row className="g-4">
                {filteredDocuments.map((doc) => (
                  <Col key={doc.id} lg={6} xl={4}>
                    <Card className="h-100 border-0 shadow-sm card-hover">
                      <Card.Body className="p-4">
                        <div className="d-flex align-items-start mb-3">
                          <div className="bg-light rounded-3 d-flex align-items-center justify-content-center me-3" 
                               style={{ width: '50px', height: '50px', minWidth: '50px' }}>
                            <span style={{ fontSize: '1.5rem' }}>{getFileIcon(doc.content_type)}</span>
                          </div>
                          <div className="flex-grow-1 overflow-hidden">
                            <Link 
                              to={`/documents/${doc.id}`}
                              className="text-decoration-none"
                            >
                              <h6 className="fw-semibold text-dark mb-2 text-truncate" title={doc.filename}>
                                {doc.filename}
                              </h6>
                            </Link>
                            <div className="d-flex align-items-center gap-3 mb-2">
                              <small className="text-muted">
                                <i className="fas fa-weight-hanging me-1"></i>
                                {formatBytes(doc.size)}
                              </small>
                              <small className="text-muted">
                                <i className="fas fa-clock me-1"></i>
                                {formatDistanceToNow(new Date(doc.upload_date), { addSuffix: true })}
                              </small>
                            </div>
                            <div className="mb-3">
                              {getStatusBadge(doc.processing_status)}
                            </div>
                          </div>
                        </div>
                        
                        {doc.summary && (
                          <p className="text-muted small mb-3" style={{ 
                            display: '-webkit-box', 
                            WebkitLineClamp: 3, 
                            WebkitBoxOrient: 'vertical', 
                            overflow: 'hidden' 
                          }}>
                            {doc.summary}
                          </p>
                        )}
                        
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="mb-3">
                            <div className="d-flex flex-wrap gap-1">
                              {doc.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} bg="primary" bg-opacity-10 text="primary" className="small">
                                  <i className="fas fa-tag me-1"></i>{tag}
                                </Badge>
                              ))}
                              {doc.tags.length > 3 && (
                                <Badge bg="light" text="dark" className="small">
                                  +{doc.tags.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="d-flex gap-2 mt-auto">
                          <Button 
                            as={Link} 
                            to={`/documents/${doc.id}`}
                            variant="outline-primary" 
                            size="sm" 
                            className="flex-grow-1 rounded-pill"
                          >
                            <i className="fas fa-eye me-1"></i> View
                          </Button>
                          <Button 
                            as={Link} 
                            to={`/chat?document=${doc.id}`}
                            variant="outline-info" 
                            size="sm" 
                            className="flex-grow-1 rounded-pill"
                          >
                            <i className="fas fa-comments me-1"></i> Chat
                          </Button>
                          <Button
                            onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                            variant="outline-danger"
                            size="sm"
                            className="rounded-pill"
                            title="Delete document"
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card.Body>
        </Card>
      </Container>
    </Layout>
  );
};

export default DocumentsPage;