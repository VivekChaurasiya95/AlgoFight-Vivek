import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLocationDot, faClock, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import logoIcon from '../../../assets/algofight-logo.png';
import mitsLogo from '../../../assets/mits-logo.png';
import sdcLogo from '../../../assets/sdc-logo.png';
import PublicInfoModal from '../modals/PublicInfoModal.jsx';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import './Footer.css';

export default function Footer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('about');
  
  // All collapsible sections hidden by default to keep the footer ultra-compact
  const [openSections, setOpenSections] = useState({
    platform: false,
    company: false,
    help: false,
    getInTouch: false,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleOpenModal = (tabKey) => {
    setActiveModalTab(tabKey);
    setIsModalOpen(true);
  };

  const handlePlatformNav = (path) => {
    if (user) {
      navigate(path);
    } else {
      navigate('/login');
    }
  };

  return (
    <>
      <footer className="page-footer">
        <div className="footer-container">
          {/* Top Brand & Institution Banner */}
          <div className="footer-top-bar">
            <div className="footer-brand-group">
              <div className="footer-brand-logo-wrap" onClick={() => navigate('/')}>
                <img src={logoIcon} alt="AlgoFight Logo" className="footer-logo-img" />
                <span className="footer-brand-name">AlgoFight</span>
              </div>
              <p className="footer-mission-text">
                Competitive coding arena engineered for developers who thrive under pressure and love to dominate.
              </p>
            </div>

            {/* MITS Institutional Emblem */}
            <div className="footer-institution-badge" title="Madhav Institute of Technology & Science">
              <img src={mitsLogo} alt="MITS Gwalior Logo" className="footer-mits-logo" />
            </div>
          </div>

          {/* Collapsible 4-Section Accordion Row */}
          <div className="footer-accordion-grid">
            {/* Col 1: Platform */}
            <div className={`footer-accordion-card ${openSections.platform ? 'is-expanded' : ''}`}>
              <button
                type="button"
                className="footer-accordion-btn"
                onClick={() => toggleSection('platform')}
                aria-expanded={!!openSections.platform}
                aria-controls="footer-platform-content"
              >
                <span className="footer-col-title">PLATFORM</span>
                <span className="footer-chevron-badge">
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`footer-col-chevron ${openSections.platform ? 'is-open' : ''}`}
                  />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {openSections.platform && (
                  <motion.div
                    id="footer-platform-content"
                    key="platform-content"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    className="footer-accordion-body"
                  >
                    <ul className="footer-list">
                      <li><a onClick={() => handlePlatformNav('/practice')}>Practice Arena</a></li>
                      <li><a onClick={() => handlePlatformNav('/battle')}>Battle Zone</a></li>
                      <li><a onClick={() => handlePlatformNav('/leaderboard')}>Global Leaderboard</a></li>
                      <li><a onClick={() => handlePlatformNav('/rewards')}>Season Rewards</a></li>
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Col 2: Company */}
            <div className={`footer-accordion-card ${openSections.company ? 'is-expanded' : ''}`}>
              <button
                type="button"
                className="footer-accordion-btn"
                onClick={() => toggleSection('company')}
                aria-expanded={!!openSections.company}
                aria-controls="footer-company-content"
              >
                <span className="footer-col-title">COMPANY</span>
                <span className="footer-chevron-badge">
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`footer-col-chevron ${openSections.company ? 'is-open' : ''}`}
                  />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {openSections.company && (
                  <motion.div
                    id="footer-company-content"
                    key="company-content"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    className="footer-accordion-body"
                  >
                    <ul className="footer-list">
                      <li><a onClick={() => handleOpenModal('about')}>About Us</a></li>
                      <li><a onClick={() => handleOpenModal('blog')}>DevLog & Updates</a></li>
                      <li><a onClick={() => handleOpenModal('careers')}>Careers</a></li>
                      <li><a onClick={() => navigate('/developer')}>Developers</a></li>
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Col 3: Help Center */}
            <div className={`footer-accordion-card ${openSections.help ? 'is-expanded' : ''}`}>
              <button
                type="button"
                className="footer-accordion-btn"
                onClick={() => toggleSection('help')}
                aria-expanded={!!openSections.help}
                aria-controls="footer-help-content"
              >
                <span className="footer-col-title">HELP CENTER</span>
                <span className="footer-chevron-badge">
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`footer-col-chevron ${openSections.help ? 'is-open' : ''}`}
                  />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {openSections.help && (
                  <motion.div
                    id="footer-help-content"
                    key="help-content"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    className="footer-accordion-body"
                  >
                    <ul className="footer-list">
                      <li><a onClick={() => handleOpenModal('help')}>Help Center & FAQ</a></li>
                      <li><a onClick={() => handleOpenModal('contact')}>Contact Support</a></li>
                      <li><a onClick={() => handleOpenModal('privacy')}>Privacy Policy</a></li>
                      <li><a onClick={() => handleOpenModal('terms')}>Terms of Service</a></li>
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Col 4: Get In Touch */}
            <div className={`footer-accordion-card ${openSections.getInTouch ? 'is-expanded' : ''}`}>
              <button
                type="button"
                className="footer-accordion-btn"
                onClick={() => toggleSection('getInTouch')}
                aria-expanded={!!openSections.getInTouch}
                aria-controls="footer-getintouch-content"
              >
                <span className="footer-col-title">GET IN TOUCH</span>
                <span className="footer-chevron-badge">
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`footer-col-chevron ${openSections.getInTouch ? 'is-open' : ''}`}
                  />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {openSections.getInTouch && (
                  <motion.div
                    id="footer-getintouch-content"
                    key="getintouch-content"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    className="footer-accordion-body"
                  >
                    <ul className="footer-contact-items">
                      <li>
                        <FontAwesomeIcon icon={faEnvelope} className="c-icon" />
                        <a href="mailto:supportalgofight@gmail.com" className="footer-contact-link">supportalgofight@gmail.com</a>
                      </li>
                      <li>
                        <FontAwesomeIcon icon={faLocationDot} className="c-icon" />
                        <span>India</span>
                      </li>
                      <li>
                        <FontAwesomeIcon icon={faClock} className="c-icon" />
                        <span>Mon - Fri, 10AM - 6PM IST</span>
                      </li>
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom Line */}
          <div className="footer-bottom-line">
            <div className="footer-copyright-group">
              <span>© {new Date().getFullYear()} AlgoFight. All rights reserved.</span>
              <span className="footer-divider">•</span>
              <span className="footer-powered-by">
                Powered by <img src={sdcLogo} alt="SDC Logo" className="footer-sdc-logo" title="Software Development Cell" />
              </span>
            </div>
            
            <div className="footer-dev-credits">
              <a onClick={() => navigate('/developer')} className="footer-dev-name" title="Arin Gupta">Arin</a>
              <span className="footer-dev-sep">,</span>
              <a onClick={() => navigate('/developer')} className="footer-dev-name" title="Vivek Chaurasiya">Vivek</a>
              <span className="footer-dev-sep">,</span>
              <a onClick={() => navigate('/developer')} className="footer-dev-name" title="Krish Dargar">Krish</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Public Info Overlay Modal */}
      <PublicInfoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        activeTab={activeModalTab}
        onSelectTab={setActiveModalTab}
      />
    </>
  );
}
