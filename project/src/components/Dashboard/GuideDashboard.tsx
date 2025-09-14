import React, { useEffect, useState } from 'react';
import {
  Container,
  Badge,
  Dropdown,
  Button,
  Spinner,
  Toast,
  ToastContainer,
  Modal,
  Form
} from 'react-bootstrap';
import { Bell } from 'lucide-react';
import axios from 'axios';
import ManageSessions from './Guide/ManageSessions';
import { useAuth } from '../../context/AuthContext';

interface SessionRequest {
  id: string;
  programmer_name: string;
  programmer_email: string;
  created_at: string;
}

const GuideDashboard: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SessionRequest[]>([]);
  const [loadingRequestId, setLoadingRequestId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal state for Google Meet link
  const [showModal, setShowModal] = useState(false);
  const [meetLink, setMeetLink] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<SessionRequest | null>(null);

  // Fetch session requests
  const fetchRequests = async () => {
    try {
      const res = await axios.get(`/api/session-requests/${user?.id}`);
      setRequests(res.data.requests);
    } catch (err) {
      console.error("Error fetching session requests", err);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [user?.id]);

  // Approve/Reject session
  const handleRequestAction = async (requestId: string, action: "approved" | "rejected") => {
    setLoadingRequestId(requestId);
    try {
      const request = requests.find((r) => r.id === requestId);

      // 1️⃣ If approving → open modal for Meet link
      if (action === "approved" && request) {
        setSelectedRequest(request);
        setShowModal(true);
      } else {
        // Direct reject
        await axios.post(`/api/session-requests/${requestId}/update`, { status: action });
        setToastMessage(`Request ${action} and programmer notified!`);
        fetchRequests();
      }
    } catch (err) {
      console.error("Error updating request", err);
      setToastMessage("Something went wrong. Try again.");
    } finally {
      setLoadingRequestId(null);
    }
  };

  // Finalize approval → create session
  const handleCreateSession = async () => {
    if (!selectedRequest) return;

    try {
      // 1️⃣ Update request status
      await axios.post(`/api/session-requests/${selectedRequest.id}/update`, { status: "approved" });

      // 2️⃣ Create session with Meet link
      await axios.post("/api/sessions", {
        title: "1:1 Mentorship Session",
        description: `Q&A with ${selectedRequest.programmer_name}`,
        meeting_link: meetLink,
        guide_id: user?.id,
        programmer_email: selectedRequest.programmer_email
      });

      // 3️⃣ Notify programmer
      await axios.post("/api/notify-programmer", {
        email: selectedRequest.programmer_email,
        name: selectedRequest.programmer_name,
        status: "approved",
        guideName: user?.name,
        meetingLink: meetLink
      });

      setToastMessage("Session created and programmer notified!");
      setShowModal(false);
      setMeetLink('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      console.error("Error creating session", err);
      setToastMessage("Failed to create session.");
    }
  };

  return (
    <Container>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-primary mb-1">Guide Dashboard</h2>
          <p className="text-muted">Create and manage 1:1 Q&A sessions</p>
        </div>

        {/* Session Requests Notification */}
        <Dropdown align="end">
          <Dropdown.Toggle variant="light" id="dropdown-basic">
            <Bell size={24} />
            {requests.length > 0 && <Badge bg="danger">{requests.length}</Badge>}
          </Dropdown.Toggle>

          <Dropdown.Menu style={{ minWidth: "300px" }}>
            {requests.length === 0 ? (
              <Dropdown.Item>No new session requests</Dropdown.Item>
            ) : (
              requests.map((req) => (
                <Dropdown.Item key={req.id} className="d-flex flex-column align-items-start">
                  <div>
                    <strong>{req.programmer_name}</strong> ({req.programmer_email})
                    <br />
                    <small className="text-muted">{new Date(req.created_at).toLocaleString()}</small>
                  </div>
                  <div className="mt-2 d-flex gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      disabled={loadingRequestId === req.id}
                      onClick={() => handleRequestAction(req.id, "approved")}
                    >
                      {loadingRequestId === req.id ? <Spinner size="sm" animation="border" /> : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={loadingRequestId === req.id}
                      onClick={() => handleRequestAction(req.id, "rejected")}
                    >
                      {loadingRequestId === req.id ? <Spinner size="sm" animation="border" /> : "Reject"}
                    </Button>
                  </div>
                </Dropdown.Item>
              ))
            )}
          </Dropdown.Menu>
        </Dropdown>
      </div>

      {/* Manage Q&A Sessions */}
      <ManageSessions guideId={user?.id} />

      {/* Modal for Meet link */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Enter Google Meet Link</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Meeting Link</Form.Label>
              <Form.Control
                type="url"
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCreateSession} disabled={!meetLink}>
            Confirm & Create
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast Notification */}
      <ToastContainer position="bottom-end" className="p-3">
        <Toast
          onClose={() => setToastMessage(null)}
          show={!!toastMessage}
          delay={4000}
          autohide
        >
          <Toast.Body>{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default GuideDashboard;
