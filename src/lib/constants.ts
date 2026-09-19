// AE FUNAI faculties
export const FACULTIES = [
  { value: 'agriculture', label: 'Faculty of Agriculture' },
  { value: 'basic_medical_sciences', label: 'Faculty of Basic Medical Sciences' },
  { value: 'biological_sciences', label: 'Faculty of Biological Sciences' },
  { value: 'education', label: 'Faculty of Education' },
  { value: 'engineering_technology', label: 'Faculty of Engineering and Technology' },
  { value: 'environmental_sciences', label: 'Faculty of Environmental Sciences' },
  { value: 'humanities', label: 'Faculty of Humanities' },
  { value: 'law', label: 'Faculty of Law' },
  { value: 'management_sciences', label: 'Faculty of Management Sciences' },
  { value: 'physical_sciences', label: 'Faculty of Physical Sciences' },
  { value: 'social_sciences', label: 'Faculty of Social Sciences' },
] as const;

// 55 AE FUNAI departments mapped to faculties
export const FACULTY_DEPARTMENTS: Record<string, { value: string; label: string }[]> = {
  agriculture: [
    { value: 'agric_economics', label: 'Agric Economics' },
    { value: 'animal_science', label: 'Animal Science' },
    { value: 'fisheries_aquaculture', label: 'Fisheries and Aquaculture' },
    { value: 'soil_science', label: 'Soil Science' },
  ],
  basic_medical_sciences: [
    { value: 'anatomy', label: 'Anatomy' },
    { value: 'human_nutrition', label: 'Human Nutrition' },
    { value: 'nursing_science', label: 'Nursing Science' },
    { value: 'physiology', label: 'Physiology' },
  ],
  biological_sciences: [
    { value: 'biochemistry', label: 'Biochemistry' },
    { value: 'biology', label: 'Biology' },
  ],
  education: [
    { value: 'agric_edu', label: 'Agric Education' },
    { value: 'biology_edu', label: 'Biology Education' },
    { value: 'business_admin_edu', label: 'Business Admin Education' },
    { value: 'chemistry_edu', label: 'Chemistry Education' },
    { value: 'computer_edu', label: 'Computer Education' },
    { value: 'economics_edu', label: 'Economics Education' },
    { value: 'edu_management', label: 'Educational Management' },
    { value: 'els_edu', label: 'English & Literary Studies (Education)' },
    { value: 'maths_edu', label: 'Mathematics Education' },
    { value: 'phe', label: 'Physical & Health Education (PHE)' },
  ],
  engineering_technology: [
    { value: 'chemical_engineering', label: 'Chemical Engineering' },
    { value: 'civil_engineering', label: 'Civil Engineering' },
    { value: 'electrical_engineering', label: 'Electrical/Electronic Engineering' },
    { value: 'mechanical_engineering', label: 'Mechanical Engineering' },
    { value: 'mechatronics', label: 'Mechatronics Engineering' },
  ],
  environmental_sciences: [
    { value: 'architecture', label: 'Architecture' },
  ],
  humanities: [
    { value: 'els_humanities', label: 'English & Literary Studies (Humanities)' },
    { value: 'fine_applied_arts', label: 'Fine & Applied Arts' },
    { value: 'french', label: 'French' },
    { value: 'history', label: 'History' },
    { value: 'igbo', label: 'Igbo' },
    { value: 'linguistics', label: 'Linguistics' },
    { value: 'ling_english', label: 'Linguistics / English' },
    { value: 'ling_french', label: 'Linguistics / French' },
    { value: 'ling_igbo', label: 'Linguistics / Igbo' },
    { value: 'philosophy', label: 'Philosophy' },
    { value: 'religion', label: 'Religion' },
    { value: 'theatre_arts', label: 'Theatre Arts' },
  ],
  law: [
    { value: 'law', label: 'Law' },
  ],
  management_sciences: [
    { value: 'accountancy', label: 'Accountancy' },
    { value: 'banking_finance', label: 'Banking and Finance' },
    { value: 'business_admin', label: 'Business Administration' },
  ],
  physical_sciences: [
    { value: 'applied_geophysics', label: 'Applied Geophysics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'computer_science', label: 'Computer Science' },
    { value: 'geology', label: 'Geology' },
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'physics', label: 'Physics' },
    { value: 'statistics', label: 'Statistics' },
  ],
  social_sciences: [
    { value: 'criminology', label: 'Criminology' },
    { value: 'economics', label: 'Economics' },
    { value: 'mass_communication', label: 'Mass Communication' },
    { value: 'political_science', label: 'Political Science' },
    { value: 'psychology', label: 'Psychology' },
    { value: 'public_admin', label: 'Public Administration' },
    { value: 'sociology', label: 'Sociology' },
  ],
};

// Flatten all departments for backward compatibility
export const DEPARTMENTS = Object.values(FACULTY_DEPARTMENTS).flat();

export const LEVELS = [
  { value: '100', label: '100 Level' },
  { value: '200', label: '200 Level' },
  { value: '300', label: '300 Level' },
  { value: '400', label: '400 Level' },
  { value: '500', label: '500 Level' },
] as const;

export const SEMESTERS = [
  { value: 'first', label: 'First Semester' },
  { value: 'second', label: 'Second Semester' },
  { value: 'exam', label: 'Exam / Past Questions' },
] as const;

// Sorted (alphabetical by label) flat department list — used for study materials browser
export const DEPARTMENTS_ALPHABETICAL = [...Object.values(FACULTY_DEPARTMENTS).flat()]
  .sort((a, b) => a.label.localeCompare(b.label));


export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
] as const;

export const USER_ROLES = [
  { value: 'student', label: 'Member' },
  { value: 'course_rep', label: 'Course Representative' },
  { value: 'sug_official', label: 'SUG Official' },
  { value: 'lecturer', label: 'Lecturer' },
  { value: 'staff', label: 'Staff' },
] as const;

// Roles that are considered staff (don't need reg number)
export const STAFF_ROLES = ['lecturer', 'staff'] as const;

export const MARKETPLACE_CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'books', label: 'Books' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'services', label: 'Services' },
  { value: 'food', label: 'Food' },
  { value: 'general', label: 'General' },
] as const;

export const GROUP_TYPES = [
  { value: 'social', label: 'Social' },
  { value: 'academic', label: 'Academic' },
  { value: 'club', label: 'Club' },
  { value: 'official', label: 'Official' },
] as const;

export const TASK_URGENCY = [
  { value: 'low', label: 'Low Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'high', label: 'High Priority' },
  { value: 'urgent', label: 'Urgent' },
] as const;

// Reg number validation: YYYY/AA/12345
export const REG_NUMBER_REGEX = /^\d{4}\/[A-Za-z]{2,}\/\d{3,}$/;

export function validateRegNumber(value: string): string | null {
  if (!value.trim()) return null; // empty is ok if not required
  if (!REG_NUMBER_REGEX.test(value.trim())) {
    return 'Registration number must follow the format: YYYY/AB/12345 (e.g., 2022/CS/12345)';
  }
  return null;
}

export type Faculty = typeof FACULTIES[number]['value'];
export type Department = typeof DEPARTMENTS[number]['value'];
export type Level = typeof LEVELS[number]['value'];
export type Gender = typeof GENDERS[number]['value'];
export type UserRoleType = typeof USER_ROLES[number]['value'];
export type GroupType = typeof GROUP_TYPES[number]['value'];
