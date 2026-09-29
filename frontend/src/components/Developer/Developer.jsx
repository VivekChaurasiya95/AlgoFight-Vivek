import React, { useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCodeBranch,
  faCodeMerge,
  faLaptopCode,
  faServer,
  faGraduationCap,
  faEnvelope,
  faCopy,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { faLinkedin, faGithub } from "@fortawesome/free-brands-svg-icons";
import vivekPic from "../../assets/devs/vivek.png";
import krishPic from "../../assets/devs/krish.jpg";
import arinPic from "../../assets/devs/arin.png";
import atulPic from "../../assets/devs/atul.png";
import BackgroundPaths from "../BackgroundPaths/BackgroundPaths";
import "../BackgroundPaths/BackgroundPaths.css";
import Footer from "../Common/Footer/Footer";
import "./Developer.css";

const teamMembers = [
  {
    name: "Arin Gupta",
    role: "Full Stack Architect & Systems Lead",
    categoryBadge: "CORE ARCHITECTURE & SYSTEMS ENGINEERING",
    tagChip: "Core Architect",
    institution: "Madhav Institute of Technology & Science (Deemed to be University), Gwalior",
    bio: "Architects the core application edge, real-time distributed state machines, and cryptographic admission gateways. Obsessed with sub-millisecond execution, tamper-proof user trust contexts, and engineering a fluid, high-octane 1v1 battle experience.",
    pic: arinPic,
    stack: "Distributed Systems & Core Edge",
    skills: ["Distributed State Machines", "Logical User Gateways", "Elastic Telemetry Spine", "Realtime Arenas"],
    icon: faCodeMerge,
    headerIcon: faCodeBranch,
    tone: "tone-cyan",
    linkedin: "https://www.linkedin.com/in/arin-gupta-2b94b032a/",
    github: "https://github.com/arin-gupta06",
    imgStyle: { objectPosition: "center 15%" },
  },
  {
    name: "Vivek Chaurasiya",
    role: "Backend & Sandbox Infrastructure Lead",
    categoryBadge: "INFRASTRUCTURE & RUNTIME ENGINES",
    tagChip: "Infrastructure Lead",
    institution: "Madhav Institute of Technology & Science (Deemed to be University), Gwalior",
    bio: "Engineers database architecture, Prisma query optimization, asynchronous job queues, and isolated code evaluation sandboxes. Ensures the backend executes arbitrary code with strict isolation, low latency, and infinite horizontal scalability.",
    pic: vivekPic,
    stack: "Backend & Sandbox Engines",
    skills: ["PostgreSQL & Prisma", "Elastic BullMQ Queues", "Piston Multi-Runtime Fleet", "System Scalability"],
    icon: faServer,
    headerIcon: faServer,
    tone: "tone-emerald",
    linkedin: "https://www.linkedin.com/in/vivek-chaurasiya-722037315",
    github: "https://github.com/VivekChaurasiya95",
    imgStyle: { objectPosition: "center 20%" },
  },
  {
    name: "Krish Dargar",
    role: "Frontend & UI/UX Systems Architect",
    categoryBadge: "DESIGN SYSTEMS & CREATIVE DIRECTION",
    tagChip: "UI/UX Architect",
    institution: "Madhav Institute of Technology & Science (Deemed to be University), Gwalior",
    bio: "Crafts the cybernetic design language, glassmorphic interfaces, and micro-animations. Translates complex algorithmic mechanics into lightning-fast, intuitive, and visually stunning web applications that coders love to use.",
    pic: krishPic,
    stack: "UI/UX & Design Systems",
    skills: ["Cyber Glassmorphic UI", "React.js & Framer Motion", "WhatsApp Media Previews", "Responsive Layouts"],
    icon: faLaptopCode,
    headerIcon: faLaptopCode,
    tone: "tone-magenta",
    linkedin: "https://www.linkedin.com/in/krish-dargar-101774324/",
    github: "https://github.com/KD2303",
    imgStyle: { objectPosition: "center 15%" },
  },
];

const mentor = {
  name: "Mr. Atul Chauhan",
  role: "Faculty Mentor & Technical Advisor",
  categoryBadge: "INSTITUTIONAL MENTORSHIP & TECHNICAL GUIDANCE",
  tagChip: "Programmer of MITS DU",
  institution: "Madhav Institute of Technology & Science (Deemed to be University), Gwalior",
  bio: "Providing distinguished institutional mentorship, systems guidance, and architectural advisory for AlgoFight at MITS DU. Inspires and steers student engineers to build high-throughput real-time platforms, develop disciplined algorithmic problem-solving capabilities, and adhere to industry-standard software engineering benchmarks.",
  pic: atulPic,
  stack: "Programmer of MITS DU",
  skills: [
    "Programmer of MITS DU",
    "Institutional Guidance",
    "Systems Engineering",
    "Pedagogical Advisory",
    "Competitive Programming Steering",
  ],
  icon: faCodeBranch,
  headerIcon: faGraduationCap,
  tone: "tone-amber",
  email: "atul@mitsgwalior.in",
  imgStyle: { objectPosition: "center 15%" },
};

const developerStats = [
  { label: "Core Architects", value: "3" },
  { label: "Monorepo Packages", value: "14" },
  { label: "Gateway Ingress", value: "15k+ RPS" },
  { label: "P99 Latency", value: "< 6ms" },
];


const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.14 },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

