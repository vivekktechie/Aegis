import React, { useState } from 'react';
import { Row, Col, Card, Form, Button, Alert, Table, Badge, ProgressBar } from 'react-bootstrap';
import { Upload, Search, Trophy, CheckCircle, XCircle, Users, Target, Download } from 'lucide-react';

interface Candidate {
  name: string;
  email: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  fileName: string;
  isShortlisted: boolean;
}

interface ScreeningResults {
  candidates: Candidate[];
  shortlisted: Candidate[];
  rejected: Candidate[];
  summary: {
    total: number;
    shortlisted: number;
    rejected: number;
    shortlistRate: number;
  };
}

const ResumeScreening: React.FC = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFiles, setResumeFiles] = useState<FileList | null>(null);
  const [results, setResults] = useState<ScreeningResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');

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
        setResults(result);
        setActiveTab('all');
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

  const exportShortlisted = () => {
    if (!results || results.shortlisted.length === 0) return;
    
    const csvContent = [
      ['Name', 'Email', 'ATS Score', 'Matched Skills', 'Missing Skills', 'Resume File'],
      ...results.shortlisted.map(candidate => [
        candidate.name,
        candidate.email,
        candidate.score.toString(),
        candidate.matchedSkills.join('; '),
        candidate.missingSkills.join('; '),
        candidate.fileName
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shortlisted_candidates_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
          {results && (
            <Card>
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Screening Results</h5>
                  <div className="d-flex gap-2">
                    <Badge bg="success" className="d-flex align-items-center">
                      <CheckCircle size={14} className="me-1" />
                      {results.summary.shortlisted} Shortlisted
                    </Badge>
                    <Badge bg="danger" className="d-flex align-items-center">
                      <XCircle size={14} className="me-1" />
                      {results.summary.rejected} Rejected
                    </Badge>
                    {results.summary.shortlisted > 0 && (
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={exportShortlisted}
                        className="d-flex align-items-center"
                      >
                        <Download size={14} className="me-1" />
                        Export Shortlisted
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted">Shortlist Rate</span>
                    <span className="fw-bold">{results.summary.shortlistRate}%</span>
                  </div>
                  <ProgressBar 
                    now={results.summary.shortlistRate} 
                    variant={results.summary.shortlistRate >= 50 ? 'success' : 'warning'}
                    className="mb-2"
                  />
                  <small className="text-muted">
                    {results.summary.shortlisted} out of {results.summary.total} candidates meet the 70% ATS threshold
                  </small>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="border-bottom">
                  <div className="d-flex">
                    <button
                      className={`screening-tab-button ${activeTab === 'all' ? 'active' : ''}`}
                      onClick={() => setActiveTab('all')}
                    >
                      <Users size={16} className="me-1" />
                      All Candidates ({results.summary.total})
                    </button>
                    <button
                      className={`screening-tab-button ${activeTab === 'shortlisted' ? 'active' : ''}`}
                      onClick={() => setActiveTab('shortlisted')}
                    >
                      <CheckCircle size={16} className="me-1" />
                      Shortlisted ({results.summary.shortlisted})
                    </button>
                    <button
                      className={`screening-tab-button ${activeTab === 'rejected' ? 'active' : ''}`}
                      onClick={() => setActiveTab('rejected')}
                    >
                      <XCircle size={16} className="me-1" />
                      Rejected ({results.summary.rejected})
                    </button>
                  </div>
                </div>
                
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Candidate</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th>Matched Skills</th>
                      <th>Missing Skills</th>
                      <th>Resume File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let candidatesToShow = results.candidates;
                      if (activeTab === 'shortlisted') {
                        candidatesToShow = results.shortlisted;
                      } else if (activeTab === 'rejected') {
                        candidatesToShow = results.rejected;
                      }
                      
                      if (candidatesToShow.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="text-center py-4">
                              <div className="text-muted">
                                {activeTab === 'shortlisted' ? (
                                  <>
                                    <CheckCircle size={24} className="mb-2" />
                                    <p className="mb-0">No candidates meet the 70% ATS threshold</p>
                                    <small>Try adjusting the job description or review rejected candidates</small>
                                  </>
                                ) : activeTab === 'rejected' ? (
                                  <>
                                    <XCircle size={24} className="mb-2" />
                                    <p className="mb-0">No rejected candidates</p>
                                    <small>All candidates meet the 70% ATS threshold!</small>
                                  </>
                                ) : (
                                  <>
                                    <Users size={24} className="mb-2" />
                                    <p className="mb-0">No candidates found</p>
                                    <small>Upload resumes to start screening</small>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      
                      return candidatesToShow.map((candidate, index) => (
                        <tr key={index} className={candidate.isShortlisted ? 'table-success' : 'table-danger'}>
                          <td>{getRankIcon(index)}</td>
                          <td>
                            <div>
                              <strong>{candidate.name}</strong>
                              <br />
                              <small className="text-muted">{candidate.email}</small>
                            </div>
                          </td>
                          <td>
                            <div className="candidate-score-display">
                              <span className={`badge bg-${getScoreVariant(candidate.score)}`}>
                                {candidate.score}%
                              </span>
                              <Target size={14} className="text-muted" />
                            </div>
                          </td>
                          <td>
                            {candidate.isShortlisted ? (
                              <Badge bg="success" className="d-flex align-items-center w-fit-content">
                                <CheckCircle size={12} className="me-1" />
                                Shortlisted
                              </Badge>
                            ) : (
                              <Badge bg="danger" className="d-flex align-items-center w-fit-content">
                                <XCircle size={12} className="me-1" />
                                Rejected
                              </Badge>
                            )}
                          </td>
                          <td>
                            <div className="skills-container">
                              {candidate.matchedSkills.slice(0, 2).map((skill, i) => (
                                <span key={i} className="badge bg-success">
                                  {skill}
                                </span>
                              ))}
                              {candidate.matchedSkills.length > 2 && (
                                <span className="badge bg-light text-dark">
                                  +{candidate.matchedSkills.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="skills-container">
                              {candidate.missingSkills.slice(0, 2).map((skill, i) => (
                                <span key={i} className="badge bg-danger">
                                  {skill}
                                </span>
                              ))}
                              {candidate.missingSkills.length > 2 && (
                                <span className="badge bg-light text-dark">
                                  +{candidate.missingSkills.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <small className="text-muted">{candidate.fileName}</small>
                          </td>
                        </tr>
                      ));
                    })()}
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