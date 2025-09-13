import React, { useState } from 'react';
import { Container, Nav, Tab } from 'react-bootstrap';
import ResumeScreening from './Recruiter/ResumeScreening';
import ManageJobs from './Recruiter/ManageJobs';

const RecruiterDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('screening');

  return (
    <Container>
      <div className="mb-4">
        <h2 className="text-primary mb-1">Recruiter Dashboard</h2>
        <p className="text-muted">Manage talent acquisition and job postings</p>
      </div>

      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'screening')}>
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link eventKey="screening">Resume Screening</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="jobs">Manage Job Roles</Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="screening">
            <ResumeScreening />
          </Tab.Pane>
          <Tab.Pane eventKey="jobs">
            <ManageJobs />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </Container>
  );
};

export default RecruiterDashboard;