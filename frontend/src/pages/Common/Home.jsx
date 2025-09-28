import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
    FaClipboardList, FaUsers, FaChartLine, FaShieldAlt, FaCommentDots, FaTasks, FaBell, FaUsersCog, FaLightbulb, FaGlobeAsia, FaHandHoldingHeart
} from "react-icons/fa";
import "./LandingPage.css";
import "animate.css";

function Home() {
    // Scroll-triggered animations
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("animate__animated", "animate__fadeInUp");
                        entry.target.classList.remove("opacity-0");
                    }
                });
            },
            { threshold: 0.1 }
        );

        document.querySelectorAll(".animate-on-scroll").forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        <div className="landing-container">
            {/* Hero Section */}
            <section className="hero-section animate__animated animate__fadeIn animate__slower">
                <div className="hero-content">
                    <h1 className="hero-title">
                        <span className="title-icon">🌍</span> Civic Seva
                    </h1>
                    <p className="hero-description">
                        Empowering communities with AI-driven civic issue reporting, real-time tracking, and seamless resolution. Join us to transform your city!
                    </p>
                    <div className="hero-buttons">
                        <Link to="/login" className="hero-btn hero-btn-primary">
                            <span className="btn-icon">🔑</span> Login
                        </Link>
                        <Link to="/register/citizen" className="hero-btn hero-btn-secondary">
                            <span className="btn-icon">📝</span> Register
                        </Link>
                        <Link to="/report" className="hero-btn hero-btn-warning">
                            <span className="btn-icon">🚨</span> Report Issue
                        </Link>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="how-it-works-section animate-on-scroll opacity-0">
                <div className="section-header">
                    <h2 className="section-title">
                        <span className="title-icon">🚀</span> How It Works
                    </h2>
                </div>
                <div className="features-grid">
                    <div className="step-card">
                        <span className="step-number">1</span>
                        <FaClipboardList size={50} className="feature-icon" />
                        <h4>Report an Issue</h4>
                        <p>Submit civic issues via web or mobile with AI-powered classification and prioritization.</p>
                    </div>
                    <div className="step-card">
                        <span className="step-number">2</span>
                        <FaTasks size={50} className="feature-icon" />
                        <h4>Department Action</h4>
                        <p>Departments receive prioritized tasks and collaborate to resolve issues efficiently.</p>
                    </div>
                    <div className="step-card">
                        <span className="step-number">3</span>
                        <FaBell size={50} className="feature-icon" />
                        <h4>Get Notified</h4>
                        <p>Receive WhatsApp updates for high-severity issues in real-time.</p>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section animate-on-scroll opacity-0">
                <div className="section-header">
                    <h2 className="section-title">
                        <span className="title-icon">🌟</span> Our Features
                    </h2>
                </div>
                <div className="features-grid">
                    <div className="feature-card">
                        <FaClipboardList size={50} className="feature-icon" />
                        <h4>Intelligent Citizen Reporting</h4>
                        <p>AI-powered issue submission via web/mobile with auto-classification, prioritization, duplicate detection, and image/document support.</p>
                    </div>
                    <div className="feature-card">
                        <FaUsers size={50} className="feature-icon" />
                        <h4>Transparent Community Engagement</h4>
                        <p>Public dashboards for real-time tracking, citizen feedback, gamified participation, and full transparency.</p>
                    </div>
                    <div className="feature-card">
                        <FaChartLine size={50} className="feature-icon" />
                        <h4>Dynamic Administrative Control</h4>
                        <p>Centralized AI dashboards with task assignment, performance insights, and role-based access for admins.</p>
                    </div>
                    <div className="feature-card">
                        <FaShieldAlt size={50} className="feature-icon" />
                        <h4>Efficient Departmental Workflow</h4>
                        <p>Dedicated portals with prioritized task queues, status updates, and inter-department collaboration.</p>
                    </div>
                    <div className="feature-card">
                        <FaCommentDots size={50} className="feature-icon" />
                        <h4>Proactive WhatsApp Communication</h4>
                        <p>Automated WhatsApp notifications for high-severity issues to keep citizens informed.</p>
                    </div>
                </div>
            </section>

            {/* Why Civic Seva Section */}
            <section className="why-civic-seva-section animate-on-scroll opacity-0">
                <div className="section-header">
                    <h2 className="section-title">
                        <span className="title-icon">🏆</span> Why Civic Seva
                    </h2>
                </div>
                <div className="why-grid">
                    <div className="why-card">
                        <FaHandHoldingHeart size={50} className="why-icon" />
                        <h4 className="why-title">Empowering Communities</h4>
                        <p className="why-description">Enable citizens to report issues easily, fostering active participation in community improvement.</p>
                    </div>
                    <div className="why-card">
                        <FaLightbulb size={50} className="why-icon" />
                        <h4 className="why-title">Innovative AI Solutions</h4>
                        <p className="why-description">Leverage AI for smart issue classification, prioritization, and efficient resolution processes.</p>
                    </div>
                    <div className="why-card">
                        <FaGlobeAsia size={50} className="why-icon" />
                        <h4 className="why-title">Transparent Governance</h4>
                        <p className="why-description">Bridge citizens and government with real-time tracking and feedback for accountable civic services.</p>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section animate-on-scroll opacity-0">
                <div className="cta-content">
                    <h2 className="cta-title">Join the Civic Seva Movement!</h2>
                    <p className="hero-description">Be a part of transforming your community. Report issues, track progress, and make a difference!</p>
                    <Link to="/register/citizen" className="cta-btn">
                        <span className="btn-icon">📝</span> Get Started Now
                    </Link>
                </div>
            </section>
        </div>
    );
}

export default Home;