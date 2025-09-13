import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Nav } from 'react-bootstrap';
import { Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'programmer'
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate(`/${user.role}`);
    }
  }, [user, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let success = false;
      
      if (isLogin) {
        success = await login(formData.email, formData.password, formData.role);
      } else {
        success = await register(formData.name, formData.email, formData.password, formData.role);
      }

      if (success) {
        navigate(`/${formData.role}`);
      } else {
        setError(isLogin ? 'Invalid credentials' : 'Registration failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="hero-section">
      <Container>
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card className="shadow-lg">
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <Shield size={48} className="text-primary mb-3" />
                  <h2 className="mb-3">Welcome to Aegis</h2>
                  <p className="text-muted">
                    AI-powered job portal connecting talent with opportunity
                  </p>
                </div>

                <Nav variant="pills" className="justify-content-center mb-4">
                  <Nav.Item>
                    <Nav.Link 
                      active={isLogin} 
                      onClick={() => setIsLogin(true)}
                    >
                      Login
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link 
                      active={!isLogin} 
                      onClick={() => setIsLogin(false)}
                    >
                      Register
                    </Nav.Link>
                  </Nav.Item>
                </Nav>

                {error && <Alert variant="danger">{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                  {!isLogin && (
                    <Form.Group className="mb-3">
                      <Form.Label>Full Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required={!isLogin}
                        placeholder="Enter your full name"
                      />
                    </Form.Group>
                  )}

                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter your email"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter your password"
                      minLength={6}
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Role</Form.Label>
                    <Form.Select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                    >
                      <option value="programmer">Programmer</option>
                      <option value="recruiter">Recruiter</option>
                      <option value="guide">Guide</option>
                    </Form.Select>
                  </Form.Group>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-100"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="loading-spinner me-2"></span>
                        {isLogin ? 'Logging in...' : 'Registering...'}
                      </>
                    ) : (
                      isLogin ? 'Login' : 'Register'
                    )}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default AuthPage;