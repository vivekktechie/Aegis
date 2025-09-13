import React, { useState } from 'react';
import { Container, Nav, Tab } from 'react-bootstrap';
import Companies from './Programmer/Companies';
import ResumeAnalyzer from './Programmer/ResumeAnalyzer';
import QASessions from './Programmer/QASessions';

const ProgrammerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('companies');

  return (
    <Container>
      <div className="mb-4">
        <h2 className="text-primary mb-1">Programmer Dashboard</h2>
        <p className="text-muted">Explore opportunities and analyze your profile</p>
      </div>

      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'companies')}>
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link eventKey="companies">Companies</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="analyzer">Resume Analyzer</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="sessions">Q&A Sessions</Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="companies">
            <Companies />
          </Tab.Pane>
          <Tab.Pane eventKey="analyzer">
            <ResumeAnalyzer />
          </Tab.Pane>
          <Tab.Pane eventKey="sessions">
            <QASessions />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </Container>
  );
};

export default ProgrammerDashboard;