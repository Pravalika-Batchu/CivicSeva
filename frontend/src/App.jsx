import { Routes, Route } from "react-router-dom";
import Login from "./pages/auth/Login";
import RegisterCitizen from "./pages/auth/RegisterCitizen";
import RegisterOfficer from "./pages/auth/RegisterOfficer";
import RegisterAdmin from "./pages/auth/RegisterAdmin";
import ReportIssue from "./pages/citizen/ReportIssue";
import MyReports from "./pages/citizen/MyReports";
import Leaderboard from "./pages/citizen/Leaderboard";
import OfficerDashboard from "./pages/officer/OfficerDashboard";
import OfficerIssueDetail from "./pages/officer/OfficerIssueDetail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageDepartments from "./pages/admin/ManageDepartments";
import ReassignIssues from "./pages/admin/ReassignIssues";
import AdminReports from "./pages/admin/AdminReports";
import SubmitResolution from "./pages/Common/SubmitResolution";
import Home from "./pages/Common/Home";
import Navbar from "./components/Navbar";
import Notifications from "./pages/citizen/Notifications";
import Reports from './pages/Common/Reports';
import Profile from './pages/citizen/Profile';
import AdminNotifications from "./pages/admin/AdminNotifications";
import OfficerStatistics from "./pages/officer/OfficerStatistics";
import CivicRiskAnalysis from "./pages/citizen/RiskAnalysis";
import ViewResolution from "./pages/citizen/ViewResolution";
import IssueMap from "./pages/citizen/IssueMap";
import IssueDetail from "./pages/citizen/IssueDetail";


function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register/citizen" element={<RegisterCitizen />} />
        <Route path="/register/officer" element={<RegisterOfficer />} />
        <Route path="/register/admin" element={<RegisterAdmin />} />

        {/* Citizen */}
        <Route path="/report" element={<ReportIssue />} />
        <Route path="/my-reports" element={<MyReports />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/risk-map" element={<CivicRiskAnalysis />} />
        <Route path="/resolution" element={<ViewResolution />} />
        <Route path="/issue-map" element={<IssueMap />} />
        <Route path="/issue/:id" element={<IssueDetail />} />
        {/* Officer */}
        <Route path="/officer/dashboard" element={<OfficerDashboard />} />
        <Route path="/officer/issue/:id" element={<OfficerIssueDetail />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/officer/statistics" element={<OfficerStatistics />} />
        {/* Admin */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/departments" element={<ManageDepartments />} />
        <Route path="/admin/reassign" element={<ReassignIssues />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/notifications" element={<AdminNotifications />} />
        {/* Common */}

        <Route path="/issue/:id/resolve" element={<SubmitResolution />} />
        <Route path="/" element={<Home />} />
        <Route path="/reports" element={<Reports />} />
      </Routes >
    </>
  );
}

export default App;