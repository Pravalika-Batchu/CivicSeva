import { useState, useEffect } from "react";
import { Card, Alert, Button, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../services/api/axios";
import "./Notifications.css";

function Notifications() {
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");
    const department = localStorage.getItem("department");
    const [notifications, setNotifications] = useState([]);
    const [readNotifications, setReadNotifications] = useState(() => {
        return JSON.parse(localStorage.getItem(`readNotifications_${username}`)) || [];
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const accessToken = localStorage.getItem("access");
    const navigate = useNavigate();

    // Haversine formula to calculate distance between two points in km
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Check if issue is nearby (within 5km)
    const isNearby = (issueLat, issueLng) => {
        if (!userLocation) return false;
        const distance = calculateDistance(userLocation.lat, userLocation.lng, issueLat, issueLng);
        return distance <= 5; // 5km radius
    };

    useEffect(() => {
        const fetchLocationAndNotifications = async () => {
            setLoading(true);
            setError(null);

            console.log("Fetching notifications for:", { username, role, department });

            if (!username || !role || (role === "DEPT_OFFICER" && !department)) {
                setError("Please log in again.");
                setLoading(false);
                navigate("/login");
                return;
            }
            if (!accessToken) {
                setError("Authentication token missing. Please log in again.");
                setLoading(false);
                navigate("/login");
                return;
            }

            try {
                // Fetch user's location
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const { latitude, longitude } = position.coords;
                            setUserLocation({ lat: latitude, lng: longitude });
                            console.log("User location:", { lat: latitude, lng: longitude });
                            fetchNotificationsWithLocation(latitude, longitude);
                        },
                        (error) => {
                            console.warn("Geolocation failed:", error);
                            fetchNotificationsWithLocation(null, null); // Proceed without location
                        }
                    );
                } else {
                    fetchNotificationsWithLocation(null, null);
                }
            } catch (err) {
                console.error("Location fetch error:", err);
                fetchNotificationsWithLocation(null, null);
            }
        };

        const fetchNotificationsWithLocation = async (lat, lng) => {
            let notifs = [];

            try {
                if (role === "CITIZEN") {
                    const issuesRes = await api.get("/api/issues/", {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    });
                    const reports = Array.isArray(issuesRes.data) ? issuesRes.data : [];
                    console.log("Citizen issues response:", reports);
                    reports.forEach((report, index) => {
                        const status = report.status?.toUpperCase() || "";
                        const severity = report.severity?.toLowerCase() || "";
                        const citizenUsername = report.citizen_username || "";
                        const timestamp = new Date(report.updated_at || report.created_at || Date.now()).toLocaleString();

                        // Own resolved reports
                        if (status === "RESOLVED" && citizenUsername === username) {
                            notifs.push({
                                id: `resolved-${report.id || index}`,
                                type: "success",
                                icon: "✅",
                                message: `Your report "${report.title || "Untitled"}" has been resolved.`,
                                reportId: report.id,
                                timestamp,
                            });
                        }

                        // Nearby high severity pending issues
                        if (severity === "high" && status === "PENDING" && isNearby(parseFloat(report.latitude), parseFloat(report.longitude))) {
                            notifs.push({
                                id: `nearby-high-${report.id || index}`,
                                type: "warning",
                                icon: "⚠️",
                                message: `High severity issue nearby: "${report.title || "Untitled"}" (within 5km).`,
                                reportId: report.id,
                                timestamp,
                            });
                        }
                    });
                }

                if (role === "DEPT_OFFICER") {
                    // High severity assigned issues
                    const issuesRes = await api.get("/api/assigned_issues/", {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    });
                    const reports = Array.isArray(issuesRes.data) ? issuesRes.data : [];
                    console.log("Officer assigned issues response:", reports);
                    reports.forEach((report, index) => {
                        const status = report.status?.toUpperCase() || "";
                        const severity = report.severity?.toLowerCase() || "";
                        const timestamp = new Date(report.updated_at || report.created_at || Date.now()).toLocaleString();

                        if (severity === "high" && status === "PENDING") {
                            notifs.push({
                                id: `high-${report.id || index}`,
                                type: "warning",
                                icon: "⚠️",
                                message: `High severity issue assigned: "${report.title || "Untitled"}".`,
                                reportId: report.id,
                                timestamp,
                            });
                        }

                        // Nearby high severity assigned issues
                        if (severity === "high" && status === "PENDING" && isNearby(parseFloat(report.latitude), parseFloat(report.longitude))) {
                            notifs.push({
                                id: `nearby-high-assigned-${report.id || index}`,
                                type: "warning",
                                icon: "🚨",
                                message: `High severity assigned issue nearby: "${report.title || "Untitled"}" (within 5km).`,
                                reportId: report.id,
                                timestamp,
                            });
                        }
                    });

                    // Department notifications
                    const notifRes = await api.get("/api/department-notifications/", {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    });
                    const deptNotifs = Array.isArray(notifRes.data) ? notifRes.data : [];
                    console.log("Department notifications response:", deptNotifs);
                    deptNotifs.forEach((notif, index) => {
                        const timestamp = new Date(notif.created_at || Date.now()).toLocaleString();
                        notifs.push({
                            id: `dept-notif-${notif.id || index}`,
                            type: notif.notif_type === "MISCLASSIFICATION" ? "warning" : "info",
                            icon: notif.notif_type === "MISCLASSIFICATION" ? "⚠️" : "📬",
                            message: notif.message || `Notification for issue #${notif.issue_id}: ${notif.notif_type}`,
                            reportId: notif.issue_id,
                            timestamp,
                        });
                    });
                }

                // Sort notifications by timestamp (newest first)
                notifs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                console.log("Final notifications:", notifs);
                setNotifications(notifs);
            } catch (err) {
                console.error("Fetch error:", err.response?.data || err.message);
                if (err.response?.status === 401) {
                    setError("Session expired or unauthorized. Please log in again.");
                    localStorage.removeItem("access");
                    localStorage.removeItem("refresh");
                    navigate("/login");
                } else {
                    setError("Failed to load notifications. Please try again later.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchLocationAndNotifications();
    }, [username, role, department, navigate]);

    useEffect(() => {
        if (username) {
            localStorage.setItem(`readNotifications_${username}`, JSON.stringify(readNotifications));
        }
    }, [readNotifications, username]);

    const markAsRead = (notifId) => {
        setReadNotifications((prev) => [...prev, notifId]);
    };

    const clearAllNotifications = () => {
        setReadNotifications(notifications.map((notif) => notif.id));
    };

    const handleNotificationClick = (reportId) => {
        if (reportId) {
            navigate(role === "DEPT_OFFICER" ? `/officer/issue/${reportId}` : `/reports?reportId=${reportId}`);
        }
    };

    return (
        <div className="container py-4 notifications-container">
            <h2 className="notifications-header">🔔 Your Notifications</h2>

            <div className="d-flex justify-content-end mb-4">
                <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={clearAllNotifications}
                    disabled={notifications.length === 0 || notifications.every((n) => readNotifications.includes(n.id))}
                    className="clear-all-btn"
                >
                    Clear All
                </Button>
            </div>

            {loading && <Alert variant="info" className="alert-info">Loading notifications...</Alert>}
            {error && <Alert variant="danger" className="alert-danger">{error}</Alert>}
            {!loading && !error && notifications.length === 0 && (
                <Alert variant="secondary" className="alert-secondary">No new notifications.</Alert>
            )}

            {!loading && !error && notifications.length > 0 && (
                <div className="notifications-list">
                    {notifications.map((notif) => (
                        <Card
                            key={notif.id}
                            className={`notification-card mb-3 shadow-sm ${readNotifications.includes(notif.id) ? "read" : ""}`}
                            onClick={() => handleNotificationClick(notif.reportId)}
                        >
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div className="notification-content">
                                        <span className="notification-icon">{notif.icon}</span>
                                        <span className={`notification-message ${readNotifications.includes(notif.id) ? "text-muted" : ""}`}>
                                            {notif.message}
                                        </span>
                                    </div>
                                    {!readNotifications.includes(notif.id) && (
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                markAsRead(notif.id);
                                            }}
                                            className="mark-read-btn"
                                        >
                                            Mark as Read
                                        </Button>
                                    )}
                                </div>
                                <div className="notification-meta mt-2">
                                    <Badge bg={notif.type} className="notification-badge">{notif.type.charAt(0).toUpperCase() + notif.type.slice(1)}</Badge>
                                    <small className="text-muted">{notif.timestamp}</small>
                                </div>
                            </Card.Body>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Notifications;