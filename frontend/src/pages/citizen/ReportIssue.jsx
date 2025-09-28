import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Alert, Button, Form } from "react-bootstrap";
import AIFormAssistant from "../../components/AIFormAssistant";
import AIChatbot from "../../components/AIChatbot";
import api from "../../services/api/axios";
import "leaflet/dist/leaflet.css";
import "./ReportIssue.css";

// Fix for default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker for selected location
const locationIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

// Map click handler component
function LocationSelector({ setForm, form }) {
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            console.log("Map clicked:", { lat, lng });
            setForm((prev) => ({
                ...prev,
                latitude: lat.toString(),
                longitude: lng.toString(),
            }));
        },
    });
    return form.latitude && form.longitude ? (
        <Marker
            position={[parseFloat(form.latitude), parseFloat(form.longitude)]}
            icon={locationIcon}
        />
    ) : null;
}

function ReportIssue() {
    const [form, setForm] = useState({
        title: "",
        description: "",
        latitude: "",
        longitude: "",
        department: "",
        photo: null,
    });
    const [severity, setSeverity] = useState("");
    const [predictedDepartment, setPredictedDepartment] = useState("");
    const [message, setMessage] = useState({ text: "", type: "" });
    const [isLoading, setIsLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [csrfToken, setCsrfToken] = useState("");
    const [mapCenter, setMapCenter] = useState([17.385044, 78.486671]); // Default: Hyderabad
    const [mapSize, setMapSize] = useState({
        width: window.innerWidth,
        height: Math.min(window.innerHeight - 300, 500), // Cap height, reserve space for form
    });

    useEffect(() => {
        const initialize = async () => {
            try {
                const csrfResponse = await api.get("/api/auth/get-csrf/", { withCredentials: true });
                setCsrfToken(csrfResponse.data.csrfToken);
                const deptResponse = await api.get("/api/departments/");
                setDepartments(deptResponse.data);
                console.log("Fetched departments:", deptResponse.data);
            } catch (err) {
                console.error("Initialization Error:", err);
                setMessage({
                    text: "❌ Failed to initialize. Please refresh the page.",
                    type: "error",
                });
            }
        };
        initialize();
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setMapSize({
                width: window.innerWidth,
                height: Math.min(window.innerHeight - 300, 500), // Reserve 300px for form, cap at 500px
            });
            console.log("Window resized:", { width: window.innerWidth, height: window.innerHeight });
        };

        window.addEventListener("resize", handleResize);
        handleResize(); // Initial call
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === "photo") {
            setForm((prev) => ({ ...prev, photo: files[0] }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
        console.log("Form updated:", { [name]: files ? files[0] : value });
    };

    const handleVoiceInput = async (userText, inputLang = "en") => {
        if (!userText) return;
        setIsLoading(true);

        try {
            let englishText = userText;

            if (inputLang !== "en") {
                const translatePrompt = `You are an AI assistant. Translate the following text to English: "${userText}" Return only the translated English text.`;
                const { data } = await api.post("/api/refine-description/", { text: translatePrompt });
                englishText = data.refined || userText;
            }

            const prompt = `You are an AI assistant for civic issue reporting. Convert the following input into a structured report with:
- Title
- Detailed Description
- Urgency (24-48 hours)
- Specific details
- Contact info placeholder

Return JSON like:
{
  "title": "",
  "description": "",
  "urgency": "",
  "details": "",
  "contact": ""
}

User input: "${englishText}"`;

            const { data } = await api.post("/api/refine-description/", { text: prompt });

            let parsed;
            try {
                parsed = JSON.parse(data.refined);
            } catch (parseErr) {
                console.error("JSON Parse Error:", parseErr, "Received:", data.refined);
                setMessage({ text: "❌ Invalid AI response format. Please try again.", type: "error" });
                return;
            }

            setForm((prev) => ({
                ...prev,
                title: parsed.title || prev.title,
                description: `${parsed.description} Urgency: ${parsed.urgency} Details: ${parsed.details} Contact: ${parsed.contact}`.trim(),
            }));
        } catch (err) {
            console.error("AI Form Assistant Error:", err);
            setMessage({ text: "❌ AI processing failed. Please try again.", type: "error" });
        } finally {
            setIsLoading(false);
        }
    };

    const getLocation = () => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setForm((prev) => ({
                    ...prev,
                    latitude: latitude.toString(),
                    longitude: longitude.toString(),
                }));
                setMapCenter([latitude, longitude]);
                console.log("Geolocation set:", { latitude, longitude });
            },
            (err) => {
                console.error("Geolocation Error:", err);
                setMessage({ text: "❌ Failed to get location. Please select on map or enter manually.", type: "error" });
            }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            setMessage({ text: "❌ Title is required.", type: "error" });
            return;
        }
        if (!form.description.trim()) {
            setMessage({ text: "❌ Description is required.", type: "error" });
            return;
        }
        setLoading(true);
        setMessage({ text: "", type: "" });

        try {
            const formData = new FormData();
            formData.append("title", form.title.trim());
            formData.append("description", form.description.trim());
            formData.append("latitude", parseFloat(form.latitude) || "");
            formData.append("longitude", parseFloat(form.longitude) || "");
            if (form.photo) formData.append("photo", form.photo);

            console.log("Submitting FormData:");
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value}`);
            }

            const classification = await api.post("/api/classify-issue/", {
                description: form.description.trim(),
                latitude: form.latitude,
                longitude: form.longitude,
            });

            if (!classification.data.department || !classification.data.severity) {
                throw new Error("AI classification failed");
            }

            formData.append("category", classification.data.department);
            formData.append("severity", classification.data.severity);
            setSeverity(classification.data.severity);
            setPredictedDepartment(classification.data.department);

            const response = await api.post("/api/issues/submit/", formData, {
                headers: {
                    "X-CSRFToken": csrfToken,
                },
            });

            if (response.data.is_duplicate) {
                setMessage({
                    text: `⚠️ This issue is a duplicate of issue #${response.data.original_issue_id}. Your submission has been recorded as an upvote.`,
                    type: "warning",
                });
            } else {
                setMessage({
                    text: `✅ Issue submitted successfully! Severity: ${classification.data.severity}, Department: ${classification.data.department}`,
                    type: "success",
                });
            }

            setForm({
                title: "",
                description: "",
                latitude: "",
                longitude: "",
                department: "",
                photo: null,
            });
            setSeverity("");
            setPredictedDepartment("");
            setMapCenter([17.385044, 78.486671]);
        } catch (err) {
            console.error("Submission Error:", err);
            const errorMessage = err.response?.data || err.message || "Unknown error";
            setMessage({
                text: `❌ Failed to submit issue: ${typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage}`,
                type: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="report-issue-container">
            <h2 className="report-issue-header">📝 Report an Issue</h2>
            <AIFormAssistant handleVoiceInput={handleVoiceInput} />
            {message.text && (
                <Alert variant={message.type === "success" ? "success" : message.type === "warning" ? "warning" : "danger"} className={`alert-${message.type}`}>
                    {message.text}
                </Alert>
            )}

            <Form onSubmit={handleSubmit} className="report-issue-form">
                <Form.Group className="mb-3">
                    <Form.Label>Title *</Form.Label>
                    <Form.Control
                        name="title"
                        placeholder="Enter issue title"
                        value={form.title}
                        onChange={handleChange}
                        disabled={isLoading || loading}
                        required
                    />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>Description *</Form.Label>
                    <Form.Control
                        as="textarea"
                        name="description"
                        placeholder="Describe the issue"
                        value={form.description}
                        onChange={handleChange}
                        disabled={isLoading || loading}
                        rows={4}
                        required
                    />
                </Form.Group>
                <div className="row mb-3">
                    <div className="col-md-6">
                        <Form.Group>
                            <Form.Label>Latitude (optional)</Form.Label>
                            <Form.Control
                                type="number"
                                step="any"
                                name="latitude"
                                placeholder="Latitude"
                                value={form.latitude}
                                onChange={handleChange}
                                disabled={isLoading || loading}
                            />
                        </Form.Group>
                    </div>
                    <div className="col-md-6">
                        <Form.Group>
                            <Form.Label>Longitude (optional)</Form.Label>
                            <Form.Control
                                type="number"
                                step="any"
                                name="longitude"
                                placeholder="Longitude"
                                value={form.longitude}
                                onChange={handleChange}
                                disabled={isLoading || loading}
                            />
                        </Form.Group>
                    </div>
                </div>
                <div className="mb-3">
                    <Form.Label>Select Location on Map</Form.Label>
                    <div className="map-wrapper">
                        <MapContainer
                            center={mapCenter}
                            zoom={13}
                            style={{ height: `${mapSize.height}px`, width: `${mapSize.width}px`, borderRadius: "8px" }}
                            zoomControl={true}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <LocationSelector setForm={setForm} form={form} />
                        </MapContainer>
                    </div>
                </div>
                {predictedDepartment && (
                    <Form.Group className="mb-3">
                        <Form.Label>Predicted Department</Form.Label>
                        <Form.Control value={predictedDepartment} readOnly disabled />
                    </Form.Group>
                )}
                <Form.Group className="mb-3">
                    <Form.Label>Upload Photo (optional)</Form.Label>
                    <Form.Control
                        type="file"
                        name="photo"
                        accept="image/*"
                        onChange={handleChange}
                        disabled={isLoading || loading}
                    />
                </Form.Group>
                <div className="d-flex gap-2 mb-3">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={getLocation}
                        disabled={isLoading || loading}
                        className="action-btn"
                    >
                        📍 Use My Location
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isLoading || loading}
                        className="action-btn"
                    >
                        {loading ? "Submitting..." : "Submit"}
                    </Button>
                </div>
            </Form>

            {severity && (
                <p className="mt-2 predicted-severity">
                    <strong>Predicted Severity:</strong> {severity}
                </p>
            )}

            <AIChatbot setForm={setForm} />
        </div>
    );
}

export default ReportIssue;