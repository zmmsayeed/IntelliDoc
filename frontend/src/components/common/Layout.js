import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Container, Navbar, Nav, NavDropdown, Offcanvas, Button } from 'react-bootstrap';

const Layout = ({ children }) => {
  const [showSidebar, setShowSidebar] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: 'fas fa-tachometer-alt' },
    { name: 'Documents', href: '/documents', icon: 'fas fa-file-alt' },
    { name: 'Chat', href: '/chat', icon: 'fas fa-comments' },
    { name: 'Profile', href: '/profile', icon: 'fas fa-user' },
  ];

  const handleLogout = () => {
    logout();
    setShowSidebar(false);
  };

  const isCurrentPath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleCloseSidebar = () => setShowSidebar(false);
  const handleShowSidebar = () => setShowSidebar(true);

  return (
    <div className="min-vh-100 bg-light" data-theme={theme}>
      {/* Top Navigation Bar */}
      <Navbar className="navbar-glass fixed-top shadow-sm" expand="lg">
        <Container fluid>
          <Button
            variant="outline-primary"
            className="d-lg-none me-3 rounded-pill"
            onClick={handleShowSidebar}
          >
            <i className="fas fa-bars"></i>
          </Button>
          
          <Navbar.Brand as={Link} to="/dashboard" className="fw-bold fs-4">
            <i className="fas fa-brain text-gradient-primary me-2"></i>
            <span className="text-gradient-primary">IntelliDoc</span>
          </Navbar.Brand>

          <div className="d-flex align-items-center gap-3">
            <Button
              variant="outline-secondary"
              size="sm"
              className="rounded-pill"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              <i className={theme === 'light' ? 'fas fa-moon' : 'fas fa-sun'}></i>
            </Button>

            <NavDropdown
              title={
                <>
                  <div className="bg-gradient-primary rounded-circle d-inline-flex align-items-center justify-content-center me-2" 
                       style={{ width: '32px', height: '32px' }}>
                    <i className="fas fa-user text-white small"></i>
                  </div>
                  <span className="fw-medium text-dark">{user?.name || 'User'}</span>
                </>
              }
              id="user-nav-dropdown"
              align="end"
              className="border-0 d-flex align-items-center"
            >
              <NavDropdown.Item as={Link} to="/profile" className="py-2">
                <i className="fas fa-user me-2 text-primary"></i>Profile
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout} className="py-2 text-danger">
                <i className="fas fa-sign-out-alt me-2"></i>Logout
              </NavDropdown.Item>
            </NavDropdown>
          </div>
        </Container>
      </Navbar>

      <div className="d-flex" style={{ marginTop: '70px' }}>
        {/* Desktop Sidebar */}
        <div className="d-none d-lg-flex flex-column sidebar-glass border-end shadow-sm" style={{ width: '280px', minHeight: 'calc(100vh - 70px)' }}>
          <div className="p-4">
            <div className="mb-4">
              <small className="text-muted fw-semibold text-uppercase tracking-wider">Navigation</small>
            </div>
            <Nav className="flex-column gap-2">
              {navigation.map((item) => (
                <Nav.Link
                  key={item.name}
                  as={Link}
                  to={item.href}
                  className={`px-3 py-3 rounded-3 text-decoration-none d-flex align-items-center transition ${
                    isCurrentPath(item.href) 
                      ? 'bg-gradient-primary text-white shadow-sm' 
                      : 'text-dark hover-bg-light'
                  }`}
                  onClick={handleCloseSidebar}
                >
                  <i className={`${item.icon} me-3 fs-5`}></i>
                  <span className="fw-medium">{item.name}</span>
                </Nav.Link>
              ))}
            </Nav>
          </div>
          
          {/* Sidebar Footer */}
          <div className="mt-auto p-4 border-top">
            <div className="d-flex align-items-center">
              <div className="bg-gradient-primary rounded-circle d-flex align-items-center justify-content-center me-3" 
                   style={{ width: '40px', height: '40px' }}>
                <i className="fas fa-user text-white"></i>
              </div>
              <div className="flex-grow-1">
                <div className="fw-semibold text-dark">{user?.name}</div>
                <small className="text-muted">{user?.email}</small>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sidebar */}
        <Offcanvas show={showSidebar} onHide={handleCloseSidebar} placement="start" className="shadow-lg">
          <Offcanvas.Header closeButton className="border-bottom">
            <Offcanvas.Title className="fw-bold">
              <i className="fas fa-brain text-gradient-primary me-2"></i>
              <span className="text-gradient-primary">IntelliDoc</span>
            </Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="p-0">
            <div className="p-4">
              <Nav className="flex-column gap-2">
                {navigation.map((item) => (
                  <Nav.Link
                    key={item.name}
                    as={Link}
                    to={item.href}
                    className={`px-3 py-3 rounded-3 text-decoration-none d-flex align-items-center ${
                      isCurrentPath(item.href) 
                        ? 'bg-gradient-primary text-white shadow-sm' 
                        : 'text-dark'
                    }`}
                    onClick={handleCloseSidebar}
                  >
                    <i className={`${item.icon} me-3 fs-5`}></i>
                    <span className="fw-medium">{item.name}</span>
                  </Nav.Link>
                ))}
              </Nav>
            </div>
            
            <div className="mt-auto p-4 border-top">
              <div className="d-flex align-items-center">
                <div className="bg-gradient-primary rounded-circle d-flex align-items-center justify-content-center me-3" 
                     style={{ width: '40px', height: '40px' }}>
                  <i className="fas fa-user text-white"></i>
                </div>
                <div>
                  <div className="fw-semibold">{user?.name}</div>
                  <small className="text-muted">{user?.email}</small>
                </div>
              </div>
            </div>
          </Offcanvas.Body>
        </Offcanvas>

        {/* Main Content */}
        <main className="flex-grow-1 p-4" style={{ minHeight: 'calc(100vh - 70px)' }}>
          <Container fluid className="animate-fade-in">
            {children}
          </Container>
        </main>
      </div>
    </div>
  );
};

export default Layout;