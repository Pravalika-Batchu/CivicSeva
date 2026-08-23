import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api/axios";
import { Container, Button, Spinner, Alert } from "react-bootstrap";
import { FaArrowLeft } from "react-icons/fa";
import CivicIntelligenceCard from "../../components/CivicIntelligenceCard";
import ResolutionEvidenceCard from "../../components/ResolutionEvidenceCard";
import "./ViewResolution.css";

function ViewResolution() {
    const { id } = useParams();
    const [issue, setIssue] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState({ text: "", type: "" });
    const accessToken = localStorage.getItem("access");
    const navigate = useNavigate();

    const fetchIssue = async () => {
        if (!accessToken) {
            setMessage({
                text: "❌ Please log in to view resolution details.",
                type: "danger",
            });
            navigate("/login");
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.get(`/api/issues/${id}/`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            setIssue(response.data);
        } catch (err) {
            console.error("Error fetching issue:", err);
            setMessage({
                text: `❌ Failed to load resolution: ${err.response?.data?.error || "Unknown error"}`,
                type: "danger",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchIssue();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, accessToken, navigate]);

    return (
        <Container className="py-5" style={{ minHeight: '85vh' }}>
            <Button 
                variant="link" 
                className="text-decoration-none text-muted mb-4 p-0 fw-bold hover-start" 
                onClick={() => navigate(-1)}
            >
                <FaArrowLeft className="me-2" />Back
            </Button>

            {message.text && (
                <Alert variant={message.type} className="mb-4 shadow-sm animate__animated animate__fadeIn">
                    {message.text}
                </Alert>
            )}

            {isLoading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : issue ? (
                <div>
                    {/* Feature 3: Resolution Evidence & Verification Gate */}
                    <ResolutionEvidenceCard 
                        issue={issue} 
                        onStatusUpdate={() => fetchIssue()} 
                    />

                    {/* Feature 1: Civic Intelligence Card */}
                    <CivicIntelligenceCard issue={issue} />
                </div>
            ) : (
                <div className="alert alert-secondary text-center">Issue not found.</div>
            )}
        </Container>
    );
}

export default ViewResolution;