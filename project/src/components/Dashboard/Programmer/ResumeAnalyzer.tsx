import React, { useState } from 'react';
import { Row, Col, Card, Form, Button, Alert, ProgressBar } from 'react-bootstrap';
import { Upload, FileText, Target, CheckCircle, XCircle } from 'lucide-react';

interface AnalysisResult {
  score: number;
  skillsFound: string[];
  skillsMissing: string[];
  recommendations: string[];
}

const ResumeAnalyzer: React.FC = () => {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeFile || !jobDescription.trim()) {
      setError('Please upload a resume and provide a job description');
      return;
    }

    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('jobDescription', jobDescription);

    try {
      const response = await fetch('http://localhost:5000/api/analyze-resume', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysis(result.analysis);
      } else {
        setError('Analysis failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'score-high';
    if (score >= 60) return 'score-medium';
    return 'score-low';
  };

  return (
    <div>
      <h4 className="mb-4">Resume Analyzer</h4>
      
      <Row>
        <Col lg={6}>
          <Card className="mb-4">
            <Card.Body>
              <h5 className="mb-3">Upload Resume & Job Description</h5>
              
              <Form.Group className="mb-3">
                <Form.Label>Resume (PDF/DOCX)</Form.Label>
                <div className="file-upload-area">
                  <Upload className="mb-2 text-muted" size={32} />
                  <Form.Control
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileChange}
                    className="mb-2"
                  />
                  {resumeFile && (
                    <div className="d-flex align-items-center justify-content-center mt-2">
                      <FileText size={16} className="me-2 text-success" />
                      <span className="text-success">{resumeFile.name}</span>
                    </div>
                  )}
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Job Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={8}
                  placeholder="Paste the job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </Form.Group>

              {error && <Alert variant="danger">{error}</Alert>}

              <Button
                variant="primary"
                onClick={handleAnalyze}
                disabled={loading || !resumeFile || !jobDescription.trim()}
                className="w-100"
              >
                {loading ? (
                  <>
                    <span className="loading-spinner me-2"></span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Target size={16} className="me-2" />
                    Analyze Resume
                  </>
                )}
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          {analysis && (
            <Card>
              <Card.Body>
                <h5 className="mb-4">Analysis Results</h5>
                
                <div className="text-center mb-4">
                  <div className={`score-circle ${getScoreColor(analysis.score)}`}>
                    {analysis.score}%
                  </div>
                  <h6 className="mt-3">ATS Match Score</h6>
                </div>

                <ProgressBar 
                  now={analysis.score} 
                  variant={analysis.score >= 80 ? 'success' : analysis.score >= 60 ? 'warning' : 'danger'}
                  className="mb-4"
                />

                <div className="mb-4">
                  <h6 className="d-flex align-items-center mb-3">
                    <CheckCircle className="text-success me-2" size={20} />
                    Skills Found ({analysis.skillsFound.length})
                  </h6>
                  <Card className="border-success">
                    <Card.Body className="p-3">
                      <div className="d-flex flex-wrap gap-2">
                        {analysis.skillsFound.map((skill, index) => (
                          <span key={index} className="badge bg-success fs-6 px-3 py-2">
                            {skill}
                          </span>
                        ))}
                      </div>
                      {analysis.skillsFound.length > 0 && (
                        <div className="mt-3">
                          <small className="text-muted">
                            <strong>Great!</strong> These skills match the job requirements.
                          </small>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </div>

                <div className="mb-4">
                  <h6 className="d-flex align-items-center mb-3">
                    <XCircle className="text-danger me-2" size={20} />
                    Skills Missing ({analysis.skillsMissing.length})
                  </h6>
                  {analysis.skillsMissing.length > 0 ? (
                    <Card className="border-danger">
                      <Card.Body className="p-3">
                        <div className="d-flex flex-wrap gap-2">
                          {analysis.skillsMissing.map((skill, index) => (
                            <span key={index} className="badge bg-danger fs-6 px-3 py-2">
                              {skill}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3">
                          <small className="text-muted">
                            <strong>Action Required:</strong> Consider learning or adding these skills to improve your resume match.
                          </small>
                        </div>
                      </Card.Body>
                    </Card>
                  ) : (
                    <div className="text-center p-3 bg-light rounded">
                      <CheckCircle className="text-success mb-2" size={24} />
                      <p className="text-muted mb-0">No missing skills! Great job!</p>
                    </div>
                  )}
                </div>

                <div>
                  <h6 className="mb-3">Recommendations</h6>
                  <Card className="border-info">
                    <Card.Body className="p-3">
                      <ul className="list-unstyled mb-0">
                        {analysis.recommendations.map((rec, index) => (
                          <li key={index} className="mb-2 d-flex align-items-start">
                            <span className="badge bg-info me-2 mt-1 small-badge">
                              {index + 1}
                            </span>
                            <small className="text-muted">{rec}</small>
                          </li>
                        ))}
                      </ul>
                    </Card.Body>
                  </Card>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default ResumeAnalyzer;