import { useState, useEffect } from "react";
import api from "../../services/api/axios";
import { useNavigate, Link } from "react-router-dom";
import { Container, Row, Col, Form, Button, Alert } from "react-bootstrap";
import { FaUserPlus, FaBuilding, FaLock, FaUser, FaPhone } from "react-icons/fa";

function RegisterEmployee() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [departments, setDepartments] = useState([]);
    const [department, setDepartment] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDepts = async () => {
            try {
                const res = await api.get("/api/departments/");
                setDepartments(res.data);
                if (res.data.length > 0) setDepartment(res.data[0].id);
            } catch (err) {
                console.error("Failed to load departments:", err);
            }
        };
        fetchDepts();
    }, []);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const phoneRegex = /^\+\d{10,15}$/;
        if (!phoneRegex.test(phoneNumber)) {
            setError("Phone number must be in international E.164 format (e.g., +919876543210)");
            setLoading(false);
            return;
        }

        try {
            await api.post("/api/auth/register-employee/", {
                username,
                password,
                department: parseInt(department),
                phone_number: phoneNumber
            });
            alert("✅ Employee registered successfully! You can now log in.");
            navigate("/login");
        } catch (err) {
            console.error("Registration error:", err);
            setError(err.response?.data?.error || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="py-5" style={{ minHeight: '85vh' }}>
            <Row className="justify-content-center">
                <Col md={6} lg={5}>
                    <div className="glass-panel p-4 p-md-5 shadow-lg border-0 bg-white animate__animated animate__fadeIn" style={{ borderRadius: '20px' }}>
                        <div className="text-center mb-4">
                            <div className="p-3 d-inline-flex rounded-circle text-white mb-2 shadow" style={{ background: 'linear-gradient(135deg, #7209b7, #3a0ca3)' }}>
                                <FaUserPlus className="fs-3" />
                            </div>
                            <h3 className="fw-bold text-dark mb-1">Employee Registration</h3>
                            <p className="text-muted small">Join your municipal department field workforce</p>
                        </div>

                        {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

                        <Form onSubmit={handleRegister}>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold text-secondary">Username</Form.Label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-0"><FaUser /></span>
                                    <Form.Control
                                        type="text"
                                        placeholder="e.g. john_doe"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        className="border-0 bg-light p-2"
                                    />
                                </div>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold text-secondary">Department</Form.Label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-0"><FaBuilding /></span>
                                    <Form.Select
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        required
                                        className="border-0 bg-light p-2"
                                    >
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </Form.Select>
                                </div>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold text-secondary">Mobile Phone (E.164)</Form.Label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-0"><FaPhone /></span>
                                    <Form.Control
                                        type="text"
                                        placeholder="+91xxxxxxxxxx"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        required
                                        className="border-0 bg-light p-2"
                                    />
                                </div>
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label className="small fw-bold text-secondary">Password</Form.Label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-0"><FaLock /></span>
                                    <Form.Control
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="border-0 bg-light p-2"
                                    />
                                </div>
                            </Form.Group>

                            <Button
                                variant="primary"
                                type="submit"
                                className="w-100 py-2 rounded-pill fw-bold shadow"
                                disabled={loading}
                                style={{ background: 'linear-gradient(135deg, #7209b7, #4361ee)', border: 'none' }}
                            >
                                {loading ? "Registering..." : "Register as Employee"}
                            </Button>
                        </Form>

                        <div className="text-center mt-4 small text-muted">
                            Already registered? <Link to="/login" className="fw-bold text-primary">Login here</Link>
                        </div>
                    </div>
                </Col>
            </Row>
        </Container>
    );
}

export default RegisterEmployee;
