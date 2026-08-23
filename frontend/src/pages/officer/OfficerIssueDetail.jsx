import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api/axios";
import { Container, Row, Col, Form, Button, Spinner, Alert } from "react-bootstrap";
import { FaArrowLeft, FaCheckCircle } from "react-icons/fa";
import CivicIntelligenceCard from "../../components/CivicIntelligenceCard";
import ResolutionEvidenceCard from "../../components/ResolutionEvidenceCard";
import WorkforceManagement from "../../components/WorkforceManagement";
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
    const [message, setMessage] = useState({ text: "", type: "" });

    const fetchIssue = async () => {
        try {
            const accessToken = localStorage.getItem("access");
            const res = await api.get(`/api/issues/${id}/`, { headers: { Authorization: `Bearer ${accessToken}` } });
            setIssue(res.data);
        } catch (err) {
            console.error(err);
            setMessage({ text: "Failed to load issue details.", type: "danger" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIssue();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            setMessage({ text: "✅ Resolution submitted successfully! Waiting for citizen approval.", type: "success" });
            fetchIssue();
        } catch (err) {
            console.error(err);
            setMessage({ text: err.response?.data?.error || "Failed to submit resolution.", type: "danger" });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>;
    if (!issue) return <div className="text-center py-5"><h3>Issue not found</h3><Button onClick={() => navigate(-1)}>Go Back</Button></div>;

    return (
        <Container fluid className="py-4 px-md-5" style={{ minHeight: '100vh', background: 'transparent' }}>
            <Button variant="link" className="text-decoration-none text-muted mb-4 p-0 fw-bold hover-start" onClick={() => navigate(-1)}>
                <FaArrowLeft className="me-2" />Back to Dashboard
            </Button>

            {message.text && (
                <Alert variant={message.type} className="mb-4 shadow-sm animate__animated animate__fadeIn">
                    {message.text}
                </Alert>
            )}

            {/* Feature 1: Issue Intelligence Card */}
            <CivicIntelligenceCard issue={issue} />

            {/* Feature 4: Department Workforce & Task Allocation */}
            <WorkforceManagement 
                issue={issue} 
                onAssigned={(updatedIssue) => {
                    if (updatedIssue) setIssue(updatedIssue);
                    else fetchIssue();
                }} 
            />

            {/* Feature 3: Resolution Evidence & Verification Gate */}
            {issue.status === "PENDING_APPROVAL" || issue.status === "RESOLVED" || issue.resolution_proof || issue.resolution_description ? (
                <ResolutionEvidenceCard 
                    issue={issue} 
                    onStatusUpdate={() => fetchIssue()} 
                />
            ) : (
                /* Resolution Submission Box for Officer / Employee */
                <div className="glass-panel p-4 mb-4 bg-white border-top border-5 border-success shadow-lg position-relative" style={{ borderRadius: '20px' }}>
                    <div className="mb-4">
                        <h4 className="fw-bold text-success d-flex align-items-center gap-2">
                            <FaCheckCircle /> Resolution Evidence Submission
                        </h4>
                        <p className="text-muted small mb-0">Upload before/after proof of work to resolve this issue and trigger citizen verification.</p>
                    </div>

                    <Form onSubmit={handleResolution}>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-bold text-dark">Action Taken / Resolution Description</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={5}
                                        placeholder="Describe the actions and repairs completed on ground..."
                                        value={desc}
                                        onChange={(e) => setDesc(e.target.value)}
                                        required
                                        className="bg-light border-0 shadow-inner p-3"
                                        style={{ resize: 'none' }}
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-bold text-dark">Proof of Work (AFTER Photo)</Form.Label>
                                    <div className="border-2 border-dashed border-secondary rounded-3 p-4 text-center cursor-pointer bg-light hover-bg-gray transition-all position-relative overflow-hidden">
                                        <input
                                            type="file"
                                            className="position-absolute top-0 start-0 w-100 h-100 opacity-0 cursor-pointer"
                                            onChange={handleFileChange}
                                            accept="image/*"
                                            required
                                        />
                                        {preview ? (
                                            <div className="position-relative">
                                                <img src={preview} alt="Preview" className="img-fluid rounded shadow-sm" style={{ maxHeight: '120px' }} />
                                                <p className="small text-muted mt-2 mb-0">Click to change</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="display-5 text-secondary mb-1">📸</div>
                                                <span className="text-primary fw-bold">Upload After Photo</span>
                                                <p className="small text-muted mb-0">Click or drag and drop</p>
                                            </>
                                        )}
                                    </div>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Button
                            type="submit"
                            variant="gradient"
                            size="lg"
                            className="w-100 rounded-pill fw-bold text-white shadow-lg btn-success"
                            disabled={submitting}
                            style={{ background: 'linear-gradient(45deg, #11998e 0%, #38ef7d 100%)', border: 'none' }}
                        >
                            {submitting ? <Spinner animation="border" size="sm" /> : "Submit Resolution for Citizen Verification"}
                        </Button>
                    </Form>
                </div>
            )}
        </Container>
    );
}

export default OfficerIssueDetail;
