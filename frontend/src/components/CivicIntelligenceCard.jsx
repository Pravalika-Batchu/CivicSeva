import { useState } from "react";
import { Badge, Button, Modal, ProgressBar } from "react-bootstrap";
import { 
    FaBrain, 
    FaExclamationTriangle, 
    FaClock, 
    FaMapMarkerAlt, 
    FaBuilding, 
    FaUserCheck, 
    FaInfoCircle, 
    FaHistory, 
    FaVoteYea,
    FaLightbulb
} from "react-icons/fa";
import "animate.css";

function CivicIntelligenceCard({ issue }) {
    const [showBreakdown, setShowBreakdown] = useState(false);

    if (!issue) return null;

    const intel = issue.civic_intelligence || {
        priority_score: issue.priority_score || 50,
        breakdown: { severity: 15, citizen_support: 0, sla_urgency: 10, location_sensitivity: 5, recurrence: 0, category_weight: 4, total: 50 },
        location_sensitivity_label: issue.location_tag || "General Public Area",
        recurrence_level: "LOW",
        recurrence_count: 0,
        sla_time_remaining: "Standard SLA",
        is_sla_breached: false,
        recommended_action: "Standard department resolution in progress.",
        citizen_support_count: (issue.upvotes || 0) + (issue.duplicate_count || 0)
    };

    const score = intel.priority_score || 50;

    return (
        <div className="glass-panel p-4 mb-4 border-0 shadow-lg position-relative overflow-hidden animate__animated animate__fadeIn"
             style={{ 
                 background: 'rgba(255, 255, 255, 0.95)', 
                 borderRadius: '20px',
                 borderTop: '5px solid #4361ee'
             }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                <div className="d-flex align-items-center gap-2">
                    <div className="p-2 rounded-circle text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #4361ee, #3a0ca3)' }}>
                        <FaBrain className="fs-4" />
                    </div>
                    <div>
                        <h4 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                            Civic Intelligence
                            <Badge bg="primary" pill className="fs-6 px-3 py-1 shadow-sm">Verified Metric</Badge>
                        </h4>
                        <small className="text-muted">Operational priority, SLA urgency & situational assessment</small>
                    </div>
                </div>

                {/* Priority Score Gauge */}
                <div className="text-end cursor-pointer" onClick={() => setShowBreakdown(true)} title="Click for Score Breakdown">
                    <div className="d-flex align-items-baseline gap-1 justify-content-end">
                        <span className="display-6 fw-bold" style={{ color: score >= 85 ? '#e63946' : score >= 65 ? '#f77f00' : '#2a9d8f' }}>
                            {score}
                        </span>
                        <span className="text-muted fw-bold">/ 100</span>
                    </div>
                    <Button variant="outline-primary" size="sm" className="rounded-pill py-0 px-2 small">
                        <FaInfoCircle className="me-1" /> View Breakdown
                    </Button>
                </div>
            </div>

            {/* Operational Metrics Grid */}
            <div className="row g-3 my-2">
                {/* Category & Severity */}
                <div className="col-sm-6 col-md-3">
                    <div className="p-3 bg-light rounded-3 h-100 border-start border-4 border-primary">
                        <span className="text-muted small d-block mb-1 text-uppercase fw-bold">Category</span>
                        <strong className="text-dark fs-6 d-flex align-items-center gap-1">
                            <FaBuilding className="text-primary" /> {issue.category || "General"}
                        </strong>
                    </div>
                </div>

                <div className="col-sm-6 col-md-3">
                    <div className="p-3 bg-light rounded-3 h-100 border-start border-4 border-warning">
                        <span className="text-muted small d-block mb-1 text-uppercase fw-bold">Severity</span>
                        <Badge bg={issue.severity === 'High' ? 'danger' : issue.severity === 'Medium' ? 'warning text-dark' : 'success'} className="fs-6 px-2 py-1">
                            <FaExclamationTriangle className="me-1" /> {issue.severity || 'Medium'}
                        </Badge>
                    </div>
                </div>

                {/* Citizen Support & Recurrence */}
                <div className="col-sm-6 col-md-3">
                    <div className="p-3 bg-light rounded-3 h-100 border-start border-4 border-info">
                        <span className="text-muted small d-block mb-1 text-uppercase fw-bold">Citizen Support</span>
                        <strong className="text-dark fs-6 d-flex align-items-center gap-1">
                            <FaVoteYea className="text-info" /> {intel.citizen_support_count} reports / upvotes
                        </strong>
                    </div>
                </div>

                <div className="col-sm-6 col-md-3">
                    <div className="p-3 bg-light rounded-3 h-100 border-start border-4 border-danger">
                        <span className="text-muted small d-block mb-1 text-uppercase fw-bold">SLA Countdown</span>
                        <Badge bg={intel.is_sla_breached ? 'danger' : 'warning text-dark'} className="fs-6 px-2 py-1">
                            <FaClock className="me-1" /> {intel.sla_time_remaining}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Context & Location Line */}
            <div className="row g-3 my-1">
                <div className="col-md-6">
                    <div className="p-2 px-3 bg-light rounded-3 d-flex align-items-center gap-2 text-muted small">
                        <FaMapMarkerAlt className="text-danger flex-shrink-0" />
                        <span><strong>Location Sensitivity:</strong> <Badge bg="secondary" className="ms-1">{intel.location_sensitivity_label}</Badge></span>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="p-2 px-3 bg-light rounded-3 d-flex align-items-center gap-2 text-muted small">
                        <FaHistory className="text-primary flex-shrink-0" />
                        <span><strong>Recurrence Level:</strong> <Badge bg={intel.recurrence_level === 'HIGH' ? 'danger' : 'info'} className="ms-1">{intel.recurrence_level} ({intel.recurrence_count} nearby issues)</Badge></span>
                    </div>
                </div>
            </div>

            {/* Assignment Context */}
            <div className="d-flex flex-wrap gap-3 my-3 p-3 bg-light rounded-3 align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                    <FaBuilding className="text-primary fs-5" />
                    <div>
                        <small className="text-muted d-block">Department</small>
                        <strong>{issue.department_name || issue.category}</strong>
                    </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <FaUserCheck className="text-success fs-5" />
                    <div>
                        <small className="text-muted d-block">Assigned Employee</small>
                        <strong className={issue.assigned_employee_username ? 'text-success' : 'text-muted'}>
                            {issue.assigned_employee_username ? `👤 ${issue.assigned_employee_username}` : "Unassigned"}
                        </strong>
                    </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <div>
                        <small className="text-muted d-block">Current Status</small>
                        <Badge bg={issue.status === 'RESOLVED' ? 'success' : issue.status === 'PENDING_APPROVAL' ? 'warning text-dark' : 'primary'}>
                            {issue.status}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Recommended Action Callout */}
            <div className="p-3 rounded-3 shadow-sm d-flex align-items-start gap-3 mt-3"
                 style={{ 
                     background: intel.is_sla_breached ? 'rgba(230, 57, 70, 0.1)' : 'rgba(67, 97, 238, 0.08)',
                     borderLeft: intel.is_sla_breached ? '5px solid #e63946' : '5px solid #4361ee'
                 }}>
                <div className="p-2 rounded-circle bg-white shadow-sm">
                    <FaLightbulb className={intel.is_sla_breached ? 'text-danger fs-5' : 'text-primary fs-5'} />
                </div>
                <div>
                    <span className="fw-bold d-block text-uppercase small" style={{ color: intel.is_sla_breached ? '#e63946' : '#4361ee' }}>
                        Operational Recommendation
                    </span>
                    <p className="mb-0 text-dark fw-semibold">{intel.recommended_action}</p>
                </div>
            </div>

            {/* Priority Breakdown Modal */}
            <Modal show={showBreakdown} onHide={() => setShowBreakdown(false)} centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold d-flex align-items-center gap-2">
                        <FaBrain className="text-primary" /> Civic Priority Score Breakdown
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <div className="text-center mb-4 p-3 bg-light rounded-4">
                        <span className="text-muted small text-uppercase fw-bold">Overall Priority Score</span>
                        <div className="display-4 fw-bold text-gradient mt-1">{score} <span className="fs-5 text-muted">/ 100</span></div>
                        <p className="small text-muted mb-0">Calculated transparently using deterministic municipal weighting factors</p>
                    </div>

                    <div className="space-y-3">
                        <div className="mb-3">
                            <div className="d-flex justify-content-between mb-1">
                                <span className="fw-bold small">1. Issue Severity</span>
                                <span className="fw-bold text-primary">+{intel.breakdown.severity} / 25</span>
                            </div>
                            <ProgressBar now={(intel.breakdown.severity / 25) * 100} variant="danger" style={{ height: '8px' }} />
                        </div>

                        <div className="mb-3">
                            <div className="d-flex justify-content-between mb-1">
                                <span className="fw-bold small">2. Citizen Support & Duplicates</span>
                                <span className="fw-bold text-primary">+{intel.breakdown.citizen_support} / 20</span>
                            </div>
                            <ProgressBar now={(intel.breakdown.citizen_support / 20) * 100} variant="info" style={{ height: '8px' }} />
                        </div>

                        <div className="mb-3">
                            <div className="d-flex justify-content-between mb-1">
                                <span className="fw-bold small">3. SLA Deadline Urgency</span>
                                <span className="fw-bold text-primary">+{intel.breakdown.sla_urgency} / 20</span>
                            </div>
                            <ProgressBar now={(intel.breakdown.sla_urgency / 20) * 100} variant="warning" style={{ height: '8px' }} />
                        </div>

                        <div className="mb-3">
                            <div className="d-flex justify-content-between mb-1">
                                <span className="fw-bold small">4. Location Sensitivity ({intel.location_sensitivity_label})</span>
                                <span className="fw-bold text-primary">+{intel.breakdown.location_sensitivity} / 15</span>
                            </div>
                            <ProgressBar now={(intel.breakdown.location_sensitivity / 15) * 100} variant="secondary" style={{ height: '8px' }} />
                        </div>

                        <div className="mb-3">
                            <div className="d-flex justify-content-between mb-1">
                                <span className="fw-bold small">5. Recurrence Frequency in Zone</span>
                                <span className="fw-bold text-primary">+{intel.breakdown.recurrence} / 14</span>
                            </div>
                            <ProgressBar now={(intel.breakdown.recurrence / 14) * 100} variant="danger" style={{ height: '8px' }} />
                        </div>

                        <div className="mb-3">
                            <div className="d-flex justify-content-between mb-1">
                                <span className="fw-bold small">6. Category Weight ({issue.category})</span>
                                <span className="fw-bold text-primary">+{intel.breakdown.category_weight} / 6</span>
                            </div>
                            <ProgressBar now={(intel.breakdown.category_weight / 6) * 100} variant="success" style={{ height: '8px' }} />
                        </div>

                        <div className="p-3 bg-primary-subtle rounded-3 d-flex justify-content-between align-items-center mt-3 border border-primary">
                            <strong className="text-primary">Total Computed Score:</strong>
                            <strong className="text-primary fs-5">{score} / 100</strong>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <Button variant="secondary" onClick={() => setShowBreakdown(false)} className="rounded-pill w-100">
                        Close Breakdown
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default CivicIntelligenceCard;
