import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function CitizenMap() {
    const [issues, setIssues] = useState([]);
    const [summary, setSummary] = useState({});
    const [precautions, setPrecautions] = useState([]);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            fetch(`/api/nearby_issues?lat=${latitude}&lng=${longitude}`)
                .then(res => res.json())
                .then(data => {
                    setIssues(data.issues);
                    setSummary(data.summary);
                    setPrecautions(data.precautions);
                });
        });
    }, []);

    return (
        <div>
            <h2>Nearby Reports</h2>
            <div>
                <h3>Summary:</h3>
                <pre>{JSON.stringify(summary, null, 2)}</pre>
            </div>
            <div>
                <h3>Precautions:</h3>
                <ul>
                    {precautions.map((p, idx) => <li key={idx}>{p}</li>)}
                </ul>
            </div>
            <MapContainer
                center={[issues[0]?.lat || 0, issues[0]?.lng || 0]}
                zoom={13}
                style={{ height: "500px", width: "100%" }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {issues.map(issue => (
                    <Marker key={issue.id} position={[issue.lat, issue.lng]}>
                        <Popup>
                            <strong>{issue.title}</strong><br />
                            {issue.description}<br />
                            Severity: {issue.severity}
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
