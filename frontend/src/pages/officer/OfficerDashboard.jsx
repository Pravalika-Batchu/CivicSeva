import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api/axios";
import { Container, Row, Col, Badge, Form, Dropdown, Button } from "react-bootstrap";
import { FaSortAmountDown, FaExclamationTriangle, FaShareSquare, FaCheckCircle, FaClock, FaMapMarkerAlt, FaVoteYea } from "react-icons/fa";
import "animate.css";
import "./OfficerDashboard.css"; // Preserving for specific overrides if needed

function OfficerDashboard() {
    const [issues, setIssues] = useState([]);
    const [filteredIssues, setFilteredIssues] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);
    const [filter, setFilter] = useState("recent");
    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const username = localStorage.getItem("username");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchIssues = async () => {
            const accessToken = localStorage.getItem("access");
            if (!accessToken) {
                navigate("/login");
                return;
            }

            try {
                const res = await api.get("/api/assigned_issues/", { headers: { Authorization: `Bearer ${accessToken}` } });
                const unresolved = res.data.filter(issue => issue.status !== "RESOLVED");

                const normalize = (items) => items.map(item => ({
                    ...item,
                    severity: item.severity ? item.severity.charAt(0).toUpperCase() + item.severity.slice(1).toLowerCase() : "Low"
                }));

                setIssues(normalize(unresolved));
                setFilteredIssues(normalize(unresolved));
            } catch (err) {
                if (err.response?.status === 401) {
                    localStorage.removeItem("access");
                    navigate("/login");
                }
                setMessage({ text: "Failed to load issues.", type: "error" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchIssues();
    }, [navigate]);

    useEffect(() => {
        let sorted = [...issues];
        if (filter === "severity") {
            const severityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
            sorted.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));
        } else if (filter === "votes") {
            sorted.sort((a, b) => (b.votes || 0) - (a.votes || 0));
        } else {
            sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        setFilteredIssues(sorted);
    }, [filter, issues]);

    const sendNotification = async (issueId, notifType) => {
        setNotifLoading(true);
        let msg = notifType === "MISCLASSIFICATION"
            ? "This issue does not belong to our department. Please reassign."
            : "Our part is done. Please assign to next department.";

        try {
            const accessToken = localStorage.getItem("access");
            await api.post("/api/department-notifications/send/", { issue_id: issueId, notif_type: notifType, message: msg }, { headers: { Authorization: `Bearer ${accessToken}` } });
            setMessage({ text: "Notification sent to admin!", type: "success" });
            setIssues(prev => prev.map(issue => issue.id === issueId ? { ...issue, [`${notifType}_sent`]: true } : issue));
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ text: "Failed to send notification.", type: "error" });
        } finally {
            setNotifLoading(false);
        }
    };

    const getSeverityBadge = (severity) => {
        const map = { 'Critical': 'bg-danger', 'High': 'bg-warning text-dark', 'Medium': 'bg-info text-dark', 'Low': 'bg-success' };
        return <Badge pill className={map[severity] || 'bg-secondary'}>{severity}</Badge>;
    };

    const IssueCard = ({ issue }) => (
        <Col md={6} lg={4} className="mb-4 animate__animated animate__fadeInUp">
            <div className="glass-panel h-100 p-0 overflow-hidden hover-lift position-relative">
                <div className={`position-absolute top-0 start-0 w-100 h-1 bg-${issue.severity === 'High' || issue.severity === 'Critical' ? 'danger' : 'primary'}`}></div>
                <div className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="d-flex align-items-center gap-2">
                            <span className="text-muted small">#{issue.id}</span>
                            {getSeverityBadge(issue.severity)}
                        </div>
                        <small className="text-muted"><FaClock className="me-1" />{new Date(issue.created_at).toLocaleDateString()}</small>
                    </div>

                    <h5 className="fw-bold text-dark text-truncate mb-2" title={issue.title}>{issue.title}</h5>
                    <p className="text-muted small text-truncate-2 mb-3" style={{ minHeight: '3em' }}>{issue.description}</p>

                    <div className="d-flex align-items-center gap-3 mb-2 text-muted small">
                        <span className="d-flex align-items-center"><FaVoteYea className="me-1 text-primary" /> {issue.votes || 0} Votes</span>
                        <span className="d-flex align-items-center"><FaMapMarkerAlt className="me-1 text-danger" /> Map</span>
                    </div>

                    {issue.community_deadline && (
                        <div className="small mb-3 p-2 bg-warning-subtle rounded border border-warning-subtle text-dark animate__animated animate__pulse animate__infinite">
                            <FaClock className="me-2 text-warning" />
                            <strong>Deadline:</strong> {new Date(issue.community_deadline).toLocaleString()}
                        </div>
                    )}

                    {issue.assigned_to_username && (
                        <div className="small text-primary fw-bold mb-3">
                            👤 Assigned to: {issue.assigned_to_username}
                        </div>
                    )}

                    <div className="d-flex gap-2 border-top pt-3">
                        <Link to={`/officer/issue/${issue.id}`} className="btn btn-outline-primary btn-sm flex-grow-1">Details</Link>

                        {(issue.assigned_to_username === username || !issue.assigned_to_username) && (
                            <Link to={`/officer/issue/${issue.id}`} className="btn btn-success btn-sm flex-grow-1 shadow-sm">
                                <FaCheckCircle className="me-1" /> Resolve
                            </Link>
                        )}

                        <Dropdown>
                            <Dropdown.Toggle variant="light" size="sm" className="border shadow-sm">
                                More
                            </Dropdown.Toggle>
                            <Dropdown.Menu align="end" className="shadow border-0">
                                <Dropdown.Item
                                    onClick={() => sendNotification(issue.id, "MISCLASSIFICATION")}
                                    disabled={notifLoading || issue.MISCLASSIFICATION_sent}
                                    className="text-warning fw-bold small"
                                >
                                    <FaExclamationTriangle className="me-2" /> Misclassified
                                </Dropdown.Item>
                                <Dropdown.Item
                                    onClick={() => sendNotification(issue.id, "MULTI_DEPT_NEXT_STEP")}
                                    disabled={notifLoading || issue.MULTI_DEPT_NEXT_STEP_sent}
                                    className="text-info fw-bold small"
                                >
                                    <FaShareSquare className="me-2" /> Request Handoff
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                </div>
            </div>
        </Col>
    );

    return (
        <Container fluid className="py-5" style={{ minHeight: '100vh', background: 'transparent' }}>
            <div className="d-flex justify-content-between align-items-center mb-5 sticky-top p-3 glass-panel z-10 animate__animated animate__fadeInDown" style={{ backdropFilter: 'blur(15px)', zIndex: 100 }}>
                <div>
                    <h2 className="fw-bold mb-0 text-gradient display-6">Officer Dashboard</h2>
                    <p className="text-muted small mb-0">Manage and resolve assigned civic issues</p>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <FaSortAmountDown className="text-muted" />
                    <Form.Select
                        size="sm"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="border-0 shadow-sm bg-light fw-bold"
                        style={{ width: '130px' }}
                    >
                        <option value="recent">Recent</option>
                        <option value="severity">Severity</option>
                        <option value="votes">Votes</option>
                    </Form.Select>
                </div>
            </div>

            {message && (
                <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} shadow-sm position-fixed top-0 start-50 translate-middle-x mt-4 z-index-toast animate__animated animate__fadeInDown`}>
                    {message.text}
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
            ) : filteredIssues.length === 0 ? (
                <div className="text-center py-5 glass-panel opacity-75 animate__animated animate__fadeIn">
                    <div className="display-1 mb-3">🎉</div>
                    <h3>All caught up!</h3>
                    <p className="text-muted">No pending issues assigned to your department.</p>
                </div>
            ) : (
                <Row>
                    {filteredIssues.map(issue => <IssueCard key={issue.id} issue={issue} />)}
                </Row>
            )}
        </Container>
    );
}

export default OfficerDashboard;