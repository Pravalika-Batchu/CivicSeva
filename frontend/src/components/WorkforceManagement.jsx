import { useState, useEffect } from "react";
import { Table, Badge, Button, Form, Alert, Spinner } from "react-bootstrap";
import { 
    FaRobot, 
    FaUserPlus, 
    FaCheck, 
    FaTasks, 
    FaSync,
    FaInfoCircle,
    FaUserCheck,
    FaExclamationCircle
} from "react-icons/fa";
import api from "../services/api/axios";
import "animate.css";

function WorkforceManagement({ issue, issuesList = [], onSelectIssue, onAssigned }) {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
    const [assigning, setAssigning] = useState(false);
    const [autoAssigning, setAutoAssigning] = useState(false);
    const [autoAssignResult, setAutoAssignResult] = useState(null);
    const [message, setMessage] = useState({ text: "", type: "" });

    const fetchWorkforce = async () => {
        setLoading(true);
        try {
            const accessToken = localStorage.getItem("access");
            const res = await api.get("/api/department/employees/", {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            setEmployees(res.data);
        } catch (err) {
            console.error("Failed to fetch workforce:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkforce();
    }, []);

    const handleManualAssign = async (e) => {
        if (e) e.preventDefault();
        if (!selectedEmployeeId || !issue) return;

        setAssigning(true);
        setMessage({ text: "", type: "" });
        setAutoAssignResult(null);

        try {
            const accessToken = localStorage.getItem("access");
            const res = await api.post(
                `/api/issues/${issue.id}/assign_employee/`,
                { employee_id: parseInt(selectedEmployeeId) },
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            setMessage({ text: `✅ ${res.data.message}`, type: "success" });
            fetchWorkforce();
            if (onAssigned) onAssigned(res.data.issue);
        } catch (err) {
            console.error("Manual assign error:", err);
            setMessage({ text: err.response?.data?.error || "Failed to assign task.", type: "danger" });
        } finally {
            setAssigning(false);
        }
    };

    const handleAutoAssign = async () => {
        if (!issue) return;
        setAutoAssigning(true);
        setMessage({ text: "", type: "" });
        setAutoAssignResult(null);

        try {
            const accessToken = localStorage.getItem("access");
            const res = await api.post(
                `/api/issues/${issue.id}/auto_assign/`,
                {},
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            setAutoAssignResult(res.data);
            setMessage({ text: "🤖 Task successfully allocated using workload optimization!", type: "success" });
            fetchWorkforce();
            if (onAssigned) onAssigned(res.data.issue);
        } catch (err) {
            console.error("Auto assign error:", err);
            setMessage({ text: err.response?.data?.error || "Auto assignment failed.", type: "danger" });
        } finally {
            setAutoAssigning(false);
        }
    };

    const isAlreadyAssigned = Boolean(issue?.assigned_employee_username || issue?.assigned_employee);

    return (
        <div className="glass-panel p-4 mb-4 border-0 shadow-lg position-relative animate__animated animate__fadeIn"
             style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '20px', borderTop: '5px solid #7209b7' }}>
            
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <div className="d-flex align-items-center gap-2">
                    <div className="p-2 rounded-circle text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #7209b7, #3a0ca3)' }}>
                        <FaTasks className="fs-4" />
                    </div>
                    <div>
                        <h4 className="fw-bold mb-0 text-dark">Department Workforce & Task Allocation</h4>
                        <small className="text-muted">Workload-aware assignment and team capacity monitoring</small>
                    </div>
                </div>
                <Button variant="light" size="sm" onClick={fetchWorkforce} className="rounded-pill shadow-sm">
                    <FaSync className={loading ? "fa-spin" : ""} /> Refresh
                </Button>
            </div>

            {message.text && (
                <Alert variant={message.type} className="mb-4 shadow-sm animate__animated animate__fadeIn">
                    {message.text}
                </Alert>
            )}

            {/* Task Allocation Action Box */}
            {issuesList && issuesList.length > 0 && (
                <div className="p-4 bg-light rounded-4 border mb-4 shadow-sm">
                    {/* Task Selector Row */}
                    <div className="mb-3">
                        <label className="form-label small fw-bold text-muted d-flex justify-content-between align-items-center">
                            <span>Select Department Task to Assign / Reassign:</span>
                            <span className="text-primary">{issuesList.length} active department tasks</span>
                        </label>
                        <Form.Select 
                            value={issue?.id || ""} 
                            onChange={(e) => {
                                const found = issuesList.find(i => i.id === parseInt(e.target.value));
                                if (found && onSelectIssue) onSelectIssue(found);
                            }}
                            className="shadow-sm border p-2 fw-semibold"
                        >
                            {issuesList.map(i => (
                                <option key={i.id} value={i.id}>
                                    #{i.id}: {i.title} — {i.assigned_employee_username ? `[Assigned: @${i.assigned_employee_username}]` : `[⚠️ UNASSIGNED]`}
                                </option>
                            ))}
                        </Form.Select>
                    </div>

                    {issue && (
                        <>
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3 pt-2 border-top">
                                <div>
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <h5 className="fw-bold text-dark mb-0">Task #{issue.id}: {issue.title}</h5>
                                        {isAlreadyAssigned ? (
                                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1 fw-bold small rounded-pill d-inline-flex align-items-center gap-1">
                                                <FaUserCheck /> Assigned: @{issue.assigned_employee_username}
                                            </span>
                                        ) : (
                                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2.5 py-1 fw-bold small rounded-pill d-inline-flex align-items-center gap-1">
                                                <FaExclamationCircle /> Unallocated Task
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-muted small">
                                        Department: <strong className="text-primary">{issue.department_name || issue.category}</strong> | Priority: <strong className="text-danger">{issue.priority_score || 50}/100</strong> | Status: <strong className="text-dark">{issue.status}</strong>
                                    </span>
                                </div>
                                <Button 
                                    variant="primary" 
                                    size="md" 
                                    className="rounded-pill fw-bold shadow d-flex align-items-center gap-2"
                                    onClick={handleAutoAssign}
                                    disabled={autoAssigning || assigning}
                                    style={{ background: 'linear-gradient(135deg, #4361ee, #7209b7)', border: 'none' }}
                                >
                                    {autoAssigning ? <Spinner size="sm" animation="border" /> : <><FaRobot /> {isAlreadyAssigned ? "Re-allocate (Auto)" : "Auto Assign"}</>}
                                </Button>
                            </div>

                            {/* Manual Assign Controls */}
                            <div className="row g-2 align-items-center">
                                <div className="col-md-8">
                                    <Form.Select 
                                        value={selectedEmployeeId} 
                                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                        className="shadow-sm border-0 p-2"
                                    >
                                        <option value="">{isAlreadyAssigned ? "Select New Employee to Reassign..." : "Select Department Employee for Manual Assignment..."}</option>
                                        {employees.map((emp) => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.full_name} (@{emp.username}) — {emp.active_tasks} active tasks ({emp.workload_status})
                                            </option>
                                        ))}
                                    </Form.Select>
                                </div>
                                <div className="col-md-4">
                                    <Button 
                                        variant={isAlreadyAssigned ? "warning" : "outline-dark"} 
                                        className="w-100 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                                        onClick={handleManualAssign}
                                        disabled={!selectedEmployeeId || assigning || autoAssigning}
                                    >
                                        {assigning ? <Spinner size="sm" animation="border" /> : <><FaUserPlus /> {isAlreadyAssigned ? "Reassign Task" : "Assign Task"}</>}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Intelligent Task Allocation Explanation Box */}
                    {autoAssignResult && autoAssignResult.reason && (
                        <div className="mt-4 p-4 rounded-4 shadow-sm border border-success animate__animated animate__fadeIn"
                             style={{ background: 'rgba(46, 196, 182, 0.08)' }}>
                            <div className="d-flex align-items-center gap-2 text-success mb-2">
                                <FaRobot className="fs-4" />
                                <h5 className="fw-bold mb-0">Intelligent Task Allocation Decision</h5>
                            </div>

                            <p className="mb-3 text-dark">
                                Assigned To: <strong className="text-primary fs-5">{autoAssignResult.assigned_employee.username} ({autoAssignResult.assigned_employee.department} Dept)</strong>
                            </p>

                            <div className="p-3 bg-white rounded-3 shadow-inner mb-3">
                                <h6 className="text-muted small text-uppercase fw-bold mb-2">Algorithm Verification Checklist</h6>
                                <div className="d-flex flex-column gap-2 text-dark small">
                                    <div className="d-flex align-items-center gap-2 text-success">
                                        <FaCheck /> <span>Same Department: <strong>{autoAssignResult.reason.department_name}</strong></span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2 text-success">
                                        <FaCheck /> <span>Availability: <strong>{autoAssignResult.reason.availability}</strong></span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2 text-success">
                                        <FaCheck /> <span>Lowest Active Workload: <strong>{autoAssignResult.reason.active_tasks} tasks</strong> (Evaluated {autoAssignResult.reason.total_candidates_evaluated} employees)</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2 text-success">
                                        <FaCheck /> <span>Overdue Assignments: <strong>{autoAssignResult.reason.overdue_tasks} overdue</strong></span>
                                    </div>
                                </div>
                            </div>

                            <p className="small text-muted mb-0 fst-italic">
                                <FaInfoCircle className="me-1 text-primary" /> {autoAssignResult.reason.summary}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Department Workforce List */}
            <h5 className="fw-bold text-dark mb-3">Department Workforce Roster</h5>
            {loading ? (
                <div className="text-center py-4"><Spinner animation="border" variant="primary" /></div>
            ) : employees.length === 0 ? (
                <div className="alert alert-secondary text-center">No department employees registered yet.</div>
            ) : (
                <div className="table-responsive">
                    <Table hover className="align-middle border rounded-3 overflow-hidden shadow-sm">
                        <thead className="table-light">
                            <tr>
                                <th>Employee</th>
                                <th>Department</th>
                                <th>Contact</th>
                                <th>Active Tasks</th>
                                <th>Overdue</th>
                                <th>Resolved</th>
                                <th>Workload Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((emp) => (
                                <tr key={emp.id}>
                                    <td>
                                        <div className="fw-bold text-dark">{emp.full_name}</div>
                                        <small className="text-muted">@{emp.username}</small>
                                    </td>
                                    <td>
                                        <Badge bg="secondary">{emp.department_name}</Badge>
                                    </td>
                                    <td>{emp.phone_number || "Not provided"}</td>
                                    <td>
                                        <span className="fw-bold text-primary fs-6">{emp.active_tasks}</span>
                                    </td>
                                    <td>
                                        {emp.overdue_tasks > 0 ? (
                                            <Badge bg="danger" pill>{emp.overdue_tasks} overdue</Badge>
                                        ) : (
                                            <span className="text-muted">0</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className="fw-bold text-success">{emp.resolved_tasks}</span>
                                    </td>
                                    <td>
                                        <Badge bg={emp.badge_color} className="px-3 py-2 fs-6">
                                            {emp.badge_icon} {emp.workload_status}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            )}
        </div>
    );
}

export default WorkforceManagement;
