import { useState, useEffect } from "react";
import api from "../../services/api/axios";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

function RegisterOfficer() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [departments, setDepartments] = useState([]);
    const [department, setDepartment] = useState("");
    const [error, setError] = useState("");
    const [isReady, setIsReady] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        let mounted = true;

        const fetchData = async (csrfRetries = 3) => {
            try {
                // Fetch CSRF token with retry
                let csrfToken;
                for (let i = 0; i < csrfRetries; i++) {
                    try {
                        await api.get("/api/auth/get-csrf/", { withCredentials: true });
                        csrfToken = Cookies.get("csrftoken");
                        console.log(`CSRF token attempt ${i + 1}:`, csrfToken);
                        if (csrfToken) break;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (err) {
                        console.error(`CSRF token attempt ${i + 1} failed:`, err.response?.data);
                    }
                }

                if (!csrfToken && mounted) {
                    console.warn("CSRF token not retrieved, proceeding without it (endpoint is csrf_exempt)");
                }

                // Fetch departments
                const res = await api.get("/api/departments/", { withCredentials: true });
                if (mounted) {
                    console.log("Departments response:", res.data);
                    if (!res.data || res.data.length === 0) {
                        setError("No departments available. Please contact support.");
                        setIsReady(true); // Allow form to render with error
                    } else {
                        setDepartments(res.data);
                        setIsReady(true);
                    }
                }
            } catch (err) {
                if (mounted) {
                    console.error("Fetch error:", err.response?.data);
                    setError(err.response?.data?.error || "Failed to load departments or CSRF token");
                    setIsReady(true); // Allow form to render with error
                }
            }
        };

        fetchData();

        return () => {
            mounted = false;
        };
    }, []);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");

        if (!isReady) {
            setError("Please wait for the form to load");
            return;
        }

        const csrfToken = Cookies.get("csrftoken");
        if (!csrfToken) {
            console.warn("CSRF token missing, but endpoint is csrf_exempt");
        }

        const phoneRegex = /^\+\d{10,15}$/;
        if (!phoneRegex.test(phoneNumber)) {
            setError("Phone number must be in E.164 format (e.g., +1234567890)");
            return;
        }

        if (!department) {
            setError("Please select a department");
            return;
        }

        const deptId = parseInt(department);
        if (isNaN(deptId)) {
            setError("Invalid department selected");
            return;
        }

        try {
            console.log("Submitting payload:", { username, password, department: deptId, phone_number: phoneNumber });
            const response = await api.post(
                "/api/auth/register-officer/",
                {
                    username,
                    password,
                    department: deptId,
                    phone_number: phoneNumber,
                },
                {
                    headers: {
                        "X-CSRFToken": csrfToken || "", // Include token if available
                        "Content-Type": "application/json",
                    },
                    withCredentials: true,
                }
            );

            console.log("Registration response:", response.data);
            alert("Officer registered successfully!");
            navigate("/login");
        } catch (err) {
            const errorMsg = err.response?.data?.error || "Registration failed! Please check your input.";
            console.error("Registration error:", err.response?.data);
            setError(errorMsg);
        }
    };

    return (
        <div className="container mt-5" style={{ maxWidth: "400px" }}>
            <h3 className="text-center">🏢 Officer Register</h3>
            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}
            {!isReady ? (
                <div className="alert alert-info" role="alert">
                    Loading...
                </div>
            ) : (
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
                    <select
                        className="form-select mb-2"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        required
                    >
                        <option value="">Select Department</option>
                        {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                    <button className="btn btn-info w-100" type="submit">
                        Register
                    </button>
                </form>
            )}
        </div>
    );
}

export default RegisterOfficer;