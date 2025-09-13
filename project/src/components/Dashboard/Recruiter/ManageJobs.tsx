import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Alert, Table } from 'react-bootstrap';
import { Plus, Edit, Trash2, Briefcase } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface Job {
  id: string;
  title: string;
  description: string;
  companyId: string;
  createdAt: string;
}

const ManageJobs: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/jobs/recruiter/${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = editingJob 
        ? `http://localhost:5000/api/jobs/${editingJob.id}`
        : 'http://localhost:5000/api/jobs';
      
      const method = editingJob ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          recruiterId: user?.id
        }),
      });

      if (response.ok) {
        setSuccess(editingJob ? 'Job updated successfully!' : 'Job created successfully!');
        setFormData({ title: '', description: '' });
        setEditingJob(null);
        fetchJobs();
      } else {
        setError('Operation failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      description: job.description
    });
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setEditingJob(null);
    setFormData({ title: '', description: '' });
    setError('');
    setSuccess('');
  };

  const handleDelete = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this job?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/jobs/${jobId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Job deleted successfully!');
        fetchJobs();
      } else {
        setError('Failed to delete job.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  return (
    <div>
      <h4 className="mb-4">Manage Job Roles</h4>
      
      <Row>
        <Col lg={4}>
          <Card>
            <Card.Body>
              <h5 className="mb-3">
                {editingJob ? 'Edit Job Role' : 'Create New Job Role'}
              </h5>
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Job Title</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Senior Software Engineer"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Job Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={8}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter detailed job description..."
                    required
                  />
                </Form.Group>

                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <div className="d-flex gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                    className="flex-grow-1"
                  >
                    {loading ? (
                      <>
                        <span className="loading-spinner me-2"></span>
                        {editingJob ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Plus size={16} className="me-2" />
                        {editingJob ? 'Update Job' : 'Create Job'}
                      </>
                    )}
                  </Button>
                  
                  {editingJob && (
                    <Button variant="outline-secondary" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  )}
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0 d-flex align-items-center">
                <Briefcase size={20} className="me-2" />
                Your Job Listings ({jobs.length})
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              {jobs.length === 0 ? (
                <div className="text-center p-5">
                  <Briefcase size={48} className="text-muted mb-3" />
                  <p className="text-muted">No job roles created yet.</p>
                  <p className="text-muted">Create your first job posting to get started!</p>
                </div>
              ) : (
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Job Title</th>
                      <th>Description</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <strong>{job.title}</strong>
                        </td>
                        <td>
                          <div style={{ maxWidth: '300px' }}>
                            {job.description.length > 100
                              ? `${job.description.substring(0, 100)}...`
                              : job.description
                            }
                          </div>
                        </td>
                        <td>
                          <small className="text-muted">
                            {new Date(job.createdAt).toLocaleDateString()}
                          </small>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleEdit(job)}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(job.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ManageJobs;