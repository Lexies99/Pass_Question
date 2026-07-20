import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOCK_DB_PATH = path.join(__dirname, 'mock_db.json');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

const DB_NAME = process.env.DB_NAME || 'gimpa_past_questions';
let pool;
let useMockDB = false;

// Mock database storage
let mockData = {
  system_settings: [
    { setting_key: 'current_academic_year', setting_value: '2026' }
  ],
  students: [
    {
      id: 1,
      index_number: '2261001',
      name: 'Kofi Mensah',
      school: 'GIMPA Business School (GBS)',
      degree: 'BSc in Business Administration (Accounting Option)',
      admission_year: 2024,
      duration: 4,
      status: 'active',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      index_number: '2261002',
      name: 'Ama Serwaa',
      school: 'School of Technology and Social Sciences (SOTSS)',
      degree: 'BSc in Computer Science',
      admission_year: 2022,
      duration: 4,
      status: 'active',
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      index_number: '2261003',
      name: 'Kojo Antwi',
      school: 'GIMPA Law School',
      degree: 'Post-First Degree LL.B',
      admission_year: 2025,
      duration: 3,
      status: 'pending',
      created_at: new Date().toISOString()
    }
  ],
  past_questions: [
    {
      id: 1,
      title: 'Introduction to Computer Programming',
      course_code: 'SOT-101',
      school: 'School of Technology and Social Sciences (SOTSS)',
      degree: 'BSc in Computer Science',
      year: 2024,
      semester: 'First Semester',
      file_name: 'sot101_2024_sem1.pdf',
      file_path: '/uploads/sot101_2024_sem1.pdf',
      uploaded_at: new Date().toISOString()
    },
    {
      id: 2,
      title: 'Financial Accounting I',
      course_code: 'GBS-201',
      school: 'GIMPA Business School (GBS)',
      degree: 'BSc in Business Administration (Accounting Option)',
      year: 2025,
      semester: 'First Semester',
      file_name: 'gbs201_2025_sem1.pdf',
      file_path: '/uploads/gbs201_2025_sem1.pdf',
      uploaded_at: new Date().toISOString()
    },
    {
      id: 3,
      title: 'Constitutional Law I',
      course_code: 'LAW-101',
      school: 'GIMPA Law School',
      degree: 'Bachelor of Laws (LL.B) - Regular',
      year: 2023,
      semester: 'Second Semester',
      file_name: 'law101_2023_sem2.pdf',
      file_path: '/uploads/law101_2023_sem2.pdf',
      uploaded_at: new Date().toISOString()
    }
  ]
};

// Save mock data to JSON file
function saveMockDB() {
  try {
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(mockData, null, 2));
  } catch (err) {
    console.error('Failed to save mock database:', err);
  }
}

// Load mock data from JSON file
function loadMockDB() {
  try {
    if (fs.existsSync(MOCK_DB_PATH)) {
      const fileData = fs.readFileSync(MOCK_DB_PATH, 'utf-8');
      mockData = JSON.parse(fileData);
      console.log('Mock database loaded from file server/mock_db.json.');
    } else {
      saveMockDB();
      console.log('Mock database file created at server/mock_db.json.');
    }
  } catch (err) {
    console.error('Failed to load mock database:', err);
  }
}

export async function initDB() {
  let connection;
  try {
    // 1. Try to connect to MySQL server
    console.log(`Connecting to MySQL server at ${dbConfig.host}...`);
    connection = await mysql.createConnection(dbConfig);
    
    // Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    console.log(`Database "${DB_NAME}" verified/created successfully.`);
    await connection.end();

    // 2. Create the connection pool with database selected
    pool = mysql.createPool({
      ...dbConfig,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // 3. Create tables
    await createTables();
    
    // 4. Seed initial data
    await seedData();
    
    console.log('MySQL database initialization completed successfully.');
    return true;
  } catch (error) {
    console.warn('\n============================================================');
    console.warn('MySQL CONNECTION FAILED (ECONNREFUSED).');
    console.warn('ACTIVER MOCK FALLBACK MODE: Using server/mock_db.json.');
    console.warn('------------------------------------------------------------');
    console.warn('To switch to MySQL, make sure MySQL server is running and run:');
    console.warn(`  CREATE DATABASE IF NOT EXISTS ${DB_NAME};`);
    console.warn('============================================================\n');
    
    useMockDB = true;
    loadMockDB();
    return true; // Return true because mock mode successfully configured
  }
}

async function createTables() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(255) PRIMARY KEY,
        setting_value VARCHAR(255) NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        index_number VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        school VARCHAR(100) NOT NULL,
        degree VARCHAR(100) NOT NULL,
        admission_year INT NOT NULL,
        duration INT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS past_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        course_code VARCHAR(50) NOT NULL,
        school VARCHAR(100) NOT NULL,
        degree VARCHAR(100) NOT NULL,
        year INT NOT NULL,
        semester VARCHAR(20) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } finally {
    connection.release();
  }
}

