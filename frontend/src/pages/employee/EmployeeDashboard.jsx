import { useState, useEffect } from "react";
import { Container, Row, Col, Badge, Button, Spinner, Modal, Form, Alert } from "react-bootstrap";
import { 
    FaTasks, 
    FaClock, 
    FaMapMarkerAlt, 
    FaCheckCircle, 
    FaUpload, 
    FaPlay, 
    FaSync
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api/axios";
import CivicIntelligenceCard from "../../components/CivicIntelligenceCard";
import "animate.css";

function EmployeeDashboard() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [resolveFile, setResolveFile] = useState(null);
    const [resolveDesc, setResolveDesc] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [preview, setPreview] = useState(null);
    const [message, setMessage] = useState({ text: "", type: "" });
    const navigate = useNavigate();
    const username = localStorage.getItem("username");

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const accessToken = localStorage.getItem("access");
            if (!accessToken) {
                navigate("/login");
                return;
            }
            const res = await api.get("/api/employee/my-tasks/", {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            setTasks(res.data);
            if (res.data.length > 0 && !selectedTask) {
                setSelectedTask(res.data[0]);
            }
        } catch (err) {
            console.error("Failed to load employee tasks:", err);
            setMessage({ text: "Failed to load assigned tasks.", type: "danger" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleStartWork = async (taskId) => {
        try {
            const accessToken = localStorage.getItem("access");
            await api.post(`/api/issues/${taskId}/update_status/`, { status: "IN_PROGRESS" }, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            setMessage({ text: `Task #${taskId} marked as IN PROGRESS.`, type: "info" });
            fetchTasks();
        } catch (err) {
            console.error("Failed to update status:", err);
            setMessage({ text: "Failed to start task.", type: "danger" });
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setResolveFile(file);
        if (file) setPreview(URL.createObjectURL(file));
    };

    const handleResolutionSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTask || !resolveFile || !resolveDesc.trim()) {
            setMessage({ text: "Please provide both resolution description and proof photo.", type: "warning" });
            return;
        }

        setSubmitting(true);
        try {
            const accessToken = localStorage.getItem("access");
            const formData = new FormData();
            formData.append("file", resolveFile);
            formData.append("description", resolveDesc.trim());

            await api.post(`/api/issues/${selectedTask.id}/submit_resolution/`, formData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "multipart/form-data"
                }
            });

            setMessage({ text: `✅ Resolution proof submitted for Task #${selectedTask.id}! Waiting for citizen approval.`, type: "success" });
            setShowResolveModal(false);
            setResolveFile(null);
            setPreview(null);
            setResolveDesc("");
            fetchTasks();
        } catch (err) {
            console.error("Failed to submit resolution:", err);
            setMessage({ text: err.response?.data?.error || "Failed to submit resolution proof.", type: "danger" });
        } finally {
            setSubmitting(false);
        }
    };

    const getSeverityBadge = (severity) => {
        const map = { 'Critical': 'bg-danger', 'High': 'bg-danger', 'Medium': 'bg-warning text-dark', 'Low': 'bg-success' };
        return <Badge pill className={map[severity] || 'bg-secondary'}>{severity}</Badge>;
    };

    return (
        <Container fluid className="py-5 px-md-5" style={{ minHeight: '100vh', background: 'transparent' }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom animate__animated animate__fadeInDown">
                <div>
                    <h2 className="display-6 fw-bold text-gradient d-flex align-items-center gap-3">
                        <FaTasks className="text-primary" /> My Assigned Tasks
                    </h2>
                    <p className="text-muted mb-0">
                        Welcome back, <strong>{username}</strong> (Department Workforce Employee). Complete tasks and upload resolution proof for citizen verification.
                    </p>
                </div>
                <Button variant="light" className="rounded-pill shadow-sm" onClick={fetchTasks} disabled={loading}>
                    <FaSync className={`me-2 ${loading ? 'fa-spin' : ''}`} /> Refresh Tasks
                </Button>
            </div>

            {message.text && (
                <Alert variant={message.type} className="mb-4 shadow-sm animate__animated animate__fadeIn">
                    {message.text}
                </Alert>
            )}

            {loading ? (
                <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
            ) : tasks.length === 0 ? (
                <div className="glass-panel p-5 text-center shadow-sm" style={{ borderRadius: '20px' }}>
                    <FaCheckCircle className="display-3 text-success mb-3" />
                    <h4 className="fw-bold">All clear! No active tasks assigned.</h4>
                    <p className="text-muted">New issues routed to your department will appear here once allocated by your Department Officer.</p>
                </div>
            ) : (
                <Row className="g-4">
                    {/* Task List Column */}
                    <Col lg={5}>
                        <div className="glass-panel p-4 h-100 shadow-lg border-0 bg-white" style={{ borderRadius: '20px' }}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="fw-bold mb-0 text-dark">Active Work Queue ({tasks.length})</h5>
                                <small className="text-muted">Sorted by Civic Priority</small>
                            </div>

                            <div className="space-y-3 overflow-auto pe-1" style={{ maxHeight: '680px' }}>
                                {tasks.map((task) => {
                                    const isSelected = selectedTask && selectedTask.id === task.id;
                                    const intel = task.civic_intelligence || {};
                                    return (
                                        <div 
                                            key={task.id}
                                            onClick={() => setSelectedTask(task)}
                                            className={`p-3 mb-3 rounded-4 cursor-pointer transition-all border ${isSelected ? 'border-primary shadow-md bg-light' : 'border-light bg-white hover-lift'}`}
                                            style={{ borderLeft: `6px solid ${task.severity === 'High' ? '#e63946' : '#4361ee'}` }}
                                        >
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="fw-bold text-dark small">#{task.id}</span>
                                                    {getSeverityBadge(task.severity)}
                                                    <Badge bg="primary" pill className="small">Priority: {intel.priority_score || task.priority_score || 50}</Badge>
                                                </div>
                                                <Badge bg={task.status === 'RESOLVED' ? 'success' : task.status === 'PENDING_APPROVAL' ? 'warning text-dark' : 'info'}>
                                                    {task.status}
                                                </Badge>
                                            </div>

                                            <h6 className="fw-bold text-dark mb-1 text-truncate" title={task.title}>{task.title}</h6>
                                            <p className="text-muted small mb-2 text-truncate-2" style={{ maxHeight: '2.8em' }}>{task.description}</p>

                                            <div className="d-flex justify-content-between align-items-center text-muted small pt-2 border-top">
                                                <span><FaMapMarkerAlt className="text-danger me-1" />{task.location_tag || "City Zone"}</span>
                                                <span className={intel.is_sla_breached ? "text-danger fw-bold" : "text-warning fw-bold"}>
                                                    <FaClock className="me-1" />{intel.sla_time_remaining || "Standard SLA"}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Col>

                    {/* Task Detail & Action Column */}
                    <Col lg={7}>
                        {selectedTask ? (
                            <div>
                                <CivicIntelligenceCard issue={selectedTask} />

                                {/* Field Action Box */}
                                <div className="glass-panel p-4 shadow-lg border-0 bg-white" style={{ borderRadius: '20px', borderTop: '5px solid #2ec4b6' }}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h5 className="fw-bold mb-0 text-dark">Field Action Center</h5>
                                        <Badge bg="secondary" className="px-3 py-2">Current Status: {selectedTask.status}</Badge>
                                    </div>

                                    <p className="text-muted small mb-4">
                                        As an assigned department employee, inspect the issue on ground, execute repairs, and submit before/after resolution evidence.
                                    </p>

                                    <div className="d-flex gap-3 flex-wrap">
                                        {selectedTask.status === "ASSIGNED" && (
                                            <Button 
                                                variant="primary" 
                                                size="lg" 
                                                className="rounded-pill fw-bold shadow d-flex align-items-center gap-2"
                                                onClick={() => handleStartWork(selectedTask.id)}
                                            >
                                                <FaPlay /> Mark In Progress
                                            </Button>
                                        )}

                                        {selectedTask.status !== "RESOLVED" && selectedTask.status !== "PENDING_APPROVAL" && (
                                            <Button 
                                                variant="success" 
                                                size="lg" 
                                                className="rounded-pill fw-bold shadow d-flex align-items-center gap-2"
                                                onClick={() => setShowResolveModal(true)}
                                                style={{ background: 'linear-gradient(135deg, #11998e, #38ef7d)', border: 'none' }}
                                            >
                                                <FaUpload /> Submit Resolution Proof
                                            </Button>
                                        )}

                                        <Link to={`/issue/${selectedTask.id}`} className="btn btn-outline-secondary btn-lg rounded-pill fw-bold">
                                            View Full Issue Page
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="glass-panel p-5 text-center text-muted shadow-sm" style={{ borderRadius: '20px' }}>
                                <h5>Select a task from the list on the left to inspect intelligence and take action.</h5>
                            </div>
                        )}
                    </Col>
                </Row>
            )}

            {/* Resolution Upload Modal */}
            <Modal show={showResolveModal} onHide={() => setShowResolveModal(false)} centered size="lg">
                <Form onSubmit={handleResolutionSubmit}>
                    <Modal.Header closeButton>
                        <Modal.Title className="fw-bold text-success d-flex align-items-center gap-2">
                            <FaCheckCircle /> Submit Resolution Evidence for Task #{selectedTask?.id}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold text-dark">Action Taken / Resolution Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                placeholder="Describe the physical repair, materials used, and exact work completed..."
                                value={resolveDesc}
                                onChange={(e) => setResolveDesc(e.target.value)}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold text-dark">Resolution Proof Photo (AFTER)</Form.Label>
                            <div className="border-2 border-dashed border-secondary rounded-3 p-4 text-center cursor-pointer bg-light position-relative overflow-hidden">
                                <input
                                    type="file"
                                    className="position-absolute top-0 start-0 w-100 h-100 opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    required
                                />
                                {preview ? (
                                    <div>
                                        <img src={preview} alt="Preview" className="img-fluid rounded shadow-sm mb-2" style={{ maxHeight: '180px' }} />
                                        <p className="small text-muted mb-0">Click to change photo</p>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="display-5 text-secondary mb-2">📸</div>
                                        <span className="text-primary fw-bold">Upload After-Repair Photo</span>
                                        <p className="small text-muted mb-0">Click or drag & drop</p>
                                    </div>
                                )}
                            </div>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="light" onClick={() => setShowResolveModal(false)}>Cancel</Button>
                        <Button variant="success" type="submit" disabled={submitting}>
                            {submitting ? <Spinner size="sm" animation="border" /> : "Submit Resolution Proof"}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
}

export default EmployeeDashboard;
