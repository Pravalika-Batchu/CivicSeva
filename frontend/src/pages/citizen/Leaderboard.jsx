import { useEffect, useState } from "react";
import api from "../../services/api/axios";
import { useAuth } from "../../contexts/AuthContext";
import { Container, Row, Col, Badge } from "react-bootstrap";
import { FaMedal, FaCrown, FaUserCircle } from "react-icons/fa";
import "animate.css";

// Helper for Podium
const PodiumStep = ({ rank, data, type }) => {
    if (!data) return null;

    const heightMap = { 1: 250, 2: 200, 3: 170 };
    const colorMap = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
    const iconMap = { 1: <FaCrown className="text-warning mb-2 display-6" />, 2: <FaMedal className="text-secondary mb-2 h2" />, 3: <FaMedal className="text-brown mb-2 h3" style={{ color: '#CD7F32' }} /> };

    return (
        <div className="d-flex flex-column align-items-center justify-content-end mx-2" style={{ width: '120px' }}>
            <div className="text-center mb-2 animate__animated animate__fadeInDown">
                <div className="fw-bold small text-muted">{type === 'citizen' ? data.username : data.department}</div>
                <div className="badge bg-light text-dark shadow-sm border mt-1">{data.points || data.total_points} pts</div>
            </div>
            <div
                className="d-flex flex-column justify-content-end align-items-center w-100 rounded-top-4 shadow-lg animate__animated animate__slideInUp"
                style={{
                    height: `${heightMap[rank]}px`,
                    background: `linear-gradient(to top, ${colorMap[rank]}cc, ${colorMap[rank]}33)`,
                    borderTop: `4px solid ${colorMap[rank]}`
                }}
            >
                <h1 className="fw-bold text-white mb-3" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{rank}</h1>
                <div className="mb-4">{iconMap[rank]}</div>
            </div>
        </div>
    );
};

