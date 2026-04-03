import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Container, Row, Col, Button, Badge } from "react-bootstrap";
import { FaBolt, FaShieldAlt, FaMagic, FaArrowRight, FaCity, FaUserFriends, FaRegCheckCircle } from "react-icons/fa";
import "animate.css";
import "./Home.css";

const Home = () => {
    const [activeFeature, setActiveFeature] = useState(0);

    const features = [
        { icon: <FaMagic />, title: "AI-Powered", desc: "Snap a pic. Our AI detects potholes, garbage, & more instantly." },
        { icon: <FaBolt />, title: "Real-Time Action", desc: "Direct line to city departments. No red tape. Just results." },
        { icon: <FaShieldAlt />, title: "Verified Trust", desc: "Verified reports ensure transparency & accountability." }
    ];

    // Simple carousel effect
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveFeature((prev) => (prev + 1) % features.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="home-container">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-bg-shapes">
                    <div className="shape-orb orb-1"></div>
                    <div className="shape-orb orb-2"></div>
                    <div className="shape-orb orb-3"></div>
                </div>

                <Container className="position-relative z-2">
                    <Row className="align-items-center">
                        <Col lg={7} className="animate__animated animate__fadeInLeft">
                            <h1 className="hero-headline">
                                Empower Citizens.<br />
                                <span className="text-gradient">Transform Cities.</span>
                            </h1>
                            <p className="hero-sub">
                                The modern platform bridging the gap between you and a better neighborhood.
                                Report issues, earn rewards, and see the change happen.
                            </p>
                            <div className="d-flex gap-3 flex-wrap justify-content-center justify-content-lg-start">
                                <Link to="/report">
                                    <button className="btn-primary-gradient shadow-lg px-5 py-3 fs-5">
                                        Start Reporting <FaArrowRight className="ms-2" />
                                    </button>
                                </Link>
                                <Link to="/issue-map">
                                    <button className="btn btn-outline-dark rounded-pill px-5 py-3 fs-5 fw-bold border-2">
                                        Explore Map
                                    </button>
                                </Link>
                            </div>
                        </Col>

                        <Col lg={5} className="animate__animated animate__fadeInRight">
                            <div className="feature-carousel-container">
                                <div className="feature-card-3d">
                                    <div className="feature-icon-lg animate__animated animate__pulse animate__infinite">
                                        {features[activeFeature].icon}
                                    </div>
                                    <h2 className="fw-bold mb-3">{features[activeFeature].title}</h2>
                                    <p className="text-muted lead">{features[activeFeature].desc}</p>

                                    <div className="d-flex justify-content-center gap-2 mt-4">
                                        {features.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`rounded-circle transition-all ${idx === activeFeature ? 'bg-primary' : 'bg-light'}`}
                                                style={{ width: '10px', height: '10px', cursor: 'pointer', transform: idx === activeFeature ? 'scale(1.5)' : 'scale(1)' }}
                                                onClick={() => setActiveFeature(idx)}
                                            ></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* Value Props Grid */}
            <section className="py-6 bg-white position-relative z-2">
                <Container className="py-5">
                    <Row className="g-4">
                        <Col md={4} className="animate__animated animate__fadeInUp">
                            <div className="gradient-card">
                                <div className="mb-4 text-primary fs-1"><FaCity /></div>
                                <h3 className="fw-bold mb-3">City-Wide Coverage</h3>
                                <p className="text-muted">From downtown to the suburbs, our network covers every street corner. No issue is too small to report.</p>
                            </div>
                        </Col>
                        <Col md={4} className="animate__animated animate__fadeInUp" style={{ animationDelay: '0.1s' }}>
                            <div className="gradient-card">
                                <div className="mb-4 text-accent fs-1"><FaMagic /></div>
                                <h3 className="fw-bold mb-3">Smart Classification</h3>
                                <p className="text-muted">Our custom AI engine instantly categorizes issues (Potholes, Garbage, Lights) so they reach the right team faster.</p>
                            </div>
                        </Col>
                        <Col md={4} className="animate__animated animate__fadeInUp" style={{ animationDelay: '0.2s' }}>
                            <div className="gradient-card">
                                <div className="mb-4 text-success fs-1"><FaUserFriends /></div>
                                <h3 className="fw-bold mb-3">Citizen Rewards</h3>
                                <p className="text-muted">Gamify your civic duty. Earn points, badges, and recognition on the leaderboard for every verified report.</p>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* How It Works Section */}
            <section className="py-6 bg-light border-top border-bottom">
                <Container className="py-5">
                    <div className="text-center mb-5">
                        <h2 className="display-5 fw-bold mb-3">How it <span className="text-gradient">Works</span></h2>
                        <p className="text-muted lead">The simple 3-step journey from reporting to resolution.</p>
                    </div>
                    <Row className="g-5">
                        {[
                            { step: "01", title: "Spot & Snap", text: "Notice a civic issue? Take a photo and let our AI handle the rest.", icon: "📸" },
                            { step: "02", title: "Track & Engage", text: "Watch your report move through departments in real-time.", icon: "📡" },
                            { step: "03", title: "Verify & Reward", text: "Confirm the fix and earn points for your contribution.", icon: "🏆" }
                        ].map((item, idx) => (
                            <Col md={4} key={idx} className="animate__animated animate__fadeInUp" style={{ animationDelay: `${idx * 0.1}s` }}>
                                <div className="step-card">
                                    <div className="step-number">{item.step}</div>
                                    <div className="step-icon">{item.icon}</div>
                                    <h4 className="fw-bold my-3">{item.title}</h4>
                                    <p className="text-muted">{item.text}</p>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </section>

            {/* Community Impact Stats (Visual icons) */}

            {/* FAQ Section */}
            <section className="py-6 bg-white">
                <Container className="py-5">
                    <div className="text-center mb-5">
                        <h2 className="display-5 fw-bold mb-3">Common <span className="text-gradient-accent">Questions</span></h2>
                    </div>
                    <Row className="justify-content-center">
                        <Col lg={8}>
                            {[
                                { q: "Is reporting an issue anonymous?", a: "While we require an account for rewards, so you can track your progress and earn badges, your identity is hidden in public maps." },
                                { q: "How fast are issues resolved?", a: "Critical issues are typically addressed within 24-48 hours. Lower severity items follow city schedules." },
                                { q: "What rewards can I earn?", a: "Earn community points redeemable for local discounts, public transport credits, and civic badges." }
                            ].map((faq, idx) => (
                                <div key={idx} className="glass-panel p-4 mb-3 border-0 shadow-sm hover-lift">
                                    <h5 className="fw-bold mb-2 text-primary">Q: {faq.q}</h5>
                                    <p className="mb-0 text-muted">{faq.a}</p>
                                </div>
                            ))}
                        </Col>
                    </Row>
                </Container>
            </section>

            {/* Final CTA */}
            <section className="py-7 bg-dark text-white text-center position-relative overflow-hidden">
                <div className="hero-bg-shapes opacity-25">
                    <div className="shape-orb orb-1" style={{ background: '#FF0080', left: '-5%' }}></div>
                    <div className="shape-orb orb-2" style={{ background: '#0061ff', right: '-5%' }}></div>
                </div>
                <Container className="position-relative z-2 py-5">
                    <h2 className="display-4 fw-bold mb-4">Start making your city <span className="text-gradient">better</span> today.</h2>
                    <p className="lead mb-5 opacity-75 mx-auto" style={{ maxWidth: '700px' }}>Join thousands of citizens who are already shaping a more efficient, responsive, and beautiful environment.</p>
                    <div className="d-flex gap-3 justify-content-center flex-wrap">
                        <Link to="/register/citizen">
                            <button className="btn-primary-gradient px-5 py-3 fs-5 shadow-lg border-0">
                                Get Started Now
                            </button>
                        </Link>
                        <Link to="/login">
                            <button className="btn btn-outline-light rounded-pill px-5 py-3 fs-5 border-2">
                                Sign In
                            </button>
                        </Link>
                    </div>
                </Container>
            </section>
        </div>
    );
};

export default Home;