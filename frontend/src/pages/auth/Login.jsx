import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api/axios";

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post("/api/auth/login/", { username, password });

            // Save token & role
            localStorage.setItem("access", res.data.access);
            localStorage.setItem("refresh", res.data.refresh);
            localStorage.setItem("role", res.data.role);
            localStorage.setItem("username", res.data.username);

            // Redirect by role
            switch (res.data.role) {
                case "CITIZEN":
                    navigate("/report");
                    break;
                case "DEPT_OFFICER":
                    navigate("/officer/dashboard"); // officer page
                    break;
                case "ADMIN":
                    navigate("/admin/dashboard");
                    break;
                default:
                    alert("Unknown role!");
            }
        } catch (err) {
            console.error("Login error:", err);
            alert("Invalid credentials!");
        }
    };

    return (
        <div className="container d-flex flex-column justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
            <div className="glass-panel p-5 animate__animated animate__fadeInUp" style={{ maxWidth: "400px", width: "100%" }}>
                <div className="text-center mb-4">
                    <span style={{ fontSize: "3rem" }}>🔐</span>
                    <h3 className="fw-bold mt-2">Welcome Back</h3>
                    <p className="text-muted small">Access your CivicSeva dashboard</p>
                </div>

                <form onSubmit={handleLogin}>
                    <div className="mb-3">
                        <label className="form-label small fw-bold text-muted">Username</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div className="mb-4">
                        <label className="form-label small fw-bold text-muted">Password</label>
                        <input
                            type="password"
                            className="form-control"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary w-100 mb-3 shadow-sm verify-btn">Login</button>

                    <div className="text-center border-top pt-3">
                        <p className="small text-muted mb-1">Don't have an account?</p>
                        <a href="/register/citizen" className="text-decoration-none fw-bold" style={{ color: "var(--primary)" }}>
                            Register as Citizen
                        </a>
                        <div className="mt-2">
                            <a href="/register/officer" className="text-decoration-none small text-muted">
                                Are you an Officer? Register here
                            </a>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Login;
