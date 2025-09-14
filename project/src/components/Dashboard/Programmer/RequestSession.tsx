import React, { useEffect, useState } from 'react';
import { Card, Button, Row, Col, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { User } from 'lucide-react';

interface Guide {
  id: string;
  name: string;
  expertise: string;
  email: string;
}

const RequestSession: React.FC = () => {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    const fetchGuides = async () => {
      try {
        const res = await axios.get("/api/guides");
        setGuides(res.data);
      } catch (err) {
        console.error("Error fetching guides", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGuides();
  }, []);
const handleRequestSession = async (guideId: string) => {
  if (!user) {
    alert("You must be logged in to request a session.");
    return;
  }

  setRequesting(guideId);
  try {
    const res = await axios.post("/api/request-session", {
      guideId,
      programmerId: user.id,
    });
    alert(res.data.message);
  } catch (err: any) {
    console.error("Error requesting session", err);
    alert(err.response?.data?.error || "Failed to request session.");
  } finally {
    setRequesting(null);
  }
};

  // const handleRequestSession = async (guideId: string) => {
  //   if (!user) {
  //     alert("You must be logged in to request a session.");
  //     return;
  //   }

  //   setRequesting(guideId);
  //   try {
  //     await axios.post("/api/request-session", {
  //       guideId,
  //       programmerId: user.id,
  //     });
  //     alert(`Session request sent to guide!`);
  //   } catch (err: any) {
  //     console.error("Error requesting session", err);
  //     alert(err.response?.data?.error || "Failed to request session.");
  //   } finally {
  //     setRequesting(null);
  //   }
  // };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading guides...</p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="mb-4 fw-bold text-dark">Request a Session with a Guide</h4>
      <Row>
        {guides.map((guide) => (
          <Col md={4} key={guide.id} className="mb-4">
          <Card className="guide-card h-100 text-center">
            <Card.Body className="d-flex flex-column align-items-center">
              {/* Avatar */}
              <div className="guide-avatar mb-3">
                <User size={28} />
              </div>
        
              {/* Name & Expertise */}
              <h5 className="fw-semibold mb-1">{guide.name}</h5>
              <p className="text-muted small mb-2">{guide.expertise}</p>
        
              {/* Email */}
              <p className="text-muted small mb-3">
                📧 {guide.email}
              </p>
        
              {/* Action */}
              <Button
                variant="primary"
                className="rounded-pill px-4"
                disabled={requesting === guide.id}
                onClick={() => handleRequestSession(guide.id)}
              >
                {requesting === guide.id ? (
                  <Spinner size="sm" animation="border" />
                ) : (
                  "Request Session"
                )}
              </Button>
            </Card.Body>
          </Card>
        </Col>
        
        ))}
      </Row>
    </div>
  );
};

export default RequestSession;


// import React, { useEffect, useState } from 'react';
// import { Card, Button, Row, Col, Spinner } from 'react-bootstrap';
// import axios from 'axios';
// import { useAuth } from '../../../context/AuthContext'; // adjust path if needed

// interface Guide {
//   id: string;
//   name: string;
//   expertise: string;
//   email: string;
// }

// const RequestSession: React.FC = () => {
//   const [guides, setGuides] = useState<Guide[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [requesting, setRequesting] = useState<string | null>(null);

//   const { user } = useAuth(); // current logged-in user

//   useEffect(() => {
//     const fetchGuides = async () => {
//       try {
//         const res = await axios.get("/api/guides");
//         setGuides(res.data);
//       } catch (err) {
//         console.error("Error fetching guides", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchGuides();
//   }, []);

//   const handleRequestSession = async (guideId: string) => {
//     if (!user) {
//       alert("You must be logged in to request a session.");
//       return;
//     }

//     setRequesting(guideId);
//     try {
//       await axios.post("/api/request-session", {
//         guideId,
//         name: user.name,
//         email: user.email,
//       });
//       alert(`Session request sent to guide!`);
//     } catch (err: any) {
//       console.error("Error requesting session", err);
//       alert(err.response?.data?.error || "Failed to request session.");
//     } finally {
//       setRequesting(null);
//     }
//   };

//   if (loading) return <p>Loading guides...</p>;

//   return (
//     <div>
//       <h4 className="mb-4">Request a Session with a Guide</h4>
//       <Row>
//         {guides.map((guide) => (
//           <Col md={4} key={guide.id} className="mb-3">
//             <Card className="shadow-sm">
//               <Card.Body>
//                 <Card.Title>{guide.name}</Card.Title>
//                 <Card.Subtitle className="mb-2 text-muted">
//                   Expertise: {guide.expertise}
//                 </Card.Subtitle>
//                 <Card.Text>Email: {guide.email}</Card.Text>
//                 <Button
//                   variant="primary"
//                   disabled={requesting === guide.id}
//                   onClick={() => handleRequestSession(guide.id)}
//                 >
//                   {requesting === guide.id ? (
//                     <Spinner size="sm" animation="border" />
//                   ) : (
//                     "Request Session"
//                   )}
//                 </Button>
//               </Card.Body>
//             </Card>
//           </Col>
//         ))}
//       </Row>
//     </div>
//   );
// };

// export default RequestSession;