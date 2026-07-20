import React, { useEffect, useState, useMemo } from 'react';
import { Check, Loader2, X, Calendar as CalendarIcon, List as ListIcon, Clock, ChevronLeft, ChevronRight, CalendarCheck, Users, Activity, LogOut, Menu, FileText, Settings, User, BarChart2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import api from '../services/api';
import logo from '../assets/healthbirch-logo.png';

const severityBadgeClasses = (severity) => {
  if (severity === 'low' || severity === 'routine') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (severity === 'medium' || severity === 'urgent') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (severity === 'high' || severity === 'emergency') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    phone: '', clinic_name: '', clinic_address: '', experience: '',
    availableDays: [], availableSlots: []
  });
  const [profileSaveStatus, setProfileSaveStatus] = useState(null);
  const [profileFormDirty, setProfileFormDirty] = useState(false);
  const [passwordResetStatus, setPasswordResetStatus] = useState(null);
  const [selectedApt, setSelectedApt] = useState(null); // For full summary modal (Task 16)
  const [statusError, setStatusError] = useState(''); // inline error for status/severity updates

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await api.get('/api/appointments/doctor');
        setAppointments(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    const fetchDoctorProfile = async () => {
      try {
        const res = await api.get('/api/doctors/me');
        if (res.data) {
          setDoctorProfile(res.data);
          setDoctorForm({
            name: res.data.name || '',
            phone: res.data.phone || '',
            clinic_name: res.data.clinic_name || '',
            clinic_address: res.data.clinic_address || '',
            experience: res.data.experience || '',
            availableDays: res.data.availableDays || [],
            availableSlots: res.data.availableSlots || [],
          });
        }
      } catch (err) {
        console.error('Could not fetch doctor profile', err);
      }
    };
    fetchAppointments();
    fetchDoctorProfile();
  }, []);

  const handleDoctorFormChange = (field, value) => {
    setDoctorForm(prev => ({ ...prev, [field]: value }));
    setProfileFormDirty(true);
    setProfileSaveStatus(null);
  };

  const saveDoctorProfile = async (e) => {
    e?.preventDefault();
    setProfileSaveStatus('saving');
    try {
      await api.put('/api/doctors/me', doctorForm);
      setProfileSaveStatus('saved');
      setProfileFormDirty(false);
    } catch (err) {
      console.error('Profile save error:', err);
      setProfileSaveStatus('error');
    }
  };

  const handlePasswordReset = async () => {
    setPasswordResetStatus('sending');
    try {
      const email = doctorProfile?.email;
      if (!email) throw new Error('No email');
      await sendPasswordResetEmail(auth, email);
      setPasswordResetStatus('sent');
    } catch (err) {
      console.error(err);
      setPasswordResetStatus('error');
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

  const updateStatus = async (appointmentId, status) => {
    setStatusError('');
    try {
      await api.patch(`/api/appointments/${appointmentId}/status`, { status });
      setAppointments((prev) => prev.map((apt) => (apt.id === appointmentId ? { ...apt, status } : apt)));
    } catch (err) {
      console.error(err);
      setStatusError('Failed to update appointment status. Please try again.');
    }
  };

  const overrideSeverity = async (appointmentId, newSeverity) => {
    setStatusError('');
    try {
      await api.patch(`/api/appointments/${appointmentId}/severity`, { severity: newSeverity });
      setAppointments(prev => prev.map(apt => apt.id === appointmentId ? { ...apt, severity: newSeverity } : apt));
    } catch (err) {
      console.error(err);
      setStatusError('Failed to update severity. Please try again.');
    }
  };

  const pendingAppointments = appointments.filter(a => a.status === 'pending');
  const confirmedAppointments = appointments.filter(a => a.status === 'confirmed').sort((a, b) => new Date(a.date) - new Date(b.date));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + (currentWeekOffset * 7));

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const sidebarItems = [
    { key: 'schedule', label: 'Schedule', icon: CalendarCheck },
    { key: 'patients', label: 'Patients', icon: Users },
    { key: 'reports', label: 'Reports', icon: Activity },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d1b3e] to-[#0a0a0f]">
      {/* Sidebar Navigation */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} shrink-0 border-r border-white/5 bg-white/5 backdrop-blur-md hidden md:flex flex-col transition-all duration-300 h-screen sticky top-0`}>
        <div className="p-4">
          <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} mb-6`}>
            {sidebarOpen && (
              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className="flex items-center gap-2 transition hover:opacity-90"
              >
                <img src={logo} alt="HEALTHBIRCH" className="h-6 w-auto object-contain bg-white rounded-md p-1" />
                <span className="text-lg font-bold tracking-tight text-white">HEALTHBIRCH</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSidebarOpen(prev => !prev)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          {sidebarOpen && <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">Dashboard</div>}
          <div className="space-y-1">
            {sidebarItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-primary/90 text-white shadow-md shadow-primary/20 scale-[1.02]' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-auto p-4 border-t border-white/5 bg-white/[0.02]">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all`}
            title={!sidebarOpen ? 'Sign Out' : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="mx-auto max-w-6xl animate-in fade-in duration-700 zoom-in-[0.98]">

          {/* ===== SCHEDULE TAB ===== */}
          {activeTab === 'schedule' && (
            <>
              <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-secondary/80 uppercase tracking-widest mb-1">
                    Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},{' '}
                    {doctorProfile ? `Dr. ${doctorProfile.name?.replace(/^Dr\.?\s*/i, '').split(' ')[0] || 'Doctor'}` : '…'} 👋
                  </p>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">Today's Schedule</h1>
                  <p className="mt-1 text-slate-300 font-medium">{["Great doctors listen before they speak.", "Your expertise changes lives every day.", "Every patient is someone's whole world.", "Medicine is a science of uncertainty and an art of probability.", "Healing is a matter of time, but sometimes also a matter of opportunity."][new Date().getDay() % 5]}</p>
                  {statusError && (
                    <div className="mt-2 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-300 font-semibold">
                      <span className="flex-1">{statusError}</span>
                      <button type="button" onClick={() => setStatusError('')} className="text-red-400 hover:text-red-200 text-lg leading-none">&times;</button>
                    </div>
                  )}
                </div>
                <div className="flex items-center rounded-2xl glass-panel p-1 border border-white/50 shadow-sm h-fit">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-md' : 'text-slate-300 hover:bg-white/50'}`}
                  >
                    <ListIcon className="h-4 w-4" /> Pending Requests
                    {pendingAppointments.length > 0 && <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">{pendingAppointments.length}</span>}
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${viewMode === 'calendar' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                  >
                    <CalendarIcon className="h-4 w-4" /> My Calendar
                  </button>
                </div>
              </header>

              <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/50 glass-panel p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Pending Requests</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{pendingAppointments.length}</p>
                </div>
                <div className="rounded-3xl border border-white/50 glass-panel p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Today's Appointments</p>
                  <p className="mt-2 text-3xl font-bold text-primary">{confirmedAppointments.filter(a => a.date.startsWith(new Date().toLocaleDateString('en-CA'))).length}</p>
                </div>
                <div className="rounded-3xl border border-white/50 glass-panel p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Upcoming This Week</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{confirmedAppointments.length}</p>
                </div>
              </section>

              {loading ? (
                <div className="flex justify-center rounded-3xl border border-white/50 glass-panel p-16 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : viewMode === 'list' ? (
                pendingAppointments.length === 0 ? (
                  <div className="rounded-3xl border border-white/50 glass-panel p-16 text-center text-slate-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    No pending requests at the moment.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingAppointments.map((apt) => (
                      <article key={apt.id} className="rounded-3xl border border-white/50 glass-panel p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-full bg-primary-light flex items-center justify-center text-primary-dark font-bold text-lg">
                                {apt.patientName?.[0] || 'P'}
                              </div>
                              <div>
                                <h2 className="text-lg font-bold text-slate-900">{apt.patientName || 'Patient'}</h2>
                                <p className="text-sm text-slate-500">{new Date(apt.date).toLocaleDateString()} • {apt.timeSlot}</p>
                              </div>
                            </div>
                            <div className="mt-4 rounded-2xl border border-white/50 bg-white/40 p-4 text-sm text-slate-600 shadow-sm relative overflow-hidden">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/40"></div>
                              <span className="font-semibold text-slate-700 block mb-1">AI Triage Note:</span>
                              {apt.aiReasoning && (
                                <div className="mb-2 text-xs italic bg-slate-50/50 p-2 rounded">
                                  <span className="font-semibold text-slate-500 not-italic">Reasoning:</span> {apt.aiReasoning}
                                </div>
                              )}
                              {apt.aiSummary || apt.symptoms || 'No AI symptom brief available.'}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-start gap-4 md:items-end mt-2 md:mt-0">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-semibold mr-1">Triage Priority:</span>
                                <select
                                  value={apt.severity || 'low'}
                                  onChange={(e) => overrideSeverity(apt.id, e.target.value)}
                                  className={`text-xs border rounded-lg px-2 py-1 font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-primary/20 ${severityBadgeClasses(apt.severity)}`}
                                >
                                  <option value="Low">LOW</option>
                                  <option value="Medium">MEDIUM</option>
                                  <option value="High">HIGH</option>
                                </select>
                              </div>
                              {apt.aiSeverity && apt.aiSeverity.toLowerCase() !== apt.severity?.toLowerCase() && (
                                <div className="text-[9px] text-slate-400 font-bold uppercase">
                                  AI Original: {apt.aiSeverity}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => updateStatus(apt.id, 'confirmed')} className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 shadow-md hover:-translate-y-0.5 active:scale-95">
                                <Check className="h-4 w-4" /> Accept
                              </button>
                              <button type="button" onClick={() => updateStatus(apt.id, 'cancelled')} className="inline-flex items-center gap-1 rounded-full border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:border-slate-300 active:scale-95">
                                <X className="h-4 w-4" /> Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )
              ) : (
                <div className="rounded-3xl border border-white/50 glass-panel p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900">
                      {startOfWeek.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex gap-2">
                      <button onClick={() => setCurrentWeekOffset(p => p - 1)} className="p-2 rounded-full hover:bg-primary/10 text-slate-600 transition">
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button onClick={() => setCurrentWeekOffset(0)} className="px-4 py-2 rounded-full hover:bg-primary/10 text-sm font-semibold text-slate-600 transition">
                        Today
                      </button>
                      <button onClick={() => setCurrentWeekOffset(p => p + 1)} className="p-2 rounded-full hover:bg-primary/10 text-slate-600 transition">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                    {weekDays.map(date => {
                      const isToday = date.toDateString() === new Date().toDateString();
                      const dayStr = date.toLocaleDateString('en-CA');
                      const dayAppointments = confirmedAppointments.filter(a => a.date.startsWith(dayStr));
                      return (
                        <div key={date.toISOString()} className={`flex flex-col min-h-[220px] rounded-2xl p-3 transition-all ${isToday ? 'bg-primary/5 border-primary/30 border-2 shadow-inner' : 'bg-white/60 border border-white/80 hover:bg-white/80'}`}>
                          <div className="mb-4 flex items-baseline justify-between border-b border-black/5 pb-2">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                              {date.toLocaleDateString(undefined, { weekday: 'short' })}
                            </span>
                            <span className={`text-lg font-bold ${isToday ? 'text-primary' : 'text-slate-700'}`}>
                              {date.getDate()}
                            </span>
                          </div>
                          <div className="flex-1 flex flex-col gap-2">
                            {dayAppointments.length === 0 ? (
                              <div className="flex-1 flex items-center justify-center">
                                <span className="text-xs text-slate-400">No appts</span>
                              </div>
                            ) : (
                              dayAppointments.map(apt => (
                                <div key={apt.id} className="rounded-xl bg-white border border-gray-100 p-2.5 shadow-sm hover:shadow-md transition">
                                  <div className="text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {apt.timeSlot}
                                  </div>
                                  <div className="text-sm font-bold text-slate-900 leading-tight">
                                    {apt.patientName?.split(' ')[0]}
                                  </div>
                                  <div className="mt-1 flex items-center gap-1">
                                    <span className="text-[8px] text-slate-400 font-bold uppercase">Pri:</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${severityBadgeClasses(apt.severity)}`}>
                                      {(apt.severity || 'rtn').substring(0, 3)}
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ===== PATIENTS TAB ===== */}
          {activeTab === 'patients' && (
            <>
              <header className="mb-8">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">My Patients</h1>
                <p className="mt-1 text-slate-300 font-medium">Patients who have booked appointments with you.</p>
              </header>
              {loading ? (
                <div className="flex justify-center rounded-3xl border border-white/50 glass-panel p-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : appointments.length === 0 ? (
                <div className="rounded-3xl border border-white/50 glass-panel p-16 text-center text-slate-500">
                  No patient appointments yet.
                </div>
              ) : (
                <div className="rounded-3xl border border-white/50 glass-panel overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-white/30">
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Severity</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Outcome</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Summary</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map(apt => (
                          <tr key={apt.id} className="border-b border-slate-50 hover:bg-white/40 transition">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary-light flex items-center justify-center text-primary-dark font-bold text-sm">
                                  {apt.patientName?.[0] || 'P'}
                                </div>
                                <span className="font-semibold text-slate-900">{apt.patientName || 'Patient'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">{apt.date ? new Date(apt.date).toLocaleDateString() : '—'}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{apt.timeSlot || '—'}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${severityBadgeClasses(apt.severity)}`}>
                                {apt.severity || 'routine'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : apt.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                {apt.status || 'pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {(apt.status === 'confirmed') && (
                                <select
                                  value={apt.outcome || ''}
                                  onChange={(e) => updateStatus(apt.id, e.target.value)}
                                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 font-bold bg-white text-slate-700 outline-none focus:ring-1 focus:ring-primary/30"
                                >
                                  <option value="">Set Outcome…</option>
                                  <option value="completed">✓ Showed</option>
                                  <option value="no_show">✗ No-show</option>
                                  <option value="rescheduled">↻ Reschedule</option>
                                  <option value="cancelled">— Cancelled</option>
                                </select>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {(apt.aiSummary || apt.symptoms) && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedApt(apt)}
                                  className="text-xs font-bold text-secondary hover:text-secondary-light underline underline-offset-2 transition"
                                >
                                  View Summary
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ===== Full Summary Modal (Task 16) ===== */}
          {selectedApt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="w-full max-w-lg rounded-3xl bg-[#0A1F44] border border-white/10 text-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-bold text-white">AI Triage Summary</h3>
                  <button type="button" onClick={() => setSelectedApt(null)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold">{selectedApt.patientName?.[0] || 'P'}</div>
                    <div>
                      <p className="font-bold text-white">{selectedApt.patientName}</p>
                      <p className="text-xs text-slate-400">{new Date(selectedApt.date).toLocaleDateString()} · {selectedApt.timeSlot}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/5 border border-white/5 p-4 text-sm text-slate-300 space-y-3">
                    {selectedApt.aiSummary && (
                      <div>
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">AI Summary</span>
                        <p>{selectedApt.aiSummary}</p>
                      </div>
                    )}
                    {selectedApt.aiReasoning && (
                      <div>
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reasoning</span>
                        <p className="italic">{selectedApt.aiReasoning}</p>
                      </div>
                    )}
                    {selectedApt.symptoms && (
                      <div>
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Patient Symptoms</span>
                        <p>{selectedApt.symptoms}</p>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap pt-1">
                      {selectedApt.aiSeverity && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">AI Severity: {selectedApt.aiSeverity}</span>}
                      {selectedApt.severity && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400">Override: {selectedApt.severity}</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button type="button" onClick={() => setSelectedApt(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-secondary hover:bg-secondary-light transition">Close</button>
                </div>
              </div>
            </div>
          )}

          {/* ===== REPORTS TAB ===== */}
          {activeTab === 'reports' && (() => {
            const totalApts = appointments.length;
            const confirmed = appointments.filter(a => a.status === 'confirmed' || a.status === 'completed').length;
            const pending = appointments.filter(a => a.status === 'pending').length;
            const cancelled = appointments.filter(a => a.status === 'cancelled' || a.status === 'canceled').length;
            const highSeverity = appointments.filter(a => a.severity === 'high' || a.severity === 'emergency').length;
            const medSeverity = appointments.filter(a => a.severity === 'medium' || a.severity === 'urgent').length;
            const lowSeverity = appointments.filter(a => a.severity === 'low' || a.severity === 'routine').length;
            const uniquePatients = new Set(appointments.map(a => a.patientId)).size; // Task 18
            return (
              <>
                <header className="mb-8">
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">Patient Analytics</h1>
                  <p className="mt-1 text-slate-300 font-medium">Appointment analytics and patient volume at a glance.</p>
                </header>
                {/* Stats Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'Total Appointments', value: totalApts, color: 'text-white' },
                    { label: 'Confirmed / Done', value: confirmed, color: 'text-emerald-400' },
                    { label: 'Pending Approval', value: pending, color: 'text-amber-400' },
                    { label: 'Cancelled', value: cancelled, color: 'text-red-400' },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                      <p className={`mt-2 text-3xl font-extrabold ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>
                {/* Unique Patients stat (Task 18) */}
                <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5 mb-8 flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center">
                    <Users className="w-7 h-7 text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unique Patients Seen</p>
                    <p className="mt-1 text-4xl font-extrabold text-white">{uniquePatients}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Distinct patients across all appointment records</p>
                  </div>
                </div>
                {/* Severity Breakdown */}
                <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 mb-8">
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-secondary" /> Severity Distribution</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'High / Emergency', value: highSeverity, total: totalApts, color: 'bg-red-500' },
                      { label: 'Medium / Urgent', value: medSeverity, total: totalApts, color: 'bg-amber-400' },
                      { label: 'Low / Routine', value: lowSeverity, total: totalApts, color: 'bg-emerald-400' },
                    ].map(row => (
                      <div key={row.label}>
                        <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                          <span>{row.label}</span>
                          <span className="text-white">{row.value} ({row.total > 0 ? Math.round(row.value / row.total * 100) : 0}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div className={`h-2 rounded-full ${row.color} transition-all duration-700`} style={{ width: `${row.total > 0 ? (row.value / row.total * 100) : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Recent Appointments Table */}
                <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-secondary" />
                    <h3 className="text-base font-bold text-white">All Appointments</h3>
                  </div>
                  {appointments.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">No appointment data yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Patient</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Time</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Severity</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...appointments].sort((a, b) => new Date(b.date) - new Date(a.date)).map(apt => (
                            <tr key={apt.id} className="border-b border-white/5 hover:bg-white/[0.04] transition">
                              <td className="px-6 py-3 text-sm font-semibold text-white">{apt.patientName || 'Patient'}</td>
                              <td className="px-6 py-3 text-sm text-slate-400">{apt.date ? new Date(apt.date).toLocaleDateString() : '—'}</td>
                              <td className="px-6 py-3 text-sm text-slate-400">{apt.timeSlot || '—'}</td>
                              <td className="px-6 py-3"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${severityBadgeClasses(apt.severity)}`}>{apt.severity || 'routine'}</span></td>
                              <td className="px-6 py-3"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${apt.status === 'confirmed' || apt.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : apt.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>{apt.status || 'pending'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* ===== SETTINGS TAB ===== */}
          {activeTab === 'settings' && (
            <>
              <header className="mb-8">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">My Settings</h1>
                <p className="mt-1 text-slate-300 font-medium">Update your clinic details and account preferences.</p>
              </header>

              {/* ── Clinic / Practice Details ── */}
              <div className="max-w-2xl rounded-3xl border border-secondary/15 bg-secondary/[0.03] p-6 mb-6 space-y-5">
                <h4 className="text-sm font-bold text-secondary uppercase tracking-wider flex items-center gap-2"><User className="w-4 h-4" /> Practice Details</h4>
                <form onSubmit={saveDoctorProfile} className="space-y-4">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-400 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={doctorForm.name || ''}
                      onChange={e => handleDoctorFormChange('name', e.target.value)}
                      placeholder="Your full name"
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-secondary transition-all"
                    />
                  </div>
                  {/* Email (read-only) */}
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-400 mb-1">Email Address</label>
                    <input
                      type="text"
                      value={doctorProfile?.email || ''}
                      readOnly
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Email is managed by the administrator.</p>
                  </div>
                  {[
                    { field: 'phone', label: 'Phone Number', placeholder: '+91 98765 43210' },
                    { field: 'clinic_name', label: 'Clinic Name', placeholder: 'e.g. City Health Clinic' },
                    { field: 'clinic_address', label: 'Clinic Address', placeholder: 'Full address...' },
                    { field: 'experience', label: 'Years of Experience', placeholder: 'e.g. 10 Years' },
                  ].map(({ field, label, placeholder }) => (
                    <div key={field} className="flex flex-col">
                      <label className="text-xs font-semibold text-slate-400 mb-1">{label}</label>
                      <input
                        type="text"
                        value={doctorForm[field]}
                        onChange={e => handleDoctorFormChange(field, e.target.value)}
                        placeholder={placeholder}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-secondary transition-all"
                      />
                    </div>
                  ))}

                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-400 mb-1">Available Days (comma-separated)</label>
                    <input
                      type="text"
                      value={doctorForm.availableDays.join(', ')}
                      onChange={e => handleDoctorFormChange('availableDays', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="Monday, Tuesday, Wednesday..."
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-secondary transition-all"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-slate-400 mb-1">Available Slots (comma-separated)</label>
                    <input
                      type="text"
                      value={doctorForm.availableSlots.join(', ')}
                      onChange={e => handleDoctorFormChange('availableSlots', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="09:00 AM, 10:00 AM, 02:00 PM..."
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-secondary transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <button
                      type="submit"
                      disabled={profileSaveStatus === 'saving' || !profileFormDirty}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold bg-secondary hover:bg-secondary-light text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {profileSaveStatus === 'saving' ? 'Saving…' : 'Save Changes'}
                    </button>
                    {profileSaveStatus === 'saved' && <span className="text-xs text-emerald-400 font-semibold">✓ Saved successfully</span>}
                    {profileSaveStatus === 'error' && <span className="text-xs text-red-400 font-semibold">Failed to save. Try again.</span>}
                  </div>
                </form>
              </div>

              {/* ── Security ── */}
              <div className="max-w-2xl rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm p-6 mb-6 space-y-4">
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
                    className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all bg-secondary/90 hover:bg-secondary text-white shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {passwordResetStatus === 'sending' ? 'Sending…' : passwordResetStatus === 'sent' ? '✓ Email Sent' : 'Send Reset Email'}
                  </button>
                </div>
                {passwordResetStatus === 'sent' && <p className="text-xs text-emerald-400 font-semibold">Reset email sent to {doctorProfile?.email}.</p>}
                {passwordResetStatus === 'error' && <p className="text-xs text-red-400 font-semibold">Failed to send. Try again.</p>}
              </div>

              {/* ── Logout ── */}
              <div className="max-w-2xl">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-red-400 bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:text-red-300 transition-all"
                >
                  <LogOut className="w-4 h-4" /> Sign out of HEALTHBIRCH
                </button>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
};

export default DoctorDashboard;
