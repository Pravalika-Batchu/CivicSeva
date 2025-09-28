// src/pages/Common/Reports.jsx
// eslint-disable-next-line
import { useEffect, useState } from "react";
import { Modal, Button, Form, Alert, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../services/api/axios";

function Reports() {
    const [reports, setReports] = useState([]);
    const [filteredReports, setFilteredReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState("");
    const [sortOption, setSortOption] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [csrfToken, setCsrfToken] = useState("");

    const navigate = useNavigate();
    const currentUser = localStorage.getItem("username");
    const accessToken = localStorage.getItem("access");
    const DUPLICATE_THRESHOLD = 2; // Threshold for duplicate count
    const VOTE_THRESHOLD = 2; // Threshold for upvotes

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const csrfResponse = await api.get("/api/auth/get-csrf/", { withCredentials: true });
                setCsrfToken(csrfResponse.data.csrfToken);

                if (!accessToken) {
                    setError("Please log in to view reports.");
                    setLoading(false);
                    return;
                }

                // Fetch all reports (we'll filter high-priority client-side)
                const res = await api.get("/api/issues/", {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });

                const severities = ["Low", "Medium", "High", "Critical"];
                const updatedReports = res.data.map((report) => {
                    if (!report.severity || report.severity.trim() === "") {
                        const randomSeverity = severities[Math.floor(Math.random() * severities.length)];
                        return { ...report, severity: randomSeverity };
                    }
                    const normalizedSeverity =
                        report.severity.charAt(0).toUpperCase() +
                        report.severity.slice(1).toLowerCase();
                    return { ...report, severity: normalizedSeverity };
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
        fetchData();
    }, [accessToken]);

    useEffect(() => {
        let filtered = [...reports];

        // Apply status filters
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
            filtered = filtered.filter(
                (report) => report.status.toLowerCase() !== "resolved"
            );
        }

        // Apply sorting
        if (sortOption === "high-priority-first") {
            filtered.sort((a, b) => {
                const aIsHighPriority = (a.upvotes || 0) > VOTE_THRESHOLD || (a.duplicate_count || 0) > DUPLICATE_THRESHOLD ? 1 : 0;
                const bIsHighPriority = (b.upvotes || 0) > VOTE_THRESHOLD || (b.duplicate_count || 0) > DUPLICATE_THRESHOLD ? 1 : 0;
                return bIsHighPriority - aIsHighPriority; // High-priority reports come first
            });
        } else if (sortOption === "most-votes") {
            filtered.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
        } else if (sortOption === "least-votes") {
            filtered.sort((a, b) => (a.upvotes || 0) - (b.upvotes || 0));
        } else if (sortOption === "severity-high-to-low") {
            const sevOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
            filtered.sort(
                (a, b) => (sevOrder[b.severity] || 0) - (sevOrder[a.severity] || 0)
            );
        } else if (sortOption === "severity-low-to-high") {
            const sevOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
            filtered.sort(
                (a, b) => (sevOrder[a.severity] || 0) - (sevOrder[b.severity] || 0)
            );
        }

        setFilteredReports(filtered);
    }, [reports, statusFilter, sortOption]);

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

            setReports((prevReports) =>
                prevReports.map((report) =>
                    report.id === issueId
                        ? {
                            ...report,
                            upvotes: res.data.upvotes,
                            downvotes: res.data.downvotes,
                            duplicate_count: res.data.duplicate_count,
                            severity: res.data.severity
                        }
                        : report
                )
            );
            setFilteredReports((prevFiltered) =>
                prevFiltered.map((report) =>
                    report.id === issueId
                        ? {
                            ...report,
                            upvotes: res.data.upvotes,
                            downvotes: res.data.downvotes,
                            duplicate_count: res.data.duplicate_count,
                            severity: res.data.severity
                        }
                        : report
                )
            );
            if (selectedReport?.id === issueId) {
                setSelectedReport((prev) => ({
                    ...prev,
                    upvotes: res.data.upvotes,
                    downvotes: res.data.downvotes,
                    duplicate_count: res.data.duplicate_count,
                    severity: res.data.severity
                }));
            }

            alert(`${voteType} successful!`);
        } catch (err) {
            console.error(`Error ${voteType.toLowerCase()}voting:`, err);
            alert(
                err.response?.data?.error ||
                `Failed to ${voteType.toLowerCase()}vote.`
            );
        }
    };

    const handleRequestSolve = async (issueId) => {
        if (!accessToken) {
            alert("Please log in to request solve.");
            return;
        }

        try {
            await api.post(`/api/issues/request_solve/${issueId}/`, {}, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "X-CSRFToken": csrfToken,
                },
            });
            alert("✅ Request sent to admin for assignment!");
            closeModal();
        } catch (err) {
            console.error("Error requesting solve:", err);
            alert(err.response?.data?.error || "❌ Failed to request solve.");
        }
    };

    const exportToCSV = () => {
        const headers = ["ID,Title,Status,Severity,Department,Reported by,Assigned to,Duplicate Count,Upvotes,Address"];
        const rows = filteredReports.map(report => [
            report.id,
            `"${report.title.replace(/"/g, '""')}"`,
            report.status,
            report.severity || "Not specified",
            report.department_name || "General Department",
            report.citizen_username || "Unknown",
            report.assigned_to_username || "Unassigned",
            report.duplicate_count || 0,
            report.upvotes || 0,
            `"${(report.address || "").replace(/"/g, '""')}"`
        ].join(','));

        const csvContent = [...headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'all_reports.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const openModal = (report) => {
        setSelectedReport(report);
        setShowModal(true);
    };

    const closeModal = () => {
        setSelectedReport(null);
        setShowModal(false);
    };

    return (
        <div className="container mt-4">
            <h2 className="mb-4">📄 All Reports</h2>

            <div className="d-flex gap-3 mb-3 flex-wrap align-items-center">
                <Form.Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ maxWidth: "200px", fontWeight: statusFilter === "high-priority" ? "bold" : "normal" }}
                >
                    <option value="">All Active Reports</option>
                    <option value="high-priority">High Priority</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                </Form.Select>

                <Form.Select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    style={{ maxWidth: "200px" }}
                >
                    <option value="">Sort by</option>
                    <option value="high-priority-first">High Priority First</option>
                    <option value="most-votes">Most Votes</option>
                    <option value="least-votes">Least Votes</option>
                    <option value="severity-high-to-low">Severity: High to Low</option>
                    <option value="severity-low-to-high">Severity: Low to High</option>
                </Form.Select>

                {filteredReports.length > 0 && (
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={exportToCSV}
                    >
                        Export to CSV
                    </Button>
                )}
            </div>

            {statusFilter === "high-priority" && !loading && !error && (
                <Alert variant="warning">
                    Showing {filteredReports.length} high-priority {filteredReports.length === 1 ? "report" : "reports"} (Upvotes &gt; {VOTE_THRESHOLD} or Duplicates &gt; {DUPLICATE_THRESHOLD})
                </Alert>
            )}

            {loading && <Alert variant="info">Loading reports...</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}

            {!loading && !error && filteredReports.length === 0 && (
                <p className="text-muted">No reports found.</p>
            )}

            {!loading && !error && filteredReports.length > 0 && (
                <div className="row">
                    {filteredReports.map((report) => (
                        <div
                            key={report.id}
                            className="col-md-6 mb-3"
                            onClick={() => openModal(report)}
                        >
                            <div className="card shadow-sm cursor-pointer">
                                <div className="card-body">
                                    <h5 className="card-title">
                                        Issue #{report.id}: {report.title}
                                        {((report.upvotes || 0) > VOTE_THRESHOLD || report.duplicate_count > DUPLICATE_THRESHOLD) && (
                                            <Badge bg="danger" className="ms-2">High Priority</Badge>
                                        )}
                                    </h5>
                                    <p className="card-text text-truncate">
                                        {report.description}
                                    </p>
                                    <p className="card-text">
                                        <strong>Reported by:</strong>{" "}
                                        {report.citizen_username || "Unknown"}
                                    </p>
                                    <p className="card-text">
                                        <strong>Assigned to:</strong>{" "}
                                        {report.assigned_to_username || "Unassigned"}
                                    </p>
                                    <p className="card-text">
                                        <strong>Status:</strong> {report.status}
                                    </p>
                                    <p className="card-text">
                                        <strong>Severity:</strong>{" "}
                                        {report.severity || "Not specified"}
                                    </p>
                                    <p className="card-text">
                                        <strong>Department:</strong>{" "}
                                        {report.department_name || "General Department"}
                                    </p>
                                    {report.address && (
                                        <p className="card-text">
                                            <strong>Address:</strong> {report.address}
                                        </p>
                                    )}
                                    <div className="d-flex gap-2 mt-2">
                                        <Button
                                            variant="outline-success"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleVote(report.id, "Upvote");
                                            }}
                                        >
                                            👍 {report.upvotes || 0}
                                        </Button>
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleVote(report.id, "Downvote");
                                            }}
                                        >
                                            👎 {report.downvotes || 0}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal show={showModal} onHide={closeModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        Issue #{selectedReport?.id}: {selectedReport?.title}
                        {((selectedReport?.upvotes || 0) > VOTE_THRESHOLD || selectedReport?.duplicate_count > DUPLICATE_THRESHOLD) && (
                            <Badge bg="danger" className="ms-2">High Priority</Badge>
                        )}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        <strong>Description:</strong> {selectedReport?.description}
                    </p>
                    <p>
                        <strong>Reported by:</strong> {selectedReport?.citizen_username || "Unknown"}
                    </p>
                    <p>
                        <strong>Assigned to:</strong> {selectedReport?.assigned_to_username || "Unassigned"}
                    </p>
                    <p>
                        <strong>Status:</strong> {selectedReport?.status}
                    </p>
                    <p>
                        <strong>Severity:</strong> {selectedReport?.severity || "Not specified"}
                    </p>
                    <p>
                        <strong>Department:</strong> {selectedReport?.department_name || "General Department"}
                    </p>
                    {selectedReport?.address && (
                        <p>
                            <strong>Address:</strong> {selectedReport?.address}
                        </p>
                    )}
                    {selectedReport?.assigned_to_username !== currentUser && (
                        <Button
                            variant="primary"
                            className="mt-2"
                            onClick={() => handleRequestSolve(selectedReport.id)}
                        >
                            🙋 Request to Solve
                        </Button>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeModal}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default Reports;