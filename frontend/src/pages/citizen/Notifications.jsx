import { useState, useEffect, useCallback } from "react";
import { Card, Alert, Button, Badge, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../services/api/axios";
import "./Notifications.css";

function Notifications() {
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");
    const department = localStorage.getItem("department");
    const accessToken = localStorage.getItem("access");
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [readNotifications, setReadNotifications] = useState(() => {
        return JSON.parse(localStorage.getItem(`readNotifications_${username}`)) || [];
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userLocation, setUserLocation] = useState(null);

    // Haversine formula to calculate distance
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const fetchNotificationsData = useCallback(async (lat, lng) => {
        if (!accessToken) return;
        setLoading(true);
        setError(null);
        let notifs = [];

        try {
            // Fetch issues for both roles to check status updates and nearby alerts
            const issuesRes = await api.get("/api/issues/", {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const reports = Array.isArray(issuesRes.data) ? issuesRes.data : [];

            reports.forEach((report, index) => {
                const status = report.status?.toUpperCase() || "";
                const severity = report.severity?.toLowerCase() || "";
                const timestamp = new Date(report.updated_at || report.created_at || Date.now()).toLocaleString();

                // 1. Citizen: Own resolved reports
                if (role === "CITIZEN" && report.citizen_username === username && status === "RESOLVED") {
                    notifs.push({
                        id: `resolved-${report.id || index}`,
                        type: "success",
                        icon: "✅",
                        message: `Your report "${report.title}" has been resolved!`,
                        reportId: report.id,
                        timestamp,
                    });
                }

                // 2. Nearby high severity assigned issues (relevant for everyone)
                if (lat && lng && report.latitude && report.longitude) {
                    const dist = calculateDistance(lat, lng, report.latitude, report.longitude);
                    if (dist <= 5 && severity === "high" && status === "ASSIGNED") {
                        notifs.push({
                            id: `nearby-high-${report.id || index}`,
                            type: "warning",
                            icon: "🚨",
                            message: `High severity issue nearby: "${report.title}" (within 5km).`,
                            reportId: report.id,
                            timestamp,
                        });
                    }
                }

                // 3. Officer: New issues for their department
                if (role === "DEPT_OFFICER" && report.department_name === department && (status === "OPEN" || status === "REASSIGNED")) {
                    notifs.push({
                        id: `dept-new-${report.id || index}`,
                        type: severity === "high" ? "danger" : "info",
                        icon: severity === "high" ? "🔥" : "📋",
                        message: `New issue for your department: "${report.title}"`,
                        reportId: report.id,
                        timestamp,
                    });
                }
            });

            // 4. Department specific notifications (Misclassifications, etc.)
            if (role === "DEPT_OFFICER" || role === "ADMIN") {
                const notifRes = await api.get("/api/department-notifications/", {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                const deptNotifs = Array.isArray(notifRes.data) ? notifRes.data : [];
                deptNotifs.forEach((notif, index) => {
                    const timestamp = new Date(notif.created_at || Date.now()).toLocaleString();
                    notifs.push({
                        id: `dept-notif-${notif.id || index}`,
                        type: notif.notif_type === "MISCLASSIFICATION" ? "warning" : "info",
                        icon: notif.notif_type === "MISCLASSIFICATION" ? "⚠️" : "📬",
                        message: notif.message,
                        reportId: notif.issue,
                        timestamp,
                    });
                });
            }

            // Sort by newest first
            notifs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setNotifications(notifs);
        } catch (err) {
            console.error("Fetch error:", err.response?.data || err.message);
            if (err.response?.status === 401) {
                setError("Session expired. Please log in again.");
                localStorage.removeItem("access");
                navigate("/login");
            } else {
                setError("Failed to load notifications.");
            }
        } finally {
            setLoading(false);
        }
    }, [accessToken, role, username, department, navigate]);

    // Initial load: Fetch location then notifications
    useEffect(() => {
        if (!accessToken) {
            navigate("/login");
            return;
        }

        const initialLoad = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        setUserLocation({ lat: latitude, lng: longitude });
                        fetchNotificationsData(latitude, longitude);
                    },
                    (err) => {
                        console.warn("Geolocation failed:", err);
                        fetchNotificationsData(null, null);
                    }
                );
            } else {
                fetchNotificationsData(null, null);
            }
        };

        initialLoad();
    }, [accessToken, navigate, fetchNotificationsData]);

    // Save read state to localStorage
    useEffect(() => {
        if (username) {
            localStorage.setItem(`readNotifications_${username}`, JSON.stringify(readNotifications));
        }
    }, [readNotifications, username]);

    const markAsRead = (notifId) => {
        setReadNotifications((prev) => {
            if (prev.includes(notifId)) return prev;
            return [...prev, notifId];
        });
    };

    const clearAll = () => {
        const allIds = notifications.map(n => n.id);
        setReadNotifications(allIds);
    };

    const handleNotifClick = (reportId, notifId) => {
        markAsRead(notifId);
        if (reportId) {
            navigate(role === "DEPT_OFFICER" ? `/officer/issue/${reportId}` : `/reports?reportId=${reportId}`);
        }
    };

    return (
        <div className="notifications-page py-5 container">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold mb-0">Notifications</h2>
                    <p className="text-muted">Stay updated with your community activities</p>
                </div>
                {notifications.length > 0 && (
                    <Button variant="outline-primary" size="sm" onClick={clearAll} className="rounded-pill">
                        Mark All as Read
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : error ? (
                <Alert variant="danger">{error}</Alert>
            ) : notifications.length === 0 ? (
                <div className="text-center py-5 glass-panel">
                    <div className="display-1 mb-4">📭</div>
                    <h3>No notifications yet</h3>
                    <p className="text-muted">You're all caught up!</p>
                </div>
            ) : (
                <div className="notif-list animate__animated animate__fadeIn">
                    {notifications.map((notif) => (
                        <Card
                            key={notif.id}
                            className={`mb-3 notif-card shadow-sm border-0 ${readNotifications.includes(notif.id) ? 'opacity-75' : 'border-start border-4 border-' + notif.type}`}
                            onClick={() => handleNotifClick(notif.reportId, notif.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            <Card.Body className="d-flex align-items-center p-3">
                                <div className="notif-icon-wrapper me-3 fs-3">{notif.icon}</div>
                                <div className="flex-grow-1">
                                    <h6 className={`mb-1 ${readNotifications.includes(notif.id) ? 'fw-normal' : 'fw-bold'}`}>{notif.message}</h6>
                                    <div className="small text-muted">{notif.timestamp}</div>
                                </div>
                                {!readNotifications.includes(notif.id) && <Badge bg="primary" pill className="ms-2">New</Badge>}
                            </Card.Body>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Notifications;