async function seedData() {
  const connection = await pool.getConnection();
  try {
    const [settings] = await connection.query('SELECT * FROM system_settings WHERE setting_key = "current_academic_year"');
    if (settings.length === 0) {
      await connection.query('INSERT INTO system_settings (setting_key, setting_value) VALUES ("current_academic_year", "2026")');
    }

    const [students] = await connection.query('SELECT COUNT(*) as count FROM students');
    if (students[0].count === 0) {
      for (const s of mockData.students) {
        await connection.query(`
          INSERT INTO students (index_number, name, school, degree, admission_year, duration, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [s.index_number, s.name, s.school, s.degree, s.admission_year, s.duration, s.status]);
      }
    }

    const [questions] = await connection.query('SELECT COUNT(*) as count FROM past_questions');
    if (questions[0].count === 0) {
      for (const q of mockData.past_questions) {
        await connection.query(`
          INSERT INTO past_questions (title, course_code, school, degree, year, semester, file_name, file_path)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [q.title, q.course_code, q.school, q.degree, q.year, q.semester, q.file_name, q.file_path]);
      }
    }
  } finally {
    connection.release();
  }
}

// SQL Query Router / Interceptor for Mock DB Mode
export async function query(sql, params = []) {
  if (!useMockDB) {
    if (!pool) {
      throw new Error('Database pool not initialized.');
    }
    const [results] = await pool.execute(sql, params);
    return results;
  }

  // MOCK DB LOGIC
  const cleanSql = sql.trim().replace(/\s+/g, ' ');
  console.log(`[MOCK QUERY]: ${cleanSql} | Params:`, params);

  // 1. Settings Queries
  if (cleanSql.startsWith('SELECT * FROM system_settings WHERE setting_key = "current_academic_year"')) {
    return mockData.system_settings;
  }
  if (cleanSql.startsWith('UPDATE system_settings SET setting_value = ?')) {
    mockData.system_settings[0].setting_value = params[0].toString();
    saveMockDB();
    return { affectedRows: 1 };
  }

  // 2. Select Expirations
  if (cleanSql.startsWith('SELECT * FROM students WHERE admission_year + duration <= ? AND status != \'expired\'')) {
    const yr = params[0];
    return mockData.students.filter(s => (s.admission_year + s.duration) <= yr && s.status !== 'expired');
  }

  // 3. Update Expirations
  if (cleanSql.startsWith('UPDATE students SET status = \'expired\' WHERE admission_year + duration <= ? AND status != \'expired\'') ||
      cleanSql.startsWith('UPDATE students SET status = "expired" WHERE admission_year + duration <= ? AND status != \'expired\'')) {
    const yr = params[0];
    let count = 0;
    mockData.students.forEach(s => {
      if ((s.admission_year + s.duration) <= yr && s.status !== 'expired') {
        s.status = 'expired';
        count++;
      }
    });
    if (count > 0) saveMockDB();
    return { affectedRows: count };
  }

  // 4. Student Queries
  if (cleanSql.startsWith('SELECT * FROM students WHERE index_number = ?')) {
    return mockData.students.filter(s => s.index_number === params[0]);
  }
  if (cleanSql.startsWith('SELECT * FROM students WHERE id = ?')) {
    return mockData.students.filter(s => s.id == params[0]);
  }
  if (cleanSql.startsWith('SELECT id, index_number, name, school, degree, admission_year, duration, status, created_at FROM students ORDER BY created_at DESC')) {
    return [...mockData.students].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // 5. Update Student Status
  if (cleanSql.startsWith('UPDATE students SET status = ? WHERE id = ?')) {
    const st = mockData.students.find(s => s.id == params[1]);
    if (st) {
      st.status = params[0];
      saveMockDB();
    }
    return { affectedRows: 1 };
  }

  // 6. Update Student Details
  if (cleanSql.startsWith('UPDATE students SET name = ?, school = ?, degree = ?, admission_year = ?, duration = ?, status = ? WHERE id = ?')) {
    const st = mockData.students.find(s => s.id == params[6]);
    if (st) {
      st.name = params[0];
      st.school = params[1];
      st.degree = params[2];
      st.admission_year = parseInt(params[3], 10);
      st.duration = parseInt(params[4], 10);
      st.status = params[5];
      saveMockDB();
    }
    return { affectedRows: 1 };
  }

  // 7. Insert Student
  if (cleanSql.startsWith('INSERT INTO students (index_number, name, school, degree, admission_year, duration, status)')) {
    const newStudent = {
      id: mockData.students.length > 0 ? Math.max(...mockData.students.map(s => s.id)) + 1 : 1,
      index_number: params[0],
      name: params[1],
      school: params[2],
      degree: params[3],
      admission_year: parseInt(params[4], 10),
      duration: parseInt(params[5], 10),
      status: params[6] || 'pending',
      created_at: new Date().toISOString()
    };
    mockData.students.push(newStudent);
    saveMockDB();
    return { insertId: newStudent.id };
  }

  // 8. Delete Student
  if (cleanSql.startsWith('DELETE FROM students WHERE id = ?')) {
    mockData.students = mockData.students.filter(s => s.id != params[0]);
    saveMockDB();
    return { affectedRows: 1 };
  }

  // 9. Past Questions Queries
  if (cleanSql.startsWith('SELECT * FROM past_questions')) {
    // Determine filters based on query syntax (in index.js, filter parameters are dynamically appended)
    let results = [...mockData.past_questions];
    let paramIndex = 0;

    if (cleanSql.includes('AND (title LIKE ? OR course_code LIKE ?)')) {
      const queryStr = params[paramIndex].replace(/%/g, '').toLowerCase();
      results = results.filter(q => q.title.toLowerCase().includes(queryStr) || q.course_code.toLowerCase().includes(queryStr));
      paramIndex += 2; // skips two params for search
    }
    if (cleanSql.includes('AND school = ?')) {
      const val = params[paramIndex++];
      results = results.filter(q => q.school === val);
    }
    if (cleanSql.includes('AND degree = ?')) {
      const val = params[paramIndex++];
      results = results.filter(q => q.degree === val);
    }
    if (cleanSql.includes('AND year = ?')) {
      const val = parseInt(params[paramIndex++], 10);
      results = results.filter(q => q.year === val);
    }
    if (cleanSql.includes('AND semester = ?')) {
      const val = params[paramIndex++];
      results = results.filter(q => q.semester === val);
    }

    // Sort by year desc, uploaded_at desc
    results.sort((a, b) => b.year - a.year || new Date(b.uploaded_at) - new Date(a.uploaded_at));
    return results;
  }

  // 10. Insert Past Question
  if (cleanSql.startsWith('INSERT INTO past_questions')) {
    const newQuestion = {
      id: mockData.past_questions.length > 0 ? Math.max(...mockData.past_questions.map(q => q.id)) + 1 : 1,
      title: params[0],
      course_code: params[1],
      school: params[2],
      degree: params[3],
      year: parseInt(params[4], 10),
      semester: params[5],
      file_name: params[6],
      file_path: params[7],
      uploaded_at: new Date().toISOString()
    };
    mockData.past_questions.push(newQuestion);
    saveMockDB();
    return { insertId: newQuestion.id };
  }

  throw new Error(`Mock SQL query not implemented: ${cleanSql}`);
}

export function getPool() {
  return pool;
}
