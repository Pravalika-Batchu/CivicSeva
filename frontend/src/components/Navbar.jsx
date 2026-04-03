import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Badge } from "react-bootstrap";
import "./Navbar.css";

function Navbar() {
    const location = useLocation(); // Force re-render on route change
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");
    const [notificationCount, setNotificationCount] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch unread notification count from localStorage
        const unreadCount = parseInt(localStorage.getItem(`unreadNotifications_${username}`)) || 0;
        setNotificationCount(unreadCount);

        const handleScroll = () => {
            if (window.scrollY > 50) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [username, location]); // Re-run on location change too

    return (
        <nav className={`navbar-custom navbar navbar-expand-lg fixed-top ${isScrolled ? 'navbar-scrolled shadow-sm' : ''}`}>
            <div className="container-fluid px-4">
                {/* Logo */}
                <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
                    <span className="brand-icon" style={{ fontSize: '1.5rem' }}>🌍</span>
                    <span style={{ fontWeight: 800, background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        CivicSeva
                    </span>
                </Link>
                {/* Mobile Toggler */}
                <button
                    className="navbar-toggler border-0"
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
                    <ul className="navbar-nav ms-auto align-items-center gap-3">
                        {!username ? (
                            <>
                                <li className="nav-item">
                                    <Link className="nav-link" to="/login">Login</Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="btn btn-secondary py-2 px-4" to="/register/citizen">Register</Link>
                                </li>
                            </>
                        ) : (
                            <>
                                {/* Citizen Links */}
                                {role === "CITIZEN" && (
                                    <>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/issue-map">Map View</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/reports">Reports</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/my-reports">My Reports</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/leaderboard">Leaderboard</Link>
                                        </li>
                                        <li className="nav-item position-relative">
                                            <Link className="nav-link" to="/notifications">
                                                🔔
                                                {notificationCount > 0 && (
                                                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light">
                                                        {notificationCount}
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="btn btn-primary shadow-sm" to="/report">
                                                + Report Issue
                                            </Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/profile">👤</Link>
                                        </li>
                                    </>
                                )}

                                {/* Officer Links */}
                                {role === "DEPT_OFFICER" && (
                                    <>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/officer/dashboard">Dashboard</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/officer/statistics">Statistics</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/reports">Reports</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/leaderboard">Leaderboard</Link>
                                        </li>
                                    </>
                                )}

                                {/* Admin Links */}
                                {role === "ADMIN" && (
                                    <>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/admin/dashboard">Dashboard</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/admin/reassign">Reassign</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/reports">Reports</Link>
                                        </li>
                                        <li className="nav-item">
                                            <Link className="nav-link" to="/leaderboard">Leaderboard</Link>
                                        </li>
                                        <li className="nav-item position-relative">
                                            <Link className="nav-link" to="/admin/notifications">
                                                🔔 Alerts
                                            </Link>
                                        </li>
                                    </>
                                )}

                                <li className="nav-item">
                                    <button
                                        className="btn btn-link nav-link text-danger"
                                        style={{ textDecoration: 'none' }}
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