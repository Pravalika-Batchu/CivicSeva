// src/pages/Common/Reports.jsx
// eslint-disable-next-line
import { useEffect, useState } from "react";
import { Modal, Button, Form, Badge, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../services/api/axios";
import { FaThumbsUp, FaThumbsDown, FaMapMarkerAlt, FaUser, FaClock, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import "animate.css";

function Reports() {
    const [reports, setReports] = useState([]);
    const [filteredReports, setFilteredReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState("");
    const [sortOption, setSortOption] = useState("");
    const [userLocation, setUserLocation] = useState(null);
    const [geoError, setGeoError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [csrfToken, setCsrfToken] = useState("");

    const navigate = useNavigate();
    const currentUser = localStorage.getItem("username");
    const accessToken = localStorage.getItem("access");
    const DUPLICATE_THRESHOLD = 2;
    const VOTE_THRESHOLD = 2;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const csrfResponse = await api.get("/api/auth/get-csrf/", { withCredentials: true });
                setCsrfToken(csrfResponse.data.csrfToken);

                if (!accessToken) {
                    setError("Please log in to view reports.");
                    return;
                }

                let queryParams = {};
                if (sortOption === "nearby" && userLocation) {
                    queryParams = {
                        sort: "nearby",
                        lat: userLocation.lat,
                        lng: userLocation.lng
                    };
                }

                const res = await api.get("/api/issues/", {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    params: queryParams
                });

                const severities = ["Low", "Medium", "High", "Critical"];
                const updatedReports = res.data.map((report) => {
                    if (!report.severity || report.severity.trim() === "") {
                        const randomSeverity = severities[Math.floor(Math.random() * severities.length)];
                        return { ...report, severity: randomSeverity };
                    }
                    return { ...report, severity: report.severity.charAt(0).toUpperCase() + report.severity.slice(1).toLowerCase() };
                });

                setReports(updatedReports);
                setFilteredReports(updatedReports);
            } catch (err) {
                console.error("Error fetching reports:", err);
                setError("Failed to load reports. Please try again.");
            } finally {
                setLoading(false);
            }
        };


        // Wait for location if nearby is selected
        if (sortOption === "nearby" && !userLocation) return;

        fetchData();
    }, [accessToken, sortOption, userLocation]);

    useEffect(() => {
        if (sortOption === "nearby") {
            if (!navigator.geolocation) {
                setGeoError("Geolocation is not supported by your browser.");
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    setGeoError(null);
                },
                (err) => {
                    console.error("Geolocation error:", err);
                    setGeoError("Unable to retrieve your location. Please enable location services.");
                }
            );
        }
    }, [sortOption]);

    useEffect(() => {
        // Re-fetch when sortOption is nearby and we have location
        // or when simply filtering local state for other sorts
        if (sortOption === "nearby") {
            // For nearby, we rely on the API response which we fetch in the main useEffect
            // We need to trigger a refetch or handle it here. 
            // Actually, simplest way is to add userLocation and sortOption to the main fetch dependency.
            // But existing code handles local sorting for other options.
            // We'll skip local sort if it's nearby, as the API does it.
            return;
        }

        let filtered = [...reports];

        if (statusFilter === "high-priority") {
            filtered = filtered.filter(
                (report) =>
                    (report.upvotes || 0) > VOTE_THRESHOLD ||
                    (report.duplicate_count || 0) > DUPLICATE_THRESHOLD
            );
        } else if (statusFilter) {
            filtered = filtered.filter(
                (report) => report.status.toLowerCase() === statusFilter.toLowerCase()
            );
        } else {
            filtered = filtered.filter((report) => report.status.toLowerCase() !== "resolved");
        }

        if (sortOption === "high-priority-first") {
            filtered.sort((a, b) => {
                const aIsHigh = (a.upvotes || 0) > VOTE_THRESHOLD || (a.duplicate_count || 0) > DUPLICATE_THRESHOLD ? 1 : 0;
                const bIsHigh = (b.upvotes || 0) > VOTE_THRESHOLD || (b.duplicate_count || 0) > DUPLICATE_THRESHOLD ? 1 : 0;
                return bIsHigh - aIsHigh;
            });
        } else if (sortOption === "most-votes") {
            filtered.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
        } else if (sortOption === "least-votes") {
            filtered.sort((a, b) => (a.upvotes || 0) - (b.upvotes || 0));
        } else if (sortOption === "severity-high-to-low") {
            const sevOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
            filtered.sort((a, b) => (sevOrder[b.severity] || 0) - (sevOrder[a.severity] || 0));
        } else if (sortOption === "severity-low-to-high") {
            const sevOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
            filtered.sort((a, b) => (sevOrder[a.severity] || 0) - (sevOrder[b.severity] || 0));
        }

        setFilteredReports(filtered);
    }, [reports, statusFilter, sortOption]); // Removed userLocation from dependency to avoid infinite loop with main fetch

    // Trigger fetch on sort/location change for nearby
    useEffect(() => {
        if (sortOption === "nearby" && userLocation) {
            // Re-run the main fetch logic
            // We can extract fetch logic or just force a re-render. 
            // Ideally we should move fetch logic to a reusable function or add deps to the main useEffect.
            // Let's modify the main useEffect's dependency array.
        }
    }, [sortOption, userLocation]);

    const handleVote = async (issueId, voteType) => {
        if (!accessToken) {
            alert("Please log in to vote.");
            return;
        }

        try {
            const endpoint = `/api/issues/${issueId}/${voteType.toLowerCase()}/`;
            const res = await api.post(endpoint, {}, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "X-CSRFToken": csrfToken,
                },
            });

            const updateReport = (list) => list.map(r => r.id === issueId ? { ...r, ...res.data } : r);
            setReports(prev => updateReport(prev));
            if (selectedReport?.id === issueId) {
                setSelectedReport(prev => ({ ...prev, ...res.data }));
            }
        } catch (err) {
            console.error(`Error ${voteType}:`, err);
            alert(err.response?.data?.error || `Failed to ${voteType}.`);
        }
    };

    const handleRequestSolve = async (issueId) => {
        if (!accessToken) return;
        try {
            await api.post(`/api/issues/request_solve/${issueId}/`, {}, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "X-CSRFToken": csrfToken,
                },
            });
            alert("✅ Request sent to admin!");
            closeModal();
        } catch (err) {
            console.error("Error requesting solve:", err);
            alert("❌ Time limit exceeded.");
        }
    };

    const exportToCSV = () => {
        const headers = ["ID,Title,Status,Severity,Department,Reported by,Assigned to,Duplicate Count,Upvotes,Address"];
        const rows = filteredReports.map(report => [
            report.id,
            `"${report.title.replace(/"/g, '""')}"`,
            report.status,
            report.severity || "Not specified",
            report.department_name || "Unassigned",
            report.citizen_username || "Unknown",
            report.assigned_to_username || "Unassigned",
            report.duplicate_count || 0,
            report.upvotes || 0,
            `"${(report.address || "").replace(/"/g, '""')}"`
        ].join(','));

        const blob = new Blob([[...headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'CivicSeva_Reports.csv';
        link.click();
    };

    const openModal = (report) => {
        setSelectedReport(report);
        setShowModal(true);
    };

    const closeModal = () => {
        setSelectedReport(null);
        setShowModal(false);
    };

    const getStatusBadge = (status) => {
        const styles = {
            'Pending': 'bg-warning text-dark',
            'In Progress': 'bg-info text-dark',
            'Resolved': 'bg-success',
            'Rejected': 'bg-danger'
        };
        return <Badge className={styles[status] || 'bg-secondary'}>{status}</Badge>;
    };

    const getSeverityBadge = (severity) => {
        const styles = {
            'Critical': 'bg-danger',
            'High': 'bg-warning text-dark',
            'Medium': 'bg-primary',
            'Low': 'bg-success'
        };
        return <Badge className={styles[severity] || 'bg-secondary'}>{severity}</Badge>;
    };

    const isVolunteerWindowActive = (report) => {
        if (!report.volunteer_deadline || report.status === 'RESOLVED' || report.assigned_to_username) return false;
        return new Date(report.volunteer_deadline) > new Date();
    };

    return (
        <div className="container-fluid py-4" style={{ minHeight: '100vh' }}>
            {/* Header & Filters */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3 sticky-top p-3 glass-panel z-10" style={{ backdropFilter: 'blur(20px)', zIndex: 100 }}>
                <h2 className="m-0 fw-bold d-flex align-items-center gap-2">
                    <span className="fs-1">📄</span> Public Feed
                </h2>

                <div className="d-flex gap-2 flex-wrap">
                    <Form.Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="form-control-sm border-0 shadow-sm"
                        style={{ width: "180px" }}
                    >
                        <option value="">All Active Reports</option>
                        <option value="high-priority">🔥 High Priority</option>
                        <option value="Pending">⏳ Pending</option>
                        <option value="In Progress">🚧 In Progress</option>
                        <option value="Resolved">✅ Resolved</option>
                    </Form.Select>

                    <Form.Select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="form-control-sm border-0 shadow-sm"
                        style={{ width: "160px" }}
                    >
                        <option value="">Sort by</option>
                        <option value="nearby">📍 Nearby</option>
                        <option value="high-priority-first">Priority</option>
                        <option value="most-votes">Most Votes</option>
                        <option value="severity-high-to-low">Severity (High)</option>
                    </Form.Select>

                    {filteredReports.length > 0 && (
                        <Button variant="outline-primary" size="sm" onClick={exportToCSV}>
                            Export CSV
                        </Button>
                    )}
                </div>
            </div>

            {loading && (
                <div className="text-center py-5">
                    <Spinner animation="grow" variant="primary" />
                    <p className="mt-2 text-muted">Loading community reports...</p>
                </div>
            )}

            {error && <div className="alert alert-danger shadow-sm">{error}</div>}
            {geoError && <div className="alert alert-warning shadow-sm">{geoError}</div>}

            {!loading && !error && (
                <div className="row g-4 px-2">
                    {filteredReports.map((report, idx) => (
                        <div key={report.id} className="col-md-6 col-lg-4 col-xl-3 animate__animated animate__fadeInUp" style={{ animationDelay: `${idx * 0.05}s` }}>
                            <div
                                className="glass-panel h-100 p-0 border-0 shadow-sm hover-lift cursor-pointer overflow-hidden position-relative"
                                onClick={() => openModal(report)}
                            >
                                {((report.upvotes || 0) > VOTE_THRESHOLD || report.duplicate_count > DUPLICATE_THRESHOLD) && (
                                    <div className="position-absolute top-0 end-0 bg-danger text-white px-2 py-1 small fw-bold rounded-bottom-start shadow-sm">
                                        🔥 Hot
                                    </div>
                                )}

                                <div className="p-3">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <h5 className="fw-bold mb-0 text-truncate pe-3" title={report.title}>
                                            {report.title}
                                        </h5>
                                        {getSeverityBadge(report.severity)}
                                    </div>

                                    <p className="text-muted small mb-3 text-truncate-3" style={{ minHeight: '3em' }}>
                                        {report.description}
                                    </p>

                                    <div className="d-flex flex-wrap gap-2 mb-3">
                                        {getStatusBadge(report.status)}
                                        {isVolunteerWindowActive(report) && (
                                            <Badge bg="success" className="animate__animated animate__pulse animate__infinite">
                                                🙋 Waiting for Volunteer
                                            </Badge>
                                        )}
                                        <Badge bg="light" text="dark" className="border">
                                            {report.department_name || "Unassigned"}
                                        </Badge>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center small text-muted border-top pt-2 mt-auto">
                                        <div className="d-flex align-items-center gap-1">
                                            <FaUser /> {report.citizen_username || "Anon"}
                                        </div>
                                        <div className="d-flex align-items-center gap-1">
                                            <FaMapMarkerAlt /> {report.distance ? `${report.distance.toFixed(1)}km` : "Map"}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-light bg-opacity-50 p-2 d-flex justify-content-between align-items-center border-top">
                                    <div className="d-flex gap-2">
                                        <button
                                            className="btn btn-sm btn-outline-success border-0 rounded-pill d-flex align-items-center gap-1"
                                            onClick={(e) => { e.stopPropagation(); handleVote(report.id, "Upvote"); }}
                                        >
                                            <FaThumbsUp /> {report.upvotes || 0}
                                        </button>
                                        <button
                                            className="btn btn-sm btn-outline-danger border-0 rounded-pill d-flex align-items-center gap-1"
                                            onClick={(e) => { e.stopPropagation(); handleVote(report.id, "Downvote"); }}
                                        >
                                            <FaThumbsDown /> {report.downvotes || 0}
                                        </button>
                                    </div>
                                    <small className="text-muted">
                                        #{report.id}
                                    </small>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredReports.length === 0 && (
                        <div className="col-12 text-center py-5 text-muted">
                            <h4>No reports match your filters.</h4>
                            <p>Try adjusting the filters or report a new issue!</p>
                        </div>
                    )}
                </div>
            )}

            {/* Detail Modal */}
            <Modal show={showModal} onHide={closeModal} size="lg" centered>
                {selectedReport && (
                    <>
                        <Modal.Header closeButton className="border-0 bg-light">
                            <Modal.Title className="fw-bold d-flex align-items-center gap-2">
                                #{selectedReport.id}: {selectedReport.title}
                                {getSeverityBadge(selectedReport.severity)}
                            </Modal.Title>
                        </Modal.Header>
                        <Modal.Body className="p-4">
                            <div className="row g-4">
                                <div className="col-md-8">
                                    <h6 className="fw-bold text-uppercase text-muted small">Description</h6>
                                    <p className="lead fs-6">{selectedReport.description}</p>

                                    <div className="d-flex gap-3 my-3">
                                        <div className="p-2 bg-light rounded text-center min-w-100">
                                            <div className="fw-bold fs-4 text-success">{selectedReport.upvotes || 0}</div>
                                            <div className="small text-muted">Upvotes</div>
                                        </div>
                                        <div className="p-2 bg-light rounded text-center min-w-100">
                                            <div className="fw-bold fs-4 text-warning">{selectedReport.duplicate_count || 0}</div>
                                            <div className="small text-muted">Duplicates</div>
                                        </div>
                                    </div>

                                    {selectedReport.photo_url && (
                                        <div className="mt-3">
                                            <img src={selectedReport.photo_url} alt="Evidence" className="img-fluid rounded shadow-sm" />
                                        </div>
                                    )}
                                </div>
                                <div className="col-md-4 border-start">
                                    <h6 className="fw-bold text-uppercase text-muted small mb-3">Details</h6>
                                    <ul className="list-unstyled d-flex flex-column gap-3">
                                        <li className="d-flex align-items-center gap-2">
                                            <FaCheckCircle className="text-primary" />
                                            <div>
                                                <small className="d-block text-muted">Status</small>
                                                <span className="fw-bold">{selectedReport.status}</span>
                                            </div>
                                        </li>
                                        <li className="d-flex align-items-center gap-2">
                                            <FaUser className="text-secondary" />
                                            <div>
                                                <small className="d-block text-muted">Reported By</small>
                                                <span className="fw-bold">{selectedReport.citizen_username || "Unknown"}</span>
                                            </div>
                                        </li>
                                        {selectedReport.address && (
                                            <li className="d-flex align-items-start gap-2">
                                                <FaMapMarkerAlt className="text-danger mt-1" />
                                                <div>
                                                    <small className="d-block text-muted">Location</small>
                                                    <span className="small">{selectedReport.address}</span>
                                                </div>
                                            </li>
                                        )}
                                    </ul>

                                    {selectedReport.community_deadline && selectedReport.assigned_to_username === currentUser && (
                                        <div className="mt-3 p-2 bg-warning-subtle rounded border border-warning text-dark small">
                                            <strong>⏰ Deadline:</strong> {new Date(selectedReport.community_deadline).toLocaleString()}
                                        </div>
                                    )}

                                    {isVolunteerWindowActive(selectedReport) && (
                                        <div className="mt-3 p-2 bg-success-subtle rounded border border-success text-dark small">
                                            <strong>🙋 Volunteer Window:</strong> Active until {new Date(selectedReport.volunteer_deadline).toLocaleTimeString()}
                                        </div>
                                    )}

                                    {selectedReport.assigned_to_username === currentUser && selectedReport.status !== 'RESOLVED' ? (
                                        <Button
                                            variant="success"
                                            className="w-100 mt-4 rounded-pill fw-bold shadow-sm"
                                            onClick={() => navigate(`/issue/${selectedReport.id}/resolve`)}
                                        >
                                            🛠️ Resolve Issue Now
                                        </Button>
                                    ) : (
                                        !selectedReport.assigned_to_username && selectedReport.status !== 'RESOLVED' && (
                                            <Button
                                                variant={isVolunteerWindowActive(selectedReport) ? "outline-primary" : "secondary"}
                                                className="w-100 mt-4 rounded-pill"
                                                onClick={() => handleRequestSolve(selectedReport.id)}
                                                disabled={!isVolunteerWindowActive(selectedReport)}
                                                style={{ cursor: isVolunteerWindowActive(selectedReport) ? "pointer" : "not-allowed" }}
                                            >
                                                {isVolunteerWindowActive(selectedReport) ? "🙋 Volunteer to Solve" : "⛔ Volunteer Window Closed"}
                                            </Button>
                                        )
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
                                </div>
                            </div>
                        </Modal.Body>
                        <Modal.Footer className="border-0">
                            <Button variant="secondary" onClick={closeModal}>Close</Button>
                        </Modal.Footer>
                    </>
                )}
            </Modal>
        </div>
    );
}

export default Reports;