import React, { useState, useEffect } from 'react';

const GIMPA_STRUCTURE = {
  "GIMPA Business School (GBS)": [
    { name: "BSc in Business Administration (Accounting Option)", duration: 4 },
    { name: "BSc in Business Administration (Finance Option)", duration: 4 },
    { name: "MSc in Development Finance", duration: 2 },
    { name: "BSc in Business Administration (HRM Option)", duration: 4 },
    { name: "BSc in Business Administration (Marketing Option)", duration: 4 },
    { name: "Master of Business Administration (MBA)", duration: 2 },
    { name: "BSc in Procurement and Supply Chain Management", duration: 4 }
  ],
  "School of Technology and Social Sciences (SOTSS)": [
    { name: "BSc in Computer Science", duration: 4 },
    { name: "BSc in Information Technology", duration: 4 },
    { name: "MSc in Information Technology", duration: 2 },
    { name: "BSc in Economics", duration: 4 },
    { name: "MSc in Financial Economics", duration: 2 }
  ],
  "GIMPA Law School": [
    { name: "Bachelor of Laws (LL.B) - Regular", duration: 4 },
    { name: "Post-First Degree LL.B", duration: 3 }
  ],
  "School of Public Service and Governance (SPSG)": [
    { name: "Master of Public Administration (MPA)", duration: 2 },
    { name: "MA in International Relations and Diplomacy", duration: 2 },
    { name: "Bachelor of Public Administration", duration: 4 },
    { name: "MPhil in Development Policy", duration: 2 }
  ]
};

