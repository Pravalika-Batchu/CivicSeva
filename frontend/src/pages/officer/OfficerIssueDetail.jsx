import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api/axios";
function OfficerIssueDetail() {
    const { id } = useParams();
    const [issue, setIssue] = useState(null);
    const [status, setStatus] = useState("");
    const [file, setFile] = useState(null);
    const [desc, setDesc] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        api.get(`/api/issues/`)
            .then((res) => {
                const found = res.data.find((i) => i.id === parseInt(id));
                setIssue(found);
                setStatus(found.status);
            })
            .catch(() => alert("Failed to load issue"));
    }, [id]);

    const handleResolution = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        if (file) formData.append("file", file);
        formData.append("description", desc);

        try {
            await api.post(`/api/issues/${id}/submit_resolution/`, formData);
            alert("Resolution submitted! Waiting for citizen approval.");
            navigate("/officer/dashboard");
        } catch {
            alert("Failed to submit resolution");
        }
    };

    return (
        <div className="container mt-4">
            {issue ? (
                <>
                    <h2>🛠 Issue #{issue.id}</h2>
                    <p><strong>Title:</strong> {issue.title}</p>
                    <p><strong>Description:</strong> {issue.description}</p>
                    <p><strong>Status:</strong> {issue.status}</p>
                    <p><strong>Citizen:</strong> {issue.citizen_username}</p>
                    {issue.file_url && (
                        <img src={issue.file_url} alt="Proof" className="img-fluid mb-3" />
                    )}

                    <form onSubmit={handleResolution} className="border p-3 rounded bg-light">
                        <h5>Submit Resolution</h5>
                        <textarea
                            className="form-control mb-2"
                            placeholder="Resolution description"
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                        />
                        <input
                            type="file"
                            className="form-control mb-2"
                            onChange={(e) => setFile(e.target.files[0])}
                        />
                        <button className="btn btn-success">Submit</button>
                    </form>
                </>
            ) : (
                <p>Loading issue...</p>
            )}
        </div>
    );
}

export default OfficerIssueDetail;
