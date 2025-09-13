import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Alert, Table } from 'react-bootstrap';
import { Plus, Video, Trash2, ExternalLink, Calendar } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface Session {
  id: string;
  title: string;
  description: string;
  meetingLink: string;
  createdAt: string;
}

const ManageSessions: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meetingLink: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/sessions/guide/${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim() || !formData.meetingLink.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:5000/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          guideId: user?.id
        }),
      });

      if (response.ok) {
        setSuccess('Q&A session created successfully!');
        setFormData({ title: '', description: '', meetingLink: '' });
        fetchSessions();
      } else {
        setError('Failed to create session. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Session deleted successfully!');
        fetchSessions();
      } else {
        setError('Failed to delete session.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleOpenMeeting = (meetingLink: string) => {
    window.open(meetingLink, '_blank');
  };

  return (
    <div>
      <Row>
        <Col lg={4}>
          <Card>
            <Card.Body>
              <h5 className="mb-3">Create Q&A Session</h5>
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Session Title</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., React Best Practices"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of the session topics..."
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Meeting Link</Form.Label>
                  <Form.Control
                    type="url"
                    name="meetingLink"
                    value={formData.meetingLink}
                    onChange={handleInputChange}
                    placeholder="https://meet.google.com/..."
                    required
                  />
                  <Form.Text className="text-muted">
                    Google Meet, Zoom, or any video meeting link
                  </Form.Text>
                </Form.Group>

                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  className="w-100"
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner me-2"></span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="me-2" />
                      Create Session
                    </>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0 d-flex align-items-center">
                <Video size={20} className="me-2" />
                Your Q&A Sessions ({sessions.length})
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              {sessions.length === 0 ? (
                <div className="text-center p-5">
                  <Video size={48} className="text-muted mb-3" />
                  <p className="text-muted">No Q&A sessions created yet.</p>
                  <p className="text-muted">Create your first session to start helping programmers!</p>
                </div>
              ) : (
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Session Title</th>
                      <th>Description</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.id}>
                        <td>
                          <strong>{session.title}</strong>
                        </td>
                        <td>
                          <div style={{ maxWidth: '300px' }}>
                            {session.description.length > 100
                              ? `${session.description.substring(0, 100)}...`
                              : session.description
                            }
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <Calendar size={14} className="me-2 text-muted" />
                            <small className="text-muted">
                              {new Date(session.createdAt).toLocaleDateString()}
                            </small>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleOpenMeeting(session.meetingLink)}
                              title="Open meeting"
                            >
                              <ExternalLink size={14} />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(session.id)}
                              title="Delete session"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ManageSessions;