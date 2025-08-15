import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { Container, Row, Col, Card, Button, Navbar, Nav } from 'react-bootstrap';

const features = [
  {
    name: 'Smart Document Processing',
    description: 'Upload any document type and get instant AI-powered analysis, summaries, and key insights extraction.',
    icon: 'fas fa-file-alt',
    color: 'primary'
  },
  {
    name: 'Intelligent Q&A',
    description: 'Ask questions about your documents in natural language and get accurate, context-aware answers.',
    icon: 'fas fa-comments',
    color: 'success'
  },
  {
    name: 'Semantic Search',
    description: 'Find relevant information across all your documents using advanced vector similarity search.',
    icon: 'fas fa-search',
    color: 'info'
  },
  {
    name: 'Real-time Analytics',
    description: 'Track document processing metrics, usage patterns, and system performance in real-time.',
    icon: 'fas fa-chart-bar',
    color: 'warning'
  },
  {
    name: 'Secure & Private',
    description: 'Your documents are processed securely with enterprise-grade security and privacy controls.',
    icon: 'fas fa-shield-alt',
    color: 'danger'
  },
  {
    name: 'Multi-format Support',
    description: 'Support for PDFs, Word documents, text files, and images with OCR capabilities.',
    icon: 'fas fa-cloud-upload-alt',
    color: 'secondary'
  },
];

const stats = [
  { label: 'Documents Processed', value: '10,000+' },
  { label: 'Average Processing Time', value: '<30s' },
  { label: 'Accuracy Rate', value: '95%+' },
  { label: 'Supported Formats', value: '6+' },
];

