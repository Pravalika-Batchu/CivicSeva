import { useState } from "react";
import api from "../../services/api/axios";
import { useNavigate } from "react-router-dom";

function RegisterAdmin() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");

        // Validate phone number (E.164 format)
        const phoneRegex = /^\+\d{10,15}$/;
        if (!phoneRegex.test(phoneNumber)) {
            setError("Phone number must be in E.164 format (e.g., +1234567890)");
            return;
        }

        try {
            await api.post("/api/auth/register-admin/", {
                username,
                password,
                phone_number: phoneNumber,
            });
            alert("Admin registered successfully!");
            navigate("/login");
        } catch (err) {
            const errorMsg = err.response?.data?.error || "Registration failed!";
            setError(errorMsg);
        }
    };

    return (
        <div className="container mt-5" style={{ maxWidth: "400px" }}>
            <h3 className="text-center">👑 Admin Register</h3>
            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}
            <form onSubmit={handleRegister}>
                <input
                    type="text"
                    className="form-control mb-2"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    type="password"
                    className="form-control mb-2"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <input
                    type="text"
                    className="form-control mb-2"
                    placeholder="Phone Number (e.g., +1234567890)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                />
                <button className="btn btn-danger w-100" type="submit">
                    Register
                </button>
            </form>
        </div>
    );
}

export default RegisterAdmin;