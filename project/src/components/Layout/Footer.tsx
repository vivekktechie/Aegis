import React from 'react';
import { Container } from 'react-bootstrap';

const Footer: React.FC = () => {
  return (
    <footer className="bg-dark text-white py-4 mt-5">
      <Container>
        <div className="row">
          <div className="col-md-6">
            <h6>Aegis Job Portal</h6>
            <p className="mb-0 text-muted">
              Connecting talent with opportunity through AI-powered matching.
            </p>
          </div>
          <div className="col-md-6 text-md-end">
            <p className="mb-0 text-muted">
              © 2024 Aegis. All rights reserved.
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;