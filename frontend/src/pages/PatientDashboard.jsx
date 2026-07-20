import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarCheck, LogOut, MessageSquare, Search, Send, Sparkles, Star, X, Menu, Calendar, Clock, MapPin, Award, Activity, Heart, ShieldAlert, BookOpen, Settings, User } from 'lucide-react';
import logo from '../assets/healthbirch-logo.png';
import { signOut, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import api from '../services/api';
import { auth } from '../services/firebase';
import { Button } from '../components/shared/Button';
import { Badge } from '../components/shared/Badge';
import { useAuth } from '../context/AuthContext';

const CITY_OPTIONS = [
  'Any',
  'Mumbai',
  'Delhi',
  'Bangalore',
  'Kolkata',
  'Chennai',
  'Hyderabad',
  'Ahmedabad',
  'Pune',
  'Jaipur',
  'Lucknow'
];

const HEALTH_TIPS = [
  "Stay hydrated by drinking at least 8-10 glasses of water daily.",
  "Engage in at least 30 minutes of moderate exercise like walking or cycling.",
  "Prioritize 7-9 hours of quality sleep to strengthen immune response.",
  "Include a rainbow of vegetables and clean proteins in your meals.",
  "Take desk breaks every 45 minutes to stand, stretch, and relax your eyes."
];

const getInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/);
  const first = parts[0]?.[0] || 'P';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

const severityBadgeClasses = (severity) => {
  const s = String(severity || '').toLowerCase();
  if (s === 'low' || s === 'routine') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (s === 'medium' || s === 'urgent') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  if (s === 'high' || s === 'emergency') return 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse';
  return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
};

const statusBadgeClasses = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'confirmed' || s === 'completed') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (s === 'pending') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  if (s === 'cancelled' || s === 'canceled') return 'bg-red-500/10 text-red-500 border-red-500/20';
  return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
};

const PatientDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Onboarding conversational flow state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingMessages, setOnboardingMessages] = useState([
    { id: 'ob0', role: 'model', content: "Hello! Welcome to HEALTHBIRCH. Before we begin, let's complete a quick health onboarding conversation. What is your full name?" }
  ]);
  const [onboardingInput, setOnboardingInput] = useState('');
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingCompleteData, setOnboardingCompleteData] = useState(null);

  // Show onboarding only once user has fully loaded from Firestore (Task 7 fix)
  useEffect(() => {
    if (user && user.onboardingComplete === false) {
      setShowOnboarding(true);
    }
  }, [user?.uid, user?.onboardingComplete]);

  const handleOnboardingSend = async (e) => {
    e?.preventDefault();
    if (!onboardingInput.trim() || onboardingLoading) return;

    const userMessage = { id: `ob_${Date.now()}_u`, role: 'user', content: onboardingInput.trim() };
    const nextMessages = [...onboardingMessages, userMessage];
    setOnboardingMessages(nextMessages);
    setOnboardingInput('');
    setOnboardingLoading(true);

    try {
      const response = await api.post('/api/chat/onboarding', {
        messages: nextMessages.map(m => ({ role: m.role, content: m.content }))
      });
      const data = response.data;
      if (data.complete) {
        setOnboardingCompleteData(data);
      } else {
        setOnboardingMessages(prev => [
          ...prev,
          { id: `ob_${Date.now()}_m`, role: 'model', content: data.message }
        ]);
      }
    } catch (error) {
      console.error(error);
      setOnboardingMessages(prev => [
        ...prev,
        { id: `ob_${Date.now()}_err`, role: 'model', content: "Sorry, I had a small connection issue. What was your last answer?" }
      ]);
    } finally {
      setOnboardingLoading(false);
    }
  };

  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cityOptions, setCityOptions] = useState(CITY_OPTIONS);

  // Sync tab with route / location state
  useEffect(() => {
    if (location.pathname === '/patient/doctors') {
      setActiveTab('find');
    } else if (location.pathname === '/patient/dashboard' && activeTab === 'find') {
      setActiveTab('home');
    }
  }, [location.pathname]);

  // Chat State
  const [messages, setMessages] = useState([
    { id: 'p0', role: 'model', content: "Hello! I'm your HEALTHBIRCH AI assistant. What symptoms are you experiencing today?" },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

  // Doctors State
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [specialtyQuery, setSpecialtyQuery] = useState('');
  const [city, setCity] = useState('Any');

  // Appointments State
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentFilter, setAppointmentFilter] = useState('upcoming');

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewPayload, setReviewPayload] = useState({ doctorId: null, doctorName: '', rating: 5, comment: '' });

  // Settings state
  const [emailNotif, setEmailNotif] = useState(() => localStorage.getItem('hb_emailNotif') !== 'false');
  const [smsAlerts, setSmsAlerts] = useState(() => localStorage.getItem('hb_smsAlerts') === 'true');
  const [passwordResetStatus, setPasswordResetStatus] = useState(null);

  // Display name (Bug 2 fix)
  const [displayName, setDisplayName] = useState('');
  const [nameSaveStatus, setNameSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  useEffect(() => {
    setDisplayName(user?.name || user?.email?.split('@')[0] || '');
  }, [user?.name, user?.email]);

  const saveDisplayName = async () => {
    if (!displayName.trim()) return;
    setNameSaveStatus('saving');
    try {
      // Update Firebase Auth display name
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      }
      // Persist to Firestore
      await api.put('/api/users/profile', { name: displayName.trim() });
      setNameSaveStatus('saved');
      setTimeout(() => setNameSaveStatus(null), 3000);
    } catch (err) {
      console.error('Name save error:', err);
      setNameSaveStatus('error');
      setTimeout(() => setNameSaveStatus(null), 4000);
    }
  };

  // Daily water intake state (Task 8)
  const [waterIntake, setWaterIntake] = useState(() => Number(localStorage.getItem('hb_waterIntake') || '1.5'));

  const toggleEmailNotif = (val) => { setEmailNotif(val); localStorage.setItem('hb_emailNotif', val); };
  const toggleSmsAlerts = (val) => { setSmsAlerts(val); localStorage.setItem('hb_smsAlerts', val); };

  const handlePasswordReset = async () => {
    setPasswordResetStatus('sending');
    try {
      await sendPasswordResetEmail(auth, user?.email);
      setPasswordResetStatus('sent');
    } catch (err) {
      console.error('Password reset error:', err);
      setPasswordResetStatus('error');
    }
  };

  // Health profile editing state
  const [healthProfileForm, setHealthProfileForm] = useState({
    age: '', gender: '', height: '', weight: '', bloodType: '',
    medications: '', conditions: '', allergies: '', diet: '', exercise: '', city: ''
  });
  const [profileSaveStatus, setProfileSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const [profileFormDirty, setProfileFormDirty] = useState(false);
  const [expandedCountry, setExpandedCountry] = useState('India');

  // Helper: coerce array values (from onboarding) to comma-separated strings
  const coerceToStr = (v) => Array.isArray(v) ? v.join(', ') : (v || '');

  // Populate form when user loads — sanitise arrays from onboarding
  useEffect(() => {
    if (user?.healthProfile) {
      const hp = user.healthProfile;
      setHealthProfileForm(prev => ({
        ...prev,
        ...hp,
        medications: coerceToStr(hp.medications),
        conditions:  coerceToStr(hp.conditions),
        allergies:   coerceToStr(hp.allergies),
      }));
    }
  }, [user?.healthProfile]);

  const handleProfileFieldChange = (field, value) => {
    setHealthProfileForm(prev => ({ ...prev, [field]: value }));
    setProfileFormDirty(true);
    setProfileSaveStatus(null);
  };

  const saveHealthProfile = async (e) => {
    e?.preventDefault();
    setProfileSaveStatus('saving');
    try {
      await api.put('/api/users/profile', { healthProfile: healthProfileForm });
      setProfileSaveStatus('saved');
      setProfileFormDirty(false);
    } catch (err) {
      console.error('Profile save error:', err);
      console.error("Backend response:", err.response?.data);
      console.error("Status:", err.response?.status);
      setProfileSaveStatus('error');
    }
  };

  // Rotating health tip
  const healthTip = useMemo(() => {
    const day = new Date().getDate();
    return HEALTH_TIPS[day % HEALTH_TIPS.length];
  }, []);

  const findDoctors = async (nextSpecialty, nextCity) => {
    setActiveTab('find');
    if (nextSpecialty !== undefined) setSpecialtyQuery(nextSpecialty);
    if (nextCity !== undefined) {
      setCity(nextCity);
      if (nextCity !== 'Any' && !cityOptions.includes(nextCity)) {
        setCityOptions(prev => [...prev, nextCity]);
      }
    }
    setLoadingDoctors(true);
    try {
      const params = new URLSearchParams();
      if (nextSpecialty?.trim()) params.set('specialization', nextSpecialty.trim());
      if (nextCity && nextCity !== 'Any') params.set('city', nextCity);
      const qs = params.toString();
      const response = await api.get(`/api/doctors/${qs ? `?${qs}` : ''}`);
      setDoctors(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const fetchAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const res = await api.get('/api/appointments/patient');
      setAppointments(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    if (location.state?.goToFind) {
      setActiveTab('find');
      const aiSpecialty = location.state.specialty || '';
      const aiCity = location.state.city || 'Any';
      setSpecialtyQuery(aiSpecialty);
      if (aiCity !== 'Any' && !cityOptions.includes(aiCity)) {
        setCityOptions(prev => [...prev, aiCity]);
      }
      setCity(aiCity);
      findDoctors(aiSpecialty, aiCity);
      navigate('/patient/doctors', { replace: true, state: {} });
    }
  }, [location.state, navigate, cityOptions]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputValue.trim() || loadingChat) return;

    const userMessage = { id: `p_${Date.now()}_u`, role: 'user', content: inputValue.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputValue('');
    setLoadingChat(true);

    try {
      const response = await api.post('/api/chat/', {
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
      });
      const data = response.data;
      setMessages((prev) => [
        ...prev,
        { id: `p_${Date.now()}_a`, role: 'model', content: data.message || '' },
      ]);
      setRecommendation(data.recommendation || null);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { id: `p_${Date.now()}_err`, role: 'model', content: "Sorry, I'm having trouble connecting right now." },
      ]);
      setRecommendation(null);
    } finally {
      setLoadingChat(false);
    }
  };

  const cancelAppointment = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.patch(`/api/appointments/${id}/status`, { status: 'cancelled' });
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)));
    } catch (err) {
      console.error(err);
      alert('Failed to cancel appointment.');
    }
  };

  const submitReview = async () => {
    try {
      await api.post(`/api/doctors/${reviewPayload.doctorId}/reviews`, {
        rating: reviewPayload.rating,
        comment: reviewPayload.comment,
      });
      alert('Review submitted successfully!');
      setReviewModalOpen(false);
      fetchAppointments();
    } catch (error) {
      console.error(error);
      alert('Failed to submit review. Try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // derived stats
  const greeting = useMemo(() => {
    const hrs = new Date().getHours();
    const name = user?.name || user?.email?.split('@')[0] || 'Guest';
    if (hrs < 12) return `Good morning, ${name}`;
    if (hrs < 18) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  }, [user]);

  const upcomingAppointments = useMemo(() => {
    return appointments.filter(a => {
      const isPastDate = new Date(a.date) < new Date(new Date().setHours(0, 0, 0, 0));
      return a.status !== 'cancelled' && a.status !== 'canceled' && a.status !== 'completed' && !isPastDate;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [appointments]);

  const uniqueDocsCount = useMemo(() => {
    return new Set(appointments.map(a => a.doctorId)).size;
  }, [appointments]);

  const aiConsultationsCount = useMemo(() => {
    // derived from number of user queries in chat state or default count based on messages
    return Math.max(0, messages.filter(m => m.role === 'user').length);
  }, [messages]);

  const combinedHistory = useMemo(() => {
    const aptHistory = appointments
      .filter(a => a.status === 'completed' || new Date(a.date) < new Date(new Date().setHours(0, 0, 0, 0)))
      .map(a => ({
        id: a.id,
        isAppointment: true,
        date: a.date,
        doctorName: a.doctorName,
        specialization: a.specialization,
        symptoms: a.symptoms,
        severity: a.severity || 'routine',
        status: a.status
      }));

    const aiHistory = (user?.medicalHistory || [])
      .map(a => ({
        id: a.id,
        isAppointment: false,
        date: a.date,
        doctorName: 'HEALTHBIRCH AI Triage Desk',
        specialization: a.specialty || 'General screening',
        symptoms: a.symptoms,
        severity: a.severity || 'routine',
        status: 'completed',
        aiRecommendation: a.aiRecommendation,
        painRating: a.painRating
      }));

    return [...aptHistory, ...aiHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [appointments, user?.medicalHistory]);

  const sidebarItems = [
    { key: 'home', label: 'Dashboard', icon: Heart },
    { key: 'chat', label: 'AI Assistant', icon: MessageSquare },
    { key: 'appointments', label: 'My Appointments', icon: CalendarCheck },
    { key: 'find', label: 'Find Doctors', icon: Search },
    { key: 'emergency', label: 'Emergency Contacts', icon: ShieldAlert },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  if (showOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-dark via-primary-dark to-[#0A1F44] text-white p-4 font-sans relative overflow-hidden">
        {/* Soft glowing orb effect */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary rounded-full mix-blend-screen filter blur-[100px] opacity-40" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 rounded-full mix-blend-screen filter blur-[100px] opacity-20" />

        <div className="relative z-10 w-full max-w-2xl bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col h-[600px] max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
            <img src={logo} alt="HEALTHBIRCH" className="h-8 w-auto object-contain bg-white rounded-lg p-1.5" />
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                HEALTHBIRCH Onboarding <Sparkles className="w-5 h-5 text-secondary animate-pulse" />
              </h2>
              <p className="text-xs text-slate-400">Let's set up your personalized health profile</p>
            </div>
          </div>

          {!onboardingCompleteData ? (
            <>
              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin">
                {onboardingMessages.map((msg, idx) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-md leading-relaxed ${msg.role === 'user' ? 'bg-secondary text-white rounded-tr-none' : 'bg-white/10 text-slate-200 border border-white/5 rounded-tl-none'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {onboardingLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-white/5 border border-white/5 px-4 py-3 text-sm text-slate-400 flex items-center gap-2">
                      <span className="text-xs font-semibold">Triage Engine processing</span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleOnboardingSend} className="flex gap-2">
                <input
                  type="text"
                  value={onboardingInput}
                  onChange={(e) => setOnboardingInput(e.target.value)}
                  placeholder="Type your response..."
                  disabled={onboardingLoading}
                  className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all font-semibold"
                />
                <button
                  type="submit"
                  disabled={onboardingLoading || !onboardingInput.trim()}
                  className="h-11 w-11 shrink-0 rounded-full bg-secondary text-white shadow-md flex items-center justify-center hover:bg-secondary-light active:scale-95 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-between items-center text-center py-6 animate-in zoom-in-95 duration-300">
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 text-3xl mx-auto">
                  ✓
                </div>
                <h3 className="text-2xl font-bold text-white">Your Health Profile is Set!</h3>
                <p className="text-sm text-slate-300 max-w-md leading-relaxed">
                  {onboardingCompleteData.advice || "Based on your profile, you're all set to use HealthBirch. I'm here whenever you need health guidance."}
                </p>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-xs text-left max-w-md mx-auto space-y-2 mt-4">
                  <div className="font-bold text-slate-400 border-b border-white/5 pb-1">AI Health Profile Summary:</div>
                  <p className="text-slate-300 italic">"{onboardingCompleteData.summary}"</p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setShowOnboarding(false);
                  window.location.reload();
                }}
                className="rounded-full px-8 py-3 shadow-lg"
              >
                Proceed to Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d1b3e] to-[#0a0a0f] overflow-hidden text-white font-sans">

      {/* Sidebar - Collapsible desktop sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} shrink-0 border-r border-white/5 bg-white/5 backdrop-blur-md hidden md:flex flex-col transition-all duration-300 relative z-20 h-screen sticky top-0`}>
        <div className="p-4 flex items-center justify-between">
          {sidebarOpen && (
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2 transition hover:opacity-90 align-middle"
            >
              <img src={logo} alt="HEALTHBIRCH" className="h-6 w-auto object-contain bg-white rounded-md p-1" />
              <span className="text-base font-bold tracking-tight text-white">HEALTHBIRCH</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen(prev => !prev)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all mx-auto"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {sidebarOpen && <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">Main Menu</div>}

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {sidebarItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${isActive ? 'bg-primary/95 text-white shadow-md shadow-primary/20 scale-[1.02] border-l-4 border-secondary' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-secondary' : 'text-slate-400'}`} />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto p-4 border-t border-white/5 bg-white/[0.02]">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-secondary-light flex items-center justify-center text-primary-dark font-bold text-sm">
                {getInitials(user?.name || user?.email)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate text-white">{user?.name || user?.email?.split('@')[0]}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-3">
              <div className="w-8 h-8 rounded-full bg-secondary-light flex items-center justify-center text-primary-dark font-bold text-xs" title={user?.email}>
                {getInitials(user?.name || user?.email)}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all`}
            title={!sidebarOpen ? 'Sign Out' : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content pane */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col min-w-0">
        <div className="mx-auto max-w-6xl w-full flex-1 flex flex-col">

          {/* ===== 1. DASHBOARD HOME VIEW ===== */}
          {activeTab === 'home' && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">

              {/* Welcome Banner */}
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary to-primary-dark border border-white/10 p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.4)_1px,transparent_0)] [background-size:12px_12px]" />
                <div className="relative z-10 space-y-1">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">{greeting} 👋</h1>
                  <p className="text-slate-300 text-sm md:text-base font-medium">Clear insights and clinical recommendations from your verified health logs.</p>
                </div>
                <div className="relative z-10 shrink-0 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/15 text-xs md:text-sm font-semibold">
                  📅 {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/15">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming Bookings</p>
                  <p className="mt-2 text-2xl md:text-3xl font-extrabold text-white">{upcomingAppointments.length}</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/15">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI consultations</p>
                  <p className="mt-2 text-2xl md:text-3xl font-extrabold text-white">{aiConsultationsCount}</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/15">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doctors Consulted</p>
                  <p className="mt-2 text-2xl md:text-3xl font-extrabold text-white">{uniqueDocsCount}</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-white/15">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daily Water Intake</p>
                  <p className="mt-2 text-2xl md:text-3xl font-extrabold text-cyan-400">{waterIntake.toFixed(2)} L / 3.00 L</p>
                  <div className="flex gap-2 mt-3 items-center">
                    <button
                      type="button"
                      onClick={() => setWaterIntake(prev => { const val = Math.max(0, prev - 0.25); localStorage.setItem('hb_waterIntake', val.toString()); return val; })}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-sm font-bold text-white transition-all select-none"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => setWaterIntake(prev => { const val = Math.min(10, prev + 0.25); localStorage.setItem('hb_waterIntake', val.toString()); return val; })}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-sm font-bold text-white transition-all select-none"
                    >
                      +
                    </button>
                    <span className="text-[10px] text-slate-400 font-bold ml-1">Target: 3L</span>
                  </div>
                </div>
              </div>

              {/* Main Landing Split Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

                {/* Left Columns (Booking/Recommend details) */}
                <div className="lg:col-span-2 space-y-6">

                  {/* Pinned Bookings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">Upcoming appointments <span className="h-2 w-2 rounded-full bg-secondary" /></h3>
                    {upcomingAppointments.length === 0 ? (
                      <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-6 text-center text-slate-400">
                        No upcoming consultations. Book one below.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {upcomingAppointments.slice(0, 2).map(apt => (
                          <div key={apt.id} className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-4 flex items-center justify-between hover:bg-white/[0.08] transition">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold">
                                {getInitials(apt.doctorName)}
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-sm">{apt.doctorName}</h4>
                                <span className="text-xs text-slate-400 font-semibold">{apt.specialization} &bull; 📍 {apt.city || 'Clinic'}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 text-right">
                              <span className="text-xs font-bold text-white block">{new Date(apt.date).toLocaleDateString()}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">{apt.timeSlot}</span>
                              <div className="flex gap-2 items-center">
                                <span className={`text-[9px] uppercase font-extrabold tracking-wider border px-2 py-0.5 rounded-full ${statusBadgeClasses(apt.status)}`}>
                                  {apt.status}
                                </span>
                                {apt.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); cancelAppointment(apt.id); }}
                                    className="px-2 py-0.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 font-bold rounded text-[9px] transition-colors"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick actions grid */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">General Healthcare Actions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <button onClick={() => setActiveTab('chat')} className="flex flex-col items-start p-5 rounded-2xl border border-white/5 bg-gradient-to-br from-white/10 to-white/5 hover:border-secondary hover:from-white/15 hover:to-white/10 transition-all text-start group w-full">
                        <MessageSquare className="w-6 h-6 text-secondary group-hover:scale-110 transition" />
                        <h4 className="font-bold text-white text-sm mt-4">Start AI Screening</h4>
                        <p className="text-xs text-slate-400 mt-1">Chat about symptoms, specialties details</p>
                      </button>
                      <button onClick={() => setActiveTab('find')} className="flex flex-col items-start p-5 rounded-2xl border border-white/5 bg-gradient-to-br from-white/10 to-white/5 hover:border-secondary hover:from-white/15 hover:to-white/10 transition-all text-start group w-full">
                        <Search className="w-6 h-6 text-secondary group-hover:scale-110 transition" />
                        <h4 className="font-bold text-white text-sm mt-4">Find & Book Doctors</h4>
                        <p className="text-xs text-slate-400 mt-1">Book local clinicians directly</p>
                      </button>
                      <button onClick={() => setActiveTab('emergency')} className="flex flex-col items-start p-5 rounded-2xl border border-white/5 bg-gradient-to-br from-white/10 to-white/5 hover:border-red-500 hover:from-white/15 hover:to-white/10 transition-all text-start group w-full">
                        <ShieldAlert className="w-6 h-6 text-red-500 group-hover:scale-110 transition" />
                        <h4 className="font-bold text-white text-sm mt-4">Emergency contacts</h4>
                        <p className="text-xs text-slate-400 mt-1">Rapid hotline reference directory</p>
                      </button>
                    </div>
                  </div>

                </div>

                {/* Right columns (AI assessments & Tips) */}
                <div className="space-y-6">

                  {/* Latest AI screening card */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">Triage Status Check</h3>
                    {recommendation ? (
                      <div className="rounded-2xl border border-secondary/20 bg-secondary/5 backdrop-blur-md p-5 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Recommended Specialty</span>
                            <h4 className="text-base font-extrabold text-white mt-0.5">{recommendation.recommended_specialist}</h4>
                          </div>
                          <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold uppercase tracking-widest ${severityBadgeClasses(recommendation.severity)}`}>
                            {recommendation.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 italic">"{recommendation.advice}"</p>
                        {recommendation.city && <span className="text-[11px] text-slate-400 block">📍 Filter Location: {recommendation.city}</span>}
                        {recommendation.recommendDoctor !== false ? (
                          <Button
                            className="w-full text-xs py-2 rounded-full"
                            onClick={() => findDoctors(recommendation.recommended_specialist, recommendation.city)}
                          >
                            Find {recommendation.recommended_specialist} Doctors
                          </Button>
                        ) : (
                          <div className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 p-2 border border-emerald-500/20 rounded-xl text-center">
                            No clinical booking recommended. Follow self-care advice.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-5 text-center">
                        <Sparkles className="w-8 h-8 text-secondary/40 mx-auto mb-3" />
                        <h4 className="font-bold text-sm text-white">No Triage Record</h4>
                        <p className="text-xs text-slate-400 mt-1 mb-4">Complete an AI dialogue to view health specialist advice.</p>
                        <Button className="w-full text-xs rounded-full" onClick={() => setActiveTab('chat')}>Run Free Check</Button>
                      </div>
                    )}
                  </div>

                  {/* Health Tip */}
                  <div className="rounded-2xl border border-teal-500/10 bg-teal-500/[0.03] p-5">
                    <div className="flex items-center gap-2 text-teal-400">
                      <Award className="w-5 h-5 shrink-0" />
                      <h4 className="font-bold text-sm">Health Tip of the Day</h4>
                    </div>
                    <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                      {healthTip}
                    </p>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* ===== 2. AI ASSISTANT VIEW (CHAT) ===== */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500">
              <header className="mb-4">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  AI Symptom Triage <Sparkles className="w-5 h-5 text-secondary animate-pulse" />
                </h1>
                <p className="text-xs md:text-sm text-slate-300">Discuss health context. Our LLM parses reports to auto-suggest appropriate departments.</p>
              </header>

              <div className="flex-1 flex flex-col rounded-3xl border border-white/5 bg-white/5 backdrop-blur-md shadow-2xl overflow-hidden min-h-0">
                <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-xs text-white uppercase tracking-wider">Clinical Agent Online</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold bg-[#0A1F44] border border-white/10 px-2 py-0.5 rounded">Triage Assistant Only</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar-thin">
                  {messages.map((msg, idx) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-md leading-relaxed ${msg.role === 'user' ? 'bg-secondary text-white rounded-tr-none' : 'bg-white/10 text-slate-200 border border-white/5 rounded-tl-none'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {loadingChat && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-white/5 border border-white/5 px-4 py-3 text-sm text-slate-400 flex items-center gap-2">
                        <span className="text-xs font-semibold">Triage Engine processing</span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {recommendation && (
                  <div className="border-t border-white/5 bg-white/[0.01] p-4">
                    <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-secondary uppercase tracking-wider">AI Department Suggestion</div>
                        <h4 className="text-base font-extrabold text-white mt-1 shrink-0">{recommendation.recommended_specialist}</h4>
                        {recommendation.city && <p className="text-xs text-slate-400 mt-0.5">Location targeted: {recommendation.city}</p>}
                        <p className="text-xs text-slate-300 mt-2 italic">"{recommendation.advice}"</p>
                      </div>
                      <div className="flex flex-col items-stretch md:items-end gap-2">
                        <span className={`px-3 py-1 border rounded-full text-xs font-bold uppercase text-center ${severityBadgeClasses(recommendation.severity)}`}>
                          Severity: {recommendation.severity}
                        </span>
                        {recommendation.recommendDoctor !== false ? (
                          <Button
                            className="text-xs py-2 rounded-full whitespace-nowrap"
                            onClick={() => findDoctors(recommendation.recommended_specialist, recommendation.city)}
                          >
                            Find {recommendation.recommended_specialist} Clinicians
                          </Button>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-400">Self-care recommended</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSend} className="border-t border-white/5 bg-white/[0.02] p-4 flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Briefly state symptoms, duration, urgency level..."
                    disabled={loadingChat}
                    className="flex-1 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all font-semibold"
                  />
                  <button
                    type="submit"
                    disabled={loadingChat || !inputValue.trim()}
                    className="h-11 w-11 shrink-0 rounded-full bg-secondary text-white shadow-md flex items-center justify-center hover:bg-secondary-light active:scale-95 transition disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ===== 3. MY APPOINTMENTS VIEW ===== */}
          {activeTab === 'appointments' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <header className="mb-4">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">My Consultations</h1>
                <p className="text-xs md:text-sm text-slate-300">View upcoming, pending, or historic status checks.</p>
              </header>

              <div className="flex space-x-2 border-b border-white/5 pb-2">
                <button
                  onClick={() => setAppointmentFilter('upcoming')}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${appointmentFilter === 'upcoming' ? 'bg-secondary text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  Active & Pending
                </button>
                <button
                  onClick={() => setAppointmentFilter('past')}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${appointmentFilter === 'past' ? 'bg-secondary text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  Consultation Logs
                </button>
              </div>

              {loadingAppointments ? (
                <div className="flex justify-center items-center py-16">
                  <div className="w-8 h-8 border-2 border-secondary animate-spin border-t-transparent rounded-full" />
                </div>
              ) : appointments.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-white/5 p-12 text-center text-slate-400">
                  No appointments recorded.
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments
                    .filter(apt => {
                      const isCancelled = apt.status === 'cancelled' || apt.status === 'canceled';
                      const isPastDate = new Date(apt.date) < new Date(new Date().setHours(0, 0, 0, 0));
                      const isPast = isCancelled || isPastDate || apt.status === 'completed';
                      return appointmentFilter === 'upcoming' ? !isPast : isPast;
                    })
                    .map(apt => (
                      <div key={apt.id} className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-white/[0.08] transition">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-secondary/15 flex items-center justify-center text-secondary font-bold text-lg">
                            {getInitials(apt.doctorName)}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-base">{apt.doctorName}</h4>
                            <p className="text-xs text-slate-400 font-semibold">{apt.specialization} &bull; 📍 {apt.city}</p>
                            <p className="text-xs text-slate-500 mt-2 font-medium">Recorded Symptoms: <span className="text-slate-300">"{apt.symptoms || 'None listed'}"</span></p>
                          </div>
                        </div>
                        <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
                          <div className="text-left md:text-right">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-secondary" /> {new Date(apt.date).toLocaleDateString()}</span>
                            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mt-1"><Clock className="w-3.5 h-3.5 text-secondary" /> {apt.timeSlot}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusBadgeClasses(apt.status)}`}>
                              {apt.status}
                            </span>
                            {apt.status === 'pending' && appointmentFilter === 'upcoming' && (
                              <button
                                onClick={() => cancelAppointment(apt.id)}
                                className="px-3 py-1 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 font-semibold rounded-lg text-[10px] transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                            {appointmentFilter === 'past' && apt.status !== 'cancelled' && (
                              <button
                                onClick={() => { setReviewPayload({ doctorId: apt.doctorId, doctorName: apt.doctorName, rating: 5, comment: '' }); setReviewModalOpen(true); }}
                                className="px-3 py-1 border border-secondary/35 text-secondary hover:bg-secondary/15 font-semibold rounded-lg text-[10px] transition"
                              >
                                Review
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  {appointments.filter(apt => {
                    const isCancelled = apt.status === 'cancelled' || apt.status === 'canceled';
                    const isPastDate = new Date(apt.date) < new Date(new Date().setHours(0, 0, 0, 0));
                    const isPast = isCancelled || isPastDate || apt.status === 'completed';
                    return appointmentFilter === 'upcoming' ? !isPast : isPast;
                  }).length === 0 && (
                      <div className="py-8 text-center text-slate-400">No {appointmentFilter} appointments identified.</div>
                    )}
                </div>
              )}
            </div>
          )}

          {/* ===== 4. FIND DOCTORS VIEW ===== */}
          {activeTab === 'find' && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
              <header className="mb-4">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Active Clinical Practitioners</h1>
                <p className="text-xs md:text-sm text-slate-300">Book consultations with verified medical specialists in your city.</p>
              </header>

              <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">Specialty Keyword</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={specialtyQuery}
                      onChange={(e) => setSpecialtyQuery(e.target.value)}
                      placeholder="e.g. general, cardiology, orthopedics..."
                      className="w-full rounded-2xl border border-white/5 bg-white/5 pl-11 pr-5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-secondary transition-all"
                    />
                  </div>
                </div>

                <div className="w-full md:w-52">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">City targeted</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-2xl border border-white/5 bg-[#061530] text-slate-300 px-4 py-3 text-sm focus:outline-none focus:border-secondary transition-all font-semibold"
                  >
                    {cityOptions.map(c => (
                      <option key={c} value={c} className="bg-primary-dark text-slate-300">{c}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => findDoctors(specialtyQuery, city)}
                  disabled={loadingDoctors}
                  className="px-6 py-3 bg-secondary hover:bg-secondary-light font-bold text-sm text-white rounded-2xl transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shrink-0 h-11 pointer-events-auto"
                >
                  <Search className="w-4 h-4" /> Run Query
                </button>
              </div>

              {loadingDoctors ? (
                <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-secondary border-t-transparent animate-spin rounded-full" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                  {doctors.length === 0 ? (
                    <div className="col-span-full rounded-2xl border border-white/5 bg-white/5 p-12 text-center text-slate-400">
                      No practitioners matching criteria registered. Adjust keywords or filters.
                    </div>
                  ) : (
                    doctors.map(doc => {
                      const initials = getInitials(doc.name);
                      const rating = Number(doc.rating || 4.5);
                      const availableDays = Array.isArray(doc.availableDays) ? doc.availableDays.join(', ') : '';
                      return (
                        <div key={doc.id} className="rounded-2xl border border-white/5 bg-white/5 hover:bg-white/[0.08] transition p-6 flex flex-col justify-between hover:-translate-y-1 duration-200">
                          <div>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-secondary/15 flex items-center justify-center text-secondary font-bold text-lg">
                                {initials}
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-base leading-tight">{doc.name}</h4>
                                <span className="inline-block mt-1 text-[10px] font-extrabold uppercase bg-secondary/20 text-secondary border border-secondary/15 px-2.5 py-0.5 rounded-full">
                                  {doc.specialization}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-yellow-400 mt-4 font-semibold">
                              <Star className="w-4 h-4 fill-current shrink-0" />
                              <span>{rating.toFixed(1)}</span>
                              <span className="text-slate-400 font-medium">({doc.reviews_count || 0} reviews)</span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/5 space-y-2 text-xs text-slate-400 font-medium">
                              <div>📍 Location: <span className="text-slate-200">{doc.city}, {doc.state}</span></div>
                              {doc.clinic_name && <div>🏥 Clinic: <span className="text-slate-200">{doc.clinic_name}</span></div>}
                              <div>⏳ Practicing: <span className="text-slate-200">{doc.experience}</span></div>
                              <div className="truncate">🗓️ Days: <span className="text-slate-200">{availableDays || 'Mon-Fri'}</span></div>
                            </div>
                          </div>
                          <Button
                            className="mt-6 w-full text-xs rounded-full py-2.5 font-bold"
                            onClick={() => navigate(`/patient/book/${doc.id}`, { state: { doctor: doc, recommendation } })}
                          >
                            <CalendarCheck className="w-4 h-4 mr-1.5" /> Book Consultation
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== 6. EMERGENCY CONTACTS VIEW ===== */}
          {activeTab === 'emergency' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <header className="mb-4">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  Emergency Resources <ShieldAlert className="w-6 h-6 text-red-500" />
                </h1>
                <p className="text-xs md:text-sm text-slate-300">Immediate hotlines and clinical references. Call 911/112 for local emergency response agencies.</p>
              </header>

              <div className="space-y-4 max-w-3xl">
                {[
                  {
                    country: 'India',
                    code: 'IN',
                    contacts: [
                      { label: 'Ambulance', number: '102', color: 'text-red-400' },
                      { label: 'Police', number: '100', color: 'text-slate-300' },
                      { label: 'Fire', number: '101', color: 'text-slate-300' },
                      { label: 'National Helpline (Single Emergency Number)', number: '112', color: 'text-red-400 font-extrabold' },
                      { label: 'Women Helpline', number: '1091', color: 'text-pink-400' },
                      { label: 'Senior Citizen Helpline', number: '14567', color: 'text-slate-300' }
                    ]
                  },
                  {
                    country: 'United States',
                    code: 'US',
                    contacts: [
                      { label: 'General Emergency', number: '911', color: 'text-red-400 font-extrabold' },
                      { label: 'Suicide & Crisis Lifeline', number: '988', color: 'text-amber-400' },
                      { label: 'Poison Control', number: '+1 (800) 222-1222', color: 'text-slate-300' }
                    ]
                  },
                  {
                    country: 'United Kingdom',
                    code: 'GB',
                    contacts: [
                      { label: 'General Emergency', number: '999 or 112', color: 'text-red-400 font-extrabold' },
                      { label: 'National Health Service (NHS) Advice', number: '111', color: 'text-teal-400' },
                      { label: 'Police (Non-emergency)', number: '101', color: 'text-slate-300' }
                    ]
                  },
                  {
                    country: 'Canada',
                    code: 'CA',
                    contacts: [
                      { label: 'General Emergency', number: '911', color: 'text-red-400 font-extrabold' },
                      { label: 'Health Information (Telehealth)', number: '811', color: 'text-slate-300' }
                    ]
                  },
                  {
                    country: 'Australia',
                    code: 'AU',
                    contacts: [
                      { label: 'Emergency (Triple Zero)', number: '000', color: 'text-red-400 font-extrabold' },
                      { label: 'State Emergency Service (SES)', number: '132 500', color: 'text-slate-300' }
                    ]
                  },
                  {
                    country: 'Germany',
                    code: 'DE',
                    contacts: [
                      { label: 'Ambulance & Fire', number: '112', color: 'text-red-400 font-extrabold' },
                      { label: 'Police', number: '110', color: 'text-slate-300' },
                      { label: 'Non-emergency Medical Service', number: '116 117', color: 'text-slate-300' }
                    ]
                  },
                  {
                    country: 'France',
                    code: 'FR',
                    contacts: [
                      { label: 'European Emergency Number', number: '112', color: 'text-red-400 font-extrabold' },
                      { label: 'Ambulance (SAMU)', number: '15', color: 'text-red-400' },
                      { label: 'National Police', number: '17', color: 'text-slate-300' },
                      { label: 'Fire Brigade', number: '18', color: 'text-slate-300' }
                    ]
                  },
                  {
                    country: 'United Arab Emirates',
                    code: 'AE',
                    contacts: [
                      { label: 'Ambulance', number: '998', color: 'text-red-400' },
                      { label: 'Police', number: '999', color: 'text-red-400 font-extrabold' },
                      { label: 'Fire (Civil Defence)', number: '997', color: 'text-slate-300' }
                    ]
                  },
                  {
                    country: 'Singapore',
                    code: 'SG',
                    contacts: [
                      { label: 'Ambulance & Fire (Emergency)', number: '995', color: 'text-red-400 font-extrabold' },
                      { label: 'Police', number: '999', color: 'text-slate-300' },
                      { label: 'Ambulance (Non-emergency)', number: '1777', color: 'text-slate-300' }
                    ]
                  }
                ].map(c => {
                  const isOpen = expandedCountry === c.country;
                  return (
                    <div key={c.country} className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm overflow-hidden transition-all duration-300">
                      <button
                        type="button"
                        onClick={() => setExpandedCountry(isOpen ? '' : c.country)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
                      >
                        <span className="font-bold text-white flex items-center gap-3 text-base md:text-lg animate-in fade-in duration-300">
                          <span className="text-xs font-extrabold px-2.5 py-1 rounded bg-[#60A5FA]/20 border border-[#60A5FA]/20 text-[#60A5FA] font-sans tracking-wide">{c.code}</span>
                          <span>{c.country}</span>
                        </span>
                        <span className="text-slate-400 font-bold transition-transform duration-300" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                          ▶
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-5 pt-1 space-y-3 border-t border-white/5 divide-y divide-white/5 text-sm select-text">
                          {c.contacts.map((contact, idx) => (
                            <div key={idx} className="flex justify-between py-2.5 border-b border-white/5 last:border-0">
                              <span className="text-slate-400 font-semibold">{contact.label}</span>
                              <span className={`${contact.color} font-bold text-right`}>{contact.number}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== 7. SETTINGS VIEW ===== */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <header className="mb-4">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Settings</h1>
                <p className="text-xs md:text-sm text-slate-300 mt-1">Manage your account, health profile, and notification preferences.</p>
              </header>

              {/* ── Health Profile ── */}
              <div className="max-w-2xl rounded-2xl border border-secondary/15 bg-secondary/[0.03] backdrop-blur-sm p-6 space-y-5">
                <h4 className="text-sm font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4" /> Health Profile
                </h4>
                <form onSubmit={saveHealthProfile} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { field: 'age', label: 'Age', placeholder: 'e.g. 28' },
                      { field: 'gender', label: 'Gender', placeholder: 'e.g. Male / Female / Other' },
                      { field: 'height', label: 'Height', placeholder: 'e.g. 175 cm' },
                      { field: 'weight', label: 'Weight', placeholder: 'e.g. 70 kg' },
                      { field: 'bloodType', label: 'Blood Type', placeholder: 'e.g. O+' },
                      { field: 'city', label: 'City', placeholder: 'e.g. Mumbai' },
                    ].map(({ field, label, placeholder }) => (
                      <div key={field} className="flex flex-col">
                        <label className="text-xs font-semibold text-slate-400 mb-1">{label}</label>
                        <input
                          type="text"
                          value={healthProfileForm[field]}
                          onChange={e => handleProfileFieldChange(field, e.target.value)}
                          placeholder={placeholder}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-secondary transition-all"
                        />
                      </div>
                    ))}
                  </div>

                  {[
                    { field: 'medications', label: 'Current Medications', placeholder: 'List medications, dosages…' },
                    { field: 'conditions', label: 'Existing Conditions', placeholder: 'e.g. Diabetes, Hypertension…' },
                    { field: 'allergies', label: 'Allergies', placeholder: 'e.g. Penicillin, Pollen…' },
                    { field: 'diet', label: 'Diet & Nutrition', placeholder: 'e.g. Vegetarian, low-sodium…' },
                    { field: 'exercise', label: 'Exercise Routine', placeholder: 'e.g. 30 min walking daily…' },
                  ].map(({ field, label, placeholder }) => (
                    <div key={field} className="flex flex-col">
                      <label className="text-xs font-semibold text-slate-400 mb-1">{label}</label>
                      <textarea
                        rows={2}
                        value={healthProfileForm[field]}
                        onChange={e => handleProfileFieldChange(field, e.target.value)}
                        placeholder={placeholder}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-secondary transition-all resize-none"
                      />
                    </div>
                  ))}

                  <div className="flex items-center gap-4 pt-2">
                    <button
                      type="submit"
                      disabled={profileSaveStatus === 'saving' || !profileFormDirty}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold bg-secondary hover:bg-secondary-light text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {profileSaveStatus === 'saving' ? 'Saving…' : 'Save Health Profile'}
                    </button>
                    {profileSaveStatus === 'saved' && <span className="text-xs text-emerald-400 font-semibold">✓ Saved successfully</span>}
                    {profileSaveStatus === 'error' && <span className="text-xs text-red-400 font-semibold">Failed to save. Try again.</span>}
                  </div>
                </form>
              </div>

              {/* ── Account Info ── */}
              <div className="max-w-2xl rounded-2xl border border-secondary/15 bg-secondary/[0.03] backdrop-blur-sm p-6 space-y-4">
                <h4 className="text-sm font-bold text-secondary uppercase tracking-wider flex items-center gap-2"><User className="w-4 h-4" /> Account Details</h4>
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <label className="text-xs text-slate-400 font-semibold mb-1">Display Name</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={displayName}
                        onChange={e => { setDisplayName(e.target.value); setNameSaveStatus(null); }}
                        placeholder="Your display name"
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-secondary transition-all"
                      />
                      <button
                        type="button"
                        onClick={saveDisplayName}
                        disabled={nameSaveStatus === 'saving' || !displayName.trim()}
                        className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold bg-secondary hover:bg-secondary-light text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {nameSaveStatus === 'saving' ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                    {nameSaveStatus === 'saved' && <span className="text-xs text-emerald-400 font-semibold mt-1">✓ Display name updated</span>}
                    {nameSaveStatus === 'error' && <span className="text-xs text-red-400 font-semibold mt-1">Failed to save. Try again.</span>}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 font-semibold mb-1">Email Address</span>
                    <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-sm font-semibold text-white">
                      {user?.email || '–'}
                    </div>
                    <span className="text-xs text-slate-500 mt-1">Email cannot be changed here.</span>
                  </div>
                </div>
              </div>

              {/* ── Security ── */}
              <div className="max-w-2xl rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm p-6 space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Security</h4>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-white">Change Password</p>
                    <p className="text-xs text-slate-400 mt-0.5">A reset link will be sent to your registered email.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={passwordResetStatus === 'sending' || passwordResetStatus === 'sent'}
                    className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all bg-secondary/90 hover:bg-secondary text-white shadow-md hover:shadow-secondary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {passwordResetStatus === 'sending' ? 'Sending…' : passwordResetStatus === 'sent' ? '✓ Email Sent' : 'Send Reset Email'}
                  </button>
                </div>
                {passwordResetStatus === 'sent' && (
                  <p className="text-xs text-emerald-400 font-semibold">Check your inbox — a password reset link has been sent to {user?.email}.</p>
                )}
                {passwordResetStatus === 'error' && (
                  <p className="text-xs text-red-400 font-semibold">Failed to send reset email. Please try again or contact support.</p>
                )}
              </div>

              {/* ── Notifications ── */}
              <div className="max-w-2xl rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm p-6 space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Notifications</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">Email Notifications</p>
                      <p className="text-xs text-slate-400 mt-0.5">Appointment reminders and health tips.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleEmailNotif(!emailNotif)}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 outline-none focus:ring-2 focus:ring-secondary/30 ${emailNotif ? 'bg-secondary' : 'bg-white/10'}`}
                      aria-label="Toggle email notifications"
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${emailNotif ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">SMS Alerts</p>
                      <p className="text-xs text-slate-400 mt-0.5">Urgent alerts and booking confirmations via SMS.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSmsAlerts(!smsAlerts)}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 outline-none focus:ring-2 focus:ring-secondary/30 ${smsAlerts ? 'bg-secondary' : 'bg-white/10'}`}
                      aria-label="Toggle SMS alerts"
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${smsAlerts ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Logout ── */}
              <div className="max-w-2xl">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-red-400 bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:text-red-300 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out of HEALTHBIRCH
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Review Modal popup */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0A1F44] border border-white/10 text-white rounded-3xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-2">Review {reviewPayload.doctorName}</h3>
            <p className="text-xs text-slate-400 mb-6 font-semibold">How was your appointment experience?</p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setReviewPayload({ ...reviewPayload, rating: star })} className={`p-2 rounded-full transition ${reviewPayload.rating >= star ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-400 hover:bg-white/5'}`}>
                    <Star className="h-7 w-7" fill={reviewPayload.rating >= star ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Comment</label>
              <textarea rows={3} value={reviewPayload.comment} onChange={(e) => setReviewPayload({ ...reviewPayload, comment: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-secondary resize-none font-semibold" placeholder="Share details of your experience..." />
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="secondary" className="rounded-full px-5 hover:bg-white/5 text-slate-300 border-white/10" onClick={() => setReviewModalOpen(false)}>Cancel</Button>
              <Button className="rounded-full px-5 shadow-md" onClick={submitReview}>Submit Review</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PatientDashboard;