const LandingPage = () => {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-3"></div>
          <h5 className="text-muted">Loading IntelliDoc...</h5>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-vh-100">
      {/* Navigation */}
      <Navbar expand="lg" className="navbar-glass fixed-top shadow-sm">
        <Container>
          <Navbar.Brand as={Link} to="/" className="fw-bold fs-3">
            <i className="fas fa-brain text-gradient-primary me-2"></i>
            <span className="text-gradient-primary">IntelliDoc</span>
          </Navbar.Brand>
          
          <Navbar.Toggle aria-controls="navbar-nav" />
          <Navbar.Collapse id="navbar-nav">
            <Nav className="ms-auto align-items-center">
              <Nav.Item className="me-3">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={toggleTheme}
                  className="rounded-pill"
                  title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                  <i className={theme === 'light' ? 'fas fa-moon' : 'fas fa-sun'}></i>
                </Button>
              </Nav.Item>
              <Nav.Item className="me-3">
                <Nav.Link as={Link} to="/login" className="fw-medium">
                  Sign In
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Button as={Link} to="/register" className="btn-gradient-primary px-4 rounded-pill">
                  <i className="fas fa-rocket me-2"></i>Get Started
                </Button>
              </Nav.Item>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Hero Section */}
      <div className="bg-gradient-primary text-white position-relative overflow-hidden" style={{ paddingTop: '100px', paddingBottom: '80px' }}>
        <Container className="position-relative">
          <Row className="align-items-center min-vh-75">
            <Col lg={6} className="animate-fade-in">
              <div className="mb-4">
                <span className="badge bg-white text-primary px-3 py-2 rounded-pill fw-medium mb-4">
                  <i className="fas fa-sparkles me-2"></i>AI-Powered Platform
                </span>
              </div>
              <h1 className="display-3 fw-bold mb-4 lh-1">
                Transform Documents into 
                <span className="d-block text-warning">Intelligent Insights</span>
              </h1>
              <p className="lead mb-5 opacity-90">
                Upload, analyze, and interact with your documents using cutting-edge AI technology. 
                Get instant answers, summaries, and actionable intelligence from any document type.
              </p>
              <div className="d-flex flex-column flex-sm-row gap-3 mb-5">
                <Button 
                  as={Link} 
                  to="/register" 
                  size="lg" 
                  className="bg-white text-primary border-0 px-5 fw-semibold rounded-pill"
                >
                  <i className="fas fa-rocket me-2"></i>Start Free Trial
                </Button>
                <Button 
                  variant="outline-light" 
                  size="lg" 
                  href="#features"
                  className="px-5 fw-semibold rounded-pill"
                >
                  <i className="fas fa-play me-2"></i>Learn More
                </Button>
              </div>
              <div className="d-flex align-items-center text-light opacity-75">
                <i className="fas fa-check-circle me-2"></i>
                <small>No credit card required • 14-day free trial</small>
              </div>
            </Col>
            <Col lg={6}>
              <div className="text-center">
                <Card className="border-0 shadow-lg bg-white bg-opacity-10 backdrop-blur">
                  <Card.Body className="p-5">
                    <div className="bg-gradient-success rounded-circle d-inline-flex align-items-center justify-content-center mb-4" 
                         style={{ width: '120px', height: '120px' }}>
                      <i className="fas fa-file-alt text-white" style={{ fontSize: '3rem' }}></i>
                    </div>
                    <h4 className="text-white fw-bold mb-3">Smart Document Processing</h4>
                    <p className="text-white opacity-90 mb-4">
                      Upload • Analyze • Query • Extract Insights
                    </p>
                    <div className="d-flex justify-content-around text-center">
                      <div>
                        <div className="h5 text-warning fw-bold mb-1">10K+</div>
                        <small className="text-white opacity-75">Documents</small>
                      </div>
                      <div>
                        <div className="h5 text-warning fw-bold mb-1">&lt;30s</div>
                        <small className="text-white opacity-75">Processing</small>
                      </div>
                      <div>
                        <div className="h5 text-warning fw-bold mb-1">95%+</div>
                        <small className="text-white opacity-75">Accuracy</small>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            </Col>
          </Row>
        </Container>
        
        {/* Background decoration */}
        <div className="position-absolute top-0 end-0 opacity-10">
          <i className="fas fa-brain" style={{ fontSize: '20rem' }}></i>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-light py-5">
        <Container>
          <Row className="text-center">
            {stats.map((stat, index) => (
              <Col key={stat.label} md={3} sm={6} className="mb-4">
                <Card className="border-0 bg-transparent text-center">
                  <Card.Body>
                    <div className="display-4 fw-bold text-primary mb-2">{stat.value}</div>
                    <div className="text-muted fw-medium">{stat.label}</div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </div>

      {/* Features Section */}
      <div id="features" className="py-5">
        <Container>
          <Row className="text-center mb-5">
            <Col lg={8} className="mx-auto">
              <span className="badge bg-primary text-white px-3 py-2 rounded-pill fw-medium mb-3">
                <i className="fas fa-star me-2"></i>Powerful Features
              </span>
              <h2 className="display-5 fw-bold mb-4">
                Everything you need for 
                <span className="text-gradient-primary d-block">Document Intelligence</span>
              </h2>
              <p className="lead text-muted">
                Our comprehensive platform provides all the tools you need to extract value 
                from your documents using cutting-edge AI technology.
              </p>
            </Col>
          </Row>
          
          <Row className="g-4">
            {features.map((feature, index) => (
              <Col key={feature.name} lg={4} md={6} className="mb-4">
                <Card className="h-100 border-0 shadow-sm card-hover">
                  <Card.Body className="p-4 text-center">
                    <div className={`bg-gradient-${feature.color} rounded-circle d-inline-flex align-items-center justify-content-center mb-4`} 
                         style={{ width: '80px', height: '80px' }}>
                      <i className={`${feature.icon} text-white`} style={{ fontSize: '2rem' }}></i>
                    </div>
                    <h5 className="fw-bold mb-3">{feature.name}</h5>
                    <p className="text-muted mb-0">{feature.description}</p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-secondary text-white py-5">
        <Container>
          <Row className="text-center">
            <Col lg={8} className="mx-auto">
              <div className="bg-white rounded-circle d-inline-flex align-items-center justify-content-center mb-4" 
                   style={{ width: '80px', height: '80px' }}>
                <i className="fas fa-rocket text-primary" style={{ fontSize: '2rem' }}></i>
              </div>
              <h2 className="display-5 fw-bold mb-4">
                Ready to transform your documents?
              </h2>
              <p className="lead mb-5 opacity-90">
                Start processing your documents with AI-powered intelligence today. 
                No credit card required - just intelligent document processing.
              </p>
              <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center mb-4">
                <Button
                  as={Link}
                  to="/register"
                  size="lg"
                  className="bg-white text-primary border-0 px-5 fw-semibold rounded-pill"
                >
                  <i className="fas fa-rocket me-2"></i>Get Started Free
                </Button>
                <Button
                  as={Link}
                  to="/login"
                  variant="outline-light"
                  size="lg"
                  className="px-5 fw-semibold rounded-pill"
                >
                  <i className="fas fa-sign-in-alt me-2"></i>Sign In
                </Button>
              </div>
              <small className="text-light opacity-75">
                <i className="fas fa-check-circle me-2"></i>
                14-day free trial • No credit card required • Cancel anytime
              </small>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Footer */}
      <footer className="bg-dark text-white py-4">
        <Container>
          <Row className="align-items-center">
            <Col md={6}>
              <div className="d-flex align-items-center">
                <i className="fas fa-brain text-primary me-2 fs-4"></i>
                <span className="fw-bold">IntelliDoc</span>
              </div>
            </Col>
            <Col md={6} className="text-md-end">
              <small className="text-muted">
                © 2024 IntelliDoc. Built with AI for the future of document processing.
              </small>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  );
};

export default LandingPage;