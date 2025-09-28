import { useState, useEffect } from "react";
import api from "../../services/api/axios";

function ManageDepartments() {
    const [departments, setDepartments] = useState([]);
    const [name, setName] = useState("");

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = () => {
        api.get("/api/departments/").then((res) => setDepartments(res.data));
    };

    const addDepartment = async (e) => {
        e.preventDefault();
        try {
            await api.post("/api/departments/", { name }); // You may need to enable POST in backend
            setName("");
            fetchDepartments();
        } catch {
            alert("Failed to add department");
        }
    };

    return (
        <div className="container mt-4">
            <h2>🏢 Manage Departments</h2>
            <form onSubmit={addDepartment} className="d-flex mb-3">
                <input
                    type="text"
                    className="form-control me-2"
                    placeholder="Department Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <button className="btn btn-success">Add</button>
            </form>
            <ul className="list-group">
                {departments.map((d) => (
                    <li key={d.id} className="list-group-item">{d.name}</li>
                ))}
            </ul>
        </div>
    );
}

export default ManageDepartments;
