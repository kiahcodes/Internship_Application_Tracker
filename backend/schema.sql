CREATE DATABASE IF NOT EXISTS internship_tracker
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE internship_tracker;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role ENUM('student','poster') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INT PRIMARY KEY,
  course VARCHAR(150) NOT NULL DEFAULT '',
  semester VARCHAR(50) NOT NULL DEFAULT '',
  bio TEXT,
  skills VARCHAR(500) NOT NULL DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resumes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  data LONGBLOB NOT NULL,
  is_current TINYINT(1) NOT NULL DEFAULT 0,
  -- Cover letters are stored here too, just with a different kind.
  kind ENUM('resume','cover_letter') NOT NULL DEFAULT 'resume',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS internships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company VARCHAR(100) NOT NULL,
  role VARCHAR(150) NOT NULL,
  location VARCHAR(100) NOT NULL,
  lat DOUBLE NULL,
  lon DOUBLE NULL,
  -- Filled by `npm run scrape`; seed rows have source = 'seed'.
  source VARCHAR(30) NOT NULL DEFAULT 'seed',
  external_id VARCHAR(190) NULL,
  url VARCHAR(500) NULL,
  description TEXT NULL,
  posted_at DATETIME NULL,
  scraped_at TIMESTAMP NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  posted_by INT NULL,
  UNIQUE KEY uq_source_ext (source, external_id)
);

-- One row per tracked application. internship_id is NULL for cards the user
-- added manually on the Tracker page.
CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  internship_id INT NULL,
  title VARCHAR(255) NOT NULL,
  status ENUM('Applied','Interview','Offer') NOT NULL DEFAULT 'Applied',
  -- The resume version sent with this application (NULL if none or later deleted).
  resume_id INT NULL,
  -- Cover letter text written for this application.
  cover_letter MEDIUMTEXT NULL,
  -- An uploaded cover letter file (a resumes row with kind = 'cover_letter').
  cover_letter_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_internship (user_id, internship_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE SET NULL,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL,
  FOREIGN KEY (cover_letter_id) REFERENCES resumes(id) ON DELETE SET NULL
);

INSERT INTO internships (company, role, location, lat, lon)
SELECT * FROM (
  SELECT 'Google' c, 'Frontend Intern' r, 'Bengaluru' l, 12.9716 a, 77.5946 o UNION ALL
  SELECT 'Microsoft', 'Software Engineering Intern', 'Hyderabad', 17.385, 78.4867 UNION ALL
  SELECT 'Amazon', 'SDE Intern', 'Bangalore', 12.9716, 77.5946 UNION ALL
  SELECT 'Adobe', 'React Developer Intern', 'Noida', 28.5355, 77.391 UNION ALL
  SELECT 'Infosys', 'Web Development Intern', 'Pune', 18.5204, 73.8567
) seed WHERE NOT EXISTS (SELECT 1 FROM internships);
