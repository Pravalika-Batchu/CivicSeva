import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Form, Button, Alert } from "react-bootstrap";
import api from "../../services/api/axios";
import "./SubmitResolution.css";

function SubmitResolution() {
    const { id } = useParams(); // Issue ID from URL
    const [file, setFile] = useState(null);
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const accessToken = localStorage.getItem("access");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        console.log("Submitting resolution for issue:", id);
        console.log("Access token:", accessToken ? "Present" : "Missing");

        if (!accessToken) {
            setError("Please log in to submit a resolution.");
            setLoading(false);
            navigate("/login");
            return;
        }

        if (!file) {
            setError("⚠️ Please upload a proof file.");
            setLoading(false);
            return;
        }

        if (!description.trim()) {
            setError("⚠️ Please provide a description of the resolution.");
            setLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("description", description);

        // Debug FormData content
        for (let [key, value] of formData.entries()) {
            console.log(`FormData: ${key}=${value}`);
        }

        try {
            const response = await api.post(`/api/issues/${id}/submit_resolution/`, formData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            console.log("Resolution submission response:", response.data);
            alert("✅ Resolution submitted, waiting for reporter approval!");
            navigate("/reports");
        } catch (err) {
            console.error("Error submitting resolution:", err.response?.data || err.message);
            if (err.response?.status === 401) {
                setError("Session expired or unauthorized. Please log in again.");
                localStorage.removeItem("access");
                localStorage.removeItem("refresh");
                navigate("/login");
            } else if (err.response?.status === 403) {
                setError("You do not have permission to submit a resolution for this issue. Ensure it belongs to your department.");
            } else if (err.response?.status === 404) {
                setError("Issue not found. It may have been deleted.");
            } else {
                const errorMessage =
                    err.response?.data?.error ||
                    err.response?.data?.detail ||
                    "Failed to submit resolution. Please try again.";
                setError(`❌ ${errorMessage}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4 resolution-container">
            <h2 className="resolution-header">🛠️ Submit Resolution for Issue #{id}</h2>

            {error && <Alert variant="danger" className="alert-danger">{error}</Alert>}

            {loading && <Alert variant="info" className="alert-info">Submitting resolution...</Alert>}

            <Form onSubmit={handleSubmit} className="resolution-form">
                <Form.Group className="mb-3">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={4}
                        placeholder="Describe how you resolved the issue..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={loading}
                        className="resolution-textarea"
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Proof File</Form.Label>
                    <Form.Control
                        type="file"
                        onChange={(e) => setFile(e.target.files[0])}
                        disabled={loading}
                        accept="image/*,video/*,.pdf"
                        className="resolution-file-input"
                    />
                </Form.Group>

                <Button
                    type="submit"
                    variant="success"
                    disabled={loading}
                    className="resolution-submit-btn"
                >
                    {loading ? "Submitting..." : "✅ Submit Resolution"}
                </Button>
            </Form>
        </div>
    );
}

export default SubmitResolution;