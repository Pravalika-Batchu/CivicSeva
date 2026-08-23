import { useState, useEffect } from "react";
import { Container, Row, Col, Badge, Spinner, Button, Table } from "react-bootstrap";
import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";
import L from "leaflet";
import { Bar, Doughnut } from "react-chartjs-2";
import { 
    Chart, 
    BarElement, 
    CategoryScale, 
    LinearScale, 
    Tooltip, 
    Legend, 
    ArcElement, 
    PointElement, 
    LineElement 
} from "chart.js";
import { 
    FaFire, 
    FaChartBar, 
    FaMapMarkedAlt, 
    FaSync,
    FaInfoCircle
} from "react-icons/fa";
import { Link } from "react-router-dom";
import api from "../../services/api/axios";
import "leaflet/dist/leaflet.css";
import "animate.css";

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement, PointElement, LineElement);

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function HotspotAnalysis() {
    const [hotspots, setHotspots] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedHotspot, setSelectedHotspot] = useState(null);
    const [mapCenter, setMapCenter] = useState([17.4156, 78.4350]); // Hyderabad center default

    const fetchData = async () => {
        setLoading(true);
        try {
            const [hotspotsRes, analyticsRes] = await Promise.all([
                api.get("/api/hotspots/"),
                api.get("/api/hotspots/analytics/")
            ]);
            setHotspots(hotspotsRes.data);
            setAnalytics(analyticsRes.data);

            if (hotspotsRes.data && hotspotsRes.data.length > 0) {
                setMapCenter([hotspotsRes.data[0].latitude, hotspotsRes.data[0].longitude]);
                setSelectedHotspot(hotspotsRes.data[0]);
            }
        } catch (err) {
            console.error("Failed to load hotspot data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Chart 1: Issues by Category
    const categoryChartData = {
        labels: analytics?.category_distribution ? Object.keys(analytics.category_distribution) : [],
        datasets: [{
            label: "Report Count",
            data: analytics?.category_distribution ? Object.values(analytics.category_distribution) : [],
            backgroundColor: ['#4361ee', '#3a0ca3', '#7209b7', '#f72585', '#4cc9f0', '#2ec4b6', '#ff9f1c'],
            borderRadius: 6
        }]
    };

    // Chart 2: Resolution Status (Deterministic, distinct color per status)
    const statusColorMap = {
        'OPEN': '#ef4444',              // Red
        'ASSIGNED': '#06b6d4',          // Cyan
        'IN_PROGRESS': '#3b82f6',       // Blue
        'PENDING_APPROVAL': '#8b5cf6',  // Purple
        'RESOLVED': '#10b981',          // Emerald Green
        'REASSIGNED': '#f59e0b',        // Amber / Orange
        'FLAGGED_FAKE': '#6b7280',      // Gray
    };

    const statusLabels = analytics?.status_distribution ? Object.keys(analytics.status_distribution) : [];
    const statusData = analytics?.status_distribution ? Object.values(analytics.status_distribution) : [];
    const statusColors = statusLabels.map(label => statusColorMap[label] || '#6366f1');

    const statusChartData = {
        labels: statusLabels,
        datasets: [{
            data: statusData,
            backgroundColor: statusColors,
            borderColor: '#ffffff',
            borderWidth: 2
        }]
    };

    // Chart 3: Top Hotspot Areas
    const areaLabels = hotspots.slice(0, 6).map(h => h.area_name);
    const areaTotalReports = hotspots.slice(0, 6).map(h => h.total_reports);
    const areaUnresolved = hotspots.slice(0, 6).map(h => h.unresolved_count);

    const areaChartData = {
        labels: areaLabels,
        datasets: [
            {
                label: "Total Reports",
                data: areaTotalReports,
                backgroundColor: '#4361ee',
                borderRadius: 5
            },
            {
                label: "Unresolved",
                data: areaUnresolved,
                backgroundColor: '#e63946',
                borderRadius: 5
            }
        ]
    };

    const getCircleColor = (riskLevel) => {
        if (riskLevel === "HIGH_RISK_HOTSPOT") return { color: "#e63946", fillColor: "#e63946" };
        if (riskLevel === "RECURRING_ZONE") return { color: "#f77f00", fillColor: "#f77f00" };
        return { color: "#4cc9f0", fillColor: "#4cc9f0" };
    };

    return (
        <Container fluid className="py-5 px-md-5" style={{ minHeight: '100vh', background: 'transparent' }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom animate__animated animate__fadeInDown">
                <div>
                    <h2 className="display-6 fw-bold text-gradient d-flex align-items-center gap-3">
                        <FaFire className="text-danger" /> Civic Hotspot Analysis
                    </h2>
                    <p className="text-muted mb-0">
                        Historical geospatial clustering identifying recurring municipal zones and problem density.
                    </p>
                </div>
                <Button variant="light" className="rounded-pill shadow-sm" onClick={fetchData} disabled={loading}>
                    <FaSync className={`me-2 ${loading ? 'fa-spin' : ''}`} /> Refresh Analysis
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
            ) : (
                <>
                    {/* Top Stat Cards */}
                    <Row className="g-4 mb-4 animate__animated animate__fadeIn">
                        <Col md={3}>
                            <div className="glass-panel p-4 text-center h-100 border-bottom border-4 border-danger shadow-sm">
                                <span className="text-muted small fw-bold text-uppercase d-block mb-1">Identified Hotspots</span>
                                <h3 className="display-6 fw-bold text-danger mb-0">{hotspots.length}</h3>
                                <small className="text-muted">Geospatial clusters (≤500m)</small>
                            </div>
                        </Col>
                        <Col md={3}>
                            <div className="glass-panel p-4 text-center h-100 border-bottom border-4 border-warning shadow-sm">
                                <span className="text-muted small fw-bold text-uppercase d-block mb-1">Unresolved Reports</span>
                                <h3 className="display-6 fw-bold text-warning mb-0">{analytics?.unresolved_count || 0}</h3>
                                <small className="text-muted">Active complaints pending action</small>
                            </div>
                        </Col>
                        <Col md={3}>
                            <div className="glass-panel p-4 text-center h-100 border-bottom border-4 border-success shadow-sm">
                                <span className="text-muted small fw-bold text-uppercase d-block mb-1">City Resolution Rate</span>
                                <h3 className="display-6 fw-bold text-success mb-0">{analytics?.resolution_rate || 0}%</h3>
                                <small className="text-muted">{analytics?.resolved_count || 0} issues resolved</small>
                            </div>
                        </Col>
                        <Col md={3}>
                            <div className="glass-panel p-4 text-center h-100 border-bottom border-4 border-info shadow-sm">
                                <span className="text-muted small fw-bold text-uppercase d-block mb-1">Avg Resolution Time</span>
                                <h3 className="display-6 fw-bold text-info mb-0">{analytics?.avg_resolution_time_hours || 24}h</h3>
                                <small className="text-muted">From report to verified resolution</small>
                            </div>
                        </Col>
                    </Row>

                    {/* Interactive Hotspot Map & Details Drawer */}
                    <Row className="g-4 mb-5">
                        <Col lg={8}>
                            <div className="glass-panel p-0 overflow-hidden shadow-lg border-0 h-100 position-relative" style={{ borderRadius: '20px', minHeight: '520px' }}>
                                <div className="p-3 bg-white border-bottom d-flex justify-content-between align-items-center">
                                    <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                                        <FaMapMarkedAlt className="text-primary" /> Geographic Issue Clusters
                                    </h5>
                                    <div className="d-flex gap-2">
                                        <Badge bg="danger" className="px-2 py-1">🔴 High-Risk</Badge>
                                        <Badge bg="warning" text="dark" className="px-2 py-1">🟠 Recurring</Badge>
                                        <Badge bg="info" className="px-2 py-1">🔵 Emerging</Badge>
                                    </div>
                                </div>

                                <MapContainer 
                                    center={mapCenter} 
                                    zoom={13} 
                                    style={{ height: '460px', width: '100%' }}
                                >
                                    <TileLayer 
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    {hotspots.map((hotspot) => {
                                        const theme = getCircleColor(hotspot.risk_level);
                                        return (
                                            <Circle
                                                key={hotspot.id}
                                                center={[hotspot.latitude, hotspot.longitude]}
                                                radius={450}
                                                pathOptions={{
                                                    color: theme.color,
                                                    fillColor: theme.fillColor,
                                                    fillOpacity: 0.35,
                                                    weight: 3
                                                }}
                                                eventHandlers={{
                                                    click: () => {
                                                        setSelectedHotspot(hotspot);
                                                        setMapCenter([hotspot.latitude, hotspot.longitude]);
                                                    }
                                                }}
                                            >
                                                <Popup>
                                                    <div className="p-2">
                                                        <h6 className="fw-bold mb-1">{hotspot.icon} {hotspot.area_name}</h6>
                                                        <Badge bg={hotspot.badge_color} className="mb-2">{hotspot.risk_level.replace(/_/g, ' ')}</Badge>
                                                        <p className="small mb-1"><strong>Total Reports:</strong> {hotspot.total_reports}</p>
                                                        <p className="small mb-1"><strong>Unresolved:</strong> {hotspot.unresolved_count}</p>
                                                        <p className="small mb-1"><strong>Dominant:</strong> {hotspot.dominant_category}</p>
                                                        <p className="small mb-0 text-muted">{hotspot.explanation}</p>
                                                    </div>
                                                </Popup>
                                            </Circle>
                                        );
                                    })}
                                </MapContainer>
                            </div>
                        </Col>

                        {/* Selected Hotspot Intelligence Panel */}
                        <Col lg={4}>
                            <div className="glass-panel p-4 h-100 shadow-lg border-0 bg-white position-relative" style={{ borderRadius: '20px' }}>
                                {selectedHotspot ? (
                                    <>
                                        <div className="d-flex justify-content-between align-items-start mb-3 pb-2 border-bottom">
                                            <div>
                                                <Badge bg={selectedHotspot.badge_color} className="mb-2 px-3 py-1 fs-6">
                                                    {selectedHotspot.icon} {selectedHotspot.risk_level.replace(/_/g, ' ')}
                                                </Badge>
                                                <h4 className="fw-bold text-dark mb-0">{selectedHotspot.area_name}</h4>
                                            </div>
                                        </div>

                                        <p className="small text-muted mb-4">{selectedHotspot.explanation}</p>

                                        <div className="row g-2 mb-4">
                                            <div className="col-6">
                                                <div className="p-3 bg-light rounded-3 text-center">
                                                    <span className="text-muted small d-block">Total Reports</span>
                                                    <strong className="fs-4 text-dark">{selectedHotspot.total_reports}</strong>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="p-3 bg-light rounded-3 text-center">
                                                    <span className="text-muted small d-block">Unresolved</span>
                                                    <strong className="fs-4 text-danger">{selectedHotspot.unresolved_count}</strong>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="p-3 bg-light rounded-3 text-center">
                                                    <span className="text-muted small d-block">Dominant Category</span>
                                                    <strong className="fs-6 text-primary">{selectedHotspot.dominant_category}</strong>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="p-3 bg-light rounded-3 text-center">
                                                    <span className="text-muted small d-block">Resolution Rate</span>
                                                    <strong className="fs-5 text-success">{selectedHotspot.resolution_rate}%</strong>
                                                </div>
                                            </div>
                                        </div>

                                        <h6 className="fw-bold text-dark mb-2">Issues in this Hotspot</h6>
                                        <div className="overflow-auto pe-1" style={{ maxHeight: '180px' }}>
                                            {selectedHotspot.issues.map((iss) => (
                                                <div key={iss.id} className="p-2 mb-2 bg-light rounded-3 d-flex justify-content-between align-items-center">
                                                    <div className="text-truncate me-2" style={{ maxWidth: '200px' }}>
                                                        <small className="fw-bold d-block text-dark text-truncate">#{iss.id} {iss.title}</small>
                                                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>{iss.category} | {iss.severity}</span>
                                                    </div>
                                                    <Link to={`/issue/${iss.id}`} className="btn btn-outline-primary btn-sm py-0 px-2 rounded-pill small flex-shrink-0">
                                                        View
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-5 text-muted">
                                        <FaInfoCircle className="fs-1 mb-2 text-secondary" />
                                        <p>Click on any hotspot circle on the map to inspect cluster analytics.</p>
                                    </div>
                                )}
                            </div>
                        </Col>
                    </Row>

                    {/* Chart.js Analytics Grid */}
                    <h4 className="fw-bold text-dark mb-4 d-flex align-items-center gap-2">
                        <FaChartBar className="text-primary" /> Municipal Decision Analytics
                    </h4>

                    <Row className="g-4 mb-4">
                        <Col lg={6}>
                            <div className="glass-panel p-4 shadow-sm h-100 bg-white" style={{ borderRadius: '20px' }}>
                                <h5 className="fw-bold text-dark mb-3">Complaints by Category</h5>
                                <div style={{ height: '280px' }}>
                                    <Bar 
                                        data={categoryChartData} 
                                        options={{ 
                                            responsive: true, 
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false } }
                                        }} 
                                    />
                                </div>
                            </div>
                        </Col>

                        <Col lg={6}>
                            <div className="glass-panel p-4 shadow-sm h-100 bg-white" style={{ borderRadius: '20px' }}>
                                <h5 className="fw-bold text-dark mb-3">Hotspot Density by Ward / Area</h5>
                                <div style={{ height: '280px' }}>
                                    <Bar 
                                        data={areaChartData} 
                                        options={{ 
                                            responsive: true, 
                                            maintainAspectRatio: false,
                                            plugins: { legend: { position: 'top' } }
                                        }} 
                                    />
                                </div>
                            </div>
                        </Col>

                        <Col lg={6}>
                            <div className="glass-panel p-4 shadow-sm h-100 bg-white" style={{ borderRadius: '20px' }}>
                                <h5 className="fw-bold text-dark mb-3">Resolution Status Distribution</h5>
                                <div style={{ height: '260px' }}>
                                    <Doughnut 
                                        data={statusChartData} 
                                        options={{ 
                                            responsive: true, 
                                            maintainAspectRatio: false,
                                            plugins: { legend: { position: 'right' } }
                                        }} 
                                    />
                                </div>
                            </div>
                        </Col>

                        <Col lg={6}>
                            <div className="glass-panel p-4 shadow-sm h-100 bg-white d-flex flex-column justify-content-between" style={{ borderRadius: '20px' }}>
                                <div>
                                    <h5 className="fw-bold text-dark mb-2">Department Workload Distribution</h5>
                                    <p className="text-muted small mb-3">Real-time active vs resolved complaints across municipal departments</p>
                                    
                                    <div className="table-responsive">
                                        <Table size="sm" hover className="align-middle">
                                            <thead>
                                                <tr>
                                                    <th>Department</th>
                                                    <th>Total</th>
                                                    <th>Unresolved</th>
                                                    <th>Health</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {analytics?.department_workload && Object.entries(analytics.department_workload).map(([dept, data]) => (
                                                    <tr key={dept}>
                                                        <td><strong>{dept}</strong></td>
                                                        <td>{data.total}</td>
                                                        <td className="text-danger fw-bold">{data.unresolved}</td>
                                                        <td>
                                                            <Badge bg={data.unresolved > 5 ? 'danger' : data.unresolved > 2 ? 'warning text-dark' : 'success'}>
                                                                {data.unresolved > 5 ? 'High Load' : data.unresolved > 2 ? 'Moderate' : 'Optimal'}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </>
            )}
        </Container>
    );
}

export default HotspotAnalysis;
