import { useState, useEffect } from "react";
import api from "../../services/api/axios";

function ReassignIssues() {
    const [issues, setIssues] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState("");

    useEffect(() => {
        api.get("/api/issues/").then((res) => setIssues(res.data));
        api.get("/api/departments/").then((res) => setDepartments(res.data));
    }, []);

    const handleReassign = async (issueId) => {
        if (!selectedDept) return alert("Select a department first!");
        try {
            await api.post(`/api/issues/reassign/${issueId}/`, {
                department: selectedDept,
            });
            alert("Issue reassigned successfully!");
        } catch {
            alert("Failed to reassign issue");
        }
    };

    return (
        <div className="container mt-4">
            <h2>🔄 Reassign Issues</h2>
            <table className="table table-bordered mt-3">
                <thead className="table-dark">
                    <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Current Dept</th>
                        <th>Reassign To</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {issues.map((issue) => (
                        <tr key={issue.id}>
                            <td>{issue.id}</td>
                            <td>{issue.title}</td>
                            <td>{issue.department_name || "None"}</td>
                            <td>
                                <select
                                    className="form-select"
                                    onChange={(e) => setSelectedDept(e.target.value)}
                                >
                                    <option value="">Select</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.name}>{d.name}</option>
                                    ))}
                                </select>
                            </td>
                            <td>
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleReassign(issue.id)}
                                >
                                    Reassign
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ReassignIssues;
