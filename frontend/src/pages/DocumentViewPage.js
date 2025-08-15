import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Form, InputGroup, Alert, Spinner } from 'react-bootstrap';
import Layout from '../components/common/Layout';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const DocumentViewPage = () => {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');

  const fetchDocument = useCallback(async () => {
    try {
      const response = await apiService.getDocument(id);
      setDocument(response.document);
    } catch (error) {
      console.error('Failed to fetch document:', error);
      toast.error('Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchDocument();
    }
  }, [id, fetchDocument]);

  const handleAddTag = async (e) => {
    e.preventDefault();
    if (!newTag.trim()) return;

    try {
      await apiService.addTag(id, newTag.trim());
      setNewTag('');
      await fetchDocument();
      toast.success('Tag added successfully');
    } catch (error) {
      toast.error('Failed to add tag');
    }
  };

  const handleRemoveTag = async (tag) => {
    try {
      await apiService.removeTag(id, tag);
      await fetchDocument();
      toast.success('Tag removed successfully');
    } catch (error) {
      toast.error('Failed to remove tag');
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
    const variants = {
      completed: 'success',
      failed: 'danger',
      pending: 'warning'
    };
    return <Badge bg={variants[status] || 'primary'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <Layout>
        <Container fluid className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Loading document...</p>
          </div>
        </Container>
      </Layout>
    );
  }

  if (!document) {
    return (
      <Layout>
        <Container fluid>
          <Alert variant="warning" className="text-center">
            <i className="fas fa-exclamation-triangle me-2"></i>
            Document not found
            <div className="mt-3">
              <Button as={Link} to="/documents" variant="primary">
                <i className="fas fa-arrow-left me-2"></i>Back to Documents
              </Button>
            </div>
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
        <div className="d-flex align-items-center mb-3 mb-md-0">
          <Button
            as={Link}
            to="/documents"
            variant="outline-secondary"
            className="me-3"
          >
            <i className="fas fa-arrow-left me-2"></i>
            Back
          </Button>
          <div>
            <h1 className="h3 text-dark mb-1">
              <i className="fas fa-file-alt me-2 text-primary"></i>
              {document.filename}
            </h1>
            <div className="d-flex flex-wrap align-items-center gap-3 text-muted small">
              <span>
                <i className="fas fa-weight-hanging me-1"></i>
                {formatBytes(document.size)}
              </span>
              <span>
                <i className="fas fa-clock me-1"></i>
                Uploaded {formatDistanceToNow(new Date(document.upload_date), { addSuffix: true })}
              </span>
              {getStatusBadge(document.processing_status)}
            </div>
          </div>
        </div>
        
        <Button 
          as={Link}
          to={`/chat?document=${document.id}`}
          variant="primary"
          className="d-flex align-items-center"
        >
          <i className="fas fa-comments me-2"></i>
          Chat with Document
        </Button>
      </div>

      <Row className="g-4">
        {/* Main Content */}
        <Col lg={8}>
          {/* Summary */}
          {document.summary && (
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white border-0 pb-0">
                <Card.Title className="h5 mb-3">
                  <i className="fas fa-file-text me-2 text-primary"></i>
                  Summary
                </Card.Title>
              </Card.Header>
              <Card.Body>
                <p className="text-dark lh-lg">{document.summary}</p>
              </Card.Body>
            </Card>
          )}

          {/* Key Insights */}
          {document.key_insights && document.key_insights.length > 0 && (
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white border-0 pb-0">
                <Card.Title className="h5 mb-3">
                  <i className="fas fa-lightbulb me-2 text-primary"></i>
                  Key Insights
                </Card.Title>
              </Card.Header>
              <Card.Body>
                <div className="d-flex flex-column gap-3">
                  {document.key_insights.map((insight, index) => (
                    <div key={index} className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                      <span className="fw-semibold text-capitalize">
                        {insight.category}
                      </span>
                      <div className="d-flex align-items-center">
                        <div className="progress me-3" style={{ width: '80px', height: '6px' }}>
                          <div 
                            className="progress-bar bg-primary" 
                            role="progressbar"
                            style={{ width: `${insight.confidence * 100}%` }}
                          ></div>
                        </div>
                        <small className="text-muted">
                          {Math.round(insight.confidence * 100)}%
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Full Text */}
          {document.extracted_text && (
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white border-0 pb-0">
                <Card.Title className="h5 mb-3">
                  <i className="fas fa-file-text me-2 text-primary"></i>
                  Document Content
                </Card.Title>
              </Card.Header>
              <Card.Body>
                <div className="bg-light p-3 rounded" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <pre className="text-dark small mb-0" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                    {document.extracted_text}
                  </pre>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>

        {/* Sidebar */}
        <Col lg={4}>
          {/* Document Info */}
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white border-0 pb-0">
              <Card.Title className="h5 mb-3">
                <i className="fas fa-info-circle me-2 text-primary"></i>
                Document Info
              </Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="d-flex flex-column gap-3">
                <div className="d-flex justify-content-between">
                  <span className="text-muted">File Type</span>
                  <span className="fw-semibold">{document.content_type}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Size</span>
                  <span className="fw-semibold">{formatBytes(document.size)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Upload Date</span>
                  <span className="fw-semibold">
                    {new Date(document.upload_date).toLocaleDateString()}
                  </span>
                </div>
                {document.processed_date && (
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Processed Date</span>
                    <span className="fw-semibold">
                      {new Date(document.processed_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Tags */}
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white border-0 pb-0">
              <Card.Title className="h5 mb-3">
                <i className="fas fa-tags me-2 text-primary"></i>
                Tags
              </Card.Title>
            </Card.Header>
            <Card.Body>
              {document.tags && document.tags.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {document.tags.map((tag) => (
                    <Badge
                      key={tag}
                      bg="primary"
                      className="px-2 py-1 cursor-pointer"
                      role="button"
                      onClick={() => handleRemoveTag(tag)}
                      title="Click to remove"
                    >
                      {tag} <i className="fas fa-times ms-1"></i>
                    </Badge>
                  ))}
                </div>
              )}
              
              <Form onSubmit={handleAddTag}>
                <InputGroup size="sm">
                  <Form.Control
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                  />
                  <Button 
                    type="submit"
                    variant="primary"
                    disabled={!newTag.trim()}
                  >
                    <i className="fas fa-plus"></i>
                  </Button>
                </InputGroup>
              </Form>
            </Card.Body>
          </Card>

          {/* Processing Metadata */}
          {document.metadata && (
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white border-0 pb-0">
                <Card.Title className="h5 mb-3">
                  <i className="fas fa-cogs me-2 text-primary"></i>
                  Processing Details
                </Card.Title>
              </Card.Header>
              <Card.Body>
                <div className="d-flex flex-column gap-3">
                  {document.metadata.text_length && (
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Characters</span>
                      <span className="fw-semibold">
                        {document.metadata.text_length.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {document.metadata.word_count && (
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Words</span>
                      <span className="fw-semibold">
                        {document.metadata.word_count.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {document.metadata.chunks_count && (
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Chunks</span>
                      <span className="fw-semibold">
                        {document.metadata.chunks_count}
                      </span>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Layout>
  );
};

export default DocumentViewPage;