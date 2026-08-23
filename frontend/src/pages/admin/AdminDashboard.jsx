import { useState, useEffect } from "react";
import api from "../../services/api/axios";
import { Bar } from "react-chartjs-2";
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { Container, Row, Col, Spinner, Button } from "react-bootstrap";
import { FaChartLine, FaBuilding, FaClipboardList, FaCheckCircle, FaHourglassHalf, FaRobot, FaSync } from "react-icons/fa";
import "animate.css";

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function AdminDashboard() {
    const [issues, setIssues] = useState([]);
    const [aiSummary, setAiSummary] = useState("");
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const accessToken = localStorage.getItem("access");
        try {
            const res = await api.get("/api/issues/", { headers: { Authorization: `Bearer ${accessToken}` } });
            setIssues(res.data);
            generateAiSummary(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const generateAiSummary = (issuesData) => {
        setAiLoading(true);
        // ... (Keep existing logic for stats calculation)
        const total = issuesData.length;
        const pending = issuesData.filter((i) => i.status === "PENDING").length;
        const resolved = issuesData.filter((i) => i.status === "RESOLVED").length;

        const deptCount = {};
        issuesData.forEach((i) => {
            const dept = i.department_name || "Unassigned";
            deptCount[dept] = (deptCount[dept] || 0) + 1;
        });

        const prompt = `
        Executive analysis of city data for the Commissioner.
        Rules: No markdown (no stars), no labels (like Summary:), max 2 sentences.
        Data: Total ${total} (R:${resolved}, P:${pending}), Top: ${Object.entries(deptCount).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => k).join(', ')}.
        Provide 2 professional, plain-text sentences.
        `;

        const accessToken = localStorage.getItem("access");
        api.post("/api/ai-chat/", { message: prompt }, { headers: { Authorization: `Bearer ${accessToken}` } })
            .then((res) => {
                if (res.data && res.data.reply) {
                    // String cleanup for symbols and labels
                    const cleanReply = res.data.reply
                        .replace(/\*\*/g, "")
                        .replace(/[#*`_]/g, "")
                        .replace(/^(Dashboard Summary|Summary|Insight|Analysis): /i, "")
                        .trim();
                    setAiSummary(cleanReply);
                } else {
                    setAiSummary("System status: Active monitoring in progress.");
                }
            })
            .catch((err) => {
                console.error("AI Summary API error:", err);
                setAiSummary("System insight currently unavailable. Please check the charts below.");
            })
            .finally(() => setAiLoading(false));
    };

    // ... (Keep existing stats calculation logic)
    const total = issues.length;
    const pending = issues.filter((i) => i.status === "PENDING").length;
    const resolved = issues.filter((i) => i.status === "RESOLVED").length;
    const inProgress = issues.filter((i) => i.status === "IN_PROGRESS").length;

    const deptCount = {};
    issues.forEach(i => {
        const dept = i.department_name || "Unassigned";
        deptCount[dept] = (deptCount[dept] || 0) + 1;
    });

    const severityStats = {
        Low: issues.filter((i) => i.severity === "Low").length,
        Medium: issues.filter((i) => i.severity === "Medium").length,
        High: issues.filter((i) => i.severity === "High").length,
        Critical: issues.filter((i) => i.severity === "Critical").length,
    };

    const barData = {
        labels: Object.keys(deptCount),
        datasets: [{ label: "Issues", data: Object.values(deptCount), backgroundColor: 'rgba(54, 162, 235, 0.7)', borderRadius: 5 }]
    };

    const severityBarData = {
        labels: ["Low", "Medium", "High", "Critical"],
        datasets: [{ label: "Count", data: [severityStats.Low, severityStats.Medium, severityStats.High, severityStats.Critical], backgroundColor: ['#28a745', '#ffc107', '#fd7e14', '#dc3545'], borderRadius: 5 }]
    };

    // Chart Options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }
    };

    const StatCard = ({ title, value, icon, color }) => (
        <Col md={3} className="animate__animated animate__fadeInUp">
            <div className={`glass-panel p-4 text-center h-100 hover-lift border-bottom border-4 border-${color}`}>
                <div className={`mb-3 p-3 rounded-circle bg-${color}-subtle text-${color} d-inline-flex fs-4`}>{icon}</div>
                <h3 className="fw-bold mb-0 text-dark">{value}</h3>
                <span className="text-muted text-uppercase small fw-bold">{title}</span>
            </div>
        </Col>
    );

    return (
        <Container fluid className="py-5" style={{ minHeight: '100vh', background: 'transparent' }}>
            <div className="d-flex justify-content-between align-items-center mb-5 animate__animated animate__fadeInDown">
                <div>
                    <h2 className="display-6 fw-bold text-gradient">Admin Dashboard</h2>
                    <p className="text-muted mb-0">System overview and analytics</p>
                </div>
                <div className="d-flex gap-2">
                    <Button variant="danger" className="rounded-pill shadow-sm" onClick={() => window.location.href = '/hotspots'}>
                        🔥 Hotspot Analysis
                    </Button>
                    <Button variant="light" className="rounded-pill shadow-sm" onClick={fetchData} disabled={loading}>
                        <FaSync className={`me-2 ${loading ? 'fa-spin' : ''}`} /> Refresh
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
            ) : (
                <>
                    {/* AI Insight Header */}
                    <div className="glass-panel p-4 mb-5 border-start border-5 border-info animate__animated animate__fadeIn shadow-sm" style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(20px)', borderRadius: '15px' }}>
                        <div className="d-flex align-items-center gap-4">
                            <div className="bg-info-subtle p-3 rounded-circle text-info shadow-inner" style={{ minWidth: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FaRobot className="fs-2 animate__pulse animate__infinite" />
                            </div>
                            <div className="flex-grow-1">
                                <h6 className="text-info text-uppercase small fw-bold mb-1 letter-spacing-1">Executive System Analysis</h6>
                                {aiLoading ? (
                                    <div className="d-flex align-items-center gap-2 text-muted">
                                        <Spinner size="sm" animation="border" />
                                        <span className="small italic text-info">Generating executive intelligence...</span>
                                    </div>
                                ) : (
                                    <p className="mb-0 text-dark fw-medium" style={{ lineHeight: '1.6', fontSize: '1.05rem', letterSpacing: '0.3px', fontStyle: 'italic' }}>
                                        "{aiSummary || 'Civic infrastructure monitoring is operating within standard parameters across municipal wards.'}"
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <Row className="g-4 mb-5">
                        <StatCard title="Total Issues" value={total} icon={<FaClipboardList />} color="primary" />
                        <StatCard title="Pending" value={pending} icon={<FaHourglassHalf />} color="warning" />
                        <StatCard title="In Progress" value={inProgress} icon={<FaSync />} color="info" />
                        <StatCard title="Resolved" value={resolved} icon={<FaCheckCircle />} color="success" />
                    </Row>

                    <Row className="g-4">
                        <Col lg={6} className="animate__animated animate__fadeInLeft">
                            <div className="glass-panel p-4 h-100">
                                <h5 className="fw-bold mb-4 text-secondary"><FaBuilding className="me-2" />Department Load</h5>
                                <div style={{ height: '300px' }}>
                                    <Bar data={barData} options={{ ...chartOptions, indexAxis: 'y' }} />
                                </div>
                            </div>
                        </Col>
                        <Col lg={6} className="animate__animated animate__fadeInRight">
                            <div className="glass-panel p-4 h-100">
                                <h5 className="fw-bold mb-4 text-secondary"><FaChartLine className="me-2" />Severity Distribution</h5>
                                <div style={{ height: '300px' }}>
                                    <Bar data={severityBarData} options={chartOptions} />
                                </div>
                            </div>
                        </Col>
                    </Row>
                </>
            )}
        </Container>
    );
}

export default AdminDashboard;