import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Alert, Button } from 'react-bootstrap';
import Layout from '../components/common/Layout';
import { apiService } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const data = await apiService.getDashboardData();
      setDashboardData(data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      case 'pending':
        return 'warning';
      default:
        return 'primary';
    }
  };

  if (loading) {
    return (
      <Layout>
        <Container fluid className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center animate-fade-in">
            <div className="loading-spinner mx-auto mb-3"></div>
            <h5 className="text-muted">Loading dashboard...</h5>
            <p className="text-muted small">Please wait while we gather your data</p>
          </div>
        </Container>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Container fluid>
          <Alert variant="danger" className="text-center">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
            <div className="mt-3">
              <Button variant="primary" onClick={fetchDashboardData}>
                <i className="fas fa-redo me-2"></i>Try Again
              </Button>
            </div>
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h1 className="display-6 fw-bold text-dark mb-2">
            <i className="fas fa-tachometer-alt me-3 text-gradient-primary"></i>
            Dashboard
          </h1>
          <p className="text-muted fs-5 mb-0">Welcome back! Here's an overview of your document intelligence platform.</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" className="rounded-pill">
            <i className="fas fa-download me-2"></i>Export Report
          </Button>
          <Button 
            as={Link} 
            to="/documents" 
            className="btn-gradient-primary rounded-pill"
          >
            <i className="fas fa-plus me-2"></i>Upload Document
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <Row className="g-4 mb-5">
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm h-100 card-hover">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="bg-gradient-primary rounded-3 d-flex align-items-center justify-content-center" 
                     style={{ width: '60px', height: '60px' }}>
                  <i className="fas fa-file-alt text-white fs-4"></i>
                </div>
                <span className="badge bg-primary bg-opacity-10 text-primary">+12%</span>
              </div>
              <div>
                <h2 className="h3 fw-bold text-dark mb-1">
                  {dashboardData?.user_stats?.total_documents || 0}
                </h2>
                <p className="text-muted mb-0 fw-medium">Total Documents</p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm h-100 card-hover">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="bg-gradient-success rounded-3 d-flex align-items-center justify-content-center" 
                     style={{ width: '60px', height: '60px' }}>
                  <i className="fas fa-cloud-upload-alt text-white fs-4"></i>
                </div>
                <span className="badge bg-success bg-opacity-10 text-success">+8%</span>
              </div>
              <div>
                <h2 className="h3 fw-bold text-dark mb-1">
                  {formatBytes(dashboardData?.user_stats?.total_storage_used || 0)}
                </h2>
                <p className="text-muted mb-0 fw-medium">Storage Used</p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm h-100 card-hover">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="bg-gradient-info rounded-3 d-flex align-items-center justify-content-center" 
                     style={{ width: '60px', height: '60px' }}>
                  <i className="fas fa-comments text-white fs-4"></i>
                </div>
                <span className="badge bg-info bg-opacity-10 text-info">+25%</span>
              </div>
              <div>
                <h2 className="h3 fw-bold text-dark mb-1">
                  {dashboardData?.user_stats?.total_chats || 0}
                </h2>
                <p className="text-muted mb-0 fw-medium">Total Chats</p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm h-100 card-hover">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="bg-gradient-warning rounded-3 d-flex align-items-center justify-content-center" 
                     style={{ width: '60px', height: '60px' }}>
                  <i className="fas fa-chart-bar text-white fs-4"></i>
                </div>
                <span className="badge bg-warning bg-opacity-10 text-warning">95%+</span>
              </div>
              <div>
                <h2 className="h3 fw-bold text-dark mb-1">
                  {dashboardData?.processing_stats ? 
                    Math.round((dashboardData.processing_stats.completed / 
                      dashboardData.processing_stats.total_documents) * 100) || 0 : 0}%
                </h2>
                <p className="text-muted mb-0 fw-medium">Processing Rate</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Processing Status & Recent Documents */}
      <Row className="g-4 mb-4">
        {/* Processing Status */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100 card-hover">
            <Card.Header className="bg-white border-0 pb-3">
              <div className="d-flex align-items-center justify-content-between">
                <Card.Title className="h5 mb-0 d-flex align-items-center">
                  <div className="bg-gradient-primary rounded-3 d-flex align-items-center justify-content-center me-3" 
                       style={{ width: '40px', height: '40px' }}>
                    <i className="fas fa-cogs text-white"></i>
                  </div>
                  Processing Status
                </Card.Title>
                <Button variant="outline-primary" size="sm" className="rounded-pill">
                  <i className="fas fa-refresh"></i>
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="pt-0">
              <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-success bg-opacity-10 rounded-3 border border-success border-opacity-25">
                <div className="d-flex align-items-center">
                  <i className="fas fa-check-circle text-success me-2"></i>
                  <span className="fw-medium text-dark">Completed</span>
                </div>
                <Badge bg="success" className="px-3 py-2 rounded-pill">
                  {dashboardData?.processing_stats?.completed || 0}
                </Badge>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-warning bg-opacity-10 rounded-3 border border-warning border-opacity-25">
                <div className="d-flex align-items-center">
                  <i className="fas fa-clock text-warning me-2"></i>
                  <span className="fw-medium text-dark">Pending</span>
                </div>
                <Badge bg="warning" className="px-3 py-2 rounded-pill">
                  {dashboardData?.processing_stats?.pending || 0}
                </Badge>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-4 p-3 bg-danger bg-opacity-10 rounded-3 border border-danger border-opacity-25">
                <div className="d-flex align-items-center">
                  <i className="fas fa-exclamation-triangle text-danger me-2"></i>
                  <span className="fw-medium text-dark">Failed</span>
                </div>
                <Badge bg="danger" className="px-3 py-2 rounded-pill">
                  {dashboardData?.processing_stats?.failed || 0}
                </Badge>
              </div>
              <div className="bg-gradient-primary p-3 rounded-3 text-white">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">Total Documents</span>
                  <span className="h5 mb-0 fw-bold">
                    {dashboardData?.processing_stats?.total_documents || 0}
                  </span>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Recent Documents */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100 card-hover">
            <Card.Header className="bg-white border-0 pb-3">
              <div className="d-flex align-items-center justify-content-between">
                <Card.Title className="h5 mb-0 d-flex align-items-center">
                  <div className="bg-gradient-info rounded-3 d-flex align-items-center justify-content-center me-3" 
                       style={{ width: '40px', height: '40px' }}>
                    <i className="fas fa-clock text-white"></i>
                  </div>
                  Recent Documents
                </Card.Title>
                <Button variant="outline-primary" size="sm" className="rounded-pill" as={Link} to="/documents">
                  View All
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="pt-0">
              {dashboardData?.recent_documents?.length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {dashboardData.recent_documents.map((doc) => (
                    <div key={doc.id} className="p-3 bg-light bg-opacity-50 rounded-3 border border-light border-opacity-50 hover-shadow transition">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="d-flex align-items-start">
                          <div className="bg-white rounded-2 d-flex align-items-center justify-content-center me-3 shadow-sm" 
                               style={{ width: '40px', height: '40px' }}>
                            <i className="fas fa-file-alt text-primary"></i>
                          </div>
                          <div className="flex-grow-1">
                            <div className="fw-semibold text-dark mb-1" style={{ maxWidth: '200px' }}>
                              {doc.filename}
                            </div>
                            <small className="text-muted d-flex align-items-center">
                              <i className="fas fa-clock me-1"></i>
                              {formatDistanceToNow(new Date(doc.upload_date), { addSuffix: true })}
                            </small>
                          </div>
                        </div>
                        <div className="text-end">
                          <Badge bg={getStatusVariant(doc.processing_status)} className="mb-2 px-3 py-1 rounded-pill">
                            {doc.processing_status}
                          </Badge>
                          <div>
                            <small className="text-muted fw-medium">
                              {formatBytes(doc.size)}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5">
                  <div className="bg-gradient-secondary rounded-circle d-inline-flex align-items-center justify-content-center mb-4" 
                       style={{ width: '80px', height: '80px' }}>
                    <i className="fas fa-file-alt text-white" style={{ fontSize: '2rem' }}></i>
                  </div>
                  <h6 className="fw-semibold text-dark mb-2">No documents yet</h6>
                  <p className="text-muted small mb-3">Upload your first document to get started</p>
                  <Button 
                    as={Link} 
                    to="/documents" 
                    className="btn-gradient-primary rounded-pill" 
                    size="sm"
                  >
                    <i className="fas fa-plus me-2"></i>Upload Document
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* System Health */}
      <Card className="border-0 shadow-sm card-hover">
        <Card.Header className="bg-white border-0 pb-3">
          <div className="d-flex align-items-center justify-content-between">
            <Card.Title className="h5 mb-0 d-flex align-items-center">
              <div className="bg-gradient-success rounded-3 d-flex align-items-center justify-content-center me-3" 
                   style={{ width: '40px', height: '40px' }}>
                <i className="fas fa-heartbeat text-white"></i>
              </div>
              System Health
            </Card.Title>
            <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill">
              <i className="fas fa-check-circle me-1"></i>All Systems Operational
            </span>
          </div>
        </Card.Header>
        <Card.Body>
          <Row className="g-4 mb-4">
            <Col md={4}>
              <div className="p-3 rounded-3 border border-light border-opacity-50 bg-light bg-opacity-30">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center">
                    <div className={`rounded-circle me-3 shadow-sm ${dashboardData?.system_health?.mongodb_connected ? 'bg-success' : 'bg-danger'}`} 
                         style={{ width: '20px', height: '20px' }}></div>
                    <div>
                      <div className="fw-semibold text-dark">MongoDB</div>
                      <small className="text-muted">
                        {dashboardData?.system_health?.mongodb_connected ? 'Connected' : 'Disconnected'}
                      </small>
                    </div>
                  </div>
                  <i className="fas fa-database text-primary fs-5"></i>
                </div>
              </div>
            </Col>
            
            <Col md={4}>
              <div className="p-3 rounded-3 border border-light border-opacity-50 bg-light bg-opacity-30">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center">
                    <div className={`rounded-circle me-3 shadow-sm ${dashboardData?.system_health?.chromadb_connected ? 'bg-success' : 'bg-danger'}`} 
                         style={{ width: '20px', height: '20px' }}></div>
                    <div>
                      <div className="fw-semibold text-dark">ChromaDB</div>
                      <small className="text-muted">
                        {dashboardData?.system_health?.chromadb_connected ? 'Connected' : 'Disconnected'}
                      </small>
                    </div>
                  </div>
                  <i className="fas fa-vector-square text-info fs-5"></i>
                </div>
              </div>
            </Col>
            
            <Col md={4}>
              <div className="p-3 rounded-3 border border-light border-opacity-50 bg-light bg-opacity-30">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center">
                    <div className={`rounded-circle me-3 shadow-sm ${dashboardData?.system_health?.services_running ? 'bg-success' : 'bg-danger'}`} 
                         style={{ width: '20px', height: '20px' }}></div>
                    <div>
                      <div className="fw-semibold text-dark">Services</div>
                      <small className="text-muted">
                        {dashboardData?.system_health?.services_running ? 'Running' : 'Stopped'}
                      </small>
                    </div>
                  </div>
                  <i className="fas fa-server text-warning fs-5"></i>
                </div>
              </div>
            </Col>
          </Row>
          
          {dashboardData?.vector_stats && (
            <>
              <div className="border-top pt-4">
                <h6 className="fw-semibold mb-4 d-flex align-items-center">
                  <i className="fas fa-chart-pie text-primary me-2"></i>
                  Vector Database Statistics
                </h6>
                <Row className="g-3">
                  <Col md={4}>
                    <div className="text-center p-4 bg-gradient-primary bg-opacity-10 rounded-3 border border-primary border-opacity-25">
                      <div className="h3 text-primary fw-bold mb-2">
                        {dashboardData.vector_stats.document_count}
                      </div>
                      <small className="text-dark fw-medium">Document Chunks</small>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="text-center p-4 bg-gradient-info bg-opacity-10 rounded-3 border border-info border-opacity-25">
                      <div className="h3 text-info fw-bold mb-2">
                        {dashboardData.vector_stats.chat_count}
                      </div>
                      <small className="text-dark fw-medium">Chat Contexts</small>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="text-center p-4 bg-gradient-success bg-opacity-10 rounded-3 border border-success border-opacity-25">
                      <div className="h3 text-success fw-bold mb-2">
                        {dashboardData.vector_stats.embedding_dimension}D
                      </div>
                      <small className="text-dark fw-medium">Embedding Dimension</small>
                    </div>
                  </Col>
                </Row>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </Layout>
  );
};

export default DashboardPage;