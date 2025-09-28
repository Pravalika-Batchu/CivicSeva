import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api/axios";
import "./OfficerDashboard.css";

function OfficerDashboard() {
    const [issues, setIssues] = useState([]);
    const [filteredIssues, setFilteredIssues] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);
    const [filter, setFilter] = useState("recent");
    const [message, setMessage] = useState({ text: "", type: "" });
    const navigate = useNavigate();
    const accessToken = localStorage.getItem("access");

    useEffect(() => {
        const fetchIssues = async () => {
            if (!accessToken) {
                setMessage({
                    text: "❌ Please log in to view assigned issues.",
                    type: "error",
                });
                navigate("/login");
                return;
            }

            try {
                const res = await api.get("/api/assigned_issues/", {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                // Filter out resolved issues
                const unresolved = res.data.filter(issue => issue.status !== "RESOLVED");
                setIssues(unresolved);
                setFilteredIssues(unresolved);
            } catch (err) {
                console.error("Fetch Issues Error:", err);
                if (err.response?.status === 401) {
                    setMessage({
                        text: "❌ Session expired or unauthorized. Please log in again.",
                        type: "error",
                    });
                    localStorage.removeItem("access");
                    localStorage.removeItem("refresh");
                    navigate("/login");
                } else {
                    setMessage({
                        text: "❌ Failed to fetch assigned issues.",
                        type: "error",
                    });
                }
            }
        };

        fetchIssues();
    }, [accessToken, navigate]);

    useEffect(() => {
        let sorted = [...issues];
        if (filter === "severity") {
            sorted.sort((a, b) => {
                const severityOrder = { High: 3, Medium: 2, Low: 1, null: 0 };
                return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
            });
        } else if (filter === "votes") {
            sorted.sort((a, b) => (b.votes || 0) - (a.votes || 0));
        } else if (filter === "recent") {
            sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        setFilteredIssues(sorted);
    }, [filter, issues]);

    const sendNotification = async (issueId, notifType) => {
        setNotifLoading(true);
        let message = "";
        if (notifType === "MISCLASSIFICATION") {
            message = "This issue does not belong to our department. Please reassign.";
        } else if (notifType === "MULTI_DEPT_NEXT_STEP") {
            message = "Our part of the resolution is done. Please assign to the next department.";
        }
        try {
            await api.post(
                "/api/department-notifications/send/",
                {
                    issue_id: issueId,
                    notif_type: notifType,
                    message,
                },
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            setMessage({
                text: "✅ Notification sent to admin!",
                type: "success",
            });
            setIssues(prev =>
                prev.map(issue =>
                    issue.id === issueId
                        ? { ...issue, [`${notifType}_sent`]: true }
                        : issue
                )
            );
        } catch (err) {
            console.error("Notification Error:", err);
            setMessage({
                text: "❌ Failed to send notification.",
                type: "error",
            });
        } finally {
            setNotifLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="dashboard-header">📋 Officer Dashboard</h2>

            {message.text && (
                <div
                    className={`alert ${message.type === "success" ? "alert-success" : "alert-danger"}`}
                    role="alert"
                >
                    {message.text}
                </div>
            )}

            <div className="filter-container mb-4">
                <label className="form-label fw-bold me-3">Filter by:</label>
                <select
                    className="form-select w-auto"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                >
                    <option value="recent">Recent (Date Uploaded)</option>
                    <option value="severity">Severity</option>
                    <option value="votes">Votes</option>
                </select>
            </div>

            {filteredIssues.length === 0 ? (
                <p className="text-muted">No issues assigned yet.</p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-striped table-hover">
                        <thead className="table-dark">
                            <tr>
                                <th>ID</th>
                                <th>Title</th>
                                <th>Status</th>
                                <th>Severity</th>
                                <th>Votes</th>
                                <th>Citizen</th>
                                <th>Department</th>
                                <th>Reported On</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredIssues.map((issue) => (
                                <tr key={issue.id}>
                                    <td>{issue.id}</td>
                                    <td>{issue.title}</td>
                                    <td>
                                        <span
                                            className={`badge ${issue.status === "PENDING"
                                                ? "bg-warning text-dark"
                                                : issue.status === "IN_PROGRESS"
                                                    ? "bg-info"
                                                    : "bg-success"
                                                }`}
                                        >
                                            {issue.status}
                                        </span>
                                    </td>
                                    <td>{issue.severity || "N/A"}</td>
                                    <td>{issue.votes || 0}</td>
                                    <td>{issue.citizen_username}</td>
                                    <td>{issue.department_name || "N/A"}</td>
                                    <td>{new Date(issue.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <Link
                                                to={`/officer/issue/${issue.id}`}
                                                className="btn btn-sm btn-primary mb-2"
                                            >
                                                View
                                            </Link>
                                            <button
                                                className="btn btn-sm btn-warning mb-2"
                                                disabled={notifLoading || issue.MISCLASSIFICATION_sent}
                                                onClick={() => sendNotification(issue.id, "MISCLASSIFICATION")}
                                            >
                                                Notify: Misclassified
                                            </button>
                                            <button
                                                className="btn btn-sm btn-info"
                                                disabled={notifLoading || issue.MULTI_DEPT_NEXT_STEP_sent}
                                                onClick={() => sendNotification(issue.id, "MULTI_DEPT_NEXT_STEP")}
                                            >
                                                Next Dept
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default OfficerDashboard;