function Developer() {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyMentorEmail = () => {
    navigator.clipboard.writeText("atul@mitsgwalior.in");
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2400);
  };

  return (
    <BackgroundPaths>
      <div className="developer-page">
        {/* Hero Section */}
        <motion.section
          className="developer-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="hero-badge">
            <span className="badge-pulse-dot" />
            <span>ENGINEERING & ARCHITECTURE</span>
          </div>
          <h1>
            Built By <span className="text-cyan-gradient">AlgoFight</span> <span className="text-purple">Architects</span>
          </h1>
          <p>
            Meet the engineers building AlgoFight. Designed from the ground up as a high-throughput, real-time algorithmic combat arena, powered by modern distributed systems and cyber glassmorphic aesthetics.
          </p>

          <div className="developer-stat-grid">
            {developerStats.map((item) => (
              <article key={item.label} className="developer-stat-card">
                <div className="developer-stat-value">{item.value}</div>
                <div className="developer-stat-label">{item.label}</div>
              </article>
            ))}
          </div>
        </motion.section>

        {/* Developer Cards Section - Matching 2nd Image Layout with Custom Color Themes */}
        <motion.section
          className="developer-team-grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {teamMembers.map((member) => (
            <motion.article
              key={member.name}
              variants={childVariants}
              className={`dev-profile-card dev-column-card ${member.tone}`}
            >
              {/* Top-Left Category Badge */}
              <div className="card-header-badge">
                <FontAwesomeIcon icon={member.headerIcon} />
                <span>{member.categoryBadge}</span>
              </div>

              <div className="card-inner">
                {/* Circular Avatar with Radiant Halo & Tag Chip */}
                <div className="card-avatar-wrap">
                  <div className="card-avatar-glow" />
                  <div className="card-avatar-img-box">
                    <img
                      src={member.pic}
                      alt={member.name}
                      className="card-avatar-img"
                      style={member.imgStyle}
                    />
                  </div>
                  <div className="card-tag-chip">
                    <span>{member.tagChip}</span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="card-content">
                  <div className="card-title-row">
                    <div>
                      <h2 className="card-name">{member.name}</h2>
                      <div className="card-role-badge">
                        <FontAwesomeIcon icon={member.icon} />
                        <span>{member.role}</span>
                      </div>
                    </div>
                    <div className="card-tag-pill">
                      {member.stack}
                    </div>
                  </div>

                  <p className="card-institution">
                    {member.institution}
                  </p>

                  <p className="card-bio">{member.bio}</p>

                  <div className="card-skills-list">
                    {member.skills.map((skill) => (
                      <span key={skill}>{skill}</span>
                    ))}
                  </div>

                  <div className="card-contact-actions">
                    {member.linkedin && (
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="card-primary-btn"
                        title={`${member.name} on LinkedIn`}
                      >
                        <FontAwesomeIcon icon={faLinkedin} />
                        <span>LinkedIn</span>
                      </a>
                    )}
                    {member.github && (
                      <a
                        href={member.github}
                        target="_blank"
                        rel="noreferrer"
                        className="card-secondary-btn"
                        title={`${member.name} on GitHub`}
                      >
                        <FontAwesomeIcon icon={faGithub} />
                        <span>GitHub</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.section>

        {/* Faculty Mentor Section - Golden Amber Theme */}
        <motion.section
          className={`dev-profile-card ${mentor.tone} faculty-mentor-card`}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          {/* Top-Left Category Badge */}
          <div className="card-header-badge">
            <FontAwesomeIcon icon={mentor.headerIcon} />
            <span>{mentor.categoryBadge}</span>
          </div>

          <div className="card-inner">
            {/* Circular Avatar with Radiant Halo & Tag Chip */}
            <div className="card-avatar-wrap">
              <div className="card-avatar-glow" />
              <div className="card-avatar-img-box">
                <img
                  src={mentor.pic}
                  alt={mentor.name}
                  className="card-avatar-img"
                  style={mentor.imgStyle}
                />
              </div>
              <div className="card-tag-chip">
                <span>{mentor.tagChip}</span>
              </div>
            </div>

            {/* Content Section */}
            <div className="card-content">
              <div className="card-title-row">
                <div>
                  <h2 className="card-name">{mentor.name}</h2>
                  <div className="card-role-badge">
                    <FontAwesomeIcon icon={mentor.icon} />
                    <span>{mentor.role}</span>
                  </div>
                </div>
                <div className="card-tag-pill">
                  {mentor.stack}
                </div>
              </div>

              <p className="card-institution">
                {mentor.institution}
              </p>

              <p className="card-bio">{mentor.bio}</p>

              <div className="card-skills-list">
                {mentor.skills.map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>

              <div className="card-contact-actions">
                <a
                  href={`mailto:${mentor.email}`}
                  className="card-primary-btn"
                  title={`Send email to ${mentor.name}`}
                >
                  <FontAwesomeIcon icon={faEnvelope} />
                  <span>{mentor.email}</span>
                </a>
                <button
                  className="card-secondary-btn"
                  onClick={handleCopyMentorEmail}
                  title="Copy email address"
                >
                  <FontAwesomeIcon icon={copiedEmail ? faCheck : faCopy} />
                  <span>{copiedEmail ? "Copied!" : "Copy Email"}</span>
                </button>
              </div>
            </div>
          </div>
        </motion.section>


      </div>
      <Footer />
    </BackgroundPaths>
  );
}

export default Developer;
