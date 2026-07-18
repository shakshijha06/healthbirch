import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, User, Stethoscope } from 'lucide-react';
import { Input } from '../components/shared/Input';
import { Button } from '../components/shared/Button';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import api from '../services/api';
import logo from '../assets/healthbirch-logo.png'; // Import brand logo.

const Register = () => {
  const [role, setRole] = useState('patient');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    city: '',
    specialization: '',
    state: '',
    country: 'India',
    phone: '',
    clinic_name: '',
    clinic_address: '',
    experience: '0 Years'
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    if (role !== 'patient') return;
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          name: user.displayName || user.email.split('@')[0],
          email: user.email,
          role: 'patient',
          onboardingComplete: false,
          createdAt: new Date().toISOString()
        });
      }
      navigate('/patient/dashboard');
    } catch (err) {
      console.error(err);
      setError('Google Sign-In failed or was closed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (role === 'patient') {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        await setDoc(doc(db, 'users', user.uid), {
          name: formData.name,
          email: formData.email,
          role: 'patient',
          city: formData.city,
          createdAt: new Date().toISOString()
        });

        navigate('/patient/dashboard');
      } else if (role === 'doctor') {
        const res = await api.post('/api/auth/register/doctor', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          specialization: formData.specialization,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          phone: formData.phone,
          clinic_name: formData.clinic_name,
          clinic_address: formData.clinic_address,
          experience: formData.experience,
          availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          availableSlots: ["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "03:00 PM"],
          rating: 0.0
        });

        if (res.status === 200) {
            await createUserWithEmailAndPassword(auth, formData.email, formData.password).catch(async (e) => {
                if(e.code === 'auth/email-already-in-use') {
                    const { signInWithEmailAndPassword } = await import('firebase/auth');
                    await signInWithEmailAndPassword(auth, formData.email, formData.password);
                } else {
                    throw e;
                }
            });

            navigate('/doctor/dashboard');
        }
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Registration failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Brand Panel (Hidden on small screens) */}
      <div className="hidden lg:flex relative flex-col justify-between bg-primary-dark overflow-hidden p-12">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_2px_2px,white_1px,transparent_0)] [background-size:32px_32px]" />
        
        {/* Soft glowing orb effect */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary rounded-full mix-blend-screen filter blur-[100px] opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary-light rounded-full mix-blend-screen filter blur-[100px] opacity-30" />
        
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src={logo} alt="HEALTHBIRCH" className="h-10 w-auto object-contain bg-white rounded-lg p-1.5" />
            <span className="text-2xl font-bold tracking-tight text-white">HEALTHBIRCH</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg pb-12">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Join the future <br />
            <span className="text-secondary-light">of healthcare.</span>
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Create an account in minutes and experience AI-powered scheduling and care matching.
          </p>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] to-[#0d1b3e] px-6 py-12 lg:px-8 overflow-y-auto text-white">
        <div className={`w-full ${role === 'doctor' ? 'max-w-2xl' : 'max-w-sm xl:max-w-md'}`}>
          {/* Mobile Header Banner */}
          <div className="lg:hidden mb-8 text-center flex flex-col items-center">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
               <img src={logo} alt="HEALTHBIRCH" className="h-10 w-auto object-contain" />
               <span className="text-xl font-bold tracking-tight text-white">HEALTHBIRCH</span>
            </Link>
          </div>

          <div className="text-center lg:text-left mb-8 space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Create an account</h1>
            <p className="text-sm text-slate-300 font-medium font-sans">Patient registration — Doctors are added by Admin only.</p>
          </div>

          {/* Patient-only notice badge (Task 22) */}
          <div className="flex items-center gap-2 bg-[#60A5FA]/10 border border-[#60A5FA]/20 rounded-2xl px-4 py-3 mb-6">
            <User size={16} className="text-[#60A5FA] shrink-0" />
            <span className="text-sm font-bold text-[#60A5FA]">Patient Account</span>
            <span className="text-xs text-slate-400 ml-1">· Doctor accounts are created by administrators only.</span>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
             {role === 'patient' ? (
                <div className="space-y-4">
                  <Input label="Full Name" type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required />
                  <Input label="Email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required />
                  <div className="relative">
                    <Input label="Password" type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required />
                    <button type="button" className="absolute right-3 top-9 p-1 rounded-full text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-light transition-colors" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <Input label="City" type="text" name="city" value={formData.city} onChange={handleChange} placeholder="E.g., Delhi" required />
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div className="space-y-4">
                      <Input label="Full Name" type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Dr. Jane Doe" required />
                      <Input label="Email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="doctor@example.com" required />
                      <div className="relative">
                        <Input label="Password" type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required />
                        <button type="button" className="absolute right-3 top-9 p-1 rounded-full text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-light transition-colors" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <Input label="Specialization" type="text" name="specialization" value={formData.specialization} onChange={handleChange} placeholder="E.g., Cardiology" required />
                      <Input label="Phone" type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 9876543210" required />
                   </div>
                   <div className="space-y-4">
                      <Input label="Experience" type="text" name="experience" value={formData.experience} onChange={handleChange} placeholder="E.g., 5 Years" required />
                      <Input label="Clinic / Hospital Name" type="text" name="clinic_name" value={formData.clinic_name} onChange={handleChange} placeholder="Healthy Heart Clinic" required />
                      <Input label="Clinic Address" type="text" name="clinic_address" value={formData.clinic_address} onChange={handleChange} placeholder="123 Care Avenue" required />
                      <Input label="City" type="text" name="city" value={formData.city} onChange={handleChange} placeholder="Mumbai" required />
                      <Input label="State" type="text" name="state" value={formData.state} onChange={handleChange} placeholder="Maharashtra" required />
                   </div>
                </div>
             )}

            {error && (
               <div className="p-3 rounded-lg bg-red-500/10 text-red-200 text-sm font-medium border border-red-500/20 mt-2">
                 {error}
               </div>
            )}

            <div className="pt-2">
              <Button type="submit" className="w-full h-12 shadow-md shadow-primary/20 text-sm tracking-wide active:scale-[0.98] transition-transform" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Create Account'}
              </Button>
            </div>
          </form>

          {/* Social Auth Divider & Placeholder only for patients. Usually doctors have strict auth. */}
          {role === 'patient' && (
             <>
               <div className="mt-8 flex items-center justify-between">
                 <hr className="w-full border-white/10" />
                 <span className="bg-transparent px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">or</span>
                 <hr className="w-full border-white/10" />
               </div>

                <div className="mt-6">
                   <button
                     type="button"
                     onClick={handleGoogleSignIn}
                     disabled={loading}
                     className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 text-sm font-bold h-12 rounded-full transition-colors shadow-sm select-none"
                   >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                   </button>
                </div>
             </>
          )}

          <div className="mt-8 text-center text-sm font-medium text-slate-400 flex flex-col items-center">
             <span>Already have an account?</span>
             <Link to="/login" className="text-secondary hover:text-[#93C5FD] font-semibold mt-1 transition-colors">
               Log in here
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
