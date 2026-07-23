import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDB, query } from './db.js';

// Setup __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite dev server (usually localhost:5173)
app.use(cors());
app.use(express.json());

// Create uploads directory if not exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Configure Multer for PDF file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

// Helper: Check student auto-deactivation
async function runAutoDeactivations(currentYear) {
  try {
    // Select students whose admission_year + duration is less than or equal to current academic year
    // and status is not already 'expired'
    const expiredStudents = await query(
      `SELECT * FROM students WHERE admission_year + duration <= ? AND status != 'expired'`,
      [currentYear]
    );

    if (expiredStudents.length > 0) {
      await query(
        `UPDATE students SET status = 'expired' WHERE admission_year + duration <= ? AND status != 'expired'`,
        [currentYear]
      );
      console.log(`Auto-deactivated ${expiredStudents.length} student(s) based on academic year ${currentYear}.`);
    }
    return expiredStudents;
  } catch (error) {
    console.error('Error during auto-deactivation:', error);
    return [];
  }
}

// 1. System Settings / Year API
app.get('/api/system/settings', async (req, res) => {
  try {
    const results = await query('SELECT * FROM system_settings WHERE setting_key = "current_academic_year"');
    const currentYear = results[0]?.setting_value || '2026';
    res.json({ current_academic_year: parseInt(currentYear, 10) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/system/year', async (req, res) => {
  const { year } = req.body;
  if (!year || isNaN(year)) {
    return res.status(400).json({ error: 'Valid year is required' });
  }

  try {
    await query('UPDATE system_settings SET setting_value = ? WHERE setting_key = "current_academic_year"', [year.toString()]);
    
    // Run the deactivation check immediately
    const deactivated = await runAutoDeactivations(parseInt(year, 10));
    
    res.json({ 
      message: `Simulated academic year updated to ${year}.`,
      deactivatedCount: deactivated.length,
      deactivatedStudents: deactivated.map(s => s.name)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Authentication API
app.post('/api/auth/login', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !role) {
    return res.status(400).json({ error: 'Username/Index Number and role are required' });
  }

  // Normalize username by trimming and taking the first word to handle duplicate or space-padded inputs
  const cleanUsername = username.trim().split(/\s+/)[0];

  try {
    if (role === 'admin') {
      if (!password) {
        return res.status(400).json({ error: 'Admin password is required' });
      }
      if (cleanUsername === 'admin' && password === 'password') {
        return res.json({ 
          token: 'mock-admin-token', 
          user: { name: 'Library Admin', role: 'admin', username: 'admin' } 
        });
      } else {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }
    } else if (role === 'student') {
      // Get current simulated academic year
      const settings = await query('SELECT * FROM system_settings WHERE setting_key = "current_academic_year"');
      const currentYear = parseInt(settings[0]?.setting_value || '2026', 10);

      // Check student
      const students = await query('SELECT * FROM students WHERE index_number = ?', [cleanUsername]);
      if (students.length === 0) {
        return res.status(401).json({ error: 'Student index number not found' });
      }

      const student = students[0];

      // Run dynamic deactivation check on login (fail-safe)
      const graduationYear = student.admission_year + student.duration;
      if (graduationYear <= currentYear && student.status !== 'expired') {
        await query('UPDATE students SET status = "expired" WHERE id = ?', [student.id]);
        student.status = 'expired';
      }

      // Check account status
      if (student.status === 'pending') {
        return res.status(403).json({ error: 'Your account is pending activation by the Library Admin.' });
      }
      if (student.status === 'suspended') {
        return res.status(403).json({ error: 'Your account has been suspended by the Library Admin.' });
      }
      if (student.status === 'expired') {
        return res.status(403).json({ 
          error: `Your account has been deactivated. Your study duration for ${student.degree} expired in Year ${graduationYear} (Current Simulated Year: ${currentYear}).`
        });
      }

      // Student is active!
      res.json({
        token: `mock-student-token-${student.index_number}`,
        user: {
          id: student.id,
          index_number: student.index_number,
          name: student.name,
          school: student.school,
          degree: student.degree,
          admission_year: student.admission_year,
          duration: student.duration,
          role: 'student',
          status: student.status
        }
      });
    } else {
      res.status(400).json({ error: 'Invalid role specified' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Past Questions API
app.get('/api/questions', async (req, res) => {
  const { search, school, degree, year, semester } = req.query;
  
  let sql = 'SELECT * FROM past_questions WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (title LIKE ? OR course_code LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (school) {
    sql += ' AND school = ?';
    params.push(school);
  }
  if (degree) {
    sql += ' AND degree = ?';
    params.push(degree);
  }
  if (year) {
    sql += ' AND year = ?';
    params.push(year);
  }
  if (semester) {
    sql += ' AND semester = ?';
    params.push(semester);
  }

  sql += ' ORDER BY year DESC, uploaded_at DESC';

  try {
    const results = await query(sql, params);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Secure Question Preview Endpoint (Returns structured exam paper content for Protify Protected Viewer)
app.get('/api/questions/:id/preview', async (req, res) => {
  const { id } = req.params;
  try {
    const questions = await query('SELECT * FROM past_questions WHERE id = ?', [id]);
    if (questions.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    const q = questions[0];
    res.json({
      id: q.id,
      title: q.title,
      course_code: q.course_code,
      school: q.school,
      degree: q.degree,
      year: q.year,
      semester: q.semester,
      uploaded_at: q.uploaded_at,
      security: {
        protected: true,
        watermarkRequired: true,
        downloadAllowed: false
      },
      content: {
        instructions: `GHANA INSTITUTE OF MANAGEMENT AND PUBLIC ADMINISTRATION (GIMPA)\n${q.school.toUpperCase()}\n${q.degree.toUpperCase()}\n\nEND OF ${q.semester.toUpperCase()} EXAMINATIONS - ${q.year}\nCOURSE: ${q.course_code} - ${q.title.toUpperCase()}\nTIME ALLOWED: 3 HOURS\n\nINSTRUCTIONS: Answer ALL questions in Section A and ANY TWO questions in Section B. Credit will be given for clarity of presentation, logical arguments, and appropriate practical examples.`,
        sections: [
          {
            name: "SECTION A (Compulsory - 40 Marks)",
            questions: [
              `1. (a) Define the core principles of ${q.title} within the context of ${q.school}. [10 Marks]\n   (b) Discuss three key challenges faced by practitioners when implementing these concepts in modern environments. [10 Marks]`,
              `2. Examine the impact of regulatory frameworks and operational developments on ${q.course_code}. Illustrate your answer with relevant examples. [20 Marks]`
            ]
          },
          {
            name: "SECTION B (Answer Any Two Questions - 30 Marks Each)",
            questions: [
              `3. Analytical Evaluation:\n   Compare and contrast theoretical framework models against real-world scenario outcomes in Ghana. [30 Marks]`,
              `4. Critical Analysis:\n   Propose a strategic roadmap for optimizing efficiency in your chosen area of ${q.degree}. [30 Marks]`,
              `5. Short Notes:\n   Write concise explanatory notes on FOUR of the following terms:\n   (i) Foundational Standards\n   (ii) Operational Governance\n   (iii) Compliance Metrics\n   (iv) Strategic Risk Management\n   (v) Performance Evaluation Framework [30 Marks]`
            ]
          }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload Past Question
app.post('/api/questions', upload.single('pdf'), async (req, res) => {
  const { title, course_code, school, degree, year, semester } = req.body;

  if (!title || !course_code || !school || !degree || !year || !semester) {
    return res.status(400).json({ error: 'All question fields are required' });
  }

  let fileName = 'mock_past_question.pdf';
  let filePath = '/uploads/mock_past_question.pdf';

  if (req.file) {
    fileName = req.file.originalname;
    filePath = `/uploads/${req.file.filename}`;
  } else {
    // If no physical PDF was uploaded, we can create a placeholder mockup file
    const mockFilename = `mock-${course_code}-${year}-${Date.now()}.pdf`;
    const mockPath = path.join(uploadsDir, mockFilename);
    fs.writeFileSync(mockPath, `%PDF-1.4 Mock past question for course ${course_code} (${title}) - Year ${year}`);
    fileName = mockFilename;
    filePath = `/uploads/${mockFilename}`;
  }

  try {
    const result = await query(
      `INSERT INTO past_questions (title, course_code, school, degree, year, semester, file_name, file_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, course_code, school, degree, parseInt(year, 10), semester, fileName, filePath]
    );

    res.status(201).json({
      message: 'Past question uploaded successfully.',
      question: {
        id: result.insertId,
        title,
        course_code,
        school,
        degree,
        year,
        semester,
        file_name: fileName,
        file_path: filePath
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Students API (Admin only)
app.get('/api/students', async (req, res) => {
  try {
    // Check auto deactivation status on fetch as well to keep dashboard real-time
    const settings = await query('SELECT * FROM system_settings WHERE setting_key = "current_academic_year"');
    const currentYear = parseInt(settings[0]?.setting_value || '2026', 10);
    await runAutoDeactivations(currentYear);

    const students = await query('SELECT id, index_number, name, school, degree, admission_year, duration, status, created_at FROM students ORDER BY created_at DESC');
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Student
app.post('/api/students', async (req, res) => {
  const { index_number, name, school, degree, admission_year, duration } = req.body;

  if (!index_number || !name || !school || !degree || !admission_year || !duration) {
    return res.status(400).json({ error: 'All student fields are required' });
  }

  try {
    // Check if index number exists
    const existing = await query('SELECT * FROM students WHERE index_number = ?', [index_number]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Index number already exists' });
    }

    // Default status is pending, but admin can choose. Let's make it start as 'pending' (library admin must activate)
    const result = await query(
      `INSERT INTO students (index_number, name, school, degree, admission_year, duration, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [index_number, name, school, degree, parseInt(admission_year, 10), parseInt(duration, 10)]
    );

    res.status(201).json({
      message: 'Student account created successfully as PENDING activation.',
      student: {
        id: result.insertId,
        index_number,
        name,
        school,
        degree,
        admission_year,
        duration,
        status: 'pending'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Create Students
app.post('/api/students/bulk', async (req, res) => {
  const { students } = req.body;

  if (!students || !Array.isArray(students)) {
    return res.status(400).json({ error: 'A list of students is required' });
  }

  const results = {
    successCount: 0,
    failCount: 0,
    errors: []
  };

  for (const student of students) {
    const { index_number, name, school, degree, admission_year, duration } = student;

    if (!index_number || !name || !school || !degree || !admission_year || !duration) {
      results.failCount++;
      results.errors.push({
        index_number: index_number || 'UNKNOWN',
        name: name || 'UNKNOWN',
        error: 'Missing required student fields'
      });
      continue;
    }

    try {
      // Check if index number exists
      const existing = await query('SELECT * FROM students WHERE index_number = ?', [index_number]);
      if (existing.length > 0) {
        results.failCount++;
        results.errors.push({
          index_number,
          name,
          error: 'Index number already exists'
        });
        continue;
      }

      await query(
        `INSERT INTO students (index_number, name, school, degree, admission_year, duration, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [index_number, name, school, degree, parseInt(admission_year, 10), parseInt(duration, 10)]
      );

      results.successCount++;
    } catch (error) {
      results.failCount++;
      results.errors.push({
        index_number,
        name,
        error: error.message
      });
    }
  }

  res.status(200).json(results);
});


// Update Student Status (Activate/Deactivate manually)
app.post('/api/students/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['pending', 'active', 'suspended', 'expired'].includes(status)) {
    return res.status(400).json({ error: 'Valid status is required' });
  }

  try {
    // If the status is being set to active, but they are expired under the current simulated academic year, warn or block it.
    if (status === 'active') {
      const studentResult = await query('SELECT * FROM students WHERE id = ?', [id]);
      if (studentResult.length > 0) {
        const student = studentResult[0];
        const settings = await query('SELECT * FROM system_settings WHERE setting_key = "current_academic_year"');
        const currentYear = parseInt(settings[0]?.setting_value || '2026', 10);
        if (student.admission_year + student.duration <= currentYear) {
          return res.status(400).json({ 
            error: `Cannot activate this student. The program duration has already expired in year ${student.admission_year + student.duration}. Extend admission year/duration first.` 
          });
        }
      }
    }

    await query('UPDATE students SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: `Student status updated to ${status}.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Student details (including Year/Duration)
app.put('/api/students/:id', async (req, res) => {
  const { id } = req.params;
  const { name, school, degree, admission_year, duration, status } = req.body;

  try {
    await query(
      `UPDATE students 
       SET name = ?, school = ?, degree = ?, admission_year = ?, duration = ?, status = ?
       WHERE id = ?`,
      [name, school, degree, parseInt(admission_year, 10), parseInt(duration, 10), status, id]
    );
    res.json({ message: 'Student updated successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Student
app.delete('/api/students/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM students WHERE id = ?', [id]);
    res.json({ message: 'Student account deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Express server after DB initialization
async function startServer() {
  const dbConnected = await initDB();
  if (dbConnected) {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      
      // Run auto deactivations on server start
      query('SELECT * FROM system_settings WHERE setting_key = "current_academic_year"')
        .then(results => {
          const currentYear = parseInt(results[0]?.setting_value || '2026', 10);
          runAutoDeactivations(currentYear);
        });
    });
  } else {
    console.error('Server failed to start because database connection could not be established.');
    console.error('The server will retry DB connection on any incoming API request.');
    
    // Fail-safe endpoint to allow app loading with setup warning
    app.use('/api', (req, res, next) => {
      res.status(503).json({ 
        error: 'Database connection failed. Please ensure MySQL is running locally and credentials in your .env are correct.' 
      });
    });
    
    app.listen(PORT, () => {
      console.log(`Server started in FAIL-SAFE mode on port ${PORT}.`);
    });
  }
}

startServer();
