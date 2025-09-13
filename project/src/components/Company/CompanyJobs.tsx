import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Button } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, Building2, MapPin } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  location?: string;
}

interface Company {
  id: string;
  name: string;
  description: string;
  location: string;
  industry: string;
}

const CompanyJobs: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (companyId) {
      fetchCompanyAndJobs();
    }
  }, [companyId]);

  const fetchCompanyAndJobs = async () => {
    try {
      // Fetch company details
      const companyResponse = await fetch(`http://localhost:5000/api/companies/${companyId}`);
      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
        setCompany(companyData.company);
      }

      // Fetch jobs
      const jobsResponse = await fetch(`http://localhost:5000/api/companies/${companyId}/jobs`);
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        setJobs(jobsData.jobs);
      } else {
        setError('Failed to load jobs');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate('/programmer');
  };

  if (loading) {
    return (
      <Container>
        <div className="text-center py-5">
          <div className="loading-spinner"></div>
          <p className="mt-3 text-muted">Loading job opportunities...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert variant="danger">{error}</Alert>
        <Button variant="outline-primary" onClick={handleGoBack}>
          <ArrowLeft size={16} className="me-2" />
          Back to Companies
        </Button>
      </Container>
    );
  }

  return (
    <Container>
      <div className="d-flex align-items-center mb-4">
        <Button variant="outline-primary" onClick={handleGoBack} className="me-3">
          <ArrowLeft size={16} className="me-2" />
          Back
        </Button>
        <div>
          <h2 className="text-primary mb-1">
            {company?.name} - Job Opportunities
          </h2>
          <p className="text-muted mb-0">
            {company?.description}
          </p>
        </div>
      </div>

      {company && (
        <Card className="mb-4">
          <Card.Body>
            <div className="d-flex align-items-start">
              <Building2 className="text-primary me-3 mt-1" size={32} />
              <div>
                <h5 className="mb-1">{company.name}</h5>
                <p className="text-muted mb-2">{company.industry}</p>
                <div className="d-flex align-items-center text-muted">
                  <MapPin size={16} className="me-2" />
                  {company.location}
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      <h4 className="mb-4">Available Positions ({jobs.length})</h4>

      {jobs.length === 0 ? (
        <Alert variant="info">
          <Briefcase className="me-2" />
          No job openings available at this company right now. Check back later!
        </Alert>
      ) : (
        <Row>
          {jobs.map((job) => (
            <Col lg={6} key={job.id} className="mb-4">
              <Card className="job-card h-100">
                <Card.Body>
                  <div className="d-flex align-items-start mb-3">
                    <Briefcase className="text-primary me-2 mt-1" size={24} />
                    <div>
                      <h5 className="mb-1">{job.title}</h5>
                      {job.location && (
                        <div className="d-flex align-items-center text-muted mb-2">
                          <MapPin size={14} className="me-1" />
                          {job.location}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <h6 className="mb-2">Job Description</h6>
                    <p className="text-muted small">
                      {job.description.length > 200
                        ? `${job.description.substring(0, 200)}...`
                        : job.description
                      }
                    </p>
                  </div>

                  {job.requirements && (
                    <div className="mb-3">
                      <h6 className="mb-2">Requirements</h6>
                      <p className="text-muted small">
                        {job.requirements.length > 150
                          ? `${job.requirements.substring(0, 150)}...`
                          : job.requirements
                        }
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-top">
                    <Button variant="primary" className="w-100">
                      Apply Now
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default CompanyJobs;