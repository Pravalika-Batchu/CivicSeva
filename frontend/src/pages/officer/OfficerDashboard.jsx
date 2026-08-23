import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api/axios";
import { Container, Row, Col, Badge, Form, Dropdown, Button, Tab, Tabs, Spinner, Alert } from "react-bootstrap";
import {
    FaClock,
    FaMapMarkerAlt,
    FaVoteYea,
    FaBrain,
    FaFire,
    FaSync,
    FaArrowRight
} from "react-icons/fa";
import WorkforceManagement from "../../components/WorkforceManagement";
import "animate.css";
import "./OfficerDashboard.css";

function OfficerDashboard() {
    const [issues, setIssues] = useState([]);
    const [filteredIssues, setFilteredIssues] = useState([]);
    const [priorityQueue, setPriorityQueue] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);
    const [filter, setFilter] = useState("priority");
    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("priority_queue");
    const [selectedIssueForAssign, setSelectedIssueForAssign] = useState(null);
    const [departmentName, setDepartmentName] = useState(localStorage.getItem("department") || "");
    const navigate = useNavigate();

    const fetchIssues = async () => {
        const accessToken = localStorage.getItem("access");
        if (!accessToken) {
            navigate("/login");
            return;
        }

        try {
            setIsLoading(true);
            const [assignedRes, prioritiesRes] = await Promise.all([
                api.get("/api/assigned_issues/", { headers: { Authorization: `Bearer ${accessToken}` } }),
                api.get("/api/priorities/top/", { headers: { Authorization: `Bearer ${accessToken}` } })
            ]);

            const unresolved = (assignedRes.data || []).filter(issue => issue.status !== "RESOLVED");

            const normalize = (items) => items.map(item => ({
                ...item,
                severity: item.severity ? item.severity.charAt(0).toUpperCase() + item.severity.slice(1).toLowerCase() : "Low"
            }));

            const departmentIssues = normalize(unresolved);
            setIssues(departmentIssues);
            setFilteredIssues(departmentIssues);

            // Determine officer's department name
            const storedDept = localStorage.getItem("department") || "";
            const dept = storedDept || (departmentIssues.length > 0 ? (departmentIssues[0].department_name || departmentIssues[0].category) : "");
            if (dept) setDepartmentName(dept);

            // Filter priority queue to ONLY show issues belonging to this department
            let rawPriorities = normalize(prioritiesRes.data || []);
            if (dept) {
                rawPriorities = rawPriorities.filter(item => {
                    const itemDept = item.department_name || item.category;
                    return itemDept && itemDept.toUpperCase() === dept.toUpperCase();
                });
            }
            setPriorityQueue(rawPriorities);

            if (departmentIssues.length > 0) {
                // Prefer selecting first unassigned issue if available
                const firstUnassigned = departmentIssues.find(i => !i.assigned_employee_username && !i.assigned_employee);
                setSelectedIssueForAssign(prev => {
                    if (prev) {
                        const updated = departmentIssues.find(i => i.id === prev.id);
                        return updated || prev;
                    }
                    return firstUnassigned || departmentIssues[0];
                });
            }
        } catch (err) {
            if (err.response?.status === 401) {
                localStorage.removeItem("access");
                navigate("/login");
            }
            setMessage({ text: "Failed to load department issues.", type: "error" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchIssues();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    useEffect(() => {
        let sorted = [...issues];
        if (filter === "priority") {
            sorted.sort((a, b) => (b.civic_intelligence?.priority_score || b.priority_score || 50) - (a.civic_intelligence?.priority_score || a.priority_score || 50));
        } else if (filter === "severity") {
            const severityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
            sorted.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));
        } else if (filter === "votes") {
            sorted.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
        } else {
            sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        setFilteredIssues(sorted);
    }, [filter, issues]);

    const sendNotification = async (issueId, notifType) => {
        setNotifLoading(true);
        let msg = notifType === "MISCLASSIFICATION"
            ? "This issue does not belong to our department. Please reassign."
            : "Our part is done. Please assign to next department.";

        try {
            const accessToken = localStorage.getItem("access");
            await api.post("/api/department-notifications/send/", { issue_id: issueId, notif_type: notifType, message: msg }, { headers: { Authorization: `Bearer ${accessToken}` } });
            setMessage({ text: "Notification sent to admin!", type: "success" });
            setIssues(prev => prev.map(issue => issue.id === issueId ? { ...issue, [`${notifType}_sent`]: true } : issue));
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ text: "Failed to send notification.", type: "error" });
        } finally {
            setNotifLoading(false);
        }
    };

    const getSeverityBadge = (severity) => {
        const sev = (severity || 'Low').toLowerCase();
        let bgStyle = { backgroundColor: '#e2e8f0', color: '#334155' };
        if (sev === 'critical') bgStyle = { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
        else if (sev === 'high') bgStyle = { backgroundColor: '#ffedd5', color: '#9a3412', border: '1px solid #fed7aa' };
        else if (sev === 'medium') bgStyle = { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
        else if (sev === 'low') bgStyle = { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };

        return (
            <span className="badge rounded-pill px-3 py-1.5 fw-bold text-uppercase" style={{ ...bgStyle, fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                {severity || 'Low'}
            </span>
        );
    };

    const IssueCard = ({ issue }) => {
        const intel = issue.civic_intelligence || {};
        const pScore = intel.priority_score || issue.priority_score || 50;
        return (
            <Col md={6} lg={4} className="mb-4 animate__animated animate__fadeInUp">
                <div className="glass-panel h-100 p-0 overflow-hidden hover-lift position-relative shadow-sm bg-white" style={{ borderRadius: '15px' }}>
                    <div className={`position-absolute top-0 start-0 w-100 h-1 bg-${pScore >= 80 ? 'danger' : pScore >= 60 ? 'warning' : 'primary'}`}></div>
                    <div className="p-4">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                            <div className="d-flex align-items-center gap-2">
                                <span className="text-muted small">#{issue.id}</span>
                                {getSeverityBadge(issue.severity)}
                                <Badge bg={pScore >= 80 ? "danger" : "primary"} pill className="px-2 py-1 small">
                                    Priority: {pScore}
                                </Badge>
                            </div>
                            <small className="text-muted"><FaClock className="me-1" />{new Date(issue.created_at).toLocaleDateString()}</small>
                        </div>

                        <h5 className="fw-bold text-dark text-truncate mb-1" title={issue.title}>{issue.title}</h5>
                        <p className="text-muted small text-truncate-2 mb-3" style={{ minHeight: '2.8em' }}>{issue.description}</p>

                        <div className="d-flex align-items-center justify-content-between mb-3 text-muted small bg-light p-2 rounded">
                            <span className="d-flex align-items-center"><FaVoteYea className="me-1 text-primary" /> {issue.upvotes || 0} Votes</span>
                            <span><FaMapMarkerAlt className="me-1 text-danger" /> {issue.location_tag || "City Area"}</span>
                        </div>

                        <div className="small mb-3 p-2 bg-warning-subtle rounded border border-warning-subtle text-dark">
                            <FaClock className="me-1 text-warning" />
                            <strong>SLA:</strong> {intel.sla_time_remaining || "Standard SLA"}
                        </div>

                        <div className="small mb-3 d-flex justify-content-between">
                            <span className="text-muted">Assigned Employee:</span>
                            <strong className={issue.assigned_employee_username ? "text-success" : "text-danger"}>
                                {issue.assigned_employee_username ? `👤 ${issue.assigned_employee_username}` : "Not Assigned"}
                            </strong>
                        </div>

                        <div className="d-flex gap-2 border-top pt-3">
                            <Link to={`/officer/issue/${issue.id}`} className="btn btn-outline-primary btn-sm flex-grow-1">
                                Details & Assign
                            </Link>

                            <Dropdown>
                                <Dropdown.Toggle variant="light" size="sm" className="border shadow-sm">
                                    More
                                </Dropdown.Toggle>
                                <Dropdown.Menu align="end" className="shadow border-0">
                                    <Dropdown.Item
                                        onClick={() => sendNotification(issue.id, "MISCLASSIFICATION")}
                                        disabled={notifLoading || issue.MISCLASSIFICATION_sent}
                                        className="text-warning fw-bold small"
                                    >
                                        ⚠️ Misclassified
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        onClick={() => sendNotification(issue.id, "MULTI_DEPT_NEXT_STEP")}
                                        disabled={notifLoading || issue.MULTI_DEPT_NEXT_STEP_sent}
                                        className="text-info fw-bold small"
                                    >
                                        🔄 Multi-Dept Step
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                    </div>
                </div>
            </Col>
        );
    };

    return (
        <Container fluid className="py-5 px-md-5" style={{ minHeight: '100vh', background: 'transparent' }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom animate__animated animate__fadeInDown">
                <div>
                    <div className="d-flex align-items-center gap-3 flex-wrap mb-1">
                        <h2 className="display-6 fw-bold text-gradient mb-0">
                            Department Officer Command Center
                        </h2>
                        <span
                            className="badge fs-6 px-3 py-2 rounded-pill shadow-sm text-uppercase d-inline-flex align-items-center gap-1"
                            style={{
                                background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
                                color: '#ffffff',
                                WebkitTextFillColor: '#ffffff',
                                border: '1px solid rgba(255,255,255,0.2)',
                                fontWeight: 700,
                                letterSpacing: '0.04em'
                            }}
                        >
                            🏢 {departmentName ? `${departmentName} DEPT` : "DEPARTMENT"}
                        </span>
                    </div>
                    <p className="text-muted mb-0">Prioritization, capacity planning, and intelligent task allocation.</p>
                </div>
                <div className="d-flex gap-2">
                    <Link to="/hotspots" className="btn btn-outline-danger rounded-pill shadow-sm">
                        <FaFire className="me-1" /> Hotspot Analysis
                    </Link>
                    <Button variant="light" className="rounded-pill shadow-sm" onClick={fetchIssues} disabled={isLoading}>
                        <FaSync className={`me-2 ${isLoading ? 'fa-spin' : ''}`} /> Refresh
                    </Button>
                </div>
            </div>

            {message && (
                <Alert variant={message.type} className="mb-4 shadow-sm animate__animated animate__fadeIn">
                    {message.text}
                </Alert>
            )}

            {/* Navigation Tabs */}
            <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-4 border-bottom-0 custom-nav-tabs"
            >
                <Tab eventKey="priority_queue" title={<span className="fw-bold">⚡ What Should We Fix First? ({priorityQueue.length})</span>}>
                    {/* Top Priorities Ranked Section */}
                    <div className="glass-panel p-4 mb-4 bg-white shadow-sm" style={{ borderRadius: '20px', borderLeft: '6px solid #e63946' }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div>
                                <h4 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                                    <FaBrain className="text-danger" /> What Should We Fix First? {departmentName && <span className="text-muted fw-normal fs-6">({departmentName} Department)</span>}
                                </h4>
                                <p className="text-muted small mb-0">
                                    Real-time priority queue for {departmentName ? `${departmentName} Department` : "your department"} calculated using severity, citizen support, SLA deadline urgency, and location sensitivity.
                                </p>
                            </div>
                        </div>

                        {priorityQueue.length === 0 ? (
                            <div className="alert alert-secondary text-center py-4">No unresolved priority issues for this department.</div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle priority-queue-table mb-0">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '70px', textAlign: 'center' }}>Rank</th>
                                            <th style={{ minWidth: '280px' }}>Issue</th>
                                            <th style={{ width: '130px' }}>Department</th>
                                            <th style={{ width: '130px' }}>Priority Score</th>
                                            <th style={{ width: '120px' }}>Severity</th>
                                            <th style={{ width: '180px' }}>SLA Deadline</th>
                                            <th style={{ width: '160px' }}>Assigned Employee</th>
                                            <th style={{ width: '160px', textAlign: 'end' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {priorityQueue.map((item, idx) => {
                                            const intel = item.civic_intelligence || {};
                                            const score = intel.priority_score || item.priority_score || 50;
                                            return (
                                                <tr key={item.id} className={idx === 0 ? "table-danger-subtle fw-semibold" : ""}>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={`rank-circle ${idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-other'}`}>
                                                            {idx + 1}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="fw-bold text-dark mb-1" style={{ fontSize: '0.95rem', lineHeight: '1.3' }}>
                                                            {item.title}
                                                        </div>
                                                        <div className="d-flex align-items-center gap-2 text-muted small flex-wrap">
                                                            <span className="d-flex align-items-center gap-1">
                                                                <FaMapMarkerAlt className="text-danger" style={{ fontSize: '0.8rem' }} />
                                                                <span>{item.location_tag || item.address || "Zone"}</span>
                                                            </span>
                                                            <span className="text-muted">•</span>
                                                            <span className="d-flex align-items-center gap-1">
                                                                <FaVoteYea className="text-primary" style={{ fontSize: '0.8rem' }} />
                                                                <span>{item.upvotes || 0} votes</span>
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="badge rounded-pill bg-light text-secondary border px-2.5 py-1.5 fw-bold text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                                                            {item.department_name || item.category || "General"}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-baseline gap-1">
                                                            <span className={`fw-bolder fs-5 ${score >= 80 ? 'text-danger' : score >= 60 ? 'text-warning' : 'text-primary'}`}>
                                                                {score}
                                                            </span>
                                                            <span className="text-muted small fw-semibold">/100</span>
                                                        </div>
                                                    </td>
                                                    <td>{getSeverityBadge(item.severity)}</td>
                                                    <td>
                                                        <span className={`badge rounded-pill px-2.5 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5 ${intel.is_sla_breached
                                                            ? "bg-danger-subtle text-danger border border-danger-subtle"
                                                            : "bg-warning-subtle text-dark border border-warning-subtle"
                                                            }`} style={{ fontSize: '0.8rem' }}>
                                                            <FaClock className={intel.is_sla_breached ? "text-danger" : "text-warning"} />
                                                            <span>{intel.sla_time_remaining || "4h remaining"}</span>
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {item.assigned_employee_username ? (
                                                            <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1.5 fw-semibold d-inline-flex align-items-center gap-1" style={{ fontSize: '0.8rem' }}>
                                                                👤 {item.assigned_employee_username}
                                                            </span>
                                                        ) : (
                                                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2.5 py-1.5 fw-semibold" style={{ fontSize: '0.8rem' }}>
                                                                Unassigned
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'end' }}>
                                                        <Link to={`/officer/issue/${item.id}`} className="btn btn-outline-primary btn-sm rounded-pill px-3 shadow-sm action-btn d-inline-flex align-items-center gap-1 fw-semibold">
                                                            Inspect & Assign <FaArrowRight style={{ fontSize: '0.75rem' }} />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </Tab>

                <Tab eventKey="department_issues" title={<span className="fw-bold">📋 Department Issue Pool ({issues.length})</span>}>
                    {/* Controls Row */}
                    <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                            <span className="text-muted small fw-bold">Sort Issues By:</span>
                            <Form.Select size="sm" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: '180px' }} className="shadow-sm">
                                <option value="priority">🔥 Civic Priority</option>
                                <option value="severity">⚠️ Severity</option>
                                <option value="votes">👍 Citizen Votes</option>
                                <option value="recent">🕒 Most Recent</option>
                            </Form.Select>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
                    ) : filteredIssues.length === 0 ? (
                        <div className="alert alert-secondary text-center py-5">No active issues in department pool.</div>
                    ) : (
                        <Row className="g-4">
                            {filteredIssues.map((issue) => (
                                <IssueCard key={issue.id} issue={issue} />
                            ))}
                        </Row>
                    )}
                </Tab>

                <Tab eventKey="workforce" title={<span className="fw-bold">👥 Department Workforce & Capacity</span>}>
                    {/* Integrated Workforce Management Component */}
                    <WorkforceManagement
                        issue={selectedIssueForAssign}
                        issuesList={issues}
                        onSelectIssue={(issue) => setSelectedIssueForAssign(issue)}
                        onAssigned={() => fetchIssues()}
                    />
                </Tab>
            </Tabs>
        </Container>
    );
}

export default OfficerDashboard;