function Leaderboard() {
    const [officersLeaderboard, setOfficersLeaderboard] = useState([]);
    const [citizensLeaderboard, setCitizensLeaderboard] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        let mounted = true;
        const fetchData = async () => {
            setLoading(true);
            try {
                const leaderboardRes = await api.get("/api/leaderboard/", { withCredentials: true });
                if (mounted) {
                    setOfficersLeaderboard(leaderboardRes.data.department_leaderboard || []);
                    setCitizensLeaderboard((leaderboardRes.data.citizen_leaderboard || []).filter(c => c.points > 0));
                }

                if (user) {
                    const profileRes = await api.get("/api/profile/", { withCredentials: true });
                    if (mounted) setCurrentUser(profileRes.data);
                }
            } catch (err) {
                if (mounted) console.error(err.response?.data?.error || "Failed to load leaderboard");
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchData();
        return () => { mounted = false; };
    }, [user]);

    const getUserRank = (list, key, value) => {
        const idx = list.findIndex(i => i[key] === value);
        return idx !== -1 ? idx + 1 : null;
    };

    const RankRow = ({ rank, data, type, isMe }) => (
        <div className={`d-flex align-items-center justify-content-between p-3 mb-2 rounded-3 shadow-sm ${isMe ? 'bg-primary-subtle border border-primary' : 'bg-white'}`}>
            <div className="d-flex align-items-center">
                <span className="fw-bold text-muted me-3" style={{ width: '30px' }}>#{rank}</span>
                <div className="d-flex align-items-center">
                    <div className="bg-light rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                        {type === 'citizen' ? <FaUserCircle className="text-secondary h5 mb-0" /> : <span className="h5 mb-0">🏢</span>}
                    </div>
                    <div>
                        <div className="fw-bold text-dark">{type === 'citizen' ? data.username : data.department}</div>
                        <div className="small text-muted">{data.issues_resolved} issues resolved</div>
                    </div>
                </div>
            </div>
            <div className="fw-bold fs-5 text-primary">
                {type === 'citizen' ? data.points : data.total_points} <span className="fs-6 text-muted">pts</span>
            </div>
        </div>
    );

    return (
        <Container fluid className="py-5" style={{ minHeight: '100vh', background: 'transparent' }}>
            <div className="text-center mb-5 animate__animated animate__fadeIn">
                <h2 className="display-4 fw-bold text-gradient">Hall of Fame</h2>
                <p className="lead text-muted">Celebrating our top civic heroes and departments</p>
            </div>

            {loading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
            ) : (
                <Row className="gy-5">
                    {/* Citizens Section */}
                    <Col lg={6} className="animate__animated animate__fadeInLeft">
                        <div className="glass-panel p-4 h-100">
                            <h3 className="fw-bold mb-4 text-center"><FaUserCircle className="text-primary me-2" />Top Citizens</h3>

                            {/* Podium */}
                            {citizensLeaderboard.length >= 3 && (
                                <div className="d-flex justify-content-center align-items-end mb-5">
                                    <PodiumStep rank={2} data={citizensLeaderboard[1]} type="citizen" />
                                    <PodiumStep rank={1} data={citizensLeaderboard[0]} type="citizen" />
                                    <PodiumStep rank={3} data={citizensLeaderboard[2]} type="citizen" />
                                </div>
                            )}

                            {/* List */}
                            <div className="mt-4">
                                {citizensLeaderboard.slice(0, 10).map((citizen, idx) => (
                                    <RankRow
                                        key={idx}
                                        rank={idx + 1}
                                        data={citizen}
                                        type="citizen"
                                        isMe={currentUser?.username === citizen.username}
                                    />
                                ))}
                                {citizensLeaderboard.length === 0 && <p className="text-center text-muted">No data available yet.</p>}
                            </div>
                        </div>
                    </Col>

                    {/* Officers Section */}
                    <Col lg={6} className="animate__animated animate__fadeInRight">
                        <div className="glass-panel p-4 h-100">
                            <h3 className="fw-bold mb-4 text-center">🏢 Top Departments</h3>

                            {/* Podium */}
                            {officersLeaderboard.length >= 3 && (
                                <div className="d-flex justify-content-center align-items-end mb-5">
                                    <PodiumStep rank={2} data={officersLeaderboard[1]} type="officer" />
                                    <PodiumStep rank={1} data={officersLeaderboard[0]} type="officer" />
                                    <PodiumStep rank={3} data={officersLeaderboard[2]} type="officer" />
                                </div>
                            )}

                            {/* List */}
                            <div className="mt-4">
                                {officersLeaderboard.map((dept, idx) => (
                                    <RankRow
                                        key={idx}
                                        rank={idx + 1}
                                        data={dept}
                                        type="officer"
                                        isMe={currentUser?.department === dept.department}
                                    />
                                ))}
                                {officersLeaderboard.length === 0 && <p className="text-center text-muted">No data available yet.</p>}
                            </div>
                        </div>
                    </Col>
                </Row>
            )}

            {/* Current User Floating Stats Bar */}
            {currentUser && currentUser.role === 'CITIZEN' && (
                <div className="fixed-bottom p-3 animate__animated animate__slideInUp" style={{ zIndex: 1050 }}>
                    <div className="container">
                        <div className="glass-panel bg-white border-primary border-2 p-3 d-flex justify-content-between align-items-center shadow-lg rounded-pill" style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div className="d-flex align-items-center ps-3">
                                <span className="fw-bold me-3">You</span>
                                <Badge bg="primary" pill className="me-2">Rank #{getUserRank(citizensLeaderboard, 'username', currentUser.username) || '-'}</Badge>
                            </div>
                            <div className="d-flex align-items-center pe-3">
                                <span className="fw-bold fs-5 text-primary me-2">{currentUser.points || 0}</span> <span className="text-muted small">points</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Container>
    );
}

export default Leaderboard;