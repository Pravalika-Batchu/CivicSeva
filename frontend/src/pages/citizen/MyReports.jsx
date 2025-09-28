import { useEffect, useState } from "react";
import { Modal, Button, Form, Alert, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../services/api/axios";
import "./MyReports.css"; // Reuse Reports.css for consistency

function MyReports() {
    const [reports, setReports] = useState([]);
    const [filteredReports, setFilteredReports] = useState([]);
    const [assignedIssues, setAssignedIssues] = useState([]);
    const [filteredAssignedIssues, setFilteredAssignedIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assignedLoading, setAssignedLoading] = useState(true);
    const [error, setError] = useState(null);
    const [assignedError, setAssignedError] = useState(null);
    const [statusFilter, setStatusFilter] = useState("");
    const [sortOption, setSortOption] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);

    const navigate = useNavigate();
    const accessToken = localStorage.getItem("access");

    // Fetch user's reported issues
    useEffect(() => {
        const fetchReports = async () => {
            setLoading(true);
            setError(null);

            try {
                if (!accessToken) {
                    setError("Please log in to view your reports.");
                    setLoading(false);
                    return;
                }

                const res = await api.get("/api/my-reports/", {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });

                const severities = ["Low", "Medium", "High"];
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
                setError("Failed to load your reports. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, [accessToken]);

    // Fetch issues assigned to the user
    useEffect(() => {
        const fetchAssignedIssues = async () => {
            setAssignedLoading(true);
            setAssignedError(null);

            try {
                if (!accessToken) {
                    setAssignedError("Please log in to view assigned issues.");
                    setAssignedLoading(false);
                    return;
                }

                const res = await api.get("/api/assigned-issues/", {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });

                const severities = ["Low", "Medium", "High"];
                const updatedIssues = res.data.map((issue) => {
                    if (!issue.severity || issue.severity.trim() === "") {
                        const randomSeverity = severities[Math.floor(Math.random() * severities.length)];
                        return { ...issue, severity: randomSeverity };
                    }
                    const normalizedSeverity =
                        issue.severity.charAt(0).toUpperCase() +
                        issue.severity.slice(1).toLowerCase();
                    return { ...issue, severity: normalizedSeverity };
                });

                setAssignedIssues(updatedIssues);
                setFilteredAssignedIssues(updatedIssues);
            } catch (err) {
                console.error("Error fetching assigned issues:", err);
                setAssignedError("Failed to load assigned issues. Please try again.");
            } finally {
                setAssignedLoading(false);
            }
        };
        fetchAssignedIssues();
    }, [accessToken]);

    // Apply filters and sorting for both reports and assigned issues
    useEffect(() => {
        // Filter and sort reports
        let filtered = [...reports];
        if (statusFilter) {
            filtered = filtered.filter(
                (report) =>
                    report.status.toLowerCase() === statusFilter.toLowerCase()
            );
        }

        if (sortOption === "most-votes") {
            filtered.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
        } else if (sortOption === "least-votes") {
            filtered.sort((a, b) => (a.upvotes || 0) - (b.upvotes || 0));
        } else if (sortOption === "severity-high-to-low") {
            const sevOrder = { High: 3, Medium: 2, Low: 1 };
            filtered.sort(
                (a, b) => (sevOrder[b.severity] || 0) - (sevOrder[a.severity] || 0)
            );
        } else if (sortOption === "severity-low-to-high") {
            const sevOrder = { High: 3, Medium: 2, Low: 1 };
            filtered.sort(
                (a, b) => (sevOrder[a.severity] || 0) - (sevOrder[b.severity] || 0)
            );
        }

        setFilteredReports(filtered);

        // Filter and sort assigned issues
        let filteredAssigned = [...assignedIssues];
        if (statusFilter) {
            filteredAssigned = filteredAssigned.filter(
                (issue) =>
                    issue.status.toLowerCase() === statusFilter.toLowerCase()
            );
        }

        if (sortOption === "most-votes") {
            filteredAssigned.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
        } else if (sortOption === "least-votes") {
            filteredAssigned.sort((a, b) => (a.upvotes || 0) - (b.upvotes || 0));
        } else if (sortOption === "severity-high-to-low") {
            const sevOrder = { High: 3, Medium: 2, Low: 1 };
            filteredAssigned.sort(
                (a, b) => (sevOrder[b.severity] || 0) - (sevOrder[a.severity] || 0)
            );
        } else if (sortOption === "severity-low-to-high") {
            const sevOrder = { High: 3, Medium: 2, Low: 1 };
            filteredAssigned.sort(
                (a, b) => (sevOrder[a.severity] || 0) - (sevOrder[b.severity] || 0)
            );
        }

        setFilteredAssignedIssues(filteredAssigned);
    }, [reports, assignedIssues, statusFilter, sortOption]);

    const openModal = (report, isAssigned = false) => {
        setSelectedReport({ ...report, isAssigned });
        setShowModal(true);
    };

    const closeModal = () => {
        setSelectedReport(null);
        setShowModal(false);
    };

    const handleVote = async (issueId, voteType) => {
        if (!accessToken) {
            alert("Please log in to vote.");
            return;
        }

        try {
            const endpoint = `/api/issues/${issueId}/${voteType.toLowerCase()}/`;
            const res = await api.post(endpoint, {}, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            setReports((prevReports) =>
                prevReports.map((report) =>
                    report.id === issueId
                        ? { ...report, upvotes: res.data.upvotes, downvotes: res.data.downvotes, duplicate_count: res.data.duplicate_count }
                        : report
                )
            );
            setFilteredReports((prevFiltered) =>
                prevFiltered.map((report) =>
                    report.id === issueId
                        ? { ...report, upvotes: res.data.upvotes, downvotes: res.data.downvotes, duplicate_count: res.data.duplicate_count }
                        : report
                )
            );
            setAssignedIssues((prevIssues) =>
                prevIssues.map((issue) =>
                    issue.id === issueId
                        ? { ...issue, upvotes: res.data.upvotes, downvotes: res.data.downvotes, duplicate_count: res.data.duplicate_count }
                        : issue
                )
            );
            setFilteredAssignedIssues((prevFiltered) =>
                prevFiltered.map((issue) =>
                    issue.id === issueId
                        ? { ...issue, upvotes: res.data.upvotes, downvotes: res.data.downvotes, duplicate_count: res.data.duplicate_count }
                        : issue
                )
            );
            if (selectedReport?.id === issueId) {
                setSelectedReport((prev) => ({
                    ...prev,
                    upvotes: res.data.upvotes,
                    downvotes: res.data.downvotes,
                    duplicate_count: res.data.duplicate_count,
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

    const handleDelete = async (issueId) => {
        if (!accessToken) {
            alert("Please log in to delete reports.");
            return;
        }

        try {
            await api.delete(`/api/delete-report/${issueId}/`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            setReports((prevReports) => prevReports.filter((report) => report.id !== issueId));
            setFilteredReports((prevFiltered) => prevFiltered.filter((report) => report.id !== issueId));
            alert("Report deleted successfully!");
            closeModal();
        } catch (err) {
            console.error("Error deleting report:", err);
            alert(err.response?.data?.error || "Failed to delete report.");
        }
    };

    const handleApprove = async (issueId) => {
        try {
            const res = await api.post(`/api/issues/${issueId}/approve_resolution/`, {}, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            setReports((prev) =>
                prev.map((report) =>
                    report.id === issueId ? { ...report, status: "RESOLVED", is_approved: true } : report
                )
            );
            setFilteredReports((prev) =>
                prev.map((report) =>
                    report.id === issueId ? { ...report, status: "RESOLVED", is_approved: true } : report
                )
            );
            setAssignedIssues((prev) =>
                prev.map((issue) =>
                    issue.id === issueId ? { ...issue, status: "RESOLVED", is_approved: true } : issue
                )
            );
            setFilteredAssignedIssues((prev) =>
                prev.map((issue) =>
                    issue.id === issueId ? { ...issue, status: "RESOLVED", is_approved: true } : issue
                )
            );
            if (selectedReport?.id === issueId) {
                setSelectedReport((prev) => ({ ...prev, status: "RESOLVED", is_approved: true }));
            }
            alert("Resolution approved!");
        } catch (err) {
            console.error("Error approving resolution:", err);
            alert(err.response?.data?.error || "Failed to approve resolution.");
        }
    };

    const exportToCSV = (data, filename) => {
        const headers = ["ID,Title,Status,Severity,Department,Duplicate Count"];
        const rows = data.map((item) => [
            item.id,
            `"${item.title.replace(/"/g, '""')}"`,
            item.status,
            item.severity || "Not specified",
            item.department_name || "General Department",
            item.duplicate_count || 0,
        ].join(','));

        const csvContent = [...headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="container mt-4">
            {/* My Reports Section */}
            <h2 className="mb-4">📄 My Reports</h2>

            <div className="d-flex gap-3 mb-3 flex-wrap align-items-center">
                <Form.Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ maxWidth: "200px" }}
                >
                    <option value="">Filter by Status</option>
                    <option value="OPEN">Open</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="PENDING_APPROVAL">Pending Approval</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                </Form.Select>

                <Form.Select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    style={{ maxWidth: "200px" }}
                >
                    <option value="">Sort by</option>
                    <option value="most-votes">Most Votes</option>
                    <option value="least-votes">Least Votes</option>
                    <option value="severity-high-to-low">Severity: High to Low</option>
                    <option value="severity-low-to-high">Severity: Low to High</option>
                </Form.Select>

                {filteredReports.length > 0 && (
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => exportToCSV(filteredReports, "my_reports.csv")}
                    >
                        Export My Reports to CSV
                    </Button>
                )}
                {filteredAssignedIssues.length > 0 && (
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => exportToCSV(filteredAssignedIssues, "assigned_issues.csv")}
                    >
                        Export Assigned Issues to CSV
                    </Button>
                )}
            </div>

            {loading && <Alert variant="info">Loading reports...</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}

            {!loading && !error && filteredReports.length === 0 && (
                <p className="text-muted">You have not submitted any reports.</p>
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
                                    <h5 className="card-title d-flex align-items-center">
                                        Issue #{report.id}: {report.title}
                                        {(report.is_duplicate || report.duplicate_count > 0) && (
                                            <Badge
                                                bg="danger"
                                                className="ms-2 duplicate-badge"
                                                title={`Duplicate issue (${report.duplicate_count} duplicates)`}
                                            >
                                                ●
                                            </Badge>
                                        )}
                                    </h5>
                                    <p className="card-text text-truncate">
                                        {report.description}
                                    </p>
                                    <p className="card-text">
                                        <strong>Status:</strong> {report.status}
                                    </p>
                                    <p className="card-text">
                                        <strong>Severity:</strong> {report.severity || "Not specified"}
                                    </p>
                                    <p className="card-text">
                                        <strong>Department:</strong> {report.department_name || "General Department"}
                                    </p>
                                    <p className="card-text">
                                        <strong>Duplicates:</strong> {report.duplicate_count || 0}
                                    </p>
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
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(report.id);
                                            }}
                                        >
                                            🗑️ Delete
                                        </Button>
                                        {(report.status === "PENDING_APPROVAL" || report.status === "RESOLVED") && (
                                            <Button
                                                variant="info"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openModal(report);
                                                }}
                                            >
                                                View Resolution
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Issues Assigned to Me Section */}
            <h2 className="mb-4 mt-5">🛠️ Issues Assigned to Me</h2>

            {assignedLoading && <Alert variant="info">Loading assigned issues...</Alert>}
            {assignedError && <Alert variant="danger">{assignedError}</Alert>}

            {!assignedLoading && !assignedError && filteredAssignedIssues.length === 0 && (
                <p className="text-muted">No issues are assigned to you.</p>
            )}

            {!assignedLoading && !assignedError && filteredAssignedIssues.length > 0 && (
                <div className="row">
                    {filteredAssignedIssues.map((issue) => (
                        <div
                            key={issue.id}
                            className="col-md-6 mb-3"
                            onClick={() => openModal(issue, true)}
                        >
                            <div className="card shadow-sm cursor-pointer">
                                <div className="card-body">
                                    <h5 className="card-title d-flex align-items-center">
                                        Issue #{issue.id}: {issue.title}
                                        {(issue.is_duplicate || issue.duplicate_count > 0) && (
                                            <Badge
                                                bg="danger"
                                                className="ms-2 duplicate-badge"
                                                title={`Duplicate issue (${issue.duplicate_count} duplicates)`}
                                            >
                                                ●
                                            </Badge>
                                        )}
                                    </h5>
                                    <p className="card-text text-truncate">
                                        {issue.description}
                                    </p>
                                    <p className="card-text">
                                        <strong>Status:</strong> {issue.status}
                                    </p>
                                    <p className="card-text">
                                        <strong>Severity:</strong> {issue.severity || "Not specified"}
                                    </p>
                                    <p className="card-text">
                                        <strong>Department:</strong> {issue.department_name || "General Department"}
                                    </p>
                                    <p className="card-text">
                                        <strong>Duplicates:</strong> {issue.duplicate_count || 0}
                                    </p>
                                    <div className="d-flex gap-2 mt-2">
                                        <Button
                                            variant="outline-success"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleVote(issue.id, "Upvote");
                                            }}
                                        >
                                            👍 {issue.upvotes || 0}
                                        </Button>
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleVote(issue.id, "Downvote");
                                            }}
                                        >
                                            👎 {issue.downvotes || 0}
                                        </Button>
                                        {(issue.status === "PENDING_APPROVAL" || issue.status === "RESOLVED") && (
                                            <Button
                                                variant="info"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openModal(issue, true);
                                                }}
                                            >
                                                View Resolution
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal for Report/Issue Details */}
            <Modal show={showModal} onHide={closeModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        Issue #{selectedReport?.id}: {selectedReport?.title}
                        {(selectedReport?.is_duplicate || selectedReport?.duplicate_count > 0) && (
                            <Badge
                                bg="danger"
                                className="ms-2 duplicate-badge"
                                title={`Duplicate issue (${selectedReport?.duplicate_count} duplicates)`}
                            >
                                ●
                            </Badge>
                        )}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        <strong>Description:</strong> {selectedReport?.description}
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
                    <p>
                        <strong>Duplicates:</strong> {selectedReport?.duplicate_count || 0}
                    </p>
                    <p>
                        <strong>Upvotes:</strong> {selectedReport?.upvotes || 0}
                    </p>
                    <p>
                        <strong>Downvotes:</strong> {selectedReport?.downvotes || 0}
                    </p>
                    {(selectedReport?.status === "PENDING_APPROVAL" || selectedReport?.status === "RESOLVED") && (
                        <>
                            <h5>Resolution Details</h5>
                            <p>
                                <strong>Resolution Description:</strong>{" "}
                                {selectedReport?.resolution_description || "N/A"}
                            </p>
                            {selectedReport?.resolution_proof && (
                                <img
                                    src={selectedReport.resolution_proof}
                                    alt="Resolution Proof"
                                    className="img-fluid mb-3"
                                    style={{ maxHeight: "300px" }}
                                />
                            )}
                            <p>
                                <strong>Resolved By:</strong>{" "}
                                {selectedReport?.resolved_by?.username || selectedReport?.resolved_by || "N/A"}
                            </p>
                            <p>
                                <strong>Resolved At:</strong>{" "}
                                {selectedReport?.resolved_at
                                    ? new Date(selectedReport.resolved_at).toLocaleString()
                                    : "N/A"}
                            </p>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeModal}>
                        Close
                    </Button>
                    {!selectedReport?.isAssigned && (
                        <Button
                            variant="danger"
                            onClick={() => handleDelete(selectedReport?.id)}
                        >
                            Delete Report
                        </Button>
                    )}
                    {selectedReport?.status === "PENDING_APPROVAL" && !selectedReport?.isAssigned && (
                        <Button
                            variant="success"
                            onClick={() => handleApprove(selectedReport?.id)}
                        >
                            Approve Resolution
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default MyReports;