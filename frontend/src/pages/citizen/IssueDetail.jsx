import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api/axios';
import './IssueDetail.css';

function IssueDetail() {
    const { id } = useParams(); // Get issue ID from URL
    const navigate = useNavigate();
    const [issue, setIssue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const accessToken = localStorage.getItem('access');

    useEffect(() => {
        const fetchIssue = async () => {
            try {
                const response = await api.get(`/api/issues/${id}/`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                setIssue(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching issue:', err.response?.data || err.message);
                setError(
                    err.response?.status === 403
                        ? 'You do not have permission to view this issue.'
                        : 'Failed to load issue details. The issue may not exist or there was a server error.'
                );
                setLoading(false);
            }
        };
        fetchIssue();
    }, [id, accessToken]);

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
        <div className="issue-detail-container">
            <header className="issue-header">
                <h1>Issue #{issue.id}: {issue.title}</h1>
                <button onClick={() => navigate('/issue-map')} className="btn btn-secondary">Back to Map</button>
            </header>
            <div className="issue-content">
                <div className="issue-section">
                    <h2>Overview</h2>
                    <p><strong>Title:</strong> {issue.title}</p>
                    <p><strong>Description:</strong> {issue.description}</p>
                    {issue.details && <p><strong>Details:</strong> {issue.details}</p>}
                    <p><strong>Severity:</strong> <span className={`severity ${issue.severity.toLowerCase()}`}>{issue.severity}</span></p>
                    <p><strong>Status:</strong> {issue.status}</p>
                    <p><strong>Category:</strong> {issue.category}</p>
                    <p><strong>Department:</strong> {issue.department_name || 'None'}</p>
                </div>
                <div className="issue-section">
                    <h2>Location</h2>
                    <p><strong>Address:</strong> {issue.address || 'Not specified'}</p>
                    <p><strong>Coordinates:</strong> ({issue.latitude}, {issue.longitude})</p>
                </div>
                {issue.photo && (
                    <div className="issue-section">
                        <h2>Photo</h2>
                        <img src={issue.photo} alt="Issue" className="issue-image" />
                    </div>
                )}
                {(issue.resolution_description || issue.resolution_proof) && (
                    <div className="issue-section">
                        <h2>Resolution</h2>
                        {issue.resolution_description && (
                            <p><strong>Resolution Description:</strong> {issue.resolution_description}</p>
                        )}
                        {issue.resolution_proof && (
                            <div>
                                <p><strong>Resolution Proof:</strong></p>
                                <img src={issue.resolution_proof} alt="Resolution Proof" className="issue-image" />
                            </div>
                        )}
                        <p><strong>Approved:</strong> {issue.is_approved ? 'Yes' : 'No'}</p>
                    </div>
                )}
                <div className="issue-section">
                    <h2>Timestamps</h2>
                    <p><strong>Created At:</strong> {new Date(issue.created_at).toLocaleString()}</p>
                    <p><strong>Updated At:</strong> {new Date(issue.updated_at).toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
}

export default IssueDetail;