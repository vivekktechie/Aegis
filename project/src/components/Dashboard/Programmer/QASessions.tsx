import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Alert, Button } from 'react-bootstrap';
import { Video, Calendar, User, ExternalLink } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  description: string;
  meetingLink: string;
  guideName: string;
  createdAt: string;
}

const QASessions: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
      } else {
        setError('Failed to load sessions');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = (meetingLink: string) => {
    window.open(meetingLink, '_blank');
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="loading-spinner"></div>
        <p className="mt-3 text-muted">Loading Q&A sessions...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div>
      <h4 className="mb-4">Available Q&A Sessions</h4>
      
      {sessions.length === 0 ? (
        <Alert variant="info">
          <Video className="me-2" />
          No Q&A sessions available at the moment. Check back later!
        </Alert>
      ) : (
        <Row>
          {sessions.map((session) => (
            <Col lg={6} key={session.id} className="mb-4">
              <Card className="session-card h-100">
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex align-items-start mb-3">
                    <Video className="text-primary me-2 mt-1" size={24} />
                    <div className="flex-grow-1">
                      <h5 className="mb-1">{session.title}</h5>
                      <p className="text-muted small mb-0">{session.description}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex align-items-center text-muted mb-2">
                      <User size={16} className="me-2" />
                      <span>Guide: {session.guideName}</span>
                    </div>
                    <div className="d-flex align-items-center text-muted">
                      <Calendar size={16} className="me-2" />
                      <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="mt-auto"
                    onClick={() => handleJoinSession(session.meetingLink)}
                  >
                    <ExternalLink size={16} className="me-2" />
                    Join Session
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default QASessions;