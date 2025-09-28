import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api/axios";
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import "./OfficerStatistics.css";

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function OfficerStatistics() {
    const [stats, setStats] = useState({
        total: 0,
        solved: 0,
        pending: 0,
        in_progress: 0,
        severity_high: 0,
        severity_medium: 0,
        severity_low: 0,
    });
    const [message, setMessage] = useState({ text: "", type: "" });
    const navigate = useNavigate();
    const accessToken = localStorage.getItem("access");
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        const fetchStats = async () => {
            if (!accessToken) {
                setMessage({
                    text: "❌ Please log in to view statistics.",
                    type: "error",
                });
                navigate("/login");
                return;
            }

            try {
                const res = await api.get("/api/department-statistics/", {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                setStats(res.data);
            } catch (err) {
                console.error("Fetch Stats Error:", err);
                if (err.response?.status === 401) {
                    setMessage({
                        text: "❌ Session expired or unauthorized. Please log in again.",
                        type: "error",
                    });
                    localStorage.removeItem("access");
                    localStorage.removeItem("refresh");
                    navigate("/login");
                } else {
                    setMessage({
                        text: "❌ Failed to fetch statistics.",
                        type: "error",
                    });
                }
            }
        };

        fetchStats();
    }, [accessToken, navigate]);

    useEffect(() => {
        if (chartRef.current) {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }

            chartInstanceRef.current = new Chart(chartRef.current, {
                type: "bar",
                data: {
                    labels: ["Total", "Solved", "Pending", "In Progress", "High Severity", "Medium Severity", "Low Severity"],
                    datasets: [
                        {
                            label: "Issues",
                            data: [
                                stats.total,
                                stats.solved,
                                stats.pending,
                                stats.in_progress,
                                stats.severity_high,
                                stats.severity_medium,
                                stats.severity_low
                            ],
                            backgroundColor: [
                                "#007bff",
                                "#28a745",
                                "#ffc107",
                                "#17a2b8",
                                "#dc3545",
                                "#fd7e14",
                                "#6c757d"
                            ],
                            borderColor: [
                                "#005bb5",
                                "#1e7e34",
                                "#e0a800",
                                "#117a8b",
                                "#c82333",
                                "#d86f12",
                                "#5a6268"
                            ],
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            titleFont: { family: "Inter", size: 14 },
                            bodyFont: { family: "Inter", size: 12 }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { font: { family: "Inter", size: 12 } }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: "#e9ecef" },
                            ticks: { font: { family: "Inter", size: 12 } }
                        }
                    }
                }
            });
        }

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [stats]);

    return (
        <div className="container mt-4">
            <h2 className="statistics-header">📊 Department Statistics</h2>

            {message.text && (
                <div
                    className={`alert ${message.type === "success" ? "alert-success" : "alert-danger"}`}
                    role="alert"
                >
                    {message.text}
                </div>
            )}

            <div className="row mb-4">
                <div className="col-md-6">
                    <ul className="list-group shadow-sm">
                        <li className="list-group-item d-flex justify-content-between align-items-center">
                            <span>Total Issues</span>
                            <span className="fw-bold text-primary">{stats.total}</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between align-items-center">
                            <span>Solved Issues</span>
                            <span className="fw-bold text-success">{stats.solved}</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between align-items-center">
                            <span>Pending Issues</span>
                            <span className="fw-bold text-warning">{stats.pending}</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between align-items-center">
                            <span>In Progress</span>
                            <span className="fw-bold text-info">{stats.in_progress}</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between align-items-center">
                            <span>High Severity</span>
                            <span className="fw-bold text-danger">{stats.severity_high}</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between align-items-center">
                            <span>Medium Severity</span>
                            <span className="fw-bold text-warning">{stats.severity_medium}</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between align-items-center">
                            <span>Low Severity</span>
                            <span className="fw-bold text-secondary">{stats.severity_low}</span>
                        </li>
                    </ul>
                </div>
                <div className="col-md-6">
                    <div className="chart-container">
                        <canvas id="statsChart" ref={chartRef}></canvas>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OfficerStatistics;