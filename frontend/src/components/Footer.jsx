import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { FaGithub, FaTwitter, FaLinkedin, FaHeart } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer style={{
            background: 'linear-gradient(to right, #1a1a2e, #16213e)',
            color: '#fff',
            paddingTop: '3rem',
            paddingBottom: '1.5rem',
            marginTop: 'auto',
            borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
            <Container>
                <Row className="g-4">
                    <Col md={4} className="mb-4 mb-md-0">
                        <div className="d-flex align-items-center gap-2 mb-3">
                            <span style={{ fontSize: '1.5rem' }}>🌍</span>
                            <span className="h4 fw-bold mb-0 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
                                style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                CivicSeva
                            </span>
                        </div>
                        <p className="text-white-50">
                            Empowering citizens to report issues and track resolutions in real-time.
                            Building better communities together with AI-driven insights.
                        </p>
                    </Col>

                    <Col md={2} xs={6}>
                        <h6 className="fw-bold mb-3 text-uppercase text-white-50" style={{ letterSpacing: '1px' }}>Platform</h6>
                        <ul className="list-unstyled d-flex flex-column gap-2">
                            <li><Link to="/" className="text-white-50 text-decoration-none hover-white">Home</Link></li>
                            <li><Link to="/reports" className="text-white-50 text-decoration-none hover-white">Public Feed</Link></li>
                            <li><Link to="/issue-map" className="text-white-50 text-decoration-none hover-white">Live Map</Link></li>
                            <li><Link to="/leaderboard" className="text-white-50 text-decoration-none hover-white">Leaderboard</Link></li>
                        </ul>
                    </Col>

                    <Col md={2} xs={6}>
                        <h6 className="fw-bold mb-3 text-uppercase text-white-50" style={{ letterSpacing: '1px' }}>Resources</h6>
                        <ul className="list-unstyled d-flex flex-column gap-2">
                            <li><Link to="/risk-map" className="text-white-50 text-decoration-none hover-white">Risk Analysis</Link></li>
                            <li><Link to="/register/citizen" className="text-white-50 text-decoration-none hover-white">Join Us</Link></li>
                            <li><Link to="/login" className="text-white-50 text-decoration-none hover-white">Login</Link></li>
                        </ul>
                    </Col>

                    <Col md={4}>
                        <h6 className="fw-bold mb-3 text-uppercase text-white-50" style={{ letterSpacing: '1px' }}>Stay Connected</h6>
                        <div className="d-flex gap-3 mb-3">
                            <a href="#" className="text-white fs-5 hover-scale"><FaGithub /></a>
                            <a href="#" className="text-white fs-5 hover-scale"><FaTwitter /></a>
                            <a href="#" className="text-white fs-5 hover-scale"><FaLinkedin /></a>
                        </div>
                        <div className="p-3 rounded bg-white bg-opacity-10 backdrop-blur-sm">
                            <p className="mb-0 small text-white-50">
                                🚀 "Innovation for Public Good"
                                <br />
                                Hackathon Edition 2026
                            </p>
                        </div>
                    </Col>
                </Row>

                <hr className="my-4 border-secondary" />

                <Row className="align-items-center">
                    <Col md={6} className="text-center text-md-start mb-3 mb-md-0">
                        <small className="text-white-50">
                            &copy; {new Date().getFullYear()} CivicSeva. All rights reserved.
                        </small>
                    </Col>
                    <Col md={6} className="text-center text-md-end">
                        <small className="text-white-50">
                            Made with <FaHeart className="text-danger mx-1" /> for a Better Future
                        </small>
                    </Col>
                </Row>
            </Container>
            <style>
                {`
                    .hover-white:hover { color: #fff !important; transition: color 0.3s ease; }
                    .hover-scale:hover { transform: translateY(-3px); transition: transform 0.3s ease; }
                `}
            </style>
        </footer>
    );
};

export default Footer;
