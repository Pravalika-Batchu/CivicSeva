import { useEffect, useState } from "react";
import api from "../../services/api/axios";
import { useAuth } from "../../contexts/AuthContext";

function Leaderboard() {
    const [officersLeaderboard, setOfficersLeaderboard] = useState([]);
    const [citizensLeaderboard, setCitizensLeaderboard] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch leaderboard
                const leaderboardRes = await api.get("/api/leaderboard/", {
                    withCredentials: true,
                });
                if (mounted) {
                    console.log("Leaderboard response:", leaderboardRes.data);
                    // Filter departments with points > 0
                    const filteredOfficers = (leaderboardRes.data.department_leaderboard || [])
                        .filter(dept => dept.total_points > 0);
                    // Filter citizens with points > 0
                    const filteredCitizens = (leaderboardRes.data.citizen_leaderboard || [])
                        .filter(citizen => citizen.points > 0);

                    setOfficersLeaderboard(filteredOfficers);
                    setCitizensLeaderboard(filteredCitizens);

                    if (filteredCitizens.length > 0 && !filteredCitizens[0].hasOwnProperty('points')) {
                        console.warn("Points not included in citizen leaderboard response.");
                    }
                }

                // Fetch current user profile
                if (user) {
                    const profileRes = await api.get("/api/profile/", {
                        withCredentials: true,
                    });
                    if (mounted) {
                        console.log("Profile response:", profileRes.data);
                        setCurrentUser(profileRes.data);
                    }
                } else {
                    console.warn("No user found in AuthContext");
                }
            } catch (err) {
                if (mounted) {
                    console.error("Fetch error:", err.response?.data);
                    setError(err.response?.data?.error || "Failed to load leaderboard");
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchData();

        return () => {
            mounted = false;
        };
    }, [user]);

    // Calculate motivational suggestions based on points
    const getMotivationalMessage = (userData, leaderboardType) => {
        if (!userData) return "Log in to see your progress!";

        const { points = 0, department } = userData; // Removed solved_count

        if (leaderboardType === "citizen") {
            const topCitizen = citizensLeaderboard[0] || { points: 0 };
            if (points === 0) {
                return "Submit or resolve an issue to start earning points!";
            } else if (points < topCitizen.points) {
                const pointsBehind = topCitizen.points - points;
                return `Earn ${pointsBehind} more points to overtake the #1 citizen!`;
            } else {
                return "You're the top citizen! Keep earning points to stay #1!";
            }
        } else if (leaderboardType === "officer") {
            const userDept = officersLeaderboard.find(
                (dept) => dept.department === department
            );
            if (!userDept) return "Resolve issues to get your department on the leaderboard!";
            const topDept = officersLeaderboard[0] || { total_points: 0 };
            if (userDept.rank === 1) {
                return "Your department is #1! Keep earning points to stay on top!";
            }
            const pointsBehind = topDept.total_points - userDept.total_points;
            return `Earn ${pointsBehind} more points to overtake the #1 department!`;
        }
        return "";
    };

    // Get current user's position in leaderboard
    const getUserPosition = (leaderboard, userKey, userValue) => {
        const position = leaderboard.findIndex(item => item[userKey] === userValue) + 1;
        return position > 0 ? position : "Not ranked yet";
    };

    return (
        <div className="container mt-4">
            <h2 className="text-center mb-4">🏆 Leaderboards</h2>
            {loading && <div className="text-center">Loading...</div>}
            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {/* Officers Leaderboard */}
            <div className="card shadow-sm mb-5">
                <div className="card-header bg-primary text-white">
                    🏢 Top Departments (Officers)
                </div>
                <div className="card-body p-0">
                    <table className="table table-striped mb-0">
                        <thead className="table-dark">
                            <tr>
                                <th>Rank</th>
                                <th>Department</th>
                                <th>Issues Resolved</th>
                                <th>Total Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {officersLeaderboard.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center">
                                        No departments with points yet
                                    </td>
                                </tr>
                            ) : (
                                officersLeaderboard.map((dept) => (
                                    <tr
                                        key={dept.rank}
                                        className={
                                            currentUser?.department === dept.department
                                                ? "table-info fw-bold"
                                                : ""
                                        }
                                    >
                                        <td>{dept.rank}</td>
                                        <td>{dept.department}</td>
                                        <td>{dept.issues_resolved}</td>
                                        <td>{dept.total_points}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {currentUser?.role === "DEPT_OFFICER" && (
                    <div className="card-footer bg-light">
                        <p className="text-muted mb-0">
                            <strong>Your Department Rank:</strong> #{getUserPosition(officersLeaderboard, "department", currentUser.department)} |
                            <strong>Points:</strong> {currentUser.points || 0} |
                            {getMotivationalMessage(currentUser, "officer")}
                        </p>
                    </div>
                )}
            </div>

            {/* Citizens Leaderboard */}
            <div className="card shadow-sm">
                <div className="card-header bg-success text-white">
                    👥 Top Citizens
                </div>
                <div className="card-body p-0">
                    <table className="table table-striped mb-0">
                        <thead className="table-dark">
                            <tr>
                                <th>Rank</th>
                                <th>Username</th>
                                <th>Issues Resolved</th>
                                <th>Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {citizensLeaderboard.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center">
                                        No citizens with points yet
                                    </td>
                                </tr>
                            ) : (
                                citizensLeaderboard.map((citizen, i) => {
                                    const rank = i + 1;
                                    const isCurrentUser = currentUser?.username === citizen.username;
                                    return (
                                        <tr
                                            key={citizen.id || rank}
                                            className={isCurrentUser ? "table-info fw-bold" : ""}
                                        >
                                            <td>{rank}</td>
                                            <td>{citizen.username}</td>
                                            <td>{citizen.issues_resolved}</td>
                                            <td>{citizen.points}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {currentUser?.role === "CITIZEN" && (
                    <div className="card-footer bg-light">
                        <p className="text-muted mb-0">
                            <strong>Your Rank:</strong> #{getUserPosition(citizensLeaderboard, "username", currentUser.username)} |
                            <strong>Points:</strong> {currentUser.points || 0} |
                            {getMotivationalMessage(currentUser, "citizen")}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Leaderboard;