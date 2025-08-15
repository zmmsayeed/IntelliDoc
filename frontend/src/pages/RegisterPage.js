import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert, InputGroup } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { user, register } = useAuth();
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

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await register(formData.email, formData.password, formData.name);
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

      <Container className="py-5">
        <Row className="justify-content-center min-vh-100 align-items-center">
          <Col lg={6} md={8} sm={10}>
            <div className="text-center mb-5">
              <div className="bg-gradient-secondary rounded-3 d-inline-flex align-items-center justify-content-center mb-4 shadow-lg" 
                   style={{ width: '80px', height: '80px' }}>
                <i className="fas fa-user-plus text-white" style={{ fontSize: '2rem' }}></i>
              </div>
              <h1 className="display-6 fw-bold mb-3 text-gradient-primary">
                Join IntelliDoc Today
              </h1>
              <p className="text-muted fs-5">
                Create your account and start transforming documents with AI
              </p>
            </div>

            <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
              <Card.Body className="p-5">
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={12} className="mb-4">
                      <Form.Label className="fw-semibold text-dark mb-2">
                        <i className="fas fa-user text-primary me-2"></i>
                        Full Name
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        size="lg"
                        className={`rounded-3 border-2 ${errors.name ? 'border-danger' : 'border-light'}`}
                        isInvalid={!!errors.name}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.name}
                      </Form.Control.Feedback>
                    </Col>

                    <Col md={12} className="mb-4">
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
                    </Col>

                    <Col md={6} className="mb-4">
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
                          placeholder="Create password"
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
                    </Col>

                    <Col md={6} className="mb-4">
                      <Form.Label className="fw-semibold text-dark mb-2">
                        <i className="fas fa-lock text-primary me-2"></i>
                        Confirm Password
                      </Form.Label>
                      <InputGroup size="lg">
                        <Form.Control
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Confirm password"
                          className={`rounded-start-3 border-2 ${errors.confirmPassword ? 'border-danger' : 'border-light'}`}
                          isInvalid={!!errors.confirmPassword}
                        />
                        <Button
                          variant="outline-secondary"
                          className="rounded-end-3 border-2"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          <i className={showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                        </Button>
                        <Form.Control.Feedback type="invalid">
                          {errors.confirmPassword}
                        </Form.Control.Feedback>
                      </InputGroup>
                    </Col>
                  </Row>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-100 btn-gradient-secondary py-3 rounded-3 fw-semibold fs-5 mb-4"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="loading-spinner me-2"></div>
                        Creating your account...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-rocket me-2"></i>
                        Create Account
                      </>
                    )}
                  </Button>

                  <div className="text-center">
                    <p className="text-muted small mb-3">
                      By creating an account, you agree to our{' '}
                      <a href="#" className="text-primary text-decoration-none">Terms of Service</a>
                      {' '}and{' '}
                      <a href="#" className="text-primary text-decoration-none">Privacy Policy</a>.
                    </p>
                    <p className="text-muted mb-3">
                      Already have an account?{' '}
                      <Link to="/login" className="text-primary fw-semibold text-decoration-none">
                        Sign in here
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
              <div className="bg-gradient-secondary" style={{ height: '6px' }}></div>
            </Card>

            {/* Feature highlights */}
            <Row className="mt-5 text-center">
              <Col md={3} className="mb-3">
                <div className="text-primary mb-2">
                  <i className="fas fa-users fs-4"></i>
                </div>
                <small className="text-muted fw-medium">Join 10K+ Users</small>
              </Col>
              <Col md={3} className="mb-3">
                <div className="text-success mb-2">
                  <i className="fas fa-shield-check fs-4"></i>
                </div>
                <small className="text-muted fw-medium">Enterprise Security</small>
              </Col>
              <Col md={3} className="mb-3">
                <div className="text-warning mb-2">
                  <i className="fas fa-clock fs-4"></i>
                </div>
                <small className="text-muted fw-medium">Setup in 2 Minutes</small>
              </Col>
              <Col md={3} className="mb-3">
                <div className="text-info mb-2">
                  <i className="fas fa-medal fs-4"></i>
                </div>
                <small className="text-muted fw-medium">14-Day Free Trial</small>
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default RegisterPage;