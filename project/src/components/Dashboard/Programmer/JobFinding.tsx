import React, { useState } from 'react';
import { Row, Col, Card, Form, Button, Alert, ProgressBar } from 'react-bootstrap';
import { Upload, FileText, Target, CheckCircle, XCircle, Briefcase } from 'lucide-react';

interface Job {
  jobId: string;
  title: string;
  location: string;
  score: number;
  company: string;
  requirements: string;
}

interface AnalysisResult {
  score: number;
  skillsFound: string[];
  skillsMissing: string[];
  recommendations?: string[];
}

interface ApiResponse {
  jobFinding: {
    analysis: AnalysisResult;
    matchedJobs: Job[];
  };
}

const JobFinding: React.FC = () => {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [matchedJobs, setMatchedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeFile) {
      setError('Please upload a resume.');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('jobDescription', jobDescription);

    try {
      const response = await fetch('http://localhost:5000/api/resume/job-finding', {
        method: 'POST',
        body: formData,
      });

      const result: ApiResponse = await response.json();

      if (response.ok) {
        setAnalysis(result.jobFinding.analysis);
        setMatchedJobs(result.jobFinding.matchedJobs || []);
      } else {
        setError((result as any).error || 'Analysis failed. Please try again.');
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
      <h4 className="mb-4">Job Finder</h4>

      <Row>
        {/* Upload Section */}
        <Col lg={6}>
          <Card className="mb-4">
            <Card.Body>
              <h5 className="mb-3">Upload Resume</h5>

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
                <Form.Label>Optional: Target Job Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste a job description to compare directly..."
                />
              </Form.Group>

              {error && <Alert variant="danger">{error}</Alert>}

              <Button
                variant="primary"
                onClick={handleAnalyze}
                disabled={loading || !resumeFile}
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

        {/* Analysis + Jobs */}
        <Col lg={6}>
          {analysis && (
            <Card className="mb-4">
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
                  <div className="d-flex flex-wrap gap-2">
                    {analysis.skillsFound.map((skill, index) => (
                      <span key={index} className="badge bg-success">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <h6 className="d-flex align-items-center mb-3">
                    <XCircle className="text-danger me-2" size={20} />
                    Skills Missing ({analysis.skillsMissing.length})
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
                    {analysis.skillsMissing.map((skill, index) => (
                      <span key={index} className="badge bg-danger">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {analysis.recommendations && analysis.recommendations.length > 0 && (
                  <div className="mb-4">
                    <h6>Recommendations:</h6>
                    <ul>
                      {analysis.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          {matchedJobs.length > 0 && (
  <Card>
    <Card.Body>
      <h5 className="mb-4">Matching Jobs</h5>
      {matchedJobs.map((job) => (
        <div key={job.jobId} className="border p-3 rounded mb-3">
          <h6 className="mb-1 d-flex align-items-center">
            <Briefcase size={18} className="me-2 text-primary" />
            {job.title} {/* Job Title */}
          </h6>
          <p className="mb-1 text-muted">
            <strong>Company:</strong> {job.company} {/* Company Name */}
          </p>
          <p className="mb-1 text-muted">
            <strong>Location:</strong> {job.location}
          </p>
          <p className="mb-2">
            <strong>Requirements:</strong> {job.requirements}
          </p>
          <ProgressBar
            now={job.score}
            label={`${job.score}%`}
            variant={job.score >= 80 ? 'success' : job.score >= 60 ? 'warning' : 'danger'}
          />
        </div>
      ))}
    </Card.Body>
  </Card>
)}


          {analysis && matchedJobs.length === 0 && (
            <Alert variant="info">No matching jobs found for your resume.</Alert>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default JobFinding;