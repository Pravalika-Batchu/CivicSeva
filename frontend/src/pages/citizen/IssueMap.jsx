import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, ScaleControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from "../../services/api/axios";
import { Link } from "react-router-dom";
import './IssueMap.css';

// // Fix for default marker icons in Leaflet (commented out as CircleMarker is used)
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//     iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
//     iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
//     shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
// });

const getCircleColor = (severity) => {
    const normalizedSeverity = severity?.toLowerCase()?.trim();
    const validSeverities = ['high', 'medium', 'low'];
    const severityKey = validSeverities.includes(normalizedSeverity)
        ? severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase()
        : 'Low';
    return {
        High: '#ef4444',  // Red
        Medium: '#f97316', // Orange
        Low: '#22c55e',   // Green
    }[severityKey] || '#22c55e'; // Default to Green for invalid
};

// Component to force map invalidation
function MapInvalidator() {
    const map = useMap();
    useEffect(() => {
        map.invalidateSize();
        const handleResize = () => map.invalidateSize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [map]);
    return null;
}

function IssueMap() {
    const [userLocation, setUserLocation] = useState(null);
    const [nearbyIssues, setNearbyIssues] = useState([]);
    const [aiSummary, setAiSummary] = useState({ summary: "", precautions: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
    const accessToken = localStorage.getItem("access");

    const fetchNearbyIssues = useCallback(async (lat, lng) => {
        try {
            console.log("Access token:", accessToken);
            const response = await api.get(`/api/nearby-issues/?lat=${lat}&lng=${lng}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const { issues, summary, precautions } = response.data;
            console.log("API Response - Nearby issues:", issues);
            console.log("API Response - Summary:", summary);
            console.log("API Response - Precautions:", precautions);

            const validIssues = (issues || []).filter(issue => {
                const isValid = issue.id &&
                    typeof issue.lat === 'number' &&
                    typeof issue.lng === 'number' &&
                    !isNaN(issue.lat) && !isNaN(issue.lng) &&
                    issue.severity &&
                    issue.title &&
                    issue.description;
                if (!isValid) {
                    console.warn(`Invalid issue data skipped:`, issue);
                }
                return isValid;
            });

            console.log("Valid issues after filtering:", validIssues);
            setNearbyIssues(validIssues);
            setAiSummary({
                summary: summary || "No issues reported in your area.",
                precautions: precautions || ["Stay alert for any emerging issues."]
            });

            if (!validIssues.length) {
                console.warn("No valid issues found after filtering. Adding test marker.");
                setNearbyIssues([{ id: "test", lat, lng, severity: "Low", title: "Test Issue", description: "Test description" }]);
            }
        } catch (err) {
            console.error("Error fetching nearby issues:", {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
            setError("Failed to load nearby issues. Please check your authentication or try again later.");
            setAiSummary({
                summary: "Unable to generate summary due to an error.",
                precautions: ["Stay cautious and report any issues you encounter."]
            });
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    const fetchUserLocation = useCallback(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    if (isNaN(latitude) || isNaN(longitude)) {
                        console.error("Invalid coordinates received:", { latitude, longitude });
                        setError("Invalid location data received.");
                        setLoading(false);
                        return;
                    }
                    setUserLocation({ lat: latitude, lng: longitude });
                    console.log(`User location set: Lat=${latitude}, Lng=${longitude}`);
                    fetchNearbyIssues(latitude, longitude);
                },
                (error) => {
                    console.error("Geolocation error:", error.message, error.code);
                    setError(`Unable to get your location: ${error.message}. Please enable location services.`);
                    setLoading(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            console.error("Geolocation not supported by browser");
            setError("Geolocation is not supported by this browser.");
            setLoading(false);
        }
    }, [fetchNearbyIssues]);

    useEffect(() => {
        fetchUserLocation();
    }, [fetchUserLocation]);

    if (loading) {
        return (
            <div className="map-page">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Locating nearby issues...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="map-page">
                <div className="error">
                    <p>{error}</p>
                    <button onClick={fetchUserLocation} className="btn btn-primary">Retry Location</button>
                </div>
            </div>
        );
    }

    if (!userLocation || isNaN(userLocation.lat) || isNaN(userLocation.lng)) {
        return (
            <div className="map-page">
                <div className="error">
                    <p>Invalid location data. Please try again.</p>
                    <button onClick={fetchUserLocation} className="btn btn-primary">Retry Location</button>
                </div>
            </div>
        );
    }

    console.log("MapContainer center:", userLocation ? [userLocation.lat, userLocation.lng] : [17.401201, 78.513539]);
    console.log("Rendering nearbyIssues:", nearbyIssues);
    return (
        <div className="map-page">
            <header className="map-header">
                <h1><span className="icon">🗺️</span> Nearby Civic Issues</h1>
                <p>{nearbyIssues.length} issues found within 5km of your location</p>
            </header>
            <div className="map-content">
                <div className="sidebar">
                    <div className="summary-section">
                        <h2 onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}>
                            AI-Generated Summary
                            <span className="toggle-icon">{isSummaryExpanded ? '−' : '+'}</span>
                        </h2>
                        {isSummaryExpanded && (
                            <div className="summary-content">
                                <p>{aiSummary.summary}</p>
                            </div>
                        )}
                    </div>
                    <div className="precautions-section">
                        <h2>Precautions for Citizens</h2>
                        <ul>
                            {aiSummary.precautions.map((precaution, index) => (
                                <li key={index}>{precaution}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="legend-section">
                        <h3>Map Legend</h3>
                        <ul className="legend-list">
                            <li><span className="legend-icon high"></span> High Severity</li>
                            <li><span className="legend-icon medium"></span> Medium Severity</li>
                            <li><span className="legend-icon low"></span> Low Severity</li>
                            <li><span className="legend-icon user"></span> Your Location</li>
                        </ul>
                    </div>
                </div>
                <div className="map-wrapper">
                    <MapContainer
                        center={userLocation ? [userLocation.lat, userLocation.lng] : [17.401201, 78.513539]}
                        zoom={13}
                        style={{ height: "100%", width: "100%" }}
                        zoomControl={true}
                        preferCanvas={true}
                    >
                        {console.log("Rendering MapContainer with center:", userLocation ? [userLocation.lat, userLocation.lng] : [17.401201, 78.513539])}
                        <MapInvalidator />
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <ScaleControl position="bottomleft" />
                        {nearbyIssues.map((issue, index) => {
                            console.log(`Rendering CircleMarker ${index}:`, issue);
                            return (
                                <CircleMarker
                                    key={issue.id}
                                    center={[issue.lat, issue.lng]}
                                    radius={10}
                                    color={getCircleColor(issue.severity)}
                                    fillColor={getCircleColor(issue.severity)}
                                    fillOpacity={0.7}
                                >
                                    <Popup>
                                        <div className="popup-content">
                                            <h3>{issue.title}</h3>
                                            <p><strong>Severity:</strong> {issue.severity}</p>
                                            <p><strong>Description:</strong> {issue.description}</p>
                                            <Link to={`/issue/${issue.id}`} className="btn btn-primary">View Details</Link>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            );
                        })}
                        {userLocation && (
                            <CircleMarker
                                center={[userLocation.lat, userLocation.lng]}
                                radius={10}
                                color="#3b82f6"
                                fillColor="#3b82f6"
                                fillOpacity={0.7}
                            >
                                <Popup>
                                    <div className="popup-content">
                                        <h3>Your Location</h3>
                                        <p>Current position</p>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        )}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
}

export default IssueMap;