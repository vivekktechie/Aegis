import React, { useState, useEffect } from "react";
import { Container, Nav, Tab, Badge, Button, Row, Col, Card, Alert } from "react-bootstrap";
import { FaBell } from "react-icons/fa";
import { Video, Calendar, User, ExternalLink } from "lucide-react";
import Companies from "./Programmer/Companies";
import ResumeAnalyzer from "./Programmer/ResumeAnalyzer";
import JobFinding from "./Programmer/JobFinding";
import RequestSession from "./Programmer/RequestSession";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

interface Notification {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface Session {
  id: string;
  title: string;
  description: string;
  meetingLink: string;
  guideName: string;
  createdAt: string;
}

const ProgrammerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("companies");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState("");

  // ------------------ Notifications ------------------
  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
      const res = await axios.get(`/api/notifications/${user.id}`);
      setNotifications(
        res.data.notifications.map((n: any) => ({
          id: n.id,
          message: n.message,
          read: n.is_read === 1,
          created_at: n.created_at,
        }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // every 15s
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleNotificationClick = async (n: Notification) => {
    try {
      await axios.post(`/api/notifications/${n.id}/read`);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === n.id ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      console.error(err);
    }
    setShowNotifications(false);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ------------------ Sessions ------------------
  const fetchSessions = async () => {
    setLoadingSessions(true);
    setSessionsError("");
    try {
      const res = await axios.get("/api/sessions");
      setSessions(res.data.sessions);
    } catch (err) {
      console.error(err);
      setSessionsError("Failed to load Q&A sessions.");
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 30000); // every 30s
    return () => clearInterval(interval);
  }, []);

  const openMeeting = (link: string) => {
    window.open(link, "_blank");
  };

  // ------------------ Q&A Sessions Component ------------------
  const QASessions = () => {
    if (loadingSessions) return <p>Loading Q&A sessions...</p>;
    if (sessionsError) return <Alert variant="danger">{sessionsError}</Alert>;
    if (!sessions || sessions.length === 0)
      return <Alert variant="info">No Q&A sessions available at the moment.</Alert>;

    return (
      <Row>
        {sessions.map((session) => (
          <Col lg={6} key={session.id} className="mb-4">
            <Card className="h-100">
              <Card.Body className="d-flex flex-column">
                <div className="d-flex align-items-start mb-2">
                  <Video className="text-primary me-2 mt-1" size={24} />
                  <div>
                    <h5 className="mb-1">{session.title}</h5>
                    <p className="text-muted small mb-0">{session.description}</p>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="d-flex align-items-center text-muted mb-1">
                    <User size={16} className="me-2" />
                    <span>Guide: {session.guideName}</span>
                  </div>
                  <div className="d-flex align-items-center text-muted">
                    <Calendar size={16} className="me-2" />
                    <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button variant="primary" className="mt-auto" onClick={() => openMeeting(session.meetingLink)}>
                  <ExternalLink size={16} className="me-2" />
                  Join Session
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  // ------------------ Render ------------------
  return (
    <Container>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-primary mb-1">Programmer Dashboard</h2>
          <p className="text-muted">Explore opportunities and join Q&A sessions</p>
        </div>

        {/* Notification Bell */}
        <div style={{ position: "relative" }}>
          <FaBell size={22} style={{ cursor: "pointer" }} onClick={() => setShowNotifications(!showNotifications)} />
          {unreadCount > 0 && (
            <Badge bg="danger" pill style={{ position: "absolute", top: "-8px", right: "-8px" }}>
              {unreadCount}
            </Badge>
          )}

          {showNotifications && (
            <div className="border rounded p-3 mt-2" style={{ background: "#f8f9fa", width: "300px", position: "absolute", right: 0, zIndex: 10 }}>
              <h6>Notifications</h6>
              {unreadCount > 0 ? (
                <ul className="list-unstyled mb-0">
                  {notifications.filter((n) => !n.read).map((n) => (
                    <li key={n.id} className="mb-2" style={{ cursor: "pointer" }} onClick={() => handleNotificationClick(n)}>
                      🔔 {n.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mb-0">No new notifications</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || "companies")}>
        <Nav variant="tabs" className="mb-3">
          <Nav.Item><Nav.Link eventKey="companies">Companies</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link eventKey="JobFinder">Job Finder</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link eventKey="request">Request Session</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link eventKey="sessions">Q&A Sessions</Nav.Link></Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="companies"><Companies /></Tab.Pane>
          <Tab.Pane eventKey="JobFinder"><JobFinding /></Tab.Pane>
          <Tab.Pane eventKey="request"><RequestSession /></Tab.Pane>
          <Tab.Pane eventKey="sessions"><QASessions /></Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </Container>
  );
};

export default ProgrammerDashboard;



// import React, { useState, useEffect } from "react";
// import { Container, Nav, Tab, Badge } from "react-bootstrap";
// import { FaBell } from "react-icons/fa";
// import Companies from "./Programmer/Companies";
// import ResumeAnalyzer from "./Programmer/ResumeAnalyzer";
// import QASessions from "./Programmer/QASessions";
// import JobFinding from "./Programmer/JobFinding";
// import RequestSession from "./Programmer/RequestSession";
// import axios from "axios";
// import { useAuth } from "../../context/AuthContext";

// interface Notification {
//   id: string;
//   message: string;
//   read: boolean;
//   created_at: string;
// }

// const ProgrammerDashboard: React.FC = () => {
//   const { user } = useAuth();
//   const [activeTab, setActiveTab] = useState("companies");
//   const [notifications, setNotifications] = useState<Notification[]>([]);
//   const [showNotifications, setShowNotifications] = useState(false);

//   // Fetch notifications from backend
//   const fetchNotifications = async () => {
//     if (!user?.id) return;
//     try {
//       const res = await axios.get(`/api/notifications/${user.id}`);
//       setNotifications(
//         res.data.notifications.map((n: any) => ({
//           id: n.id,
//           message: n.message,
//           read: n.is_read === 1,
//           created_at: n.created_at
//         }))
//       );
//     } catch (err) {
//       console.error("Error fetching notifications", err);
//     }
//   };

//   useEffect(() => {
//     fetchNotifications();
//     const interval = setInterval(fetchNotifications, 15000); // refresh every 15s
//     return () => clearInterval(interval);
//   }, [user?.id]);

//   // Handle notification click
//   const handleNotificationClick = async (n: Notification) => {
//     // For now, just mark as read locally
//     setNotifications((prev) =>
//       prev.map((notif) =>
//         notif.id === n.id ? { ...notif, read: true } : notif
//       )
//     );
//     setShowNotifications(false);

//     // TODO: Add backend endpoint to mark notification as read
//     // await axios.post(`/api/notifications/${n.id}/read`);
//   };

//   const unreadCount = notifications.filter((n) => !n.read).length;

//   return (
//     <Container>
//       {/* Header */}
//       <div className="d-flex justify-content-between align-items-center mb-4">
//         <div>
//           <h2 className="text-primary mb-1">Programmer Dashboard</h2>
//           <p className="text-muted">Explore opportunities and analyze your profile</p>
//         </div>

//         {/* Notification Bell */}
//         <div style={{ position: "relative" }}>
//           <FaBell
//             size={22}
//             style={{ cursor: "pointer" }}
//             onClick={() => setShowNotifications(!showNotifications)}
//           />
//           {unreadCount > 0 && (
//             <Badge
//               bg="danger"
//               pill
//               style={{ position: "absolute", top: "-8px", right: "-8px" }}
//             >
//               {unreadCount}
//             </Badge>
//           )}

//           {/* Notifications Dropdown */}
//           {showNotifications && (
//             <div
//               className="border rounded p-3 mt-2"
//               style={{
//                 background: "#f8f9fa",
//                 width: "300px",
//                 position: "absolute",
//                 right: 0,
//                 zIndex: 10
//               }}
//             >
//               <h6>Notifications</h6>
//               {unreadCount > 0 ? (
//                 <ul className="list-unstyled mb-0">
//                   {notifications
//                     .filter((n) => !n.read)
//                     .map((n) => (
//                       <li
//                         key={n.id}
//                         className="mb-2"
//                         style={{ cursor: "pointer" }}
//                         onClick={() => handleNotificationClick(n)}
//                       >
//                         🔔 {n.message}
//                       </li>
//                     ))}
//                 </ul>
//               ) : (
//                 <p className="text-muted mb-0">No new notifications</p>
//               )}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Tabs */}
//       <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || "companies")}>
//         <Nav variant="tabs" className="mb-3">
//           <Nav.Item>
//             <Nav.Link eventKey="companies">Companies</Nav.Link>
//           </Nav.Item>
//           <Nav.Item>
//             <Nav.Link eventKey="JobFinder">Job Finder</Nav.Link>
//           </Nav.Item>
//           <Nav.Item>
//             <Nav.Link eventKey="request">Request Session</Nav.Link>
//           </Nav.Item>
//           <Nav.Item>
//             <Nav.Link eventKey="sessions">Q&A Sessions</Nav.Link>
//           </Nav.Item>
//         </Nav>

//         <Tab.Content>
//           <Tab.Pane eventKey="companies">
//             <Companies />
//           </Tab.Pane>
//           <Tab.Pane eventKey="analyzer">
//             <ResumeAnalyzer />
//           </Tab.Pane>
//           <Tab.Pane eventKey="JobFinder">
//             <JobFinding />
//           </Tab.Pane>
//           <Tab.Pane eventKey="request">
//             <RequestSession />
//           </Tab.Pane>
//           <Tab.Pane eventKey="sessions">
//             <QASessions />
//           </Tab.Pane>
//         </Tab.Content>
//       </Tab.Container>
//     </Container>
//   );
// };

// export default ProgrammerDashboard;
