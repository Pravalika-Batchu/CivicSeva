import { useEffect, useState } from "react";
import { Modal, Button, Form, Badge, Container, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../services/api/axios";
import { FaThumbsUp, FaThumbsDown, FaTrash, FaCheckCircle, FaMapMarkerAlt, FaClock, FaSearch } from "react-icons/fa";
import "animate.css";
import "./MyReports.css";

function MyReports() {
    const [reports, setReports] = useState([]);
    const [filteredReports, setFilteredReports] = useState([]);
    const [assignedIssues, setAssignedIssues] = useState([]);
    const [filteredAssignedIssues, setFilteredAssignedIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("");
    const [sortOption] = useState("newest"); // Default sort
    const [showModal, setShowModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [searchTerm, setSearchTerm] = useState(""); // Added search

    const navigate = useNavigate();
    const accessToken = localStorage.getItem("access");

    // Unified fetch for reports and assigned issues to reduce boilerplate
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            if (!accessToken) {
                setLoading(false);
                return;
            }

            try {
                const [myReportsRes, assignedRes] = await Promise.all([
                    api.get("/api/my-reports/", { headers: { Authorization: `Bearer ${accessToken}` } }),
                    api.get("/api/assigned-issues/", { headers: { Authorization: `Bearer ${accessToken}` } })
                ]);

                const normalize = (items) => items.map(item => ({
                    ...item,
                    severity: item.severity ? item.severity.charAt(0).toUpperCase() + item.severity.slice(1).toLowerCase() : "Low"
                }));

                setReports(normalize(myReportsRes.data));
                setFilteredReports(normalize(myReportsRes.data));

                setAssignedIssues(normalize(assignedRes.data));
                setFilteredAssignedIssues(normalize(assignedRes.data));

            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [accessToken]);


    // Filtering and Sorting Logic
    useEffect(() => {
        const filterAndSort = (data) => {
            let filtered = [...data];

            if (statusFilter) {
                filtered = filtered.filter(item => item.status && item.status.toLowerCase() === statusFilter.toLowerCase());
            }

            if (searchTerm) {
                const lowerTerm = searchTerm.toLowerCase();
                filtered = filtered.filter(item =>
                    (item.title && item.title.toLowerCase().includes(lowerTerm)) ||
                    (item.description && item.description.toLowerCase().includes(lowerTerm))
                );
            }

            if (sortOption === "most-votes") {
                filtered.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
            } else if (sortOption === "severity-high") {
                const sevOrder = { High: 3, Medium: 2, Low: 1 };
                filtered.sort((a, b) => (sevOrder[b.severity] || 0) - (sevOrder[a.severity] || 0));
            } else if (sortOption === "newest") {
                filtered.sort((a, b) => b.id - a.id); // Assuming higher ID is newer
            }

            return filtered;
        };

        setFilteredReports(filterAndSort(reports));
        setFilteredAssignedIssues(filterAndSort(assignedIssues));

    }, [reports, assignedIssues, statusFilter, sortOption, searchTerm]);


    const openModal = (report, isAssigned = false) => {
        setSelectedReport({ ...report, isAssigned });
        setShowModal(true);
    };

    const closeModal = () => {
        setSelectedReport(null);
        setShowModal(false);
    };

    const handleAction = async (action, issueId) => {
        // ... (Keep existing logic but handle errors gracefully)
        if (!accessToken) return alert("Please log in.");
        try {
            let res;
            if (action === "upvote" || action === "downvote") {
                res = await api.post(`/api/issues/${issueId}/${action}/`, {}, { headers: { Authorization: `Bearer ${accessToken}` } });
            } else if (action === "delete") {
                await api.delete(`/api/issues/delete/${issueId}/`, { headers: { Authorization: `Bearer ${accessToken}` } });
                // Update local state immediately
                setReports(prev => prev.filter(r => r.id !== issueId));
                setFilteredReports(prev => prev.filter(r => r.id !== issueId));
                alert("Report deleted.");
                closeModal();
                return;
            } else if (action === "approve") {
                res = await api.post(`/api/issues/${issueId}/approve_resolution/`, {}, { headers: { Authorization: `Bearer ${accessToken}` } });
            }

            // Generic update for modify actions
            if (res && res.data) {
                const updateList = list => list.map(item => item.id === issueId ? { ...item, ...res.data, status: action === 'approve' ? 'RESOLVED' : item.status } : item);
                setReports(prev => updateList(prev));
                setAssignedIssues(prev => updateList(prev));
                if (selectedReport?.id === issueId) {
                    setSelectedReport(prev => ({ ...prev, ...res.data, status: action === 'approve' ? 'RESOLVED' : prev.status }));
                }
                if (action === 'approve') alert("Resolution approved!");
            }
        } catch (err) {
            alert(err.response?.data?.error || "Action failed.");
        }
    };

    const getStatusBadge = (status) => {
        const map = {
            'OPEN': 'bg-primary',
            'ASSIGNED': 'bg-info text-dark',
            'IN_PROGRESS': 'bg-warning text-dark',
            'RESOLVED': 'bg-success',
            'PENDING_APPROVAL': 'bg-secondary',
            'CLOSED': 'bg-dark'
        };
        return <Badge pill className={`${map[status] || 'bg-light text-dark'} px-3 py-2 shadow-sm`}>{status}</Badge>;
    };

    const getSeverityBadge = (severity) => {
        const map = {
            'High': 'bg-danger',
            'Medium': 'bg-warning text-dark',
            'Low': 'bg-success'
        };
        return <Badge pill className={`${map[severity] || 'bg-secondary'} me-2`}>{severity}</Badge>;
    };

    // Card Component for consistency
    const ReportCard = ({ item, isAssigned }) => (
        <Col md={6} lg={4} className="mb-4 animate__animated animate__fadeInUp">
            <div
                className="glass-panel h-100 position-relative hover-lift cursor-pointer p-0 overflow-hidden"
                onClick={() => openModal(item, isAssigned)}
                style={{ transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)' }}
            >
                {/* Decorative Accent */}
                <div className="position-absolute top-0 start-0 w-100" style={{ height: '4px', background: 'linear-gradient(90deg, #667eea, #764ba2)' }}></div>

                <div className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                        {getSeverityBadge(item.severity)}
                        <small className="text-muted"><FaClock className="me-1" />#{item.id}</small>
                    </div>

                    <h5 className="fw-bold text-dark mb-2 text-truncate" title={item.title}>
                        {item.title}
                        {item.duplicate_count > 0 && <Badge bg="danger" className="ms-2 small" pill>+{item.duplicate_count}</Badge>}
                    </h5>

                    <p className="text-secondary small mb-3 text-truncate-2" style={{ minHeight: '40px' }}>
                        {item.description}
                    </p>

                    <div className="d-flex align-items-center gap-2 mb-2">
                        <FaMapMarkerAlt className="text-primary" />
                        <span className="small text-muted text-truncate">{item.address || "Location not provided"}</span>
                    </div>

                    {item.community_deadline && isAssigned && item.status !== 'RESOLVED' && (
                        <div className="small mb-3 p-2 bg-warning-subtle rounded border border-warning-subtle text-dark animate__animated animate__pulse animate__infinite">
                            <FaClock className="me-2 text-warning" />
                            <strong>Deadline:</strong> {new Date(item.community_deadline).toLocaleString()}
                        </div>
                    )}

                    {isAssigned && item.status !== 'RESOLVED' && item.status !== 'PENDING_APPROVAL' && (
                        <Button
                            variant="success"
                            size="sm"
                            className="w-100 rounded-pill mb-2 shadow-sm fw-bold"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/issue/${item.id}/resolve`);
                            }}
                        >
                            <FaCheckCircle className="me-1" /> Resolve Now
                        </Button>
                    )}

                    <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-light">
                        {getStatusBadge(item.status)}
                        <div className="d-flex gap-2">
                            <span className="d-flex align-items-center text-success small fw-bold">
                                <FaThumbsUp className="me-1" /> {item.upvotes || 0}
                            </span>
                            <span className="d-flex align-items-center text-danger small fw-bold">
                                <FaThumbsDown className="me-1" /> {item.downvotes || 0}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions Overlay on Hover (Optional, maybe keep simple for now) */}
            </div>
        </Col>
    );

    return (
        <Container fluid className="py-5" style={{ minHeight: '100vh', background: 'transperant' }}>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5 animate__animated animate__fadeInDown">
                <div>
                    <h2 className="display-5 fw-bold text-gradient mb-0">My Activity</h2>
                    <p className="text-muted mt-2">Manage your reported issues and assigned tasks</p>
                </div>
                <div className="d-flex gap-2 flex-wrap mt-3 mt-md-0">
                    <div className="position-relative">
                        <FaSearch className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                        <Form.Control
                            type="text"
                            placeholder="Search..."
                            className="ps-5 rounded-pill border-0 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Form.Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-pill border-0 shadow-sm"
                        style={{ width: '150px' }}
                    >
                        <option value="">All Status</option>
                        <option value="OPEN">Open</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="IN_PROGRESS">In Progress</option>
                    </Form.Select>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                </div>
            ) : (
                <>
                    {/* My Reports Section */}
                    <div className="mb-5">
                        <h4 className="fw-bold mb-4 d-flex align-items-center">
                            <span className="me-2 fs-3">📢</span> Reported by Me
                            <Badge bg="light" text="dark" className="ms-2 border rounded-circle">{filteredReports.length}</Badge>
                        </h4>

                        {filteredReports.length === 0 ? (
                            <div className="text-center py-5 glass-panel opacity-75">
                                <h5 className="text-muted">No reports found.</h5>
                                <Button variant="primary" className="mt-3 rounded-pill" onClick={() => navigate('/report')}>Report an Issue</Button>
                            </div>
                        ) : (
                            <Row>
                                {filteredReports.map(report => <ReportCard key={report.id} item={report} />)}
                            </Row>
                        )}
                    </div>

                    {/* Assigned Issues Section (If any) */}
                    {assignedIssues.length > 0 && (
                        <div className="mb-5">
                            <h4 className="fw-bold mb-4 d-flex align-items-center text-primary">
                                <span className="me-2 fs-3">🛠️</span> Assigned to Me
                                <Badge bg="primary" className="ms-2 rounded-circle">{filteredAssignedIssues.length}</Badge>
                            </h4>
                            <Row>
                                {filteredAssignedIssues.map(issue => <ReportCard key={issue.id} item={issue} isAssigned={true} />)}
                            </Row>
                        </div>
                    )}
                </>
            )}

            {/* Detail Modal */}
            <Modal show={showModal} onHide={closeModal} size="lg" centered contentClassName="border-0 shadow-lg" style={{ backdropFilter: 'blur(5px)' }}>
                {selectedReport && (
                    <>
                        <Modal.Header closeButton className="border-0 bg-light-subtle">
                            <Modal.Title className="fw-bold d-flex align-items-center gap-2">
                                <span className="text-muted small me-2">#{selectedReport.id}</span>
                                {selectedReport.title}
                            </Modal.Title>
                        </Modal.Header>
                        <Modal.Body className="p-4">
                            {getStatusBadge(selectedReport.status)}
                            {getSeverityBadge(selectedReport.severity)}

                            <div className="mt-4">
                                <h6 className="fw-bold text-uppercase text-muted small">Description</h6>
                                <p className="lead fs-6">{selectedReport.description}</p>
                            </div>

                            {selectedReport.address && (
                                <div className="mt-3">
                                    <h6 className="fw-bold text-uppercase text-muted small">Location</h6>
                                    <p><FaMapMarkerAlt className="text-danger me-2" />{selectedReport.address}</p>
                                </div>
                            )}

                            {selectedReport.community_deadline && selectedReport.isAssigned && (
                                <div className="mt-3 p-3 bg-warning-subtle rounded-3 border border-warning">
                                    <h6 className="fw-bold text-warning-emphasis mb-2"><FaClock className="me-2" />Community Deadline</h6>
                                    <p className="mb-0">Please resolve this issue by: <strong>{new Date(selectedReport.community_deadline).toLocaleString()}</strong></p>
                                </div>
                            )}

                            {selectedReport.photo_url && (
                                <div className="mt-3">
                                    <h6 className="fw-bold text-uppercase text-muted small">Photo Evidence</h6>
                                    <img src={selectedReport.photo_url} alt="Evidence" className="img-fluid rounded-3 shadow-sm" style={{ maxHeight: '300px' }} />
                                </div>
                            )}

                            {(selectedReport.status === 'RESOLVED' || selectedReport.status === 'PENDING_APPROVAL') && selectedReport.resolution_description && (
                                <div className="mt-4 p-3 bg-success-subtle rounded-3 border border-success">
                                    <h6 className="fw-bold text-success mb-2"><FaCheckCircle className="me-2" />Resolution Details</h6>
                                    <p className="mb-2">{selectedReport.resolution_description}</p>
                                    {selectedReport.resolution_proof && <img src={selectedReport.resolution_proof} className="img-fluid rounded mt-2" style={{ maxHeight: '200px' }} alt="Proof" />}
                                    <div className="small text-muted mt-2">
                                        Resolved by {selectedReport.resolver_info ? `${selectedReport.resolver_info.username} (${selectedReport.resolver_info.role})` : (selectedReport.resolved_by?.username || 'Officer')}
                                    </div>
                                </div>
                            )}

                        </Modal.Body>
                        <Modal.Footer className="border-0 bg-light-subtle d-flex justify-content-between">
                            <Button variant="light" onClick={closeModal} className="rounded-pill px-4">Close</Button>
                            <div className="d-flex gap-2">
                                {!selectedReport.isAssigned && (
                                    <>
                                        <Button variant="outline-danger" className="rounded-pill" onClick={() => handleAction('delete', selectedReport.id)}><FaTrash className="me-2" />Delete</Button>
                                    </>
                                )}
                                {selectedReport.status === 'PENDING_APPROVAL' && !selectedReport.isAssigned && (
                                    <Button variant="success" className="rounded-pill text-white fw-bold shadow-sm" onClick={() => handleAction('approve', selectedReport.id)}>
                                        <FaCheckCircle className="me-2" />Approve Fix
                                    </Button>
                                )}
                                {selectedReport.isAssigned && selectedReport.status !== 'RESOLVED' && selectedReport.status !== 'PENDING_APPROVAL' && (
                                    <Button variant="success" className="rounded-pill text-white fw-bold shadow-sm" onClick={() => navigate(`/issue/${selectedReport.id}/resolve`)}>
                                        <FaCheckCircle className="me-2" />Resolve Issue
                                    </Button>
                                )}
                            </div>
                        </Modal.Footer>
                    </>
                )}
            </Modal>
        </Container>
    );
}

export default MyReports;