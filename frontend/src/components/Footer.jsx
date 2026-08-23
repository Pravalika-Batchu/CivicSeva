import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { FaGithub, FaTwitter, FaLinkedin, FaHeart, FaMapMarkerAlt, FaEnvelope, FaPhoneAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer style={{
            background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
            color: '#cbd5e1',
            paddingTop: '5rem',
            paddingBottom: '2rem',
            marginTop: 'auto',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Subtle background glow */}
            <div style={{
                position: 'absolute',
                top: '-100px',
                right: '-100px',
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
                zIndex: 0
            }} />

            <Container style={{ position: 'relative', zIndex: 1 }}>
                <Row className="gy-5">
                    <Col lg={4} className="pe-lg-5">
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <div style={{
                                width: '40px',
                                height: '40px',
                                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem',
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
                            }}>
                                🌍
                            </div>
                            <span className="h3 fw-bold mb-0" style={{
                                background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                letterSpacing: '-0.5px'
                            }}>
                                CivicSeva
                            </span>
                        </div>
                        <p className="mb-4 lh-lg" style={{ color: '#94a3b8', fontSize: '1.05rem' }}>
                            Transforming urban governance through citizen empowerment.
                            Report issues, monitor resolutions, and build a smarter city with AI-powered insights.
                        </p>
                        <div className="d-flex gap-3 mt-4">
                            <a href="https://github.com/Pravalika-Batchu/CivicSeva" target="_blank" rel="noopener noreferrer" className="social-btn"><FaGithub /></a>
                            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-btn"><FaTwitter /></a>
                            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-btn"><FaLinkedin /></a>
                        </div>
                    </Col>

                    <Col sm={6} lg={2}>
                        <h6 className="text-white fw-bold mb-4 text-uppercase small tracking-widest">Platform</h6>
                        <ul className="list-unstyled footer-links">
                            <li><Link to="/">Home Dashboard</Link></li>
                            <li><Link to="/reports">Public Feed</Link></li>
                            <li><Link to="/issue-map">Interactive Map</Link></li>
                            <li><Link to="/leaderboard">Leaderboard</Link></li>
                        </ul>
                    </Col>

                    <Col sm={6} lg={2}>
                        <h6 className="text-white fw-bold mb-4 text-uppercase small tracking-widest">Community</h6>
                        <ul className="list-unstyled footer-links">
                            <li><Link to="/register/citizen">Become a Citizen</Link></li>
                            <li><Link to="/register/employee">Employee Portal</Link></li>
                            <li><Link to="/register/officer">Officer Portal</Link></li>
                            <li><Link to="/profile">My Contributions</Link></li>
                        </ul>
                    </Col>

                    <Col lg={4}>
                        <h6 className="text-white fw-bold mb-4 text-uppercase small tracking-widest">Get in Touch</h6>
                        <div className="d-flex flex-column gap-3">
                            <div className="d-flex align-items-center gap-3 contact-item">
                                <div className="contact-icon"><FaMapMarkerAlt /></div>
                                <span>Hyderabad, Telangana</span>
                            </div>
                            <div className="d-flex align-items-center gap-3 contact-item">
                                <div className="contact-icon"><FaEnvelope /></div>
                                <span>civic@gmail.com</span>
                            </div>
                            <div className="d-flex align-items-center gap-3 contact-item">
                                <div className="contact-icon"><FaPhoneAlt /></div>
                                <span>+91 83095 95272</span>
                            </div>
                        </div>
                    </Col>
                </Row>

                <div className="footer-bottom-border" />

                <Row className="align-items-center py-4">
                    <Col md={6} className="text-center text-md-start mb-3 mb-md-0">
                        <p className="mb-0 small" style={{ color: '#64748b' }}>
                            &copy; {new Date().getFullYear()} CivicSeva. Built for the future of urban excellence.
                        </p>
                    </Col>
                    <Col md={6} className="text-center text-md-end">
                        <p className="mb-0 small d-flex align-items-center justify-content-center justify-content-md-end gap-1" style={{ color: '#64748b' }}>
                            Crafted with <FaHeart className="text-danger" /> by <span className="text-white">Team CivicSeva</span>
                        </p>
                    </Col>
                </Row>
            </Container>

            <style>
                {`
                    .footer-links li { margin-bottom: 0.75rem; }
                    .footer-links a { 
                        color: #94a3b8; 
                        text-decoration: none; 
                        transition: all 0.2s ease;
                        font-size: 0.95rem;
                    }
                    .footer-links a:hover { 
                        color: #fff !important; 
                        padding-left: 5px;
                    }
                    .social-btn {
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        background: rgba(255, 255, 255, 0.05);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #94a3b8;
                        text-decoration: none;
                        transition: all 0.3s ease;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    .social-btn:hover {
                        background: rgba(99, 102, 241, 0.2);
                        color: #fff;
                        transform: translateY(-3px);
                        border-color: #6366f1;
                    }
                    .contact-item {
                        color: #94a3b8;
                        font-size: 0.95rem;
                    }
                    .contact-icon {
                        color: #6366f1;
                        font-size: 1.1rem;
                    }
                    .footer-bottom-border {
                        height: 1px;
                        background: linear-gradient(to right, transparent, rgba(255,255,255,0.05), transparent);
                        margin-top: 4rem;
                        margin-bottom: 1rem;
                    }
                    .tracking-widest { letter-spacing: 0.15em; }
                `}
            </style>
        </footer>
    );
};

export default Footer;
