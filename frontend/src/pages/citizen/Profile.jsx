import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api/axios";
import "./Profile.css";

function Profile() {
    const [profile, setProfile] = useState({
        username: "",
        mobile: "",
        report_count: 0,
        points: 0,
        badges: [],
    });
    const [message, setMessage] = useState({ text: "", type: "" });
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const currentUser = localStorage.getItem("username");
    const accessToken = localStorage.getItem("access");

    useEffect(() => {
        const fetchProfile = async () => {
            if (!accessToken || !currentUser) {
                setMessage({
                    text: "❌ Please log in to view your profile.",
                    type: "error",
                });
                navigate("/login");
                return;
            }

            setIsLoading(true);
            try {
                // Fetch user profile with Authorization header
                const profileRes = await api.get("/api/profile/", {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                setProfile(profileRes.data);
            } catch (err) {
                console.error("Profile Fetch Error:", err);
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
                        text: `❌ Failed to load profile: ${err.response?.data?.error || "Unknown error"}`,
                        type: "error",
                    });
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [currentUser, accessToken, navigate]);

    const handleLogout = () => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        document.cookie = "csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        navigate("/login");
    };

    return (
        <div className="container mt-4">
            <h2 className="profile-header">👤 My Profile</h2>

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
                <div className="card shadow-sm p-4 mb-4 profile-card">
                    <h4 className="section-title">User Information</h4>
                    <div className="row mb-3">
                        <div className="col-md-6">
                            <label className="form-label fw-bold">Username</label>
                            <input className="form-control" value={profile.username} disabled />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold">Mobile Number</label>
                            <input className="form-control" value={profile.mobile || "Not Provided"} disabled />
                        </div>
                    </div>

                    <div className="row mb-3">
                        <div className="col-md-4">
                            <label className="form-label fw-bold">Reports Submitted</label>
                            <input className="form-control" value={profile.report_count} disabled />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-bold">Points</label>
                            <input className="form-control" value={profile.points} disabled />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-bold">Badges</label>
                            <div className="badges-container">
                                {profile.badges.length > 0 ? (
                                    profile.badges.map((badge, index) => (
                                        <span key={index} className="badge bg-primary me-2">{badge}</span>
                                    ))
                                ) : (
                                    <p className="text-muted">No badges earned yet.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="button-container">
                        <button
                            type="button"
                            className="btn btn-danger mt-3 logout-btn"
                            onClick={handleLogout}
                            disabled={isLoading}
                        >
                            🚪 Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Profile;