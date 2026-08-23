import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api/axios";
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { Container, Row, Col, Spinner } from "react-bootstrap";
import { FaChartBar, FaCheckCircle, FaExclamationTriangle, FaHourglassHalf, FaClipboardList } from "react-icons/fa";
import "animate.css";
import "./OfficerStatistics.css"; // Keep for custom if needed

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function OfficerStatistics() {
    const [stats, setStats] = useState({
        total: 0, solved: 0, pending: 0, in_progress: 0,
        severity_high: 0, severity_medium: 0, severity_low: 0,
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        const fetchStats = async () => {
            const accessToken = localStorage.getItem("access");
            if (!accessToken) { navigate("/login"); return; }
            try {
                const res = await api.get("/api/department-statistics/", { headers: { Authorization: `Bearer ${accessToken}` } });
                setStats(res.data);
            } catch (err) {
                console.error(err);
                if (err.response?.status === 401) navigate("/login");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [navigate]);

    useEffect(() => {
        if (chartRef.current && !loading) {
            if (chartInstanceRef.current) chartInstanceRef.current.destroy();

            const ctx = chartRef.current.getContext('2d');
            chartInstanceRef.current = new Chart(ctx, {
                type: "bar",
                data: {
                    labels: ["Total", "Solved", "Pending", "Progress", "High Sev", "Med Sev", "Low Sev"],
                    datasets: [{
                        label: "Issues Count",
                        data: [stats.total, stats.solved, stats.pending, stats.in_progress, stats.severity_high, stats.severity_medium, stats.severity_low],
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(153, 102, 255, 0.6)',
                            'rgba(255, 99, 132, 0.6)',
                            'rgba(255, 159, 64, 0.6)',
                            'rgba(201, 203, 207, 0.6)'
                        ],
                        borderColor: [
                            'rgb(54, 162, 235)',
                            'rgb(75, 192, 192)',
                            'rgb(255, 206, 86)',
                            'rgb(153, 102, 255)',
                            'rgb(255, 99, 132)',
                            'rgb(255, 159, 64)',
                            'rgb(201, 203, 207)'
                        ],
                        borderWidth: 1,
                        borderRadius: 5,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, titleFont: { size: 14 }, bodyFont: { size: 14 } }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { grid: { display: false } }
                    },
                    animation: { duration: 1000, easing: 'easeOutQuart' }
                }
            });
        }
    }, [stats, loading]);

    const StatCard = ({ title, value, icon, color, delay }) => (
        <Col md={6} lg={3} className="animate__animated animate__fadeInUp" style={{ animationDelay: `${delay}s` }}>
            <div className={`glass-panel p-4 text-center h-100 hover-lift border-bottom border-4 border-${color}`}>
                <div className={`mb-3 p-3 rounded-circle bg-${color}-subtle text-${color} d-inline-flex fs-3`}>
                    {icon}
                </div>
                <h2 className="display-4 fw-bold mb-0 text-dark">{value}</h2>
                <p className="text-muted text-uppercase small fw-bold mt-2">{title}</p>
            </div>
        </Col>
    );

    return (
        <Container fluid className="py-5" style={{ minHeight: '100vh', background: 'transparent' }}>
            <div className="text-center mb-5 animate__animated animate__fadeInDown">
                <h2 className="display-5 fw-bold text-gradient">Department Analytics</h2>
                <p className="text-muted">Real-time performance and issue tracking metrics</p>
            </div>

            {loading ? (
                <div className="text-center py-5"><Spinner animation="grow" variant="primary" /></div>
            ) : (
                <>
                    <Row className="g-4 mb-5">
                        <StatCard title="Total Issues" value={stats.total} icon={<FaClipboardList />} color="primary" delay={0.1} />
                        <StatCard title="Solved" value={stats.solved} icon={<FaCheckCircle />} color="success" delay={0.2} />
                        <StatCard title="Pending" value={stats.pending} icon={<FaHourglassHalf />} color="warning" delay={0.3} />
                        <StatCard title="Critical/High" value={stats.severity_high} icon={<FaExclamationTriangle />} color="danger" delay={0.4} />
                    </Row>

                    <Row className="animate__animated animate__fadeInUp" style={{ animationDelay: '0.5s' }}>
                        <Col xs={12}>
                            <div className="glass-panel p-4 p-md-5">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h4 className="fw-bold m-0"><FaChartBar className="me-2 text-primary" />Issue Distribution</h4>
                                </div>
                                <div style={{ height: '400px', width: '100%' }}>
                                    <canvas ref={chartRef}></canvas>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </>
            )}
        </Container>
    );
}

export default OfficerStatistics;