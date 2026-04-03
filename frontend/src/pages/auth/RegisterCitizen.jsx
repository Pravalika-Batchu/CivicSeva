import { useState } from "react";
import api from "../../services/api/axios";
import { useNavigate } from "react-router-dom";

function RegisterCitizen() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");

        // Validate phone number (E.164 format: + followed by digits)
        const phoneRegex = /^\+\d{10,15}$/;
        if (!phoneRegex.test(phoneNumber)) {
            setError("Phone number must be in E.164 format (e.g., +1234567890)");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {
            await api.post("/api/auth/register-citizen/", {
                username,
                password,
                phone_number: phoneNumber,
            });
            alert("Citizen registered successfully!");
            navigate("/login");
        } catch (err) {
            const errorMsg = err.response?.data?.error || "Registration failed!";
            setError(errorMsg);
        }
    };

    return (
        <div className="container d-flex flex-column justify-content-center align-items-center" style={{ minHeight: "85vh" }}>
            <div className="glass-panel p-5 animate__animated animate__fadeInUp" style={{ maxWidth: "450px", width: "100%" }}>
                <div className="text-center mb-4">
                    <span style={{ fontSize: "3rem" }}>📝</span>
                    <h3 className="fw-bold mt-2">Citizen Registration</h3>
                    <p className="text-muted small">Join the community to report issues</p>
                </div>

                {error && (
                    <div className="alert alert-danger shadow-sm shake-animation" role="alert">
                        {error}
                    </div>
                )}
                <form onSubmit={handleRegister}>
                    <div className="mb-3">
                        <label className="form-label small fw-bold text-muted">Username</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Choose a username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label small fw-bold text-muted">Password</label>
                            <input
                                type="password"
                                className="form-control"
                                placeholder="Create password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label small fw-bold text-muted">Confirm</label>
                            <input
                                type="password"
                                className="form-control"
                                placeholder="Confirm password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="form-label small fw-bold text-muted">Phone Number</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="+919876543210"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            required
                        />
                        <div className="form-text small">Format: +CountryCode followed by number</div>
                    </div>
                    <button className="btn btn-success w-100 mb-3 shadow-sm verify-btn" type="submit" style={{ background: "linear-gradient(to right, #11998e, #38ef7d)", border: "none" }}>
                        Create Account
                    </button>

                    <div className="text-center border-top pt-3">
                        <p className="small text-muted mb-1">Already have an account?</p>
                        <a href="/login" className="text-decoration-none fw-bold" style={{ color: "var(--primary)" }}>
                            Login Here
                        </a>
                        <div className="mt-2 text-muted small">
                            Are you an Officer? <a href="/register/officer" className="text-decoration-none">Register here</a>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default RegisterCitizen;