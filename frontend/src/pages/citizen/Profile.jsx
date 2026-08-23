import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api/axios";
import { Container, Row, Col, Button, Badge, Spinner, Alert } from "react-bootstrap";
import { FaPhone, FaStar, FaMedal, FaSignOutAlt, FaClipboardList, FaTrophy } from "react-icons/fa";
import "animate.css";
import "./Profile.css";

function Profile() {
    const [profile, setProfile] = useState({
        username: "",
        mobile: "",
        report_count: 0,
        points: 0,
        badges: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            const accessToken = localStorage.getItem("access");
            if (!accessToken) {
                navigate("/login");
                return;
            }

            try {
                const profileRes = await api.get("/api/profile/", {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                setProfile(profileRes.data);
            } catch (err) {
                console.error("Profile Fetch Error:", err);
                if (err.response?.status === 401) {
                    localStorage.removeItem("access");
                    navigate("/login");
                }
                setMessage({ text: "Failed to load profile.", type: "error" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        navigate("/login");
    };

    const StatCard = ({ icon, value, label, color }) => (
        <div className="glass-panel p-4 text-center h-100 hover-lift d-flex flex-column justify-content-center align-items-center">
            <div className={`mb-3 p-3 rounded-circle bg-${color}-subtle text-${color} d-inline-flex`}>
                {icon}
            </div>
            <h3 className="fw-bold mb-1 display-6">{value}</h3>
            <span className="text-muted small text-uppercase fw-bold">{label}</span>
        </div>
    );

    return (
        <Container className="py-5" style={{ minHeight: '100vh', maxWidth: '1000px' }}>
            {message && (
                <Alert variant="danger" className="mb-4 shadow-sm animate__animated animate__fadeIn">
                    {message.text}
                </Alert>
            )}

            {isLoading ? (
                <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
            ) : (
                <>
                    {/* Profile Header */}
                    <div className="glass-panel p-5 mb-5 position-relative overflow-hidden animate__animated animate__fadeInDown">
                <div className="position-absolute top-0 start-0 w-100 h-100 opacity-10"
                    style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', zIndex: -1 }}>
                </div>

                <Row className="align-items-center position-relative z-1">
                    <Col md={3} className="text-center mb-4 mb-md-0">
                        <div className="position-relative d-inline-block">
                            <div className="bg-white p-1 rounded-circle shadow-lg">
                                <div className="bg-light rounded-circle d-flex align-items-center justify-content-center" style={{ width: '150px', height: '150px' }}>
                                    <span className="display-1">👤</span>
                                </div>
                            </div>
                            {profile.points > 100 && (
                                <div className="position-absolute bottom-0 end-0 bg-warning text-dark rounded-circle p-2 shadow border border-white" title="Top Contributor">
                                    <FaStar />
                                </div>
                            )}
                        </div>
                    </Col>
                    <Col md={6} className="text-center text-md-start">
                        <h2 className="display-5 fw-bold mb-1">{profile.username}</h2>
                        <p className="text-muted mb-3 d-flex align-items-center justify-content-center justify-content-md-start gap-2">
                            <FaPhone className="small" /> {profile.mobile || "No mobile number"}
                        </p>
                        <div className="d-flex gap-2 justify-content-center justify-content-md-start">
                            {profile.badges.map((badge, idx) => (
                                <Badge key={idx} bg="primary" pill className="px-3 py-2 shadow-sm">
                                    <FaMedal className="me-1" /> {badge}
                                </Badge>
                            ))}
                            {profile.badges.length === 0 && <span className="text-muted small fst-italic">No badges yet. Start reporting!</span>}
                        </div>
                    </Col>
                    <Col md={3} className="text-center text-md-end mt-4 mt-md-0">
                        <Button variant="outline-danger" onClick={handleLogout} className="rounded-pill px-4 shadow-sm hover-scale">
                            <FaSignOutAlt className="me-2" /> Logout
                        </Button>
                    </Col>
                </Row>
            </div>

            {/* Stats Grid */}
            <Row className="g-4 mb-5 animate__animated animate__fadeInUp">
                <Col md={4}>
                    <StatCard
                        icon={<FaClipboardList className="display-6" />}
                        value={profile.report_count}
                        label="Reports Submitted"
                        color="primary"
                    />
                </Col>
                <Col md={4}>
                    <StatCard
                        icon={<FaTrophy className="display-6" />}
                        value={profile.points}
                        label="Impact Points"
                        color="warning"
                    />
                </Col>
                <Col md={4}>
                    <StatCard
                        icon={<FaMedal className="display-6" />}
                        value={profile.badges.length}
                        label="Badges Earned"
                        color="success"
                    />
                </Col>
            </Row>

            {/* Recent Activity or Impact Summary (Placeholder for now) */}
            <div className="glass-panel p-5 text-center animate__animated animate__fadeInUp" style={{ animationDelay: '0.2s' }}>
                <h4 className="fw-bold mb-3">Your Civic Impact</h4>
                <p className="text-muted mx-auto" style={{ maxWidth: '600px' }}>
                    Thank you for being an active citizen! Your reports help authorities identify and resolve issues faster, making our city a better place to live.
                </p>
                <Button variant="primary" className="rounded-pill px-5 mt-3 shadow-lg hover-lift" onClick={() => navigate('/report')}>
                    Submit New Report
                </Button>
            </div>
                </>
            )}
        </Container>
    );
}

export default Profile;