export default function App() {
  // Auth State
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gimpa_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  // Login Form State
  const [loginRole, setLoginRole] = useState('student'); // 'student' or 'admin'
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Academic Clock State
  const [simulatedYear, setSimulatedYear] = useState(2026);
  const [simLogs, setSimLogs] = useState([]);

  // Dashboards State
  const [questions, setQuestions] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('questions'); // 'questions' or 'students' (admin only)
  
  // Filtering States for Student View
  const [filterSearch, setFilterSearch] = useState('');
  const [filterSchool, setFilterSchool] = useState('');
  const [filterDegree, setFilterDegree] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSemester, setFilterSemester] = useState('');

  // Modals / Create Forms States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateStudentModal, setShowCreateStudentModal] = useState(false);
  
  // New Question Form State
  const [newQTitle, setNewQTitle] = useState('');
  const [newQCode, setNewQCode] = useState('');
  const [newQSchool, setNewQSchool] = useState('');
  const [newQDegree, setNewQDegree] = useState('');
  const [newQYear, setNewQYear] = useState('2025');
  const [newQSemester, setNewQSemester] = useState('First Semester');
  const [newQFile, setNewQFile] = useState(null);
  const [uploadError, setUploadError] = useState('');

  // New Student Form State
  const [newSName, setNewSName] = useState('');
  const [newSIndex, setNewSIndex] = useState('');
  const [newSSchool, setNewSSchool] = useState('');
  const [newSDegree, setNewSDegree] = useState('');
  const [newSAdmissionYear, setNewSAdmissionYear] = useState('2026');
  const [newSDuration, setNewSDuration] = useState(4);
  const [createStudentError, setCreateStudentError] = useState('');

  // Bulk Student Upload States
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [parsedStudents, setParsedStudents] = useState([]);
  const [bulkUploadErrors, setBulkUploadErrors] = useState([]);
  const [bulkUploadResult, setBulkUploadResult] = useState(null);
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);

  // Fetch initial configuration & questions
  useEffect(() => {
    fetchSystemSettings();
    fetchQuestions();
    if (user?.role === 'admin') {
      fetchStudents();
    }
  }, [user]);

  // Protify Protected Viewer States
  const [showProtectedViewerModal, setShowProtectedViewerModal] = useState(false);
  const [viewingQuestionData, setViewingQuestionData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Keyboard shortcut listener to prevent Ctrl+P, Ctrl+S, Ctrl+C inside Protify Protected Viewer
  useEffect(() => {
    if (!showProtectedViewerModal) return;

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (['p', 'P', 's', 'S', 'c', 'C'].includes(e.key))) {
        e.preventDefault();
        alert('🔒 PROTIFY SECURITY NOTICE:\nDownloading, printing, saving, or copying this protected document is restricted for student accounts.');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showProtectedViewerModal]);

  const handleOpenProtectedViewer = async (q) => {
    setPreviewLoading(true);
    setShowProtectedViewerModal(true);
    try {
      const res = await fetch(`/api/questions/${q.id}/preview`);
      if (res.ok) {
        const data = await res.json();
        setViewingQuestionData(data);
      } else {
        setViewingQuestionData({
          ...q,
          content: {
            instructions: `GHANA INSTITUTE OF MANAGEMENT AND PUBLIC ADMINISTRATION (GIMPA)\n${q.school.toUpperCase()}\n${q.degree.toUpperCase()}\n\nEND OF ${q.semester.toUpperCase()} EXAMINATIONS - ${q.year}\nCOURSE: ${q.course_code} - ${q.title.toUpperCase()}\nTIME ALLOWED: 3 HOURS\n\nINSTRUCTIONS: Answer ALL questions in Section A and ANY TWO questions in Section B.`,
            sections: [
              {
                name: "SECTION A (Compulsory - 40 Marks)",
                questions: [
                  `1. Discuss the core principles of ${q.title} within ${q.school}. [20 Marks]`,
                  `2. Analyze practical applications of ${q.course_code} for ${q.degree}. [20 Marks]`
                ]
              }
            ]
          }
        });
      }
    } catch (err) {
      console.error("Failed to load paper preview", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Refetch questions on filter changes
  useEffect(() => {
    fetchQuestions();
  }, [filterSearch, filterSchool, filterDegree, filterYear, filterSemester]);

  const fetchSystemSettings = async () => {
    try {
      const res = await fetch('/api/system/settings');
      if (res.ok) {
        const data = await res.json();
        setSimulatedYear(data.current_academic_year);
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
    }
  };

  const fetchQuestions = async () => {
    try {
      let queryParams = new URLSearchParams();
      if (filterSearch) queryParams.append('search', filterSearch);
      if (filterSchool) queryParams.append('school', filterSchool);
      if (filterDegree) queryParams.append('degree', filterDegree);
      if (filterYear) queryParams.append('year', filterYear);
      if (filterSemester) queryParams.append('semester', filterSemester);
      
      const res = await fetch(`/api/questions?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } catch (err) {
      console.error("Failed to fetch questions", err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students');
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      console.error("Failed to fetch students", err);
    }
  };

  // Auth Handling
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const payload = {
        username: loginUsername.trim().split(/\s+/)[0],
        role: loginRole
      };
      if (loginRole === 'admin') {
        payload.password = loginPassword;
      }
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (!res.ok) {
        setLoginError(data.error || 'Authentication failed');
        return;
      }
      
      localStorage.setItem('gimpa_user', JSON.stringify(data.user));
      setUser(data.user);
      setLoginUsername('');
      setLoginPassword('');
    } catch (err) {
      setLoginError('Could not connect to the authentication server.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gimpa_user');
    setUser(null);
    setStudents([]);
  };

  // Simulated Year Slider Handler
  const handleYearSliderChange = async (e) => {
    const newYear = parseInt(e.target.value, 10);
    setSimulatedYear(newYear);
    
    try {
      const res = await fetch('/api/system/year', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: newYear })
      });
      const data = await res.json();
      if (res.ok) {
        // Add log entry
        const timestamp = new Date().toLocaleTimeString();
        let logText = `[${timestamp}] Academic Clock set to Year ${newYear}.`;
        if (data.deactivatedCount > 0) {
          logText += ` AUTO-DEACTIVATED: ${data.deactivatedStudents.join(', ')}`;
          // Refresh student list if in admin dashboard
          if (user?.role === 'admin') {
            fetchStudents();
          }
          // If current logged-in student has expired, auto logout!
          if (user?.role === 'student') {
            const gradYear = user.admission_year + user.duration;
            if (gradYear <= newYear) {
              alert(`Your student account has expired (Graduation: Year ${gradYear}). Logging out.`);
              handleLogout();
            }
          }
        } else {
          logText += ' No new account expirations.';
        }
        setSimLogs(prev => [
          { text: logText, isDeactivation: data.deactivatedCount > 0 },
          ...prev.slice(0, 19) // limit to 20 logs
        ]);
      }
    } catch (err) {
      console.error("Failed to update simulated year", err);
    }
  };

  // Upload Question Handling
  const handleUploadQuestion = async (e) => {
    e.preventDefault();
    setUploadError('');

    if (!newQTitle || !newQCode || !newQSchool || !newQDegree) {
      setUploadError('Please fill in all program fields.');
      return;
    }

    const formData = new FormData();
    formData.append('title', newQTitle);
    formData.append('course_code', newQCode);
    formData.append('school', newQSchool);
    formData.append('degree', newQDegree);
    formData.append('year', newQYear);
    formData.append('semester', newQSemester);
    if (newQFile) {
      formData.append('pdf', newQFile);
    }

    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        fetchQuestions();
        setShowUploadModal(false);
        // Reset fields
        setNewQTitle('');
        setNewQCode('');
        setNewQFile(null);
      } else {
        const data = await res.json();
        setUploadError(data.error || 'Failed to upload question');
      }
    } catch (err) {
      setUploadError('Network error uploading question');
    }
  };

  // Create Student Account Handling
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setCreateStudentError('');

    if (!newSName || !newSIndex || !newSSchool || !newSDegree) {
      setCreateStudentError('Please fill in all student details.');
      return;
    }

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSName,
          index_number: newSIndex,
          school: newSSchool,
          degree: newSDegree,
          admission_year: parseInt(newSAdmissionYear, 10),
          duration: parseInt(newSDuration, 10)
        })
      });
      const data = await res.json();

      if (res.ok) {
        fetchStudents();
        setShowCreateStudentModal(false);
        // Reset fields
        setNewSName('');
        setNewSIndex('');
      } else {
        setCreateStudentError(data.error || 'Failed to create student account');
      }
    } catch (err) {
      setCreateStudentError('Network error creating student account');
    }
  };

  // Download CSV template for bulk student upload
  const handleDownloadTemplate = () => {
    const headers = ['index_number', 'name', 'school', 'degree', 'admission_year'];
    const rows = [
      ['2261004', 'John Doe', 'School of Technology and Social Sciences (SOTSS)', 'BSc in Computer Science', '2026'],
      ['2261005', 'Jane Smith', 'GIMPA Business School (GBS)', 'BSc in Business Administration (Accounting Option)', '2026']
    ];
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "gimpa_students_bulk_upload_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Find canonical school and degree from user input (case-insensitive check)
  const findCanonicalSchoolAndDegree = (schoolInput, degreeInput) => {
    const schoolKeys = Object.keys(GIMPA_STRUCTURE);
    const matchedSchool = schoolKeys.find(s => s.toLowerCase() === schoolInput.trim().toLowerCase());
    
    if (matchedSchool) {
      const degrees = GIMPA_STRUCTURE[matchedSchool];
      const matchedDegree = degrees.find(d => d.name.toLowerCase() === degreeInput.trim().toLowerCase());
      if (matchedDegree) {
        return {
          school: matchedSchool,
          degree: matchedDegree.name,
          duration: matchedDegree.duration,
          isValid: true
        };
      }
    }
    return {
      school: schoolInput.trim(),
      degree: degreeInput.trim(),
      duration: 4,
      isValid: false
    };
  };

  // Handle file selection and parsing
  const handleCSVFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setBulkUploadFile(file);
    setBulkUploadErrors([]);
    setBulkUploadResult(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      parseCSVContent(text);
    };
    reader.readAsText(file);
  };

  // Parsing CSV text content into array of student objects
  const parseCSVContent = (text) => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0 || (lines.length === 1 && !lines[0].trim())) {
      setBulkUploadErrors(['The uploaded CSV file is empty.']);
      return;
    }
    
    // Parse header line
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
    
    const indexIdx = headers.indexOf('index_number');
    const nameIdx = headers.indexOf('name');
    const schoolIdx = headers.indexOf('school');
    const degreeIdx = headers.indexOf('degree');
    const yearIdx = headers.indexOf('admission_year');
    
    if (indexIdx === -1 || nameIdx === -1 || schoolIdx === -1 || degreeIdx === -1 || yearIdx === -1) {
      setBulkUploadErrors(['CSV header is invalid. It must contain: index_number, name, school, degree, admission_year']);
      return;
    }
    
    const studentsList = [];
    const errorsList = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip blank lines
      
      // Basic CSV line parser to handle quoted fields containing commas
      const row = [];
      let insideQuote = false;
      let currentField = '';
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"' || char === "'") {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          row.push(currentField.trim().replace(/^["']|["']$/g, ''));
          currentField = '';
        } else {
          currentField += char;
        }
      }
      row.push(currentField.trim().replace(/^["']|["']$/g, ''));
      
      if (row.length < headers.length) {
        errorsList.push(`Line ${i + 1}: Incomplete fields. Check if commas are placed correctly.`);
        continue;
      }
      
      const indexNum = row[indexIdx];
      const name = row[nameIdx];
      const schoolInput = row[schoolIdx];
      const degreeInput = row[degreeIdx];
      const yearStr = row[yearIdx];
      const admissionYear = parseInt(yearStr, 10);
      
      if (!indexNum || !name || !schoolInput || !degreeInput || isNaN(admissionYear)) {
        errorsList.push(`Line ${i + 1}: Missing or invalid required fields (e.g. index number, name, school, degree, or admission year).`);
        continue;
      }
      
      // Validate and canonicalize school/degree
      const lookup = findCanonicalSchoolAndDegree(schoolInput, degreeInput);
      
      studentsList.push({
        index_number: indexNum,
        name: name,
        school: lookup.school,
        degree: lookup.degree,
        admission_year: admissionYear,
        duration: lookup.duration,
        isValid: lookup.isValid,
        lineNum: i + 1
      });
    }
    
    setParsedStudents(studentsList);
    
    if (errorsList.length > 0) {
      setBulkUploadErrors(errorsList);
    }
  };

  // Submit bulk student data to server
  const handleBulkUploadSubmit = async () => {
    const invalidCount = parsedStudents.filter(s => !s.isValid).length;
    if (invalidCount > 0) {
      alert(`Please fix the ${invalidCount} invalid rows with unrecognized school/degree details in your CSV before uploading.`);
      return;
    }
    
    if (parsedStudents.length === 0) {
      alert("No valid students found in the CSV to upload.");
      return;
    }
    
    setIsUploadingBulk(true);
    setBulkUploadErrors([]);
    
    try {
      const res = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: parsedStudents })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setBulkUploadResult(data);
        fetchStudents(); // Refresh the list in the directory
      } else {
        setBulkUploadErrors([data.error || 'Server rejected bulk import request.']);
      }
    } catch (err) {
      setBulkUploadErrors(['Network error sending student list to server.']);
    } finally {
      setIsUploadingBulk(false);
    }
  };

  const resetBulkUploadState = () => {
    setBulkUploadFile(null);
    setParsedStudents([]);
    setBulkUploadErrors([]);
    setBulkUploadResult(null);
  };

  // Change Student Account Activation Status
  const handleToggleStudentStatus = async (studentId, currentStatus) => {
    // If active -> toggle to suspended. If suspended/pending -> toggle to active
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/students/${studentId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        fetchStudents();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to toggle student activation');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Student Account
  const handleDeleteStudent = async (studentId) => {
    if (!confirm('Are you sure you want to delete this student account permanently?')) return;
    try {
      const res = await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchStudents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Cascading Dynamic Dropdowns for Creating Student / Uploading Question
  const handleSchoolChange = (schoolVal, isQuestion = false) => {
    if (isQuestion) {
      setNewQSchool(schoolVal);
      setNewQDegree('');
    } else {
      setNewSSchool(schoolVal);
      setNewSDegree('');
    }
  };

  const handleDegreeChange = (degreeVal, isQuestion = false) => {
    if (isQuestion) {
      setNewQDegree(degreeVal);
    } else {
      setNewSDegree(degreeVal);
      // Auto-set duration based on selected degree structure
      const degrees = GIMPA_STRUCTURE[newSSchool];
      if (degrees) {
        const matched = degrees.find(d => d.name === degreeVal);
        if (matched) {
          setNewSDuration(matched.duration);
        }
      }
    }
  };

  // Mock PDF viewer / downloader triggers
  const handleDownloadPDF = (q) => {
    // Generate a simple simulated PDF text file download
    const element = document.createElement("a");
    const file = new Blob([`%PDF-1.4\n% GIMPA PAST QUESTIONS ARCHIVE\nCourse: ${q.course_code} - ${q.title}\nSchool: ${q.school}\nDegree: ${q.degree}\nYear: ${q.year}\nSemester: ${q.semester}\nThis is a simulated Past Question PDF document for study verification.`], {type: 'application/pdf'});
    element.href = URL.createObjectURL(file);
    element.download = `${q.course_code}_${q.year}_Semester_${q.semester === 'First Semester' ? '1' : '2'}.pdf`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Calculate graduation stats for logged in student
  const studentGradYear = user ? user.admission_year + user.duration : 0;
  const studentRemainingYears = user ? studentGradYear - simulatedYear : 0;

  return (
    <div className="app-container">
      {/* Header Navigation */}
      <header className="glass-panel">
        <div className="logo-container">
          <div className="logo-gimpa">G</div>
          <div>
            <div className="logo-text">GIMPA Repository</div>
            <div className="logo-subtitle">Past Questions Library</div>
          </div>
        </div>

        <div className="nav-user">
          {/* Simulated Academic Clock indicator */}
          <div className="sim-year-nav" title="This represents the simulated timeline for testing account expirations">
            Academic Year: {simulatedYear}
          </div>

          {user && (
            <>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-role">
                  {user.role === 'admin' ? 'Librarian Admin' : `Student (${user.index_number})`}
                </span>
              </div>
              <button onClick={handleLogout} className="btn btn-secondary">
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      {!user ? (
        /* 1. Login Page */
        <div className="login-wrapper">
          <div className="login-card glass-panel">
            <div className="login-header">
              <h2>Sign In</h2>
              <p>Access GIMPA past questions portal</p>
            </div>

            <div className="login-toggle">
              <button 
                onClick={() => { setLoginRole('student'); setLoginError(''); }} 
                className={`login-toggle-btn ${loginRole === 'student' ? 'active' : ''}`}
              >
                Student
              </button>
              <button 
                onClick={() => { setLoginRole('admin'); setLoginError(''); }} 
                className={`login-toggle-btn ${loginRole === 'admin' ? 'active' : ''}`}
              >
                Library Admin
              </button>
            </div>

            {loginError && <div className="error-message">{loginError}</div>}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>{loginRole === 'student' ? 'Index Number' : 'Admin Username'}</label>
                <input 
                  type="text" 
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder={loginRole === 'student' ? 'e.g. 2261001' : 'e.g. admin'}
                  className="form-input"
                  required
                />
              </div>

              {loginRole === 'admin' && (
                <div className="form-group">
                  <label>Admin Password</label>
                  <input 
                    type="password" 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="form-input"
                    required
                  />
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                Login as {loginRole === 'student' ? 'Student' : 'Librarian'}
              </button>
            </form>
            
            {loginRole === 'admin' && (
              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Demo Credentials: <code>admin</code> / <code>password</code>
              </div>
            )}
            {loginRole === 'student' && (
              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Demo Accounts: <code>2261001</code> (Active) or <code>2261002</code> (Graduating) (No Password Required)
              </div>
            )}
          </div>
        </div>
      ) : user.role === 'student' ? (
        /* 2. Student Dashboard Portal */
        <div className="dashboard-content">
          {/* Sidebar */}
          <aside className="dashboard-sidebar">
            <div className="sidebar-info-card glass-panel">
              <h3 className="sidebar-info-header">My Profile</h3>
              
              <div className="info-item">
                <div className="info-label">Student Name</div>
                <div className="info-val">{user.name}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Index Number</div>
                <div className="info-val">{user.index_number}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Degree Program</div>
                <div className="info-val" style={{ fontSize: '0.8rem' }}>{user.degree}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Admission Year</div>
                <div className="info-val">{user.admission_year}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Graduation Year</div>
                <div className="info-val">{studentGradYear} ({user.duration} years)</div>
              </div>
              <div className="info-item">
                <div className="info-label">Account Status</div>
                <div className="info-val">
                  <span className="badge badge-active">Active</span>
                </div>
              </div>
            </div>

            {/* Expired Deactivation Warning */}
            {studentRemainingYears === 1 && (
              <div className="warning-banner">
                <div style={{ fontSize: '1.2rem' }}>⚠️</div>
                <div>
                  <strong>Deactivation Warning:</strong> Your account will be automatically deactivated next year (Year {studentGradYear}) due to program completion.
                </div>
              </div>
            )}

            {/* Academic Clock slider for Student to inspect (useful for demo testing) */}
            <div className="simulation-panel glass-panel">
              <h3>Academic Timeline</h3>
              <div className="sim-slider-container">
                <div className="sim-slider-labels">
                  <span>Current: {simulatedYear}</span>
                  <span>Max: 2032</span>
                </div>
                <input 
                  type="range" 
                  min="2025" 
                  max="2032" 
                  value={simulatedYear}
                  onChange={handleYearSliderChange}
                  className="sim-slider"
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                Use this slider to fast-forward GIMPA academic clock and verify account auto-deactivation logic on your student profile.
              </p>
            </div>
          </aside>

          {/* Main Question Catalog */}
          <main className="dashboard-main">
            {/* Search & Filters block */}
            <section className="filters-bar glass-panel">
              <h3 style={{ marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>Search Past Papers</h3>
              <div className="filters-grid">
                <input 
                  type="text" 
                  placeholder="Search course title or code..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="form-input"
                />
                
                <select 
                  value={filterSchool} 
                  onChange={(e) => {
                    setFilterSchool(e.target.value);
                    setFilterDegree('');
                  }}
                  className="form-select"
                >
                  <option value="">All Schools</option>
                  {Object.keys(GIMPA_STRUCTURE).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select 
                  value={filterDegree} 
                  onChange={(e) => setFilterDegree(e.target.value)}
                  className="form-select"
                  disabled={!filterSchool}
                >
                  <option value="">All Programs</option>
                  {filterSchool && GIMPA_STRUCTURE[filterSchool].map(dg => (
                    <option key={dg.name} value={dg.name}>{dg.name}</option>
                  ))}
                </select>
              </div>

              <div className="filters-grid" style={{ marginTop: '16px' }}>
                <select 
                  value={filterYear} 
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="form-select"
                >
                  <option value="">All Academic Years</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                </select>

                <select 
                  value={filterSemester} 
                  onChange={(e) => setFilterSemester(e.target.value)}
                  className="form-select"
                >
                  <option value="">All Semesters</option>
                  <option value="First Semester">First Semester</option>
                  <option value="Second Semester">Second Semester</option>
                </select>
              </div>
            </section>

            {/* Question Catalog List */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: '700' }}>Past Papers catalog ({questions.length})</h3>
              </div>

              {questions.length === 0 ? (
                <div className="empty-state glass-panel">
                  <h4>No Past Questions Found</h4>
                  <p>Try resetting filters or search query.</p>
                </div>
              ) : (
                <div className="questions-grid">
                  {questions.map((q) => (
                    <div key={q.id} className="question-card glass-panel">
                      <div>
                        <span className="q-code">{q.course_code}</span>
                        <h4 className="q-title">{q.title}</h4>
                        
                        <div className="q-metadata">
                          <div className="q-meta-row">
                            <span className="q-meta-icon">🏢</span>
                            <span>{q.school}</span>
                          </div>
                          <div className="q-meta-row">
                            <span className="q-meta-icon">🎓</span>
                            <span style={{ fontSize: '0.75rem' }}>{q.degree}</span>
                          </div>
                          <div className="q-meta-row">
                            <span className="q-meta-icon">📅</span>
                            <span>{q.year} - {q.semester}</span>
                          </div>
                        </div>
                      </div>

                      <div className="q-actions">
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Uploaded: {new Date(q.uploaded_at).toLocaleDateString()}</span>
                        {user?.role === 'student' ? (
                          <button 
                            onClick={() => handleOpenProtectedViewer(q)} 
                            className="btn btn-primary btn-sm"
                            style={{ background: 'linear-gradient(135deg, #4f46e5, #06b6d4)' }}
                          >
                            🔒 View Paper (Protected)
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => handleOpenProtectedViewer(q)} 
                              className="btn btn-secondary btn-sm"
                            >
                              👁️ Preview
                            </button>
                            <button 
                              onClick={() => handleDownloadPDF(q)} 
                              className="btn btn-primary btn-sm"
                            >
                              Download PDF
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </main>
        </div>
      ) : (
        /* 3. Librarian Admin Dashboard Portal */
        <div className="dashboard-content">
          {/* Sidebar Controls */}
          <aside className="dashboard-sidebar">
            {/* Database Stats */}
            <div className="sidebar-info-card glass-panel" style={{ padding: '20px' }}>
              <h3 className="sidebar-info-header" style={{ marginBottom: '12px' }}>Library Stats</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div className="info-label">Total Past Papers</div>
                  <div className="stat-value" style={{ fontSize: '1.5rem' }}>{questions.length}</div>
                </div>
                <div>
                  <div className="info-label">Total Accounts Registered</div>
                  <div className="stat-value" style={{ fontSize: '1.5rem', color: '#818cf8' }}>{students.length}</div>
                </div>
                <div>
                  <div className="info-label">Pending Activations</div>
                  <div className="stat-value" style={{ fontSize: '1.5rem', color: '#fbbf24' }}>
                    {students.filter(s => s.status === 'pending').length}
                  </div>
                </div>
                <div>
                  <div className="info-label">Expired (Auto-Deactivated)</div>
                  <div className="stat-value" style={{ fontSize: '1.5rem', color: '#f87171' }}>
                    {students.filter(s => s.status === 'expired').length}
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Clock Control Console */}
            <div className="simulation-panel glass-panel">
              <h3>Academic Clock System</h3>
              <div className="sim-slider-container">
                <div className="sim-slider-labels">
                  <span>Current Year: {simulatedYear}</span>
                  <span>Max: 2032</span>
                </div>
                <input 
                  type="range" 
                  min="2025" 
                  max="2032" 
                  value={simulatedYear}
                  onChange={handleYearSliderChange}
                  className="sim-slider"
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="info-label">Simulation Console Logs</div>
                <div className="simulation-logs">
                  {simLogs.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Logs will output here when slider is moved...</div>
                  ) : (
                    simLogs.map((log, index) => (
                      <div key={index} className={`log-entry ${log.isDeactivation ? 'log-deactivation' : ''}`}>
                        {log.text}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Management Hub */}
          <main className="dashboard-main">
            {/* Tabs Selector */}
            <div className="admin-tabs">
              <button 
                onClick={() => setActiveTab('questions')} 
                className={`admin-tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
              >
                Manage Past Questions
              </button>
              <button 
                onClick={() => setActiveTab('students')} 
                className={`admin-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
              >
                Manage Student Accounts
              </button>
            </div>

            {/* TAB 1: Manage Past Questions */}
            {activeTab === 'questions' && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: '700' }}>Past Papers catalog ({questions.length})</h3>
                  <button onClick={() => setShowUploadModal(true)} className="btn btn-primary">
                    <span>➕</span> Upload New Paper
                  </button>
                </div>

                {questions.length === 0 ? (
                  <div className="empty-state glass-panel">
                    <h4>No Past Questions Uploaded Yet</h4>
                    <p>Click "Upload New Paper" above to seed questions.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Course</th>
                          <th>School & Program</th>
                          <th>Year / Sem</th>
                          <th>File Name</th>
                          <th>Upload Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questions.map((q) => (
                          <tr key={q.id}>
                            <td>
                              <div style={{ fontWeight: '600' }}>{q.title}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>{q.course_code}</div>
                            </td>
                            <td>
                              <div>{q.school}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{q.degree}</div>
                            </td>
                            <td>{q.year} - {q.semester}</td>
                            <td>📁 {q.file_name}</td>
                            <td>{new Date(q.uploaded_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* TAB 2: Manage Student Accounts */}
            {activeTab === 'students' && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: '700' }}>Student Access Directory ({students.length})</h3>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setShowBulkUploadModal(true)} className="btn btn-secondary">
                      <span>📥</span> Bulk Upload Students
                    </button>
                    <button onClick={() => setShowCreateStudentModal(true)} className="btn btn-primary">
                      <span>👤</span> Add Student Account
                    </button>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Index & Name</th>
                        <th>School & Degree Program</th>
                        <th>Admission</th>
                        <th>Graduation (Duration)</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => {
                        const gradYear = s.admission_year + s.duration;
                        const isExpired = gradYear <= simulatedYear;
                        return (
                          <tr key={s.id} className={isExpired ? 'status-expired' : ''}>
                            <td>
                              <div className="student-table-name">{s.name}</div>
                              <div className="student-table-sub">Index: {s.index_number}</div>
                            </td>
                            <td>
                              <div>{s.school}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.degree}</div>
                            </td>
                            <td>{s.admission_year}</td>
                            <td>
                              <div>Year {gradYear}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({s.duration} years)</div>
                            </td>
                            <td>
                              <span className={`badge badge-${s.status}`}>
                                {s.status === 'expired' ? 'Expired (Auto)' : s.status}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions">
                                {s.status !== 'expired' ? (
                                  <button 
                                    onClick={() => handleToggleStudentStatus(s.id, s.status)}
                                    className={`btn btn-secondary ${s.status === 'active' ? 'btn-danger' : 'btn-primary'}`}
                                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                  >
                                    {s.status === 'active' ? 'Suspend' : 'Activate'}
                                  </button>
                                ) : (
                                  <button 
                                    disabled
                                    className="btn btn-secondary" 
                                    style={{ padding: '6px 12px', fontSize: '0.75rem', opacity: 0.5, cursor: 'not-allowed' }}
                                    title="Expired student accounts cannot be manually activated without expanding program duration"
                                  >
                                    Expired
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDeleteStudent(s.id)}
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--danger)' }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </main>
        </div>
      )}

      {/* 4. MODAL: Upload Past Paper */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Upload Past Question</h3>
              <button onClick={() => { setShowUploadModal(false); setUploadError(''); }} className="modal-close">×</button>
            </div>
            
            {uploadError && <div className="error-message">{uploadError}</div>}

            <form onSubmit={handleUploadQuestion}>
              <div className="form-row">
                <div className="form-group">
                  <label>Course Title</label>
                  <input 
                    type="text" 
                    value={newQTitle}
                    onChange={(e) => setNewQTitle(e.target.value)}
                    placeholder="e.g. Constitutional Law I" 
                    className="form-input" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Course Code</label>
                  <input 
                    type="text" 
                    value={newQCode}
                    onChange={(e) => setNewQCode(e.target.value)}
                    placeholder="e.g. LAW-101" 
                    className="form-input" 
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>GIMPA School</label>
                <select 
                  value={newQSchool} 
                  onChange={(e) => handleSchoolChange(e.target.value, true)}
                  className="form-select" 
                  required
                >
                  <option value="">Select School</option>
                  {Object.keys(GIMPA_STRUCTURE).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Degree Program</label>
                <select 
                  value={newQDegree} 
                  onChange={(e) => handleDegreeChange(e.target.value, true)}
                  className="form-select" 
                  disabled={!newQSchool}
                  required
                >
                  <option value="">Select Degree</option>
                  {newQSchool && GIMPA_STRUCTURE[newQSchool].map(dg => (
                    <option key={dg.name} value={dg.name}>{dg.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Academic Year</label>
                  <select 
                    value={newQYear} 
                    onChange={(e) => setNewQYear(e.target.value)}
                    className="form-select" 
                    required
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Semester</label>
                  <select 
                    value={newQSemester} 
                    onChange={(e) => setNewQSemester(e.target.value)}
                    className="form-select" 
                    required
                  >
                    <option value="First Semester">First Semester</option>
                    <option value="Second Semester">Second Semester</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Question PDF File (Simulated attachment)</label>
                <input 
                  type="file" 
                  accept="application/pdf"
                  onChange={(e) => setNewQFile(e.files ? e.files[0] : null)}
                  className="form-input" 
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  If no file is uploaded, the library server automatically generates a mock PDF document template.
                </span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                Upload Past Question
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5b. MODAL: Bulk Upload Students */}
      {showBulkUploadModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="modal-header">
              <h3>Bulk Upload Student Accounts</h3>
              <button 
                onClick={() => { setShowBulkUploadModal(false); resetBulkUploadState(); }} 
                className="modal-close"
              >
                ×
              </button>
            </div>
            
            {!bulkUploadResult ? (
              <>
                <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: '600', color: 'var(--primary-hover)' }}>💡 Bulk Upload Instructions:</div>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-muted)' }}>
                    <li>Please upload a <strong>CSV (.csv)</strong> file.</li>
                    <li>The CSV must contain headers in the first row: <code style={{ color: 'var(--text-main)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>index_number, name, school, degree, admission_year</code></li>
                    <li>GIMPA School and Degree Program names must match our structure case-insensitively (e.g. <code>School of Technology and Social Sciences (SOTSS)</code> and <code>BSc in Computer Science</code>).</li>
                    <li>Program duration (duration of study) will be automatically assigned.</li>
                  </ul>
                  <button 
                    onClick={handleDownloadTemplate} 
                    className="btn btn-secondary" 
                    style={{ alignSelf: 'flex-start', marginTop: '10px' }}
                  >
                    <span>⬇️</span> Download CSV Template
                  </button>
                </div>

                <div className="form-group">
                  <label>Select Student CSV File</label>
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={handleCSVFileChange}
                    className="form-input" 
                    style={{ padding: '12px' }}
                  />
                </div>

                {bulkUploadErrors.length > 0 && (
                  <div className="error-message" style={{ maxHeight: '120px', overflowY: 'auto', textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', marginBottom: '6px' }}>Format & Parsing Errors:</div>
                    <ul style={{ paddingLeft: '16px' }}>
                      {bulkUploadErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {parsedStudents.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                      Parsed Students Summary ({parsedStudents.length} rows found)
                    </div>
                    <div className="table-wrapper" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: '60px' }}>Status</th>
                            <th>Index Number</th>
                            <th>Name</th>
                            <th>School & Degree Program</th>
                            <th>Admission</th>
                            <th>Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedStudents.map((s, idx) => (
                            <tr key={idx} style={{ opacity: s.isValid ? 1 : 0.6 }}>
                              <td>
                                {s.isValid ? (
                                  <span style={{ color: '#10b981', fontWeight: 'bold' }} title="Valid program selection">✓</span>
                                ) : (
                                  <span style={{ color: '#ef4444', fontWeight: 'bold' }} title="Invalid program or school - will be ignored">✗</span>
                                )}
                              </td>
                              <td>{s.index_number}</td>
                              <td>{s.name}</td>
                              <td>
                                <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>{s.school}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.degree}</div>
                                {!s.isValid && (
                                  <div style={{ color: '#f87171', fontSize: '0.7rem', marginTop: '2px' }}>
                                    ⚠️ Unrecognized School/Degree Program combination
                                  </div>
                                )}
                              </td>
                              <td>{s.admission_year}</td>
                              <td>{s.duration} years</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                  <button 
                    onClick={() => { setShowBulkUploadModal(false); resetBulkUploadState(); }} 
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleBulkUploadSubmit} 
                    disabled={isUploadingBulk || parsedStudents.length === 0 || parsedStudents.some(s => !s.isValid)} 
                    className="btn btn-primary"
                  >
                    {isUploadingBulk ? 'Uploading...' : `Upload ${parsedStudents.filter(s => s.isValid).length} Accounts`}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '3rem' }}>🎉</div>
                <h4 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Bulk Import Completed!</h4>
                
                <div style={{ display: 'flex', justifyContent: 'space-around', margin: '10px 0' }}>
                  <div className="glass-panel" style={{ padding: '16px', minWidth: '120px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>{bulkUploadResult.successCount}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Successfully Added</div>
                  </div>
                  <div className="glass-panel" style={{ padding: '16px', minWidth: '120px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: bulkUploadResult.failCount > 0 ? '#ef4444' : 'var(--text-muted)' }}>{bulkUploadResult.failCount}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Failed/Skipped</div>
                  </div>
                </div>

                {bulkUploadResult.errors.length > 0 && (
                  <div className="glass-panel" style={{ padding: '16px', textAlign: 'left', maxHeight: '180px', overflowY: 'auto' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#f87171', marginBottom: '8px' }}>
                      Failed Entries Details:
                    </div>
                    <ul style={{ fontSize: '0.8rem', paddingLeft: '16px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {bulkUploadResult.errors.map((err, idx) => (
                        <li key={idx}>
                          <strong>{err.index_number} ({err.name})</strong>: {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button 
                  onClick={() => { setShowBulkUploadModal(false); resetBulkUploadState(); }} 
                  className="btn btn-primary" 
                  style={{ alignSelf: 'center', marginTop: '10px', minWidth: '150px' }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. MODAL: Register Student Account */}
      {showCreateStudentModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Create Student Account</h3>
              <button onClick={() => { setShowCreateStudentModal(false); setCreateStudentError(''); }} className="modal-close">×</button>
            </div>
            
            {createStudentError && <div className="error-message">{createStudentError}</div>}

            <form onSubmit={handleCreateStudent}>
              <div className="form-row">
                <div className="form-group">
                  <label>Student Full Name</label>
                  <input 
                    type="text" 
                    value={newSName}
                    onChange={(e) => setNewSName(e.target.value)}
                    placeholder="e.g. Kofi Mensah" 
                    className="form-input" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Index Number (Student Login Username)</label>
                  <input 
                    type="text" 
                    value={newSIndex}
                    onChange={(e) => setNewSIndex(e.target.value)}
                    placeholder="e.g. 2261004" 
                    className="form-input" 
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Admission Year</label>
                <select 
                  value={newSAdmissionYear} 
                  onChange={(e) => setNewSAdmissionYear(e.target.value)}
                  className="form-select" 
                  required
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>GIMPA School</label>
                  <select 
                    value={newSSchool} 
                    onChange={(e) => handleSchoolChange(e.target.value, false)}
                    className="form-select" 
                    required
                  >
                    <option value="">Select School</option>
                    {Object.keys(GIMPA_STRUCTURE).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Degree Program</label>
                  <select 
                    value={newSDegree} 
                    onChange={(e) => handleDegreeChange(e.target.value, false)}
                    className="form-select" 
                    disabled={!newSSchool}
                    required
                  >
                    <option value="">Select Degree</option>
                    {newSSchool && GIMPA_STRUCTURE[newSSchool].map(dg => (
                      <option key={dg.name} value={dg.name}>{dg.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Duration of Study (Years) - Automatically Set</label>
                <input 
                  type="number" 
                  value={newSDuration} 
                  onChange={(e) => setNewSDuration(parseInt(e.target.value, 10))}
                  className="form-input" 
                  required 
                  min="1"
                  max="6"
                  style={{ background: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-muted)' }}
                  readOnly
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  This program duration will dictate when the account is automatically deactivated (Admission Year + Duration).
                </span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                Create Student Account (Pending Activation)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: Protify Protected Paper Viewer */}
      {showProtectedViewerModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel protected-modal" onContextMenu={(e) => e.preventDefault()}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem' }}>
                  {viewingQuestionData?.course_code} - {viewingQuestionData?.title}
                </h3>
              </div>
              <button 
                onClick={() => { setShowProtectedViewerModal(false); setViewingQuestionData(null); }} 
                className="modal-close"
              >
                ×
              </button>
            </div>


            {previewLoading ? (
              <div className="empty-state" style={{ padding: '40px' }}>Loading protected document preview...</div>
            ) : (
              <div className="protected-paper-wrapper">
                {/* Diagonal Repeat Watermark Overlay */}
                <div className="protify-watermark-layer">
                  <div className="watermark-line">GIMPA CONFIDENTIAL • STUDENT INDEX: {user?.index_number || 'STUDENT'} • DO NOT COPY • PROTIFY PROTECTED</div>
                  <div className="watermark-line">GIMPA CONFIDENTIAL • STUDENT INDEX: {user?.index_number || 'STUDENT'} • DO NOT COPY • PROTIFY PROTECTED</div>
                  <div className="watermark-line">GIMPA CONFIDENTIAL • STUDENT INDEX: {user?.index_number || 'STUDENT'} • DO NOT COPY • PROTIFY PROTECTED</div>
                  <div className="watermark-line">GIMPA CONFIDENTIAL • STUDENT INDEX: {user?.index_number || 'STUDENT'} • DO NOT COPY • PROTIFY PROTECTED</div>
                </div>

                {/* Exam Paper Body */}
                <div className="exam-document-body">
                  <div className="exam-header-banner">
                    <div className="gimpa-institute-title">GHANA INSTITUTE OF MANAGEMENT AND PUBLIC ADMINISTRATION</div>
                    <div className="school-title">{viewingQuestionData?.school}</div>
                    <div className="degree-title">{viewingQuestionData?.degree}</div>
                    <div className="exam-details-meta">
                      <div><strong>COURSE CODE & TITLE:</strong> {viewingQuestionData?.course_code} - {viewingQuestionData?.title}</div>
                      <div><strong>PERIOD:</strong> {viewingQuestionData?.semester} ({viewingQuestionData?.year})</div>
                    </div>
                  </div>

                  <div className="exam-instructions">
                    <pre style={{ fontFamily: 'var(--font-body)', whiteSpace: 'pre-wrap', fontSize: '0.85rem', margin: 0 }}>
                      {viewingQuestionData?.content?.instructions}
                    </pre>
                  </div>

                  {viewingQuestionData?.content?.sections?.map((sec, idx) => (
                    <div key={idx} className="exam-section-block">
                      <h4 className="exam-section-title">{sec.name}</h4>
                      {sec.questions.map((qText, qIdx) => (
                        <div key={qIdx} className="exam-question-card">
                          <pre style={{ fontFamily: 'var(--font-body)', whiteSpace: 'pre-wrap', fontSize: '0.9rem', margin: 0 }}>
                            {qText}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
