// frontend/src/constants/facultySchools.js

/**
 * List of MITS Schools and Centres with their respective departments
 * Carefully transcribed from institutional directory
 */
export const FACULTY_SCHOOLS_CENTRES = [
  {
    id: "civil-eng",
    name: "School of Civil Engineering",
    type: "School",
    departments: [],
  },
  {
    id: "mech-eng",
    name: "School of Mechanical Engineering",
    type: "School",
    departments: [],
  },
  {
    id: "elec-eng",
    name: "School of Electrical Engineering",
    type: "School",
    departments: [],
  },
  {
    id: "cse",
    name: "School of Computer Science & Engineering",
    type: "School",
    departments: [
      "Computer Science & Engineering",
      "Computer Science and Design",
    ],
  },
  {
    id: "it",
    name: "School of Information Technology",
    type: "School",
    departments: [],
  },
  {
    id: "ece",
    name: "School of Electronics & Communication Engineering",
    type: "School",
    departments: [
      "Electronics Engineering",
      "Electronics and Telecommunications Engineering",
    ],
  },
  {
    id: "cai",
    name: "Centre for Artificial Intelligence",
    type: "Centre",
    departments: [],
  },
  {
    id: "ciot",
    name: "Centre for Internet of Things",
    type: "Centre",
    departments: [],
  },
  {
    id: "ccst",
    name: "Centre for Computer Science and Technology",
    type: "Centre",
    departments: [],
  },
  {
    id: "semc",
    name: "School of Engineering Mathematics & Computing",
    type: "School",
    departments: [
      "Engineering Mathematics & Computing",
      "Masters in Computer Applications",
    ],
  },
  {
    id: "chem-eng",
    name: "School of Chemical Engineering",
    type: "School",
    departments: [],
  },
  {
    id: "arch",
    name: "School of Architecture",
    type: "School",
    departments: [],
  },
  {
    id: "shm",
    name: "School of Humanities and Management",
    type: "School",
    departments: [],
  },
  {
    id: "app-math",
    name: "School of Applied Mathematics",
    type: "School",
    departments: [],
  },
];

export const FACULTY_DESIGNATIONS = [
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Professor & Head of Department (HOD)",
  "Dean",
  "Associate Dean",
  "Director",
  "Visiting / Adjunct Professor",
  "Senior Lecturer",
  "Lecturer",
  "Teaching Associate",
  "Research Scientist / Mentor",
];

/**
 * Helper to find departments for a given school name
 */
export function getDepartmentsForSchool(schoolName) {
  if (!schoolName) return [];
  const found = FACULTY_SCHOOLS_CENTRES.find(
    (s) => s.name.toLowerCase().trim() === schoolName.toLowerCase().trim()
  );
  return found ? found.departments : [];
}
