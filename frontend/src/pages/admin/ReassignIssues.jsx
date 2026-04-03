import { useState, useEffect } from "react";
import api from "../../services/api/axios";
import { Container, Table, Form, Button, Badge, Spinner } from "react-bootstrap";
import { FaExchangeAlt, FaSearch, FaExternalLinkAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import "animate.css";

function ReassignIssues() {
    const [issues, setIssues] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [assignments, setAssignments] = useState({}); // To track selected dept per issue

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const accessToken = localStorage.getItem("access");
        try {
            const [issuesRes, deptsRes] = await Promise.all([
                api.get("/api/issues/", { headers: { Authorization: `Bearer ${accessToken}` } }),
                api.get("/api/departments/")
            ]);
            setIssues(issuesRes.data.filter(i => i.status !== 'RESOLVED')); // Only show unresolved for assignment
            setDepartments(deptsRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleReassign = async (issueId) => {
        const selectedDept = assignments[issueId];
        if (!selectedDept) return alert("Please select a department first.");

        try {
            const accessToken = localStorage.getItem("access");
            await api.post(`/api/issues/reassign/${issueId}/`, { department: selectedDept }, { headers: { Authorization: `Bearer ${accessToken}` } });
            alert("Issue reassigned successfully!");
            fetchData(); // Refresh list
        } catch (err) {
            alert("Failed to reassign issue.");
        }
    };

    const filteredIssues = issues.filter(i =>
        i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.id.toString().includes(searchTerm)
    );

    return (
        <Container fluid className="py-5" style={{ minHeight: '100vh', background: 'transparent' }}>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5 animate__animated animate__fadeInDown">
                <div>
                    <h2 className="display-6 fw-bold text-gradient">Issue Assignment</h2>
                    <p className="text-muted mb-0">Re-route issues to the correct department</p>
                </div>
                <div className="position-relative mt-3 mt-md-0">
                    <FaSearch className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                    <Form.Control
                        type="text"
                        placeholder="Search issues..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="ps-5 rounded-pill border-0 shadow-sm"
                        style={{ width: '300px' }}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
            ) : (
                <div className="glass-panel p-0 overflow-hidden shadow-lg animate__animated animate__fadeInUp">
                    <Table hover responsive className="mb-0 align-middle">
                        <thead className="bg-light text-uppercase small text-muted">
                            <tr>
                                <th className="p-4 border-0">Issue</th>
                                <th className="p-4 border-0">Current Department</th>
                                <th className="p-4 border-0">Reassign To</th>
                                <th className="p-4 border-0 text-end">Action</th>
                            </tr>
                        </thead>
                        <tbody className="border-top-0">
                            {filteredIssues.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center p-5 text-muted">No unresolved issues found.</td>
                                </tr>
                            ) : (
                                filteredIssues.map(issue => (
                                    <tr key={issue.id} className="transition-all hover-bg-light">
                                        <td className="p-4 border-bottom-secondary-subtle">
                                            <div className="d-flex align-items-center gap-2">
                                                <Link to={`/issue/${issue.id}`} className="text-decoration-none fw-bold text-primary hover-underline">
                                                    #{issue.id} {issue.title} <FaExternalLinkAlt className="small ms-1" style={{ fontSize: '0.8rem' }} />
                                                </Link>
                                            </div>
                                            <div className="small text-muted text-truncate" style={{ maxWidth: '300px' }}>{issue.description}</div>
                                        </td>
                                        <td className="p-4 border-bottom-secondary-subtle">
                                            <Badge bg="secondary" className="px-3 py-2 fw-normal">{issue.department_name || "Unassigned"}</Badge>
                                        </td>
                                        <td className="p-4 border-bottom-secondary-subtle" style={{ minWidth: '200px' }}>
                                            <Form.Select
                                                size="sm"
                                                className="border-0 bg-light shadow-sm fw-bold"
                                                value={assignments[issue.id] || ""}
                                                onChange={(e) => setAssignments({ ...assignments, [issue.id]: e.target.value })}
                                            >
                                                <option value="">Select Department...</option>
                                                {departments.map(d => (
                                                    <option key={d.id} value={d.name}>{d.name}</option>
                                                ))}
                                            </Form.Select>
                                        </td>
                                        <td className="p-4 border-bottom-secondary-subtle text-end">
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                className="rounded-pill px-3 shadow-sm"
                                                onClick={() => handleReassign(issue.id)}
                                                disabled={!assignments[issue.id]}
                                            >
                                                <FaExchangeAlt className="me-2" />Assign
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>
            )}
        </Container>
    );
}

export default ReassignIssues;
