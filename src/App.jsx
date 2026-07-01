import React, { useState, useEffect } from 'react';

const GIMPA_STRUCTURE = {
  "GIMPA Business School (GBS)": {
    "Accounting & Finance": [
      { name: "BSc in Business Administration (Accounting Option)", duration: 4 },
      { name: "BSc in Business Administration (Finance Option)", duration: 4 },
      { name: "MSc in Development Finance", duration: 2 }
    ],
    "Business Management": [
      { name: "BSc in Business Administration (HRM Option)", duration: 4 },
      { name: "BSc in Business Administration (Marketing Option)", duration: 4 },
      { name: "Master of Business Administration (MBA)", duration: 2 }
    ],
    "Management Science": [
      { name: "BSc in Procurement and Supply Chain Management", duration: 4 }
    ]
  },
  "School of Technology and Social Sciences (SOTSS)": {
    "Computer Science & Information Systems": [
      { name: "BSc in Computer Science", duration: 4 },
      { name: "BSc in Information Technology", duration: 4 },
      { name: "MSc in Information Technology", duration: 2 }
    ],
    "Economics & Applied Mathematics": [
      { name: "BSc in Economics", duration: 4 },
      { name: "MSc in Financial Economics", duration: 2 }
    ]
  },
  "GIMPA Law School": {
    "Faculty of Law": [
      { name: "Bachelor of Laws (LL.B) - Regular", duration: 4 },
      { name: "Post-First Degree LL.B", duration: 3 }
    ]
  },
  "School of Public Service and Governance (SPSG)": {
    "Public Management & International Relations": [
      { name: "Master of Public Administration (MPA)", duration: 2 },
      { name: "MA in International Relations and Diplomacy", duration: 2 }
    ],
    "Development & Policy Studies": [
      { name: "Bachelor of Public Administration", duration: 4 },
      { name: "MPhil in Development Policy", duration: 2 }
    ]
  }
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
  const [filterDept, setFilterDept] = useState('');
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
  const [newQDept, setNewQDept] = useState('');
  const [newQDegree, setNewQDegree] = useState('');
  const [newQYear, setNewQYear] = useState('2025');
  const [newQSemester, setNewQSemester] = useState('First Semester');
  const [newQFile, setNewQFile] = useState(null);
  const [uploadError, setUploadError] = useState('');

  // New Student Form State
  const [newSName, setNewSName] = useState('');
  const [newSIndex, setNewSIndex] = useState('');
  const [newSPassword, setNewSPassword] = useState('password123'); // Default password
  const [newSSchool, setNewSSchool] = useState('');
  const [newSDept, setNewSDept] = useState('');
  const [newSDegree, setNewSDegree] = useState('');
  const [newSAdmissionYear, setNewSAdmissionYear] = useState('2026');
  const [newSDuration, setNewSDuration] = useState(4);
  const [createStudentError, setCreateStudentError] = useState('');

  // Fetch initial configuration & questions
  useEffect(() => {
    fetchSystemSettings();
    fetchQuestions();
    if (user?.role === 'admin') {
      fetchStudents();
    }
  }, [user]);

  // Refetch questions on filter changes
  useEffect(() => {
    fetchQuestions();
  }, [filterSearch, filterSchool, filterDept, filterDegree, filterYear, filterSemester]);

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
      if (filterDept) queryParams.append('department', filterDept);
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword, role: loginRole })
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

    if (!newQTitle || !newQCode || !newQSchool || !newQDept || !newQDegree) {
      setUploadError('Please fill in all program fields.');
      return;
    }

    const formData = new FormData();
    formData.append('title', newQTitle);
    formData.append('course_code', newQCode);
    formData.append('school', newQSchool);
    formData.append('department', newQDept);
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

    if (!newSName || !newSIndex || !newSPassword || !newSSchool || !newSDept || !newSDegree) {
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
          password: newSPassword,
          school: newSSchool,
          department: newSDept,
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
        setNewSPassword('password123');
      } else {
        setCreateStudentError(data.error || 'Failed to create student account');
      }
    } catch (err) {
      setCreateStudentError('Network error creating student account');
    }
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

  // Cascading Dynamic Dropdowns for Creating Student
  const handleSchoolChange = (schoolVal, isQuestion = false) => {
    if (isQuestion) {
      setNewQSchool(schoolVal);
      setNewQDept('');
      setNewQDegree('');
    } else {
      setNewSSchool(schoolVal);
      setNewSDept('');
      setNewSDegree('');
    }
  };

  const handleDeptChange = (deptVal, isQuestion = false) => {
    if (isQuestion) {
      setNewQDept(deptVal);
      setNewQDegree('');
    } else {
      setNewSDept(deptVal);
      setNewSDegree('');
    }
  };

  const handleDegreeChange = (degreeVal, isQuestion = false) => {
    if (isQuestion) {
      setNewQDegree(degreeVal);
    } else {
      setNewSDegree(degreeVal);
      // Auto-set duration based on selected degree structure
      const schoolDepts = GIMPA_STRUCTURE[newSSchool];
      if (schoolDepts) {
        const degrees = schoolDepts[newSDept];
        if (degrees) {
          const matched = degrees.find(d => d.name === degreeVal);
          if (matched) {
            setNewSDuration(matched.duration);
          }
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

              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input"
                  required
                />
              </div>

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
                Demo Accounts: <code>2261001</code> (Active) or <code>2261002</code> (Graduating) / password: <code>password123</code>
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
                    setFilterDept('');
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
                  value={filterDept} 
                  onChange={(e) => {
                    setFilterDept(e.target.value);
                    setFilterDegree('');
                  }}
                  className="form-select"
                  disabled={!filterSchool}
                >
                  <option value="">All Departments</option>
                  {filterSchool && Object.keys(GIMPA_STRUCTURE[filterSchool]).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <select 
                  value={filterDegree} 
                  onChange={(e) => setFilterDegree(e.target.value)}
                  className="form-select"
                  disabled={!filterDept}
                >
                  <option value="">All Programs</option>
                  {filterDept && GIMPA_STRUCTURE[filterSchool][filterDept].map(dg => (
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
                        <button onClick={() => handleDownloadPDF(q)} className="btn btn-primary btn-sm">
                          Download PDF
                        </button>
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
                  <button onClick={() => setShowCreateStudentModal(true)} className="btn btn-primary">
                    <span>👤</span> Add Student Account
                  </button>
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

              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <select 
                    value={newQDept} 
                    onChange={(e) => handleDeptChange(e.target.value, true)}
                    className="form-select" 
                    disabled={!newQSchool}
                    required
                  >
                    <option value="">Select Department</option>
                    {newQSchool && Object.keys(GIMPA_STRUCTURE[newQSchool]).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Degree Program</label>
                  <select 
                    value={newQDegree} 
                    onChange={(e) => handleDegreeChange(e.target.value, true)}
                    className="form-select" 
                    disabled={!newQDept}
                    required
                  >
                    <option value="">Select Degree</option>
                    {newQDept && GIMPA_STRUCTURE[newQSchool][newQDept].map(dg => (
                      <option key={dg.name} value={dg.name}>{dg.name}</option>
                    ))}
                  </select>
                </div>
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

              <div className="form-row">
                <div className="form-group">
                  <label>Student Password</label>
                  <input 
                    type="password" 
                    value={newSPassword}
                    onChange={(e) => setNewSPassword(e.target.value)}
                    placeholder="password123" 
                    className="form-input" 
                    required 
                  />
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
              </div>

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

              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <select 
                    value={newSDept} 
                    onChange={(e) => handleDeptChange(e.target.value, false)}
                    className="form-select" 
                    disabled={!newSSchool}
                    required
                  >
                    <option value="">Select Department</option>
                    {newSSchool && Object.keys(GIMPA_STRUCTURE[newSSchool]).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Degree Program</label>
                  <select 
                    value={newSDegree} 
                    onChange={(e) => handleDegreeChange(e.target.value, false)}
                    className="form-select" 
                    disabled={!newSDept}
                    required
                  >
                    <option value="">Select Degree</option>
                    {newSDept && GIMPA_STRUCTURE[newSSchool][newSDept].map(dg => (
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
    </div>
  );
}
