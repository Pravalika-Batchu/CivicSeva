import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api/axios";
import { Container, Row, Col, Card, Form, Button, Badge, Spinner } from "react-bootstrap";
import { FaArrowLeft, FaCheckCircle, FaExclamationTriangle, FaUser, FaMapMarkerAlt, FaExpand } from "react-icons/fa";
import "animate.css";

function OfficerIssueDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [issue, setIssue] = useState(null);
    const [file, setFile] = useState(null);
    const [desc, setDesc] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        const fetchIssue = async () => {
            try {
                const accessToken = localStorage.getItem("access");
                const res = await api.get(`/api/issues/`, { headers: { Authorization: `Bearer ${accessToken}` } });
                const found = res.data.find((i) => i.id === parseInt(id));
                setIssue(found);
            } catch (err) {
                console.error(err);
                alert("Failed to load issue details.");
            } finally {
                setLoading(false);
            }
        };
        fetchIssue();
    }, [id]);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        setFile(selected);
        if (selected) setPreview(URL.createObjectURL(selected));
    };

    const handleResolution = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const accessToken = localStorage.getItem("access");
        const formData = new FormData();
        if (file) formData.append("file", file);
        formData.append("description", desc);

        try {
            await api.post(`/api/issues/${id}/submit_resolution/`, formData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "multipart/form-data"
                }
            });
            alert("✅ Resolution submitted successfully!");
            navigate("/officer/dashboard");
        } catch (err) {
            console.error(err);
            alert("❌ Failed to submit resolution.");
        } finally {
            setSubmitting(false);
        }
    };

    const getSeverityBadge = (severity) => {
        const map = { 'Critical': 'bg-danger', 'High': 'bg-warning text-dark', 'Medium': 'bg-info text-dark', 'Low': 'bg-success' };
        return <Badge pill className={map[severity] || 'bg-secondary'}>{severity}</Badge>;
    };

    if (loading) return <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>;
    if (!issue) return <div className="text-center py-5"><h3>Issue not found</h3><Button onClick={() => navigate(-1)}>Go Back</Button></div>;

    return (
        <Container fluid className="py-4 px-md-5" style={{ minHeight: '100vh', background: 'transparent' }}>
            <Button variant="link" className="text-decoration-none text-muted mb-4 p-0 fw-bold hover-start" onClick={() => navigate(-1)}>
                <FaArrowLeft className="me-2" />Back to Dashboard
            </Button>

            <Row className="g-4 animate__animated animate__fadeIn">
                {/* Issue Details Column */}
                <Col lg={7}>
                    <div className="glass-panel p-4 h-100 position-relative">
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <div>
                                <h2 className="fw-bold mb-2 text-gradient">Issue #{issue.id}</h2>
                                <div className="d-flex gap-2">
                                    <Badge bg="light" text="dark" className="border shadow-sm">{issue.status}</Badge>
                                    {getSeverityBadge(issue.severity || 'Low')}
                                </div>
                            </div>
                            {issue.votes > 0 && <Badge bg="primary" pill className="px-3 py-2">👍 {issue.votes} Votes</Badge>}
                        </div>

                        <h4 className="fw-bold text-dark">{issue.title}</h4>
                        <p className="lead text-muted fs-6">{issue.description}</p>

                        <div className="d-flex gap-4 my-4 p-3 bg-light rounded-3">
                            <div className="d-flex align-items-center text-muted">
                                <FaUser className="me-2 text-primary" /> Reported by <strong>&nbsp;{issue.citizen_username}</strong>
                            </div>
                            <div className="d-flex align-items-center text-muted">
                                <FaMapMarkerAlt className="me-2 text-danger" /> Location provided
                            </div>
                        </div>

                        {issue.file_url ? (
                            <div className="mt-4">
                                <h6 className="fw-bold text-muted text-uppercase small mb-3">Evidence Photo</h6>
                                <div className="overflow-hidden rounded-4 shadow-sm position-relative group">
                                    <img src={issue.file_url} alt="Issue" className="img-fluid w-100 object-fit-cover" style={{ maxHeight: '400px' }} />
                                    <div className="position-absolute bottom-0 end-0 p-3">
                                        <Button variant="light" size="sm" onClick={() => window.open(issue.file_url, '_blank')} className="rounded-circle shadow">
                                            <FaExpand />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="alert alert-secondary mt-4">No photo evidence provided.</div>
                        )}
                    </div>
                </Col>

                {/* Resolution Form Column */}
                <Col lg={5}>
                    <div className="glass-panel p-4 h-100 bg-white border-top border-5 border-success position-relative">
                        <div className="mb-4">
                            <h3 className="fw-bold text-success d-flex align-items-center gap-2">
                                <FaCheckCircle /> Resolution Center
                            </h3>
                            <p className="text-muted small">Submit your proof of work to resolve this issue.</p>
                        </div>

                        <Form onSubmit={handleResolution}>
                            <Form.Group className="mb-4">
                                <Form.Label className="fw-bold text-dark">Resolution Description</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={5}
                                    placeholder="Describe the actions taken to resolve this issue..."
                                    value={desc}
                                    onChange={(e) => setDesc(e.target.value)}
                                    required
                                    className="bg-light border-0 shadow-inner p-3"
                                    style={{ resize: 'none' }}
                                />
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label className="fw-bold text-dark">Proof of Work (Photo)</Form.Label>
                                <div className="border-2 border-dashed border-secondary rounded-3 p-4 text-center cursor-pointer bg-light hover-bg-gray transition-all position-relative overflow-hidden">
                                    <input
                                        type="file"
                                        className="position-absolute top-0 start-0 w-100 h-100 opacity-0 cursor-pointer"
                                        onChange={handleFileChange}
                                        accept="image/*"
                                    />
                                    {preview ? (
                                        <div className="position-relative">
                                            <img src={preview} alt="Preview" className="img-fluid rounded shadow-sm" style={{ maxHeight: '150px' }} />
                                            <p className="small text-muted mt-2 mb-0">Click to change</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="display-4 text-secondary mb-2">📸</div>
                                            <span className="text-primary fw-bold">Upload Photo</span>
                                            <p className="small text-muted mb-0">Click or drag and drop</p>
                                        </>
                                    )}
                                </div>
                            </Form.Group>

                            <Button
                                type="submit"
                                variant="gradient"
                                size="lg"
                                className="w-100 rounded-pill fw-bold text-white shadow-lg btn-success"
                                disabled={submitting}
                                style={{ background: 'linear-gradient(45deg, #11998e 0%, #38ef7d 100%)', border: 'none' }}
                            >
                                {submitting ? <Spinner animation="border" size="sm" /> : "Submit Resolution"}
                            </Button>
                        </Form>
                    </div>
                </Col>
            </Row>
        </Container>
    );
}

export default OfficerIssueDetail;
