import React from 'react';
import { Container } from 'react-bootstrap';
import ManageSessions from './Guide/ManageSessions';

const GuideDashboard: React.FC = () => {
  return (
    <Container>
      <div className="mb-4">
        <h2 className="text-primary mb-1">Guide Dashboard</h2>
        <p className="text-muted">Create and manage Q&A sessions for programmers</p>
      </div>

      <ManageSessions />
    </Container>
  );
};

export default GuideDashboard;