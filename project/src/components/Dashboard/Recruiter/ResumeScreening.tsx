import React, { useState } from 'react';
import { Row, Col, Card, Form, Button, Alert, Table } from 'react-bootstrap';
import { Upload, Search, Trophy } from 'lucide-react';

interface Candidate {
  name: string;
  email: string;
  score: number;
  matchedSkills: string[];
  fileName: string;
}

const ResumeScreening: React.FC = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFiles, setResumeFiles] = useState<FileList | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setResumeFiles(e.target.files);
    }
  };

  const handleScreening = async () => {
    if (!resumeFiles || resumeFiles.length === 0 || !jobDescription.trim()) {
      setError('Please provide a job description and upload at least one resume');
      return;
    }

    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('jobDescription', jobDescription);
    
    for (let i = 0; i < resumeFiles.length; i++) {
      formData.append('resumes', resumeFiles[i]);
    }

    try {
      const response = await fetch('http://localhost:5000/api/resume/screen', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setCandidates(result.candidates);
      } else {
        setError('Screening failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreVariant = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="text-warning me-2" size={16} />;
    return <span className="me-2 text-muted">#{index + 1}</span>;
  };

  return (
    <div>
      <h4 className="mb-4">Resume Screening</h4>
      
      <Row>
        <Col lg={4}>
          <Card className="mb-4">
            <Card.Body>
              <h5 className="mb-3">Screening Setup</h5>
              
              <Form.Group className="mb-3">
                <Form.Label>Job Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={6}
                  placeholder="Enter the job description..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Upload Resumes</Form.Label>
                <div className="file-upload-area">
                  <Upload className="mb-2 text-muted" size={32} />
                  <Form.Control
                    type="file"
                    accept=".pdf,.docx,.doc"
                    multiple
                    onChange={handleFilesChange}
                  />
                  {resumeFiles && (
                    <p className="mt-2 text-success">
                      {resumeFiles.length} file(s) selected
                    </p>
                  )}
                </div>
              </Form.Group>

              {error && <Alert variant="danger">{error}</Alert>}

              <Button
                variant="primary"
                onClick={handleScreening}
                disabled={loading || !jobDescription.trim() || !resumeFiles}
                className="w-100"
              >
                {loading ? (
                  <>
                    <span className="loading-spinner me-2"></span>
                    Screening...
                  </>
                ) : (
                  <>
                    <Search size={16} className="me-2" />
                    Screen Candidates
                  </>
                )}
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          {candidates.length > 0 && (
            <Card>
              <Card.Header>
                <h5 className="mb-0">Screening Results</h5>
              </Card.Header>
              <Card.Body className="p-0">
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Candidate</th>
                      <th>Score</th>
                      <th>Matched Skills</th>
                      <th>Resume File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((candidate, index) => (
                      <tr key={index}>
                        <td>{getRankIcon(index)}</td>
                        <td>
                          <div>
                            <strong>{candidate.name}</strong>
                            <br />
                            <small className="text-muted">{candidate.email}</small>
                          </div>
                        </td>
                        <td>
                          <span className={`badge bg-${getScoreVariant(candidate.score)}`}>
                            {candidate.score}%
                          </span>
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {candidate.matchedSkills.slice(0, 3).map((skill, i) => (
                              <span key={i} className="badge bg-secondary">
                                {skill}
                              </span>
                            ))}
                            {candidate.matchedSkills.length > 3 && (
                              <span className="badge bg-light text-dark">
                                +{candidate.matchedSkills.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <small className="text-muted">{candidate.fileName}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default ResumeScreening;