import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Shield, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <Navbar bg="white" expand="lg" className="shadow-sm">
      <Container>
        <Navbar.Brand className="d-flex align-items-center text-primary">
          <Shield className="shield-icon" />
          Aegis
        </Navbar.Brand>
        
        {user && (
          <Nav className="ms-auto d-flex align-items-center">
            <span className="me-3 text-muted">
              Welcome, {user.name} ({user.role})
            </span>
            <Button variant="outline-primary" size="sm" onClick={handleLogout}>
              <LogOut size={16} className="me-2" />
              Logout
            </Button>
          </Nav>
        )}
      </Container>
    </Navbar>
  );
};

export default Header;