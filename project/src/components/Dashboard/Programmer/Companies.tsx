import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Alert } from 'react-bootstrap';
import { Building2, MapPin, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Company {
  id: string;
  name: string;
  description: string;
  location: string;
  employees: string;
  industry: string;
  jobCount: number;
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

  const handleCompanyClick = (companyId: string) => {
    navigate(`/company/${companyId}/jobs`);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="loading-spinner"></div>
        <p className="mt-3 text-muted">Loading companies...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div>
      <h4 className="mb-4">Browse Companies</h4>
      <Row>
        {companies.map((company) => (
          <Col md={6} lg={4} key={company.id} className="mb-4">
            <Card 
              className="company-card card-hover h-100" 
              onClick={() => handleCompanyClick(company.id)}
            >
              <Card.Body>
                <div className="d-flex align-items-start mb-3">
                  <Building2 className="text-primary me-2 mt-1" size={24} />
                  <div>
                    <h5 className="mb-1">{company.name}</h5>
                    <small className="text-muted">{company.industry}</small>
                  </div>
                </div>
                
                <p className="text-muted small mb-3">{company.description}</p>
                
                <div className="d-flex justify-content-between align-items-center text-sm">
                  <div className="d-flex align-items-center text-muted">
                    <MapPin size={14} className="me-1" />
                    {company.location}
                  </div>
                  <div className="d-flex align-items-center text-muted">
                    <Users size={14} className="me-1" />
                    {company.employees}
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-top">
                  <span className="badge bg-primary">
                    {company.jobCount} open positions
                  </span>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Companies;