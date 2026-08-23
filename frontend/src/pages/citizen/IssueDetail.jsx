import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api/axios';
import { Container, Button, Badge, Row, Col } from 'react-bootstrap';
import { FaArrowLeft, FaMapMarkerAlt, FaCalendarAlt, FaUser } from 'react-icons/fa';
import CivicIntelligenceCard from '../../components/CivicIntelligenceCard';
import ResolutionEvidenceCard from '../../components/ResolutionEvidenceCard';
import './IssueDetail.css';

function IssueDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [issue, setIssue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const accessToken = localStorage.getItem('access');

    const fetchIssue = async () => {
        try {
            const response = await api.get(`/api/issues/${id}/`);
            setIssue(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching issue:', err.response?.data || err.message);
            setError(
                err.response?.status === 404
                    ? 'Issue not found. It may have been removed or does not exist.'
                    : 'Failed to load issue details. Please check your connection or try again.'
            );
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIssue();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    if (loading) {
        return (
            <div className="issue-detail-container">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading issue details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="issue-detail-container">
                <div className="error">
                    <p>{error}</p>
                    <button onClick={() => navigate('/issue-map')} className="btn btn-primary">Back to Map</button>
                </div>
            </div>
        );
    }

    return (
        <Container className="py-4 px-md-4" style={{ minHeight: '90vh' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <Button variant="link" className="text-decoration-none text-muted p-0 fw-bold hover-start" onClick={() => navigate(-1)}>
                    <FaArrowLeft className="me-2" />Back
                </Button>
                <Badge bg={issue.status === 'RESOLVED' ? 'success' : issue.status === 'PENDING_APPROVAL' ? 'warning text-dark' : 'primary'} className="px-3 py-2 fs-6">
                    {issue.status}
                </Badge>
            </div>

            {/* Feature 1: Issue Intelligence Card */}
            <CivicIntelligenceCard issue={issue} />

            {/* Feature 3: Resolution Evidence Card (When resolution proof or description exists) */}
            {(issue.resolution_proof || issue.resolution_description || issue.status === 'PENDING_APPROVAL' || issue.status === 'RESOLVED') && (
                <ResolutionEvidenceCard 
                    issue={issue} 
                    onStatusUpdate={() => fetchIssue()} 
                />
            )}

            {/* Main Details & Live Timeline */}
            <Row className="g-4 mb-4">
                {/* Photo & Description Section */}
                <Col lg={7}>
                    <div className="glass-panel p-4 h-100 bg-white shadow-sm" style={{ borderRadius: '20px' }}>
                        <h4 className="fw-bold text-dark mb-2">#{issue.id}: {issue.title}</h4>
                        <p className="text-muted lead fs-6 mb-4">{issue.description}</p>

                        {issue.photo && (
                            <div className="mb-4">
                                <h6 className="text-muted text-uppercase small fw-bold mb-2">Citizen Photo Evidence</h6>
                                <img src={issue.file_url || issue.photo} alt="Issue" className="img-fluid rounded-4 shadow-sm w-100 object-fit-cover" style={{ maxHeight: '350px' }} />
                            </div>
                        )}

                        <div className="p-3 bg-light rounded-3 d-flex flex-wrap justify-content-between gap-2 text-muted small">
                            <span><FaUser className="me-1 text-primary" /> Reported by <strong>@{issue.citizen_username}</strong></span>
                            <span><FaMapMarkerAlt className="me-1 text-danger" /> {issue.address || "Location on Map"}</span>
                            <span><FaCalendarAlt className="me-1 text-info" /> {new Date(issue.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </Col>

                {/* Process Timeline (Live Tracker) */}
                <Col lg={5}>
                    <div className="glass-panel p-4 h-100 bg-white shadow-sm" style={{ borderRadius: '20px' }}>
                        <h5 className="fw-bold text-dark mb-3">📦 Process Timeline (Audit Trail)</h5>
                        <div className="timeline-container">
                            {/* Initial Report Event */}
                            <div className="timeline-item">
                                <div className="timeline-marker bg-primary"></div>
                                <div className="timeline-content">
                                    <h6 className="fw-bold mb-0 text-dark small">1. Issue Reported</h6>
                                    <p className="text-muted small mb-0">By citizen @{issue.citizen_username}</p>
                                    <small className="text-secondary">{new Date(issue.created_at).toLocaleString()}</small>
                                </div>
                            </div>

                            {/* Logs */}
                            {issue.status_logs && issue.status_logs.map((log, index) => (
                                <div key={index} className="timeline-item">
                                    <div className="timeline-marker bg-info"></div>
                                    <div className="timeline-content">
                                        <h6 className="fw-bold mb-0 text-dark small">Status: {log.new_status}</h6>
                                        <p className="text-muted small mb-0">Updated by {log.updated_by_username || "System"}</p>
                                        <small className="text-secondary">{new Date(log.timestamp).toLocaleString()}</small>
                                    </div>
                                </div>
                            ))}

                            {/* Current Status */}
                            <div className="timeline-item">
                                <div className={`timeline-marker ${issue.status === 'RESOLVED' ? 'bg-success' : 'bg-warning animate__animated animate__pulse animate__infinite'}`}></div>
                                <div className="timeline-content">
                                    <h6 className="fw-bold mb-0 text-dark small">Current State: {issue.status}</h6>
                                    <p className="text-muted small mb-0">
                                        {issue.status === 'RESOLVED' ? 'Issue verified and closed!' : 'Active municipal pipeline stage'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Col>
            </Row>
        </Container>
    );
}

export default IssueDetail;