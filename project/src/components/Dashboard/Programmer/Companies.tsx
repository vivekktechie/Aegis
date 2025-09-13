import React, { useState, useEffect } from 'react';
import { Building2, Briefcase, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
interface JobRole {
  id: string;
  title: string;
}

interface Company {
  id: string;
  name: string;
  jobRoles: JobRole[];
}

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies);
      } else {
        setError('Failed to load companies');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleJobRoleClick = (companyId: string, jobRoleId: string) => {
    console.log(`Clicked job role ${jobRoleId} at company ${companyId}`);
    navigate(`/jobs/${jobRoleId}`);
    
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading companies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="text-red-800 font-medium">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Companies</h1>
          <p className="text-gray-600">Discover available job opportunities at top companies</p>
        </div>

        <div className="grid gap-8">
          {companies.map((company) => (
            <div key={company.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
              {/* Company Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-white bg-opacity-20 rounded-lg p-2">
                    <Building2 className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{company.name}</h2>
                    <p className="text-blue-100">
                      {company.jobRoles.length} open position{company.jobRoles.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Job Roles */}
              {company.jobRoles.length > 0 ? (
                <div className="p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Briefcase className="text-gray-500" size={18} />
                    <h3 className="text-lg font-semibold text-gray-900">Available Positions</h3>
                  </div>
                  
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {company.jobRoles.map((jobRole) => (
                      <div
                        key={jobRole.id}
                        onClick={() => handleJobRoleClick(company.id, jobRole.id)}
                        className="group bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                            {jobRole.title}
                          </h4>
                          <ChevronRight 
                            className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" 
                            size={16} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="text-gray-400 mb-2">
                    <Briefcase size={48} className="mx-auto" />
                  </div>
                  <p className="text-gray-500">No open positions at this time</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {companies.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
            <p className="text-gray-500">Check back later for new opportunities</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Companies;


// import React, { useState, useEffect } from 'react';
// import { Row, Col, Card, Alert } from 'react-bootstrap';
// import { Building2, MapPin, Users } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';

// interface Company {
//   id: string;
//   name: string;
//   description: string;
//   location: string;
//   employees: string;
//   industry: string;
//   jobCount: number;
// }

// const Companies: React.FC = () => {
//   const [companies, setCompanies] = useState<Company[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const navigate = useNavigate();

//   useEffect(() => {
//     fetchCompanies();
//   }, []);

//   const fetchCompanies = async () => {
//     try {
//       const response = await fetch('http://localhost:5000/api/companies');
//       if (response.ok) {
//         const data = await response.json();
//         setCompanies(data.companies);
//       } else {
//         setError('Failed to load companies');
//       }
//     } catch (err) {
//       setError('Network error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCompanyClick = (companyId: string) => {
//     navigate(`/company/${companyId}/jobs`);
//   };

//   if (loading) {
//     return (
//       <div className="text-center py-5">
//         <div className="loading-spinner"></div>
//         <p className="mt-3 text-muted">Loading companies...</p>
//       </div>
//     );
//   }

//   if (error) {
//     return <Alert variant="danger">{error}</Alert>;
//   }

//   return (
//     <div>
//       <h4 className="mb-4">Browse Companies</h4>
//       <Row>
//         {companies.map((company) => (
//           <Col md={6} lg={4} key={company.id} className="mb-4">
//             <Card 
//               className="company-card card-hover h-100" 
//               onClick={() => handleCompanyClick(company.id)}
//             >
//               <Card.Body>
//                 <div className="d-flex align-items-start mb-3">
//                   <Building2 className="text-primary me-2 mt-1" size={24} />
//                   <div>
//                     <h5 className="mb-1">{company.name}</h5>
//                     <small className="text-muted">{company.industry}</small>
//                   </div>
//                 </div>
                
//                 <p className="text-muted small mb-3">{company.description}</p>
                
//                 <div className="d-flex justify-content-between align-items-center text-sm">
//                   <div className="d-flex align-items-center text-muted">
//                     <MapPin size={14} className="me-1" />
//                     {company.location}
//                   </div>
//                   <div className="d-flex align-items-center text-muted">
//                     <Users size={14} className="me-1" />
//                     {company.employees}
//                   </div>
//                 </div>
                
//                 <div className="mt-3 pt-3 border-top">
//                   <span className="badge bg-primary">
//                     {company.jobCount} open positions
//                   </span>
//                 </div>
//               </Card.Body>
//             </Card>
//           </Col>
//         ))}
//       </Row>
//     </div>
//   );
// };

// export default Companies;