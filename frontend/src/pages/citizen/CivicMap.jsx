import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
// Fix for default marker icon issue in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

const CivicMap = ({ issues, highRiskAreas, onDelete }) => {
    const [userLocation, setUserLocation] = useState([19.075983, 72.877655]); // Default Mumbai coordinates

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => setUserLocation([position.coords.latitude, position.coords.longitude]),
                (err) => console.warn("Could not get location:", err)
            );
        }
    }, []);

    const getMarkerColor = (severity) => {
        switch (severity) {
            case "HIGH":
                return "red";
            case "MEDIUM":
                return "orange";
            default:
                return "green";
        }
    };

    return (
        <MapContainer center={userLocation} zoom={13} style={{ height: "500px", width: "100%" }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* Citizen reports */}
            {issues.map((issue) => (
                <Marker key={issue.id} position={[issue.latitude, issue.longitude]}>
                    <Popup>
                        <b>{issue.category}</b>
                        <br />
                        Reported on: {new Date(issue.created_at).toLocaleDateString()}
                        <br />
                        <button
                            onClick={() => onDelete(issue.id)}
                            style={{ marginTop: "5px", cursor: "pointer" }}
                        >
                            🗑 Delete
                        </button>
                    </Popup>
                </Marker>
            ))}

            {/* High-risk areas */}
            {highRiskAreas.map((area, idx) => (
                <Circle
                    key={idx}
                    center={[area.latitude, area.longitude]}
                    radius={area.radius || 200} // meters
                    pathOptions={{ color: getMarkerColor(area.severity), fillOpacity: 0.3 }}
                />
            ))}

            {/* User location */}
            <Marker position={userLocation}>
                <Popup>You are here</Popup>
            </Marker>
        </MapContainer>
    );
};

export default CivicMap;
