import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Badge } from "react-bootstrap";
import "./Navbar.css";

function Navbar() {
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");
    const [notificationCount, setNotificationCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch unread notification count from localStorage
        const unreadCount = parseInt(localStorage.getItem(`unreadNotifications_${username}`)) || 0;
        setNotificationCount(unreadCount);
        console.log("Navbar: Unread notification count:", unreadCount); // Debug
    }, [username]);

    return (
        <nav className="civic-navbar navbar navbar-expand-lg">
            <div className="container-fluid">
                {/* Logo */}
                <Link className="navbar-brand" to="/">
                    <span className="brand-icon">🌍</span> Civic Seva
                </Link>
                {/* Mobile Toggler */}
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                    aria-controls="navbarNav"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>
                {/* Navbar Items */}
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav ms-auto">
                        {!username ? (
                            <>
                                <li className="nav-item">
                                    <Link className="nav-link" to="/login">Login</Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link" to="/register/citizen">Citizen Registration</Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link" to="/register/officer">Officer Registration</Link>
                                </li>
                            </>
                        ) : (
                            <>
                                {role === "CITIZEN" && (
                                    <>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/report">Report</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/my-reports">My Reports</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/profile">Profile</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link notification-link" to="/notifications">
                                                <span className="notification-icon">🔔</span>
                                                Notifications
                                                {notificationCount > 0 && (
                                                    <Badge className="notification-badge">
                                                        {notificationCount}
                                                    </Badge>
                                                )}
                                            </Link>
                                        </li>
                                        <li className="nav-link" to="/issue-map">
                                            <Link className="nav-link" to="/issue-map">Issue Map</Link>
                                        </li>
                                        {/* <li className="nav-link" to="/helpdesk">
                                            <Link className="nav-link" to="/helpdesk">Help Desk</Link>
                                        </li> */}


                                    </>
                                )}
                                {role === "DEPT_OFFICER" && (
                                    <>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/officer/dashboard">Officer Dashboard</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/officer/statistics">Statistics</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link notification-link" to="/notifications">
                                                <span className="notification-icon">🔔</span>
                                                Notifications
                                                {notificationCount > 0 && (
                                                    <Badge className="notification-badge">
                                                        {notificationCount}
                                                    </Badge>
                                                )}
                                            </Link>
                                        </li>
                                    </>
                                )}
                                {role === "ADMIN" && (
                                    <>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/admin/dashboard">Admin Dashboard</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/admin/reassign">Reassign Issues</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/admin/notifications">Department Notifications</Link>
                                        </li>
                                        {/* <li className="nav-item">
                                            <Link className="nav-link" to="/helpdesk/admin">Helpdesk</Link>
                                        </li> */}
                                    </>
                                )}
                                <li className="nav-item">
                                    <Link className="nav-link" to="/leaderboard">Leaderboard</Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link" to="/reports">All Reports</Link>
                                </li>
                                <li className="nav-item">
                                    <button
                                        className="logout-button"
                                        onClick={() => {
                                            localStorage.clear();
                                            window.location.href = "/";
                                        }}
                                    >
                                        Logout
                                    </button>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;