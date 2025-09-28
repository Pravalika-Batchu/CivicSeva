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
        <div className="container mt-5" style={{ maxWidth: "400px" }}>
            <h3 className="text-center">🔑 Login</h3>
            <form onSubmit={handleLogin}>
                <input
                    type="text"
                    className="form-control mb-2"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input
                    type="password"
                    className="form-control mb-2"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button className="btn btn-primary w-100">Login</button>
            </form>
        </div>
    );
}

export default Login;
