import { useState, useEffect } from "react";
import { Card, Alert, Button, Badge, Spinner } from "react-bootstrap";
import api from "../../services/api/axios";

function AdminNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [buttonLoading, setButtonLoading] = useState({});

    const fetchAdminNotifications = async () => {
        setLoading(true);
        setError(null);
        try {
            const accessToken = localStorage.getItem("access");
            const [issuesRes, requestsRes, deptNotifsRes] = await Promise.all([
                api.get("/api/issues/", { headers: { Authorization: `Bearer ${accessToken}` } }),
                api.get("/api/solve-requests/pending/", { headers: { Authorization: `Bearer ${accessToken}` } }),
                api.get("/api/department-notifications/", { headers: { Authorization: `Bearer ${accessToken}` } })
            ]);

            const issues = issuesRes.data;
            const requests = requestsRes.data;
            const deptNotifs = deptNotifsRes.data;

            console.log("Fetched requests:", requests);

            const notifs = [];

            deptNotifs.forEach(deptNotif => {
                if (deptNotif.notif_type === "MISCLASSIFICATION") {
                    notifs.push({
                        id: `misclassified-${deptNotif.id}-${deptNotif.issue}`,
                        type: "danger",
                        icon: "⚠️",
                        message: `Issue #${deptNotif.issue} may be misclassified. Please review. Message: ${deptNotif.message}`,
                        reportId: deptNotif.issue,
                        timestamp: new Date(deptNotif.created_at).toLocaleString()
                    });
                }
                if (deptNotif.notif_type === "MULTI_DEPT_NEXT_STEP") {
                    notifs.push({
                        id: `nextdept-${deptNotif.id}-${deptNotif.issue}`,
                        type: "info",
                        icon: "➡️",
                        message: `Issue #${deptNotif.issue} requires assignment to next department. Message: ${deptNotif.message}`,
                        reportId: deptNotif.issue,
                        timestamp: new Date(deptNotif.created_at).toLocaleString()
                    });
                }
            });

            requests.forEach(req => {
                notifs.push({
                    id: `request-${req.id}`,
                    type: "primary",
                    icon: "🛠️",
                    message: `User "${req.user.username}" requested to solve Issue #${req.issue.id}: "${req.issue.title}". History: Solved ${req.user.solved_issues_count || 0} issues.`,
                    requestId: req.id,
                    reportId: req.issue.id,
                    timestamp: new Date(req.created_at).toLocaleString()
                });
            });

            setNotifications(notifs);
            console.log("Updated notifications:", notifs);
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Failed to load admin notifications.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminNotifications();
    }, []);

    const handleApproveRequest = async (event, requestId) => {
        event.preventDefault();
        event.stopPropagation();
        console.log("Approving request ID:", requestId);
        setButtonLoading(prev => ({ ...prev, [requestId]: true }));
        try {
            const accessToken = localStorage.getItem("access");
            const response = await api.post(
                `/api/solve-requests/${requestId}/approve/`,
                {},
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            console.log("Approve response:", response.data);
            await fetchAdminNotifications();
            console.log("Notifications after approval:", notifications);
        } catch (err) {
            console.error("Approve error:", err);
            alert(`Failed to approve request: ${err.message}`);
        } finally {
            setButtonLoading(prev => ({ ...prev, [requestId]: false }));
        }
    };

    const handleRejectRequest = async (event, requestId) => {
        event.preventDefault();
        event.stopPropagation();
        console.log("Rejecting request ID:", requestId);
        setButtonLoading(prev => ({ ...prev, [requestId]: true }));
        try {
            const accessToken = localStorage.getItem("access");
            const response = await api.post(
                `/api/solve-requests/${requestId}/reject/`,
                {},
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            console.log("Reject response:", response.data);
            await fetchAdminNotifications();
        } catch (err) {
            console.error("Reject error:", err);
            alert(`Failed to reject request: ${err.message}`);
        } finally {
            setButtonLoading(prev => ({ ...prev, [requestId]: false }));
        }
    };

    if (loading) return <Spinner animation="border" />;

    if (error) return <Alert variant="danger">{error}</Alert>;

    if (notifications.length === 0) return <Alert variant="secondary">No notifications.</Alert>;

    return (
        <div className="container py-4">
            <h2 className="mb-4 text-primary">🔔 Admin Notifications</h2>
            {notifications.map(notif => (
                <Card key={notif.id} className="mb-3 shadow-sm">
                    <Card.Body>
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <span style={{ fontSize: "1.5rem", marginRight: "0.5rem" }}>{notif.icon}</span>
                                <span>{notif.message}</span>
                            </div>
                            {notif.requestId && (
                                <div className="d-flex gap-2">
                                    <Button
                                        type="button"
                                        variant="success"
                                        size="sm"
                                        onClick={(e) => handleApproveRequest(e, notif.requestId)}
                                        disabled={buttonLoading[notif.requestId]}
                                    >
                                        {buttonLoading[notif.requestId] ? (
                                            <Spinner as="span" animation="border" size="sm" />
                                        ) : (
                                            "✅ Approve"
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="danger"
                                        size="sm"
                                        onClick={(e) => handleRejectRequest(e, notif.requestId)}
                                        disabled={buttonLoading[notif.requestId]}
                                    >
                                        {buttonLoading[notif.requestId] ? (
                                            <Spinner as="span" animation="border" size="sm" />
                                        ) : (
                                            "❌ Reject"
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="mt-2">
                            <Badge bg={notif.type} className="me-2">
                                {notif.type.charAt(0).toUpperCase() + notif.type.slice(1)}
                            </Badge>
                            <small className="text-muted">{notif.timestamp}</small>
                        </div>
                    </Card.Body>
                </Card>
            ))}
        </div>
    );
}

export default AdminNotifications;