import { useState } from "react";
import { Badge, Button, Modal, Form, Spinner, Alert } from "react-bootstrap";
import { 
    FaCheckCircle, 
    FaTimesCircle, 
    FaUserCheck, 
    FaCalendarAlt, 
    FaFileAlt, 
    FaExpand, 
    FaShieldAlt
} from "react-icons/fa";
import api from "../services/api/axios";
import "animate.css";

function ResolutionEvidenceCard({ issue, onStatusUpdate }) {
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [message, setMessage] = useState({ text: "", type: "" });
    const [modalImage, setModalImage] = useState(null);

    if (!issue) return null;

    const currentUsername = localStorage.getItem("username");
    const isReporter = issue.citizen_username === currentUsername;
    const isPendingApproval = issue.status === "PENDING_APPROVAL";
    const isResolved = issue.status === "RESOLVED" || issue.is_approved;

    const handleApprove = async () => {
        setApproving(true);
        setMessage({ text: "", type: "" });
        try {
            const accessToken = localStorage.getItem("access");
            await api.post(
                `/api/issues/${issue.id}/approve_resolution/`,
                {},
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            setMessage({ text: "✅ Resolution confirmed! Issue has been officially closed as RESOLVED.", type: "success" });
            if (onStatusUpdate) onStatusUpdate("RESOLVED");
        } catch (err) {
            console.error("Approval error:", err);
            setMessage({ text: err.response?.data?.error || "Failed to approve resolution.", type: "danger" });
        } finally {
            setApproving(false);
        }
    };

    const handleReject = async (e) => {
        e.preventDefault();
        if (!rejectionReason.trim()) return;

        setRejecting(true);
        setMessage({ text: "", type: "" });
        try {
            const accessToken = localStorage.getItem("access");
            await api.post(
                `/api/issues/${issue.id}/reject_resolution/`,
                { reason: rejectionReason.trim() },
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            setShowRejectModal(false);
            setMessage({ text: "⚠️ Resolution rejected. Issue has been reopened for further action.", type: "warning" });
            if (onStatusUpdate) onStatusUpdate("REOPENED");
        } catch (err) {
            console.error("Rejection error:", err);
            setMessage({ text: err.response?.data?.error || "Failed to reject resolution.", type: "danger" });
        } finally {
            setRejecting(false);
        }
    };

    return (
        <div className="glass-panel p-4 mb-4 border-0 shadow-lg position-relative animate__animated animate__fadeIn"
             style={{ 
                 background: 'rgba(255, 255, 255, 0.95)', 
                 borderRadius: '20px',
                 borderTop: '5px solid #2ec4b6'
             }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <div className="d-flex align-items-center gap-2">
                    <div className="p-2 rounded-circle text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #2ec4b6, #011627)' }}>
                        <FaShieldAlt className="fs-4" />
                    </div>
                    <div>
                        <h4 className="fw-bold mb-0 text-dark">Resolution Evidence & Verification</h4>
                        <small className="text-muted">Accountable proof of work and citizen verification gate</small>
                    </div>
                </div>

                {/* Status Indicator */}
                <div>
                    {isResolved ? (
                        <Badge bg="success" className="px-3 py-2 fs-6 shadow-sm d-flex align-items-center gap-1">
                            <FaCheckCircle /> VERIFIED (RESOLVED)
                        </Badge>
                    ) : isPendingApproval ? (
                        <Badge bg="warning" text="dark" className="px-3 py-2 fs-6 shadow-sm d-flex align-items-center gap-1 animate__animated animate__pulse animate__infinite">
                            ⏳ PENDING CITIZEN VERIFICATION
                        </Badge>
                    ) : (
                        <Badge bg="secondary" className="px-3 py-2 fs-6">
                            {issue.status}
                        </Badge>
                    )}
                </div>
            </div>

            {message.text && (
                <Alert variant={message.type} className="mb-4 shadow-sm animate__animated animate__fadeIn">
                    {message.text}
                </Alert>
            )}

            {/* Side-by-Side BEFORE / AFTER Comparison */}
            <div className="row g-4 mb-4">
                {/* BEFORE Image (Citizen Report) */}
                <div className="col-md-6">
                    <div className="h-100 p-3 bg-light rounded-4 border position-relative overflow-hidden">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="badge bg-secondary px-3 py-1 text-uppercase fw-bold">
                                📸 BEFORE (Citizen Report)
                            </span>
                            <small className="text-muted">Reported by @{issue.citizen_username}</small>
                        </div>

                        <div className="rounded-3 overflow-hidden shadow-sm position-relative mb-3 bg-dark"
                             style={{ minHeight: '220px', maxHeight: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {issue.file_url || issue.photo ? (
                                <>
                                    <img 
                                        src={issue.file_url || issue.photo} 
                                        alt="Before issue" 
                                        className="img-fluid w-100 object-fit-cover cursor-pointer"
                                        style={{ maxHeight: '280px' }}
                                        onClick={() => setModalImage(issue.file_url || issue.photo)}
                                    />
                                    <Button 
                                        variant="light" 
                                        size="sm" 
                                        className="position-absolute bottom-0 end-0 m-2 rounded-circle shadow"
                                        onClick={() => setModalImage(issue.file_url || issue.photo)}
                                    >
                                        <FaExpand />
                                    </Button>
                                </>
                            ) : (
                                <div className="text-center text-muted p-4">
                                    <p className="mb-0">No original photo submitted</p>
                                </div>
                            )}
                        </div>

                        <p className="small text-muted mb-0">
                            <strong>Reported Description:</strong> {issue.description || issue.title}
                        </p>
                    </div>
                </div>

                {/* AFTER Image (Resolution Proof) */}
                <div className="col-md-6">
                    <div className="h-100 p-3 bg-light rounded-4 border border-success position-relative overflow-hidden">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="badge bg-success px-3 py-1 text-uppercase fw-bold">
                                🛠️ AFTER (Resolution Proof)
                            </span>
                            <small className="text-success fw-semibold">
                                {issue.resolved_by_username ? `Resolved by @${issue.resolved_by_username}` : "Resolution Submitted"}
                            </small>
                        </div>

                        <div className="rounded-3 overflow-hidden shadow-sm position-relative mb-3 bg-dark"
                             style={{ minHeight: '220px', maxHeight: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {issue.resolution_proof_url || issue.resolution_proof ? (
                                <>
                                    <img 
                                        src={issue.resolution_proof_url || issue.resolution_proof} 
                                        alt="Resolution proof" 
                                        className="img-fluid w-100 object-fit-cover cursor-pointer"
                                        style={{ maxHeight: '280px' }}
                                        onClick={() => setModalImage(issue.resolution_proof_url || issue.resolution_proof)}
                                    />
                                    <Button 
                                        variant="light" 
                                        size="sm" 
                                        className="position-absolute bottom-0 end-0 m-2 rounded-circle shadow"
                                        onClick={() => setModalImage(issue.resolution_proof_url || issue.resolution_proof)}
                                    >
                                        <FaExpand />
                                    </Button>
                                </>
                            ) : (
                                <div className="text-center text-muted p-4">
                                    <p className="mb-0">Awaiting resolution proof upload</p>
                                </div>
                            )}
                        </div>

                        <p className="small text-dark mb-0">
                            <strong>Action Taken:</strong> {issue.resolution_description || "Resolution proof submitted by department workforce."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Resolution Metadata Info */}
            <div className="p-3 bg-light rounded-3 d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 text-muted small">
                <div className="d-flex align-items-center gap-2">
                    <FaUserCheck className="text-primary fs-5" />
                    <div>
                        <span className="d-block text-uppercase fw-bold text-secondary" style={{ fontSize: '0.75rem' }}>Submitted By</span>
                        <strong className="text-dark">{issue.resolved_by_username || issue.assigned_employee_username || "Department Workforce"}</strong>
                    </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <FaCalendarAlt className="text-info fs-5" />
                    <div>
                        <span className="d-block text-uppercase fw-bold text-secondary" style={{ fontSize: '0.75rem' }}>Resolution Date</span>
                        <strong className="text-dark">
                            {issue.resolved_at ? new Date(issue.resolved_at).toLocaleString() : "Recently Submitted"}
                        </strong>
                    </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <FaFileAlt className="text-success fs-5" />
                    <div>
                        <span className="d-block text-uppercase fw-bold text-secondary" style={{ fontSize: '0.75rem' }}>Department</span>
                        <strong className="text-dark">{issue.department_name || issue.category}</strong>
                    </div>
                </div>
            </div>

            {/* CITIZEN VERIFICATION ACTION GATE */}
            {isPendingApproval && (
                <div className="p-4 rounded-4 shadow-sm text-center animate__animated animate__pulse"
                     style={{ background: 'linear-gradient(135deg, rgba(46, 196, 182, 0.1), rgba(67, 97, 238, 0.1))', border: '2px dashed #2ec4b6' }}>
                    <h5 className="fw-bold text-dark mb-2">Is this issue actually resolved?</h5>
                    <p className="text-muted small mb-3">
                        {isReporter 
                            ? "As the reporting citizen, your verification is the final accountability gate. Confirming will officially close the issue. Rejecting will reopen it for further departmental action."
                            : `Awaiting human verification from the reporting citizen (@${issue.citizen_username}).`}
                    </p>

                    {isReporter ? (
                        <div className="d-flex justify-content-center gap-3 flex-wrap">
                            <Button 
                                variant="success" 
                                size="lg" 
                                className="px-4 py-2 rounded-pill fw-bold shadow d-flex align-items-center gap-2"
                                onClick={handleApprove}
                                disabled={approving || rejecting}
                            >
                                {approving ? <Spinner size="sm" animation="border" /> : <><FaCheckCircle /> Confirm Resolved</>}
                            </Button>

                            <Button 
                                variant="outline-danger" 
                                size="lg" 
                                className="px-4 py-2 rounded-pill fw-bold d-flex align-items-center gap-2"
                                onClick={() => setShowRejectModal(true)}
                                disabled={approving || rejecting}
                            >
                                <FaTimesCircle /> Still Not Resolved
                            </Button>
                        </div>
                    ) : (
                        <Badge bg="secondary" className="px-3 py-2 fs-6">
                            Citizen Verification In Progress
                        </Badge>
                    )}
                </div>
            )}

            {/* Rejection Modal */}
            <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
                <Form onSubmit={handleReject}>
                    <Modal.Header closeButton>
                        <Modal.Title className="fw-bold text-danger d-flex align-items-center gap-2">
                            <FaTimesCircle /> Reopen Issue / Reject Resolution
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        <p className="text-muted small">
                            Please explain why the resolution is insufficient so the department can take corrective action:
                        </p>
                        <Form.Group className="mb-3">
                            <Form.Control 
                                as="textarea" 
                                rows={4}
                                placeholder="e.g., Pothole was only partially filled with loose gravel and washed away with rain..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                required
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="light" onClick={() => setShowRejectModal(false)}>Cancel</Button>
                        <Button variant="danger" type="submit" disabled={rejecting}>
                            {rejecting ? <Spinner size="sm" animation="border" /> : "Submit Rejection & Reopen"}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Lightbox Zoom Modal */}
            <Modal show={!!modalImage} onHide={() => setModalImage(null)} size="lg" centered>
                <Modal.Body className="p-0 bg-dark text-center rounded-3 overflow-hidden position-relative">
                    {modalImage && (
                        <img src={modalImage} alt="Zoomed evidence" className="img-fluid w-100" style={{ maxHeight: '80vh', objectFit: 'contain' }} />
                    )}
                    <Button 
                        variant="light" 
                        size="sm" 
                        className="position-absolute top-0 end-0 m-3 rounded-circle shadow"
                        onClick={() => setModalImage(null)}
                    >
                        ✕
                    </Button>
                </Modal.Body>
            </Modal>
        </div>
    );
}

export default ResolutionEvidenceCard;
