import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api/axios";
import "./ViewResolution.css";

function ViewResolution() {
    const { id } = useParams(); // Issue ID from URL
    const [issue, setIssue] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState({ text: "", type: "" });
    const accessToken = localStorage.getItem("access");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchIssue = async () => {
            if (!accessToken) {
                setMessage({
                    text: "❌ Please log in to view resolution details.",
                    type: "error",
                });
                navigate("/login");
                return;
            }

            setIsLoading(true);
            try {
                const response = await api.get(`/api/issues/${id}/`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (!response.data.resolution_proof && !response.data.resolution_description) {
                    setMessage({
                        text: "❌ No resolution details available for this issue.",
                        type: "error",
                    });
                    navigate("/reports");
                    return;
                }
                setIssue(response.data);
            } catch (err) {
                console.error("Error fetching issue:", err);
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
                        text: `❌ Failed to load resolution: ${err.response?.data?.error || "Unknown error"}`,
                        type: "error",
                    });
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchIssue();
    }, [id, accessToken, navigate]);

    return (
        <div className="container mt-4 resolution-view-container">
            <h2 className="resolution-view-header">🔍 Resolution for Issue #{id}</h2>

            {message.text && (
                <div
                    className={`alert ${message.type === "success" ? "alert-success" : "alert-danger"}`}
                    role="alert"
                >
                    {message.text}
                </div>
            )}

            {isLoading ? (
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            ) : (
                issue && (
                    <div className="card shadow-sm p-4 resolution-card">
                        <h4 className="section-title">Resolution Details</h4>
                        <p><strong>Title:</strong> {issue.title}</p>
                        <p><strong>Description:</strong> {issue.resolution_description || "No description provided."}</p>
                        {issue.resolution_proof && (
                            <>
                                <p><strong>Proof:</strong></p>
                                {issue.resolution_proof.endsWith(".pdf") ? (
                                    <a
                                        href={issue.resolution_proof}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-sm btn-info mb-3"
                                    >
                                        📄 View PDF
                                    </a>
                                ) : (
                                    <img
                                        src={issue.resolution_proof}
                                        alt="Resolution Proof"
                                        className="img-fluid rounded shadow-sm mb-3 resolution-image"
                                        style={{ maxHeight: "400px", objectFit: "contain" }}
                                    />
                                )}
                            </>
                        )}
                        <p><strong>Resolved By:</strong> {issue.resolved_by?.username || "N/A"}</p>
                        <p><strong>Resolved At:</strong> {issue.resolved_at ? new Date(issue.resolved_at).toLocaleString() : "N/A"}</p>
                        <p>
                            <strong>Status:</strong>{" "}
                            <span
                                className={`badge ${issue.status === "RESOLVED" ? "bg-success" : "bg-warning text-dark"
                                    }`}
                            >
                                {issue.status}
                            </span>
                        </p>
                        <button
                            className="btn btn-sm btn-primary mt-3"
                            onClick={() => navigate("/reports")}
                        >
                            ⬅️ Back to Reports
                        </button>
                    </div>
                )
            )}
        </div>
    );
}

export default ViewResolution;