import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Alert, Button, Form, Spinner } from "react-bootstrap";
import AIFormAssistant from "../../components/AIFormAssistant";
import AIChatbot from "../../components/AIChatbot";
import api from "../../services/api/axios";
import "leaflet/dist/leaflet.css";
import "animate.css";
// Removed ReportIssue.css dependency in favor of global styles

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
        address: "",
        latitude: "",
        longitude: "",
        department: "",
        photo: null,
    });
    const [severity, setSeverity] = useState("");
    const [predictedDepartment, setPredictedDepartment] = useState("");
    const [message, setMessage] = useState({ text: "", type: "" });
    const [isLoading, setIsLoading] = useState(false); // AI loading
    const [loading, setLoading] = useState(false); // Submit loading
    const [csrfToken, setCsrfToken] = useState("");
    const [mapCenter, setMapCenter] = useState([17.385044, 78.486671]); // Default: Hyderabad

    useEffect(() => {
        const initialize = async () => {
            try {
                const csrfResponse = await api.get("/api/auth/get-csrf/", { withCredentials: true });
                setCsrfToken(csrfResponse.data.csrfToken);
            } catch (err) {
                console.error("Initialization Error:", err);
            }
        };
        initialize();
    }, []);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === "photo") {
            setForm((prev) => ({ ...prev, photo: files[0] }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleVoiceInput = async (userText, inputLang = "en") => {
        if (!userText) return;
        setIsLoading(true);

        try {
            // Send the raw text to the refinement endpoint. 
            // The backend prompt will handle structured conversion and language cleanup.
            const { data } = await api.post("/api/refine-description/", { text: userText });
            console.log("AI Raw Data:", data.refined);

            let parsed;
            try {
                parsed = JSON.parse(data.refined);
            } catch (e) {
                // If AI returns plain text instead of JSON, use it as description
                parsed = {
                    title: userText.split(/[.!?]/)[0].substring(0, 50),
                    description: data.refined,
                    urgency: "Normal"
                };
            }

            setForm((prev) => ({
                ...prev,
                title: parsed.title || prev.title,
                description: parsed.description || prev.description,
            }));

            if (parsed.error) {
                setMessage({ text: `⚠️ AI refinement partially failed: ${parsed.error}`, type: "warning" });
            } else {
                setMessage({ text: "✨ AI has refined and expanded your report!", type: "success" });
            }
        } catch (err) {
            console.error("AI processing error:", err);
            setMessage({ text: "❌ AI processing failed.", type: "error" });
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
            },
            (err) => setMessage({ text: "❌ Failed to get location.", type: "error" })
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: "", type: "" });

        try {
            const formData = new FormData();
            formData.append("title", form.title.trim());
            formData.append("description", form.description.trim());
            formData.append("address", form.address.trim());
            formData.append("latitude", form.latitude ? parseFloat(form.latitude) : "");
            formData.append("longitude", form.longitude ? parseFloat(form.longitude) : "");
            if (form.photo) formData.append("photo", form.photo);

            // Classification Step
            const classification = await api.post("/api/classify-issue/", {
                description: form.description.trim(),
                latitude: form.latitude,
                longitude: form.longitude,
            });

            if (!classification.data.department) throw new Error("AI classification failed");

            formData.append("category", classification.data.department);
            formData.append("severity", classification.data.severity);
            setSeverity(classification.data.severity);
            setPredictedDepartment(classification.data.department);

            const response = await api.post("/api/issues/submit/", formData, {
                headers: { "X-CSRFToken": csrfToken },
            });

            if (response.data.is_duplicate) {
                setMessage({
                    text: `⚠️ Duplicate of issue #${response.data.original_issue_id}. Upvoted instead!`,
                    type: "warning",
                });
            } else {
                setMessage({
                    text: `✅ Submitted! Severity: ${classification.data.severity}, Dept: ${classification.data.department}`,
                    type: "success",
                });
                // Reset form
                setForm({
                    title: "",
                    description: "",
                    address: "",
                    latitude: "",
                    longitude: "",
                    department: "",
                    photo: null,
                });
            }
        } catch (err) {
            console.error("Submission Error:", err);
            setMessage({ text: "❌ Failed to submit issue.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container py-5 animate__animated animate__fadeIn">
            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <div className="glass-panel p-4 p-md-5">
                        <div className="text-center mb-4">
                            <h2 className="fw-bold mb-2">Report an Issue</h2>
                            <p className="text-muted">Use AI assistance or fill manually to make your city better.</p>
                        </div>

                        <AIFormAssistant handleVoiceInput={handleVoiceInput} />

                        {message.text && (
                            <Alert variant={message.type} className="animate__animated animate__shakeX">
                                {message.text}
                            </Alert>
                        )}

                        <Form onSubmit={handleSubmit} className="mt-4">
                            <Form.Group className="mb-4">
                                <Form.Label className="fw-bold text-secondary">Issue Title</Form.Label>
                                <Form.Control
                                    name="title"
                                    placeholder="e.g., Pothole on Main St"
                                    value={form.title}
                                    onChange={handleChange}
                                    disabled={isLoading || loading}
                                    required
                                    className="shadow-sm"
                                />
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label className="fw-bold text-secondary">Description</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    name="description"
                                    placeholder="Describe the issue in detail..."
                                    value={form.description}
                                    onChange={handleChange}
                                    disabled={isLoading || loading}
                                    rows={4}
                                    required
                                    className="shadow-sm"
                                />
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label className="fw-bold text-secondary">Address (Mandatory)</Form.Label>
                                <Form.Control
                                    name="address"
                                    placeholder="Enter the location address"
                                    value={form.address}
                                    onChange={handleChange}
                                    disabled={isLoading || loading}
                                    required
                                    className="shadow-sm"
                                />
                            </Form.Group>

                            <div className="mb-4">
                                <Form.Label className="fw-bold text-secondary">Location on Map (Optional)</Form.Label>
                                <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: '12px' }}>
                                    <div style={{ height: '300px', position: 'relative' }}>
                                        <MapContainer
                                            center={mapCenter}
                                            zoom={13}
                                            style={{ height: "100%", width: "100%" }}
                                            zoomControl={false}
                                        >
                                            <TileLayer
                                                attribution='&copy; OpenStreetMap'
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                            <LocationSelector setForm={setForm} form={form} />
                                        </MapContainer>
                                        <Button
                                            variant="light"
                                            size="sm"
                                            className="position-absolute bottom-0 end-0 m-2 shadow-sm"
                                            style={{ zIndex: 1000 }}
                                            onClick={getLocation}
                                        >
                                            📍 My Location
                                        </Button>
                                    </div>
                                    <div className="p-2 bg-light d-flex gap-2">
                                        <Form.Control size="sm" placeholder="Lat" value={form.latitude} readOnly />
                                        <Form.Control size="sm" placeholder="Lng" value={form.longitude} readOnly />
                                    </div>
                                </div>
                            </div>

                            <Form.Group className="mb-4">
                                <Form.Label className="fw-bold text-secondary">Evidence (Photo)</Form.Label>
                                <div className="p-4 border-2 border-dashed text-center rounded bg-light" style={{ borderColor: '#ccc', borderStyle: 'dashed' }}>
                                    <input
                                        type="file"
                                        name="photo"
                                        accept="image/*"
                                        onChange={handleChange}
                                        className="d-none"
                                        id="photo-upload"
                                    />
                                    <label htmlFor="photo-upload" className="cursor-pointer w-100 h-100 d-block">
                                        <div className="fs-3 mb-2">📸</div>
                                        <span className="text-primary fw-bold">Click to Upload Photo</span>
                                        {form.photo && <div className="mt-2 text-success small">Selected: {form.photo.name}</div>}
                                    </label>
                                </div>
                            </Form.Group>

                            {/* Predictions Preview */}
                            {(predictedDepartment || severity) && (
                                <div className="alert alert-info d-flex justify-content-between align-items-center animate__animated animate__fadeIn">
                                    <span>
                                        <strong>AI Prediction:</strong> {predictedDepartment} • {severity} Severity
                                    </span>
                                </div>
                            )}

                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                className="w-100 shadow-lg"
                                disabled={isLoading || loading}
                            >
                                {loading ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Submitting...
                                    </>
                                ) : (
                                    "Submit Report"
                                )}
                            </Button>
                        </Form>
                    </div>
                </div>
            </div>
            <AIChatbot setForm={setForm} />
        </div>
    );
}

export default ReportIssue;