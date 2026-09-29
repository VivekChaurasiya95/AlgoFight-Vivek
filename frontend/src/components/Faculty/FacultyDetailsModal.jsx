// frontend/src/components/Faculty/FacultyDetailsModal.jsx
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChalkboardUser,
  faBuildingColumns,
  faGraduationCap,
  faIdBadge,
  faCheck,
  faXmark,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import {
  FACULTY_SCHOOLS_CENTRES,
  FACULTY_DESIGNATIONS,
  getDepartmentsForSchool,
} from "../../constants/facultySchools";
import "./FacultyDetailsModal.css";

export default function FacultyDetailsModal({
  isOpen,
  onClose,
  onSubmit,
  initialSchool = "",
  initialDepartment = "",
  initialDesignation = "",
  isOnboarding = false,
  userDisplayName = "Educator",
}) {
  const [selectedSchool, setSelectedSchool] = useState(initialSchool || "");
  const [selectedDepartment, setSelectedDepartment] = useState(initialDepartment || "");
  const [selectedDesignation, setSelectedDesignation] = useState(
    initialDesignation || FACULTY_DESIGNATIONS[2] // default "Assistant Professor"
  );
  const [customDesignation, setCustomDesignation] = useState("");
  const [isCustomDesignation, setIsCustomDesignation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sync initial values when modal opens or initial props change
  useEffect(() => {
    if (isOpen) {
      setSelectedSchool(initialSchool || "");
      setSelectedDepartment(initialDepartment || "");
      if (initialDesignation) {
        if (FACULTY_DESIGNATIONS.includes(initialDesignation)) {
          setSelectedDesignation(initialDesignation);
          setIsCustomDesignation(false);
        } else {
          setSelectedDesignation("Other");
          setCustomDesignation(initialDesignation);
          setIsCustomDesignation(true);
        }
      } else {
        setSelectedDesignation(FACULTY_DESIGNATIONS[2]);
        setIsCustomDesignation(false);
      }
      setError("");
    }
  }, [isOpen, initialSchool, initialDepartment, initialDesignation]);

  // Available sub-departments for the selected school
  const availableDepartments = useMemo(() => {
    return getDepartmentsForSchool(selectedSchool);
  }, [selectedSchool]);

  // Reset department if it's no longer valid for the newly selected school
  const handleSchoolChange = (e) => {
    const newSchool = e.target.value;
    setSelectedSchool(newSchool);
    const newDepts = getDepartmentsForSchool(newSchool);
    if (!newDepts.includes(selectedDepartment)) {
      setSelectedDepartment("");
    }
  };

  const handleDesignationSelect = (e) => {
    const val = e.target.value;
    setSelectedDesignation(val);
    if (val === "Other") {
      setIsCustomDesignation(true);
    } else {
      setIsCustomDesignation(false);
    }
  };

  const finalDesignation = isCustomDesignation
    ? customDesignation.trim() || "Faculty Educator"
    : selectedDesignation;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSchool.trim()) {
      setError("Please select your School or Centre.");
      return;
    }
    if (!finalDesignation.trim()) {
      setError("Please specify your Designation.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onSubmit({
        school: selectedSchool.trim(),
        department: selectedDepartment.trim() || null,
        designation: finalDesignation.trim(),
        institutionName: "Madhav Institute of Technology & Science (MITS DU)",
      });
      if (onClose) onClose();
    } catch (err) {
      setError(err?.message || "Failed to save academic profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="faculty-modal-overlay" onClick={isOnboarding ? undefined : onClose}>
        <motion.div
          className="faculty-modal-container"
          initial={{ opacity: 0, scale: 0.94, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 25 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Banner */}
          <div className="faculty-modal-header">
            <div className="faculty-modal-badge">
              <FontAwesomeIcon icon={faBuildingColumns} className="badge-icon" />
              <span>MITS INSTITUTIONAL FACULTY</span>
            </div>

            {!isOnboarding && onClose && (
              <button
                type="button"
                className="faculty-modal-close-btn"
                onClick={onClose}
                aria-label="Close modal"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            )}

            <h2 className="faculty-modal-title">
              {isOnboarding ? "Configure Faculty Profile" : "Edit Academic Details"}
            </h2>
            <p className="faculty-modal-subtitle">
              {isOnboarding
                ? `Welcome, ${userDisplayName}! Set up your official institutional affiliation at MITS.`
                : "Update your academic School/Centre, Department, and Designation."}
            </p>
          </div>

          {error && <div className="faculty-modal-error">{error}</div>}

          <form onSubmit={handleSubmit} className="faculty-modal-form">
            {/* Field 1: School / Centre (Mandatory) */}
            <div className="faculty-form-group">
              <label htmlFor="faculty-school-select" className="faculty-form-label">
                <FontAwesomeIcon icon={faBuildingColumns} />
                <span>School / Centre</span>
                <span className="required-tag">* Mandatory</span>
              </label>
              <select
                id="faculty-school-select"
                value={selectedSchool}
                onChange={handleSchoolChange}
                className="faculty-form-select"
                required
              >
                <option value="" disabled>
                  -- Select School or Centre --
                </option>
                {FACULTY_SCHOOLS_CENTRES.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name} {item.departments.length > 0 ? `(${item.departments.length} Depts)` : ""}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                Select your primary academic school or research centre.
              </span>
            </div>

            {/* Field 2: Department (Optional) */}
            <div className="faculty-form-group">
              <label htmlFor="faculty-dept-select" className="faculty-form-label">
                <FontAwesomeIcon icon={faGraduationCap} />
                <span>Department</span>
                <span className="optional-tag">(Optional)</span>
              </label>

              {availableDepartments.length > 0 ? (
                <select
                  id="faculty-dept-select"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="faculty-form-select"
                >
                  <option value="">-- None / School Level General --</option>
                  {availableDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  id="faculty-dept-input"
                  placeholder="e.g. Structural Engineering or leave blank"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="faculty-form-input"
                />
              )}
              <span className="field-hint">
                {availableDepartments.length > 0
                  ? `Choose from specialized departments under ${selectedSchool || "your school"}, or leave general.`
                  : "Optional department or laboratory specialization."}
              </span>
            </div>

            {/* Field 3: Designation (Mandatory) */}
            <div className="faculty-form-group">
              <label htmlFor="faculty-designation-select" className="faculty-form-label">
                <FontAwesomeIcon icon={faIdBadge} />
                <span>Designation</span>
                <span className="required-tag">* Mandatory</span>
              </label>
              <select
                id="faculty-designation-select"
                value={selectedDesignation}
                onChange={handleDesignationSelect}
                className="faculty-form-select"
                required
              >
                {FACULTY_DESIGNATIONS.map((desig) => (
                  <option key={desig} value={desig}>
                    {desig}
                  </option>
                ))}
                <option value="Other">Other / Custom Designation...</option>
              </select>

              {isCustomDesignation && (
                <motion.input
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  type="text"
                  placeholder="Enter your academic title (e.g. Senior Professor)"
                  value={customDesignation}
                  onChange={(e) => setCustomDesignation(e.target.value)}
                  className="faculty-form-input"
                  style={{ marginTop: "8px" }}
                  required
                />
              )}
            </div>

            {/* Live Profile Badge Preview */}
            <div className="faculty-card-preview">
              <div className="preview-label">
                <FontAwesomeIcon icon={faSparkles} /> Live Preview
              </div>
              <div className="preview-card-body">
                <div className="preview-badge-icon">
                  <FontAwesomeIcon icon={faChalkboardUser} />
                </div>
                <div className="preview-badge-info">
                  <div className="preview-designation">
                    {finalDesignation || "Faculty Educator"}
                  </div>
                  <div className="preview-school">
                    {selectedSchool || "School / Centre Not Selected"}
                  </div>
                  {selectedDepartment && (
                    <div className="preview-department">
                      Dept: {selectedDepartment}
                    </div>
                  )}
                  <div className="preview-institute">
                    🏛️ Madhav Institute of Technology & Science
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="faculty-modal-actions">
              {!isOnboarding && onClose && (
                <button
                  type="button"
                  className="faculty-btn-cancel"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
              )}

              {isOnboarding && onClose && (
                <button
                  type="button"
                  className="faculty-btn-skip"
                  onClick={onClose}
                  disabled={loading}
                >
                  Skip for Now
                </button>
              )}

              <button
                type="submit"
                className="faculty-btn-submit"
                disabled={loading || !selectedSchool.trim()}
              >
                {loading ? (
                  <span className="spinner-wrap">Saving...</span>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCheck} />
                    <span>{isOnboarding ? "Complete Registration" : "Save Changes"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
