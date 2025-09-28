import { useState, useEffect } from "react";
import api from "../../services/api/axios";
import { Bar } from "react-chartjs-2";
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function AdminDashboard() {
    const [issues, setIssues] = useState([]);
    const [aiSummary, setAiSummary] = useState("");
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        api.get("/api/issues/")
            .then((res) => {
                setIssues(res.data);
                generateAiSummary(res.data); // Trigger AI summary after fetching issues
            })
            .finally(() => setLoading(false));
    }, []);

    // Function to generate AI summary
    const generateAiSummary = (issuesData) => {
        setAiLoading(true);

        // Compute key stats for prompt
        const total = issuesData.length;
        const pending = issuesData.filter((i) => i.status === "PENDING").length;
        const resolved = issuesData.filter((i) => i.status === "RESOLVED").length;
        const inProgress = issuesData.filter((i) => i.status === "IN_PROGRESS").length;

        // Severity stats
        const severityStats = {
            Low: issuesData.filter((i) => i.severity === "Low").length,
            Medium: issuesData.filter((i) => i.severity === "Medium").length,
            High: issuesData.filter((i) => i.severity === "High").length,
        };

        // Dept stats including min days to resolve
        const deptStats = {};
        issuesData.forEach((i) => {
            const dept = i.department_name || "General";
            if (!deptStats[dept]) {
                deptStats[dept] = {
                    total: 0,
                    resolved: 0,
                    resolveTimes: [], // Array of days to resolve
                };
            }
            deptStats[dept].total += 1;
            if (i.status === "RESOLVED" && i.resolved_at && i.created_at) {
                deptStats[dept].resolved += 1;
                const created = new Date(i.created_at);
                const resolved = new Date(i.resolved_at);
                const days = Math.ceil((resolved - created) / (1000 * 60 * 60 * 24)); // Days difference
                deptStats[dept].resolveTimes.push(days);
            }
        });

        // Compute min days per dept
        Object.keys(deptStats).forEach((dept) => {
            const times = deptStats[dept].resolveTimes;
            deptStats[dept].minDays = times.length > 0 ? Math.min(...times) : "N/A";
            deptStats[dept].avgDays = times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : "N/A";
        });

        // Prepare prompt for AI
        const prompt = `
Summarize the following civic issues reports statistics in a concise, insightful paragraph. Include key highlights on total issues, status breakdown, severity distribution, department-wise stats (total, resolved, min days to resolve, avg days), and any notable trends.

Stats:
- Total Issues: ${total}
- Pending: ${pending}
- In Progress: ${inProgress}
- Resolved: ${resolved}
- Severity: Low (${severityStats.Low}), Medium (${severityStats.Medium}), High (${severityStats.High})

Department Stats:
${Object.entries(deptStats)
                .map(
                    ([dept, stats]) =>
                        `- ${dept}: Total ${stats.total}, Resolved ${stats.resolved}, Min Days to Resolve: ${stats.minDays}, Avg Days: ${stats.avgDays}`
                )
                .join("\n")}
`;

        // Call AI chat endpoint
        api.post("/api/ai-chat/", { message: prompt })
            .then((res) => setAiSummary(res.data.reply))
            .catch((err) => setAiSummary("Error generating AI summary. Please try again."))
            .finally(() => setAiLoading(false));
    };

    // Overall Stats
    const total = issues.length;
    const pending = issues.filter((i) => i.status === "PENDING").length;
    const resolved = issues.filter((i) => i.status === "RESOLVED").length;
    const inProgress = issues.filter((i) => i.status === "IN_PROGRESS").length;

    // Department breakdown for chart
    const deptCount = {};
    issues.forEach((i) => {
        const dept = i.department_name || "General";
        deptCount[dept] = (deptCount[dept] || 0) + 1;
    });
    const deptLabels = Object.keys(deptCount);
    const deptData = Object.values(deptCount);

    const barData = {
        labels: deptLabels,
        datasets: [
            {
                label: "Issues per Department",
                data: deptData,
                backgroundColor: "#007bff",
            },
        ],
    };

    // Severity Stats for Bar Chart
    const severityStats = {
        Low: issues.filter((i) => i.severity === "Low").length,
        Medium: issues.filter((i) => i.severity === "Medium").length,
        High: issues.filter((i) => i.severity === "High").length,
    };
    const severityBarData = {
        labels: ["Low", "Medium", "High"],
        datasets: [
            {
                label: "Issues by Severity",
                data: [severityStats.Low, severityStats.Medium, severityStats.High],
                backgroundColor: ["#28a745", "#ffc107", "#dc3545"],
            },
        ],
    };

    // Dept Statistics Table Data (including min/avg days)
    const deptTableData = {};
    issues.forEach((i) => {
        const dept = i.department_name || "General";
        if (!deptTableData[dept]) {
            deptTableData[dept] = {
                total: 0,
                resolved: 0,
                resolveTimes: [],
            };
        }
        deptTableData[dept].total += 1;
        if (i.status === "RESOLVED" && i.resolved_at && i.created_at) {
            deptTableData[dept].resolved += 1;
            const created = new Date(i.created_at);
            const resolved = new Date(i.resolved_at);
            const days = Math.ceil((resolved - created) / (1000 * 60 * 60 * 24));
            deptTableData[dept].resolveTimes.push(days);
        }
    });

    Object.keys(deptTableData).forEach((dept) => {
        const times = deptTableData[dept].resolveTimes;
        deptTableData[dept].minDays = times.length > 0 ? Math.min(...times) : "N/A";
        deptTableData[dept].avgDays = times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : "N/A";
    });

    return (
        <div className="container mt-4">
            <h2 className="mb-4">👑 Admin Dashboard</h2>
            {loading ? (
                <div className="text-center my-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <div>Loading...</div>
                </div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="row mb-4">
                        <div className="col-md-3 mb-3">
                            <div className="card shadow text-center border-primary">
                                <div className="card-body">
                                    <h6 className="text-muted">Total Issues</h6>
                                    <h3 className="text-primary">{total}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3 mb-3">
                            <div className="card shadow text-center border-warning">
                                <div className="card-body">
                                    <h6 className="text-muted">Pending</h6>
                                    <h3 className="text-warning">{pending}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3 mb-3">
                            <div className="card shadow text-center border-info">
                                <div className="card-body">
                                    <h6 className="text-muted">In Progress</h6>
                                    <h3 className="text-info">{inProgress}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3 mb-3">
                            <div className="card shadow text-center border-success">
                                <div className="card-body">
                                    <h6 className="text-muted">Resolved</h6>
                                    <h3 className="text-success">{resolved}</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Department and Severity Charts */}
                    <div className="row mb-5">
                        <div className="col-md-6">
                            <h5 className="mb-3">📊 Department-wise Issue Distribution</h5>
                            <div style={{ maxWidth: 600 }}>
                                <Bar
                                    data={barData}
                                    options={{
                                        indexAxis: "y",
                                        plugins: { legend: { display: false } },
                                        scales: { x: { beginAtZero: true } },
                                    }}
                                />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <h5 className="mb-3">📊 Severity Distribution</h5>
                            <div style={{ maxWidth: 600 }}>
                                <Bar
                                    data={severityBarData}
                                    options={{
                                        plugins: { legend: { display: false } },
                                        scales: { y: { beginAtZero: true } },
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Department Statistics Table */}
                    <div className="mb-5">
                        <h5 className="mb-3">🏛️ Department Statistics (Including Resolution Times)</h5>
                        <table className="table table-striped table-bordered">
                            <thead className="table-light">
                                <tr>
                                    <th>Department</th>
                                    <th>Total Issues</th>
                                    <th>Resolved</th>
                                    <th>Min Days to Resolve</th>
                                    <th>Avg Days to Resolve</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(deptTableData).map(([dept, stats]) => (
                                    <tr key={dept}>
                                        <td>{dept}</td>
                                        <td>{stats.total}</td>
                                        <td>{stats.resolved}</td>
                                        <td>{stats.minDays}</td>
                                        <td>{stats.avgDays}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* AI Summary Section */}
                    <div className="mb-4">
                        <h5 className="mb-3">🤖 AI Summary of Reports</h5>
                        {aiLoading ? (
                            <div className="text-center my-3">
                                <div className="spinner-border text-secondary" role="status"></div>
                                <div>Generating AI Summary...</div>
                            </div>
                        ) : (
                            <div className="card shadow">
                                <div className="card-body">
                                    <p>{aiSummary || "No summary available yet."}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default AdminDashboard;