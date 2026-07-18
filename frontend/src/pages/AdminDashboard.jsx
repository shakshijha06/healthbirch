import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Clock3, Loader2, MapPin, Phone, Trash2, Check, X, ShieldCheck, Building2, Menu, FileText, Pencil, LogOut } from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/healthbirch-logo.png';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

const getInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/);
  const first = parts[0]?.[0] || 'D';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

const DoctorCardPreview = ({ doctor, cardRef }) => {
  return (
    <div className="w-[400px]">
      <div ref={cardRef} className="relative h-fit min-h-[220px] overflow-hidden rounded-3xl bg-gradient-to-r from-primary-dark to-primary p-5 text-white shadow-2xl transition hover:scale-[1.02]">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.55)_1px,transparent_0)] [background-size:14px_14px]" />
        <div className="relative z-10 flex h-full items-center justify-between gap-5">
          <div className="flex w-[122px] flex-col items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/30 bg-white/15 text-2xl font-bold">
              {getInitials(doctor?.name)}
            </div>
            <span className="mt-4 rounded-full bg-emerald-500/90 px-3 py-1 text-[10px] font-semibold text-white uppercase tracking-wider">Verified Doctor</span>
          </div>

          <div className="flex flex-1 flex-col justify-between">
            <div>
              <h3 className="truncate text-xl font-extrabold">{doctor?.name || 'Doctor Name'}</h3>
              <p className="mt-1 text-sm font-medium text-primary-light">{doctor?.specialization || 'Specialization'}</p>
              <div className="my-2 h-px bg-white/30" />
              <div className="space-y-1.5 text-[12px]">
                <p className="inline-flex items-center gap-2"><MapPin className="h-3 w-3" /> {doctor?.city || 'City'}</p>
                <p className="inline-flex items-center gap-2"><Building2 className="h-3 w-3" /> {doctor?.clinic_name || 'Clinic'}</p>
                <p className="inline-flex items-center gap-2"><Clock3 className="h-3 w-3" /> {doctor?.experience || 'Experience'}</p>
              </div>
            </div>

            <div className="text-right text-[8px] text-white/85 mt-4">
              <p className="font-bold tracking-widest uppercase">HealthBirch Secure ID</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [activeCardDoctor, setActiveCardDoctor] = useState(null);
  const cardRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('identity');

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', specialization: 'General Physician', city: '', state: '', country: 'India', phone: '', experience: '', rating: 5.0, clinic_name: '', clinic_address: '',
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    availableSlots: ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM']
  });

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const ALL_SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/api/admin/doctors');
      setDoctors(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const [editModal, setEditModal] = useState(null); // doctor being edited or null
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const openEditModal = (doctor) => {
    setEditForm({
      name: doctor.name || '',
      specialization: doctor.specialization || '',
      city: doctor.city || '',
      state: doctor.state || '',
      country: doctor.country || 'India',
      phone: doctor.phone || '',
      experience: doctor.experience || '',
      clinic_name: doctor.clinic_name || '',
      clinic_address: doctor.clinic_address || '',
      status: doctor.status || 'approved',
    });
    setEditError('');
    setEditModal(doctor);
  };

  const handleEditSave = async (e) => {
    e?.preventDefault();
    setEditSaving(true);
    setEditError('');
    try {
      await api.put(`/api/doctors/${editModal.id}`, editForm);
      setDoctors(prev => prev.map(d => d.id === editModal.id ? { ...d, ...editForm } : d));
      setEditModal(null);
    } catch (err) {
      console.error(err);
      setEditError(err.response?.data?.detail || 'Failed to save changes.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    const payload = { ...formData, rating: Number(formData.rating) };

    try {
      const result = await api.post('/api/admin/create-doctor', payload);
      const createdDoctor = { ...payload, id: result.data?.uid || `temp_${Date.now()}` };
      setActiveCardDoctor(createdDoctor);
      setFormData({
        name: '', email: '', password: '', specialization: 'General Physician', city: '', state: '', country: 'India', phone: '', experience: '', rating: 5.0, clinic_name: '', clinic_address: '',
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        availableSlots: ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM']
      });
      await fetchDoctors();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to create doctor account.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete Dr. ${name}?`)) return;
    try {
      await api.delete(`/api/doctors/${id}`);
      setDoctors((prev) => prev.filter((doctor) => doctor.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete doctor.');
    }
  };

  const downloadCard = async (doctor) => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${String(doctor?.name || 'doctor-card').replace(/\s+/g, '-').toLowerCase()}-healthbirch-card.png`;
    link.click();
  };

  // Derive unique clinics from doctors array
  const clinics = React.useMemo(() => {
    const unique = new Map();
    doctors.forEach(doc => {
      if (doc.clinic_name) {
        const key = `${doc.clinic_name.trim().toLowerCase()}_${(doc.city || '').trim().toLowerCase()}`;
        if (!unique.has(key)) {
          unique.set(key, {
            name: doc.clinic_name,
            city: doc.city || 'N/A',
            address: doc.clinic_address || 'N/A',
            doctorCount: 1
          });
        } else {
          unique.get(key).doctorCount += 1;
        }
      }
    });
    return Array.from(unique.values());
  }, [doctors]);

  const sidebarItems = [
    { key: 'identity', label: 'Identity', icon: ShieldCheck },
    { key: 'staff', label: 'Medical Staff', icon: FileText },
    { key: 'clinics', label: 'Clinics', icon: Building2 },
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
                onClick={() => setActiveTab('identity')}
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
              <Menu className="w-5 h-5 animate-pulse" />
            </button>
          </div>
          {sidebarOpen && <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">Admin</div>}
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
        <div className="mx-auto max-w-7xl animate-in fade-in duration-700 zoom-in-[0.98]">
          <header className="mb-8">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin Dashboard</h1>
            <p className="mt-1 text-slate-300 font-medium">Manage platform access, doctors, and identity verification.</p>
          </header>

          {/* ===== IDENTITY TAB ===== */}
          {activeTab === 'identity' && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <section className="rounded-3xl border border-white/50 glass-panel p-6 shadow-sm lg:col-span-1 h-fit transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <h2 className="mb-4 text-lg font-bold text-slate-900">Create Doctor Identity</h2>
                <form onSubmit={handleCreateDoctor} className="space-y-1">
                  <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} required />
                  <Input label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} required />
                  <Input label="Temporary Password" name="password" type="password" value={formData.password} onChange={handleChange} required />
                  <Input label="Specialization" name="specialization" value={formData.specialization} onChange={handleChange} required />
                  <Input label="Clinic Name" name="clinic_name" value={formData.clinic_name} onChange={handleChange} required />
                  <Input label="Clinic Address" name="clinic_address" value={formData.clinic_address} onChange={handleChange} required />
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="City" name="city" value={formData.city} onChange={handleChange} required />
                    <Input label="State" name="state" value={formData.state} onChange={handleChange} required />
                  </div>
                  <Input label="Phone" name="phone" value={formData.phone} onChange={handleChange} required />
                  <Input label="Experience (e.g. 10 Years)" name="experience" value={formData.experience} onChange={handleChange} required />
                  <Input label="Rating" name="rating" type="number" step="0.1" value={formData.rating} onChange={handleChange} required />

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Available Days</label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_DAYS.map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            availableDays: prev.availableDays.includes(day)
                              ? prev.availableDays.filter(d => d !== day)
                              : [...prev.availableDays, day]
                          }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${formData.availableDays.includes(day) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        >
                          {day.substring(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Available Slots</label>
                    <div className="grid grid-cols-3 gap-2">
                      {ALL_SLOTS.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            availableSlots: prev.availableSlots.includes(slot)
                              ? prev.availableSlots.filter(s => s !== slot)
                              : [...prev.availableSlots, slot].sort((a, b) => ALL_SLOTS.indexOf(a) - ALL_SLOTS.indexOf(b))
                          }))}
                          className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${formData.availableSlots.includes(slot) ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error ? <p className="pt-1 text-sm text-red-600">{error}</p> : null}
                  <div className="pt-4">
                    <Button type="submit" className="w-full rounded-full py-3 shadow-md" disabled={creating}>
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Issue Verified Identity & Approvals'}
                    </Button>
                  </div>
                </form>
              </section>

              <section className="rounded-3xl border border-white/50 glass-panel shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:col-span-2 overflow-hidden flex flex-col h-fit md:min-h-[600px]">
                <div className="border-b border-white/50 bg-white/30 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    Active Medical Staff <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  </h2>
                  <div className="text-xs font-semibold text-slate-500 bg-white/55 px-3 py-1 rounded-full border border-white">
                    Total: {doctors.length}
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto p-4">
                  {loading ? (
                    <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {doctors.length === 0 ? (
                        <div className="py-16 text-center text-slate-500">No doctors registered on the platform yet.</div>
                      ) : (
                        doctors.map(doctor => (
                          <div key={doctor.id} className="bg-white/80 border border-white/60 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between shadow-sm hover:shadow-md transition gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center text-primary-dark font-bold">{getInitials(doctor.name)}</div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-lg">{doctor.name}</h4>
                                <p className="text-sm text-slate-500 font-semibold">{doctor.specialization} • {doctor.city}</p>
                                <p className="text-xs text-slate-400 mt-1">{doctor.phone || 'N/A'} • {doctor.experience || 'N/A'}</p>
                                <p className="text-xs text-slate-400">{doctor.clinic_address || 'No Clinic Address'}</p>
                              </div>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                              <button onClick={() => setActiveCardDoctor(doctor)} className="flex-1 md:flex-none border-2 border-primary/20 bg-white text-primary-dark px-4 py-2 rounded-full text-sm font-bold shadow-sm hover:bg-primary/5 transition text-center whitespace-nowrap">View Card</button>
                              <button onClick={() => openEditModal(doctor)} className="p-2 border-2 border-blue-200 text-blue-500 rounded-full hover:bg-blue-50 transition" title="Edit Doctor"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(doctor.id, doctor.name)} className="p-2 border-2 border-red-200 text-red-500 rounded-full hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ===== CLINICS TAB ===== */}
          {activeTab === 'clinics' && (
            <section className="rounded-3xl border border-white/50 glass-panel p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                Registered Clinics <Building2 className="w-6 h-6 text-indigo-500" />
              </h2>
              {clinics.length === 0 ? (
                <p className="text-slate-500 py-6 text-center">No clinics found/derived from staff accounts.</p>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {clinics.map((clinic, idx) => (
                    <div key={idx} className="bg-white/80 border border-white/60 rounded-2xl p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition duration-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="p-3 bg-indigo-50 rounded-xl">
                          <Building2 className="w-6 h-6 text-indigo-500" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-100/50 border border-indigo-200 px-3 py-1 rounded-full">
                          {clinic.doctorCount} {clinic.doctorCount === 1 ? 'Doctor' : 'Doctors'}
                        </span>
                      </div>
                      <h3 className="mt-4 text-lg font-bold text-slate-900">{clinic.name}</h3>
                      <p className="text-xs text-slate-400 font-semibold mt-1 inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {clinic.city}
                      </p>
                      <p className="mt-3 text-xs text-slate-600 max-w-xs">{clinic.address}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ===== MEDICAL STAFF TAB ===== (Task 20) */}
          {activeTab === 'staff' && (
            <section className="space-y-6 animate-in fade-in duration-500">
              <header className="mb-4">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Medical Staff</h1>
                <p className="text-xs md:text-sm text-slate-300">All registered doctors on the platform.</p>
              </header>
              {loading ? (
                <div className="flex justify-center p-16"><Loader2 className="h-8 w-8 animate-spin text-secondary" /></div>
              ) : doctors.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center text-slate-400">No doctors registered yet.</div>
              ) : (
                <div className="rounded-3xl border border-white/5 bg-white/[0.04] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                          <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Doctor</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Specialization</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">City</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Clinic</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doctors.map(doc => (
                          <tr key={doc.id} className="border-b border-white/5 hover:bg-white/[0.04] transition">
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-sm">{getInitials(doc.name)}</div>
                                <span className="font-semibold text-white text-sm">{doc.name || 'Doctor'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-slate-300">{doc.specialization || '—'}</td>
                            <td className="px-6 py-3 text-sm text-slate-300">{doc.city || '—'}</td>
                            <td className="px-6 py-3 text-sm text-slate-300">{doc.clinic_name || '—'}</td>
                            <td className="px-6 py-3">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${doc.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : doc.status === 'suspended' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                {doc.status || 'pending'}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex gap-2">
                                <button type="button" onClick={() => openEditModal(doc)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"><Pencil className="w-4 h-4" /></button>
                                <button type="button" onClick={() => handleDelete(doc.id, doc.name)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

        </div>
      </main>

      {activeCardDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-[460px] rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="mb-6 text-xl font-bold text-slate-900">Digital Visiting Card</h3>
            <div className="flex justify-center">
              <DoctorCardPreview doctor={activeCardDoctor} cardRef={cardRef} />
            </div>
            <div className="mt-8 flex items-center justify-end gap-3">
              <Button variant="secondary" className="rounded-full px-6 py-2.5" onClick={() => setActiveCardDoctor(null)}>Close</Button>
              <Button className="rounded-full px-6 py-2.5 shadow-md" onClick={() => downloadCard(activeCardDoctor)}>Download PNG</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Doctor Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#0A1F44] border border-white/10 text-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-white">Edit Dr. {editModal.name}</h3>
              <button onClick={() => setEditModal(null)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleEditSave} className="space-y-3">
              {[
                { field: 'name', label: 'Full Name' },
                { field: 'specialization', label: 'Specialization' },
                { field: 'city', label: 'City' },
                { field: 'state', label: 'State' },
                { field: 'phone', label: 'Phone' },
                { field: 'experience', label: 'Experience' },
                { field: 'clinic_name', label: 'Clinic Name' },
                { field: 'clinic_address', label: 'Clinic Address' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">{label}</label>
                  <input
                    type="text"
                    value={editForm[field]}
                    onChange={e => setEditForm(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-secondary transition-all"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-[#061530] px-4 py-2.5 text-sm text-slate-300 focus:outline-none transition-all"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              {editError && <p className="text-xs text-red-400 font-semibold">{editError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditModal(null)} className="px-5 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 transition">Cancel</button>
                <button type="submit" disabled={editSaving} className="px-5 py-2 rounded-xl text-sm font-bold bg-secondary hover:bg-secondary-light text-white transition disabled:opacity-50">
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
