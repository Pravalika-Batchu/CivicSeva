import { useState, useEffect } from "react";
import api from "../../services/api/axios";
import { Container, Row, Col, Form, Button, ListGroup, InputGroup } from "react-bootstrap";
import { FaBuilding, FaPlus, FaTrash, FaSearch } from "react-icons/fa";
import "animate.css";

function ManageDepartments() {
    const [departments, setDepartments] = useState([]);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const res = await api.get("/api/departments/");
            setDepartments(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const addDepartment = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSubmitting(true);
        try {
            const accessToken = localStorage.getItem("access");
            await api.post("/api/departments/", { name }, { headers: { Authorization: `Bearer ${accessToken}` } });
            setName("");
            fetchDepartments();
        } catch (err) {
            alert("Failed to add department");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container className="py-5" style={{ minHeight: '100vh', background: 'transparent', maxWidth: '800px' }}>
            <div className="text-center mb-5 animate__animated animate__fadeInDown">
                <h2 className="display-6 fw-bold text-gradient">Manage Departments</h2>
                <p className="text-muted">Add or remove city departments</p>
            </div>

            <div className="glass-panel p-4 mb-4 animate__animated animate__fadeInUp">
                <Form onSubmit={addDepartment} className="d-flex gap-3">
                    <Form.Control
                        type="text"
                        placeholder="Enter new department name..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="border-0 bg-light shadow-inner p-3 rounded-pill"
                    />
                    <Button
                        type="submit"
                        variant="success"
                        className="rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2"
                        disabled={submitting}
                    >
                        <FaPlus /> Add
                    </Button>
                </Form>
            </div>

            <div className="glass-panel p-0 overflow-hidden animate__animated animate__fadeInUp" style={{ animationDelay: '0.2s' }}>
                <div className="p-3 bg-light border-bottom d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold text-secondary"><FaBuilding className="me-2" />Current Departments</h5>
                    <span className="badge bg-secondary rounded-pill">{departments.length} Total</span>
                </div>
                <ListGroup variant="flush">
                    {loading ? (
                        <div className="text-center py-4 text-muted">Loading departments...</div>
                    ) : departments.length === 0 ? (
                        <div className="text-center py-4 text-muted">No departments found.</div>
                    ) : (
                        departments.map((d, idx) => (
                            <ListGroup.Item key={d.id} className="d-flex justify-content-between align-items-center p-3 hover-bg-light transition-all">
                                <span className="fw-bold text-dark">{d.name}</span>
                                <span className="text-muted small">#{d.id}</span>
                                {/* Add Delete button here if backend supports it */}
                            </ListGroup.Item>
                        ))
                    )}
                </ListGroup>
            </div>
        </Container>
    );
}

export default ManageDepartments;
