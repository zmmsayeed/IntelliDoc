import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, InputGroup } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { user, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
    } catch (error) {
      // Error is handled in the auth context
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-vh-100 bg-light position-relative" data-theme={theme}>
      {/* Theme toggle */}
      <div className="position-absolute top-0 end-0 p-4">
        <Button
          variant="outline-secondary"
          size="sm"
          className="rounded-pill"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          <i className={theme === 'light' ? 'fas fa-moon' : 'fas fa-sun'}></i>
        </Button>
      </div>

      <Container className="d-flex align-items-center justify-content-center min-vh-100">
        <Row className="w-100 justify-content-center">
          <Col lg={5} md={7} sm={9}>
            <div className="text-center mb-5">
              <div className="bg-gradient-primary rounded-3 d-inline-flex align-items-center justify-content-center mb-4 shadow-lg" 
                   style={{ width: '80px', height: '80px' }}>
                <i className="fas fa-brain text-white" style={{ fontSize: '2rem' }}></i>
              </div>
              <h1 className="display-6 fw-bold mb-3 text-gradient-primary">
                Welcome Back to IntelliDoc
              </h1>
              <p className="text-muted fs-5">
                Sign in to access your AI-powered document intelligence platform
              </p>
            </div>

            <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
              <Card.Body className="p-5">
                <Form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <Form.Label className="fw-semibold text-dark mb-2">
                      <i className="fas fa-envelope text-primary me-2"></i>
                      Email Address
                    </Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email address"
                      size="lg"
                      className={`rounded-3 border-2 ${errors.email ? 'border-danger' : 'border-light'}`}
                      isInvalid={!!errors.email}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.email}
                    </Form.Control.Feedback>
                  </div>

                  <div className="mb-4">
                    <Form.Label className="fw-semibold text-dark mb-2">
                      <i className="fas fa-lock text-primary me-2"></i>
                      Password
                    </Form.Label>
                    <InputGroup size="lg">
                      <Form.Control
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        className={`rounded-start-3 border-2 ${errors.password ? 'border-danger' : 'border-light'}`}
                        isInvalid={!!errors.password}
                      />
                      <Button
                        variant="outline-secondary"
                        className="rounded-end-3 border-2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                      </Button>
                      <Form.Control.Feedback type="invalid">
                        {errors.password}
                      </Form.Control.Feedback>
                    </InputGroup>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-100 btn-gradient-primary py-3 rounded-3 fw-semibold fs-5 mb-4"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="loading-spinner me-2"></div>
                        Signing you in...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt me-2"></i>
                        Sign In
                      </>
                    )}
                  </Button>

                  <div className="text-center">
                    <p className="text-muted mb-3">
                      Don't have an account?{' '}
                      <Link to="/register" className="text-primary fw-semibold text-decoration-none">
                        Create one here
                      </Link>
                    </p>
                    <Link to="/" className="text-muted text-decoration-none small">
                      <i className="fas fa-arrow-left me-2"></i>
                      Back to Homepage
                    </Link>
                  </div>
                </Form>
              </Card.Body>
              
              {/* Decorative gradient footer */}
              <div className="bg-gradient-primary" style={{ height: '6px' }}></div>
            </Card>

            {/* Feature highlights */}
            <Row className="mt-5 text-center">
              <Col md={4} className="mb-3">
                <div className="text-primary mb-2">
                  <i className="fas fa-shield-alt fs-3"></i>
                </div>
                <small className="text-muted fw-medium">Secure & Private</small>
              </Col>
              <Col md={4} className="mb-3">
                <div className="text-success mb-2">
                  <i className="fas fa-bolt fs-3"></i>
                </div>
                <small className="text-muted fw-medium">Lightning Fast</small>
              </Col>
              <Col md={4} className="mb-3">
                <div className="text-info mb-2">
                  <i className="fas fa-brain fs-3"></i>
                </div>
                <small className="text-muted fw-medium">AI-Powered</small>
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default LoginPage;