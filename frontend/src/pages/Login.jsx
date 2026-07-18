import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, User, Stethoscope, ShieldCheck } from 'lucide-react';
import logo from '../assets/healthbirch-logo.png'; // Import brand logo.
import { Input } from '../components/shared/Input';
import { Button } from '../components/shared/Button';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Login = () => {
  const [role, setRole] = useState('patient'); // 'patient' | 'doctor' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Fetch role to determine redirect and verify they are who they claim they are
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        const actualRole = userDoc.data().role;
        // Optionally fail them if they picked the wrong tab, but for user experience,
        // it's better to log them into their actual dashboard automatically.
        if (actualRole === 'admin') navigate('/admin/dashboard');
        else if (actualRole === 'doctor') navigate('/doctor/dashboard');
        else navigate('/patient/dashboard');
      } else {
        // Fallback for missing user profile documents
        navigate('/patient/dashboard');
      }
    } catch (err) {
      setError('Failed to log in. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Brand Panel (Hidden on small screens) */}
      <div className="hidden lg:flex relative flex-col justify-between bg-[#080810] overflow-hidden p-12">
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_2px_2px,white_1px,transparent_0)] [background-size:28px_28px]" />

        {/* Galaxy core radial glow */}
        <div className="galaxy-core absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(96,165,250,0.18)_0%,transparent_70%)]" />

        {/* Rotating nebula ring */}
        <div className="nebula-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-[#60A5FA]/[0.08]" />
        <div className="nebula-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full border border-[#7C3AED]/[0.07]" style={{animationDuration:'25s',animationDirection:'reverse'}} />

        {/* Orbiting glowing orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="galaxy-orb-1 w-3 h-3 rounded-full bg-[#60A5FA] shadow-[0_0_12px_4px_rgba(96,165,250,0.6)]" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="galaxy-orb-2 w-2 h-2 rounded-full bg-[#7C3AED] shadow-[0_0_10px_3px_rgba(124,58,237,0.5)]" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="galaxy-orb-3 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_2px_rgba(255,255,255,0.4)]" />
        </div>

        {/* Stars scattered around */}
        {[ {top:'15%',left:'20%'}, {top:'70%',left:'75%'}, {top:'40%',left:'85%'}, {top:'80%',left:'30%'}, {top:'25%',left:'60%'} ].map((s, i) => (
          <div key={i} className="absolute w-1 h-1 rounded-full bg-white"
            style={{top: s.top, left: s.left, animation: `starTwinkle ${2 + i * 0.7}s ease-in-out infinite`, animationDelay: `${i * 0.4}s`, opacity: 0}} />
        ))}

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src={logo} alt="HEALTHBIRCH" className="h-10 w-auto object-contain bg-white rounded-lg p-1.5" />
            <span className="text-2xl font-bold tracking-tight text-white">HEALTHBIRCH</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg pb-12">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Seamless care, <br />
            <span className="text-[#60A5FA]">smarter matching.</span>
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Log in to manage appointments, connect with specialists, and stay on top of your health journey.
          </p>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] to-[#0d1b3e] px-6 py-12 lg:px-8 text-white relative">
        <div className="w-full max-w-sm xl:max-w-md relative z-10">
          {/* Mobile Header Banner */}
          <div className="lg:hidden mb-10 text-center flex flex-col items-center">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
               <img src={logo} alt="HEALTHBIRCH" className="h-10 w-auto object-contain" />
               <span className="text-xl font-bold tracking-tight text-white">HEALTHBIRCH</span>
            </Link>
          </div>

          <div className="text-center lg:text-left mb-8 space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Welcome back</h1>
            <p className="text-sm text-slate-300 font-medium font-sans">Log in to your {role} account</p>
          </div>

          {/* Role Selection Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-white/[0.04] border border-white/10 p-1.5 rounded-2xl mb-8">
            <button
              type="button"
              className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${role === 'patient' ? 'bg-[#60A5FA]/20 text-[#60A5FA] border border-[#60A5FA]/20' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setRole('patient')}
            >
              <User size={14} /> Patient
            </button>
            <button
              type="button"
              className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${role === 'doctor' ? 'bg-[#60A5FA]/20 text-[#60A5FA] border border-[#60A5FA]/20' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setRole('doctor')}
            >
              <Stethoscope size={14} /> Doctor
            </button>
            <button
              type="button"
              className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${role === 'admin' ? 'bg-[#60A5FA]/20 text-[#60A5FA] border border-[#60A5FA]/20' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setRole('admin')}
            >
              <ShieldCheck size={14} /> Admin
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-9 p-1 rounded-full text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-light transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
               <div className="p-3 rounded-lg bg-red-500/10 text-red-200 text-sm font-medium border border-red-500/20 flex items-start gap-2">
                 <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                 <span>{error}</span>
               </div>
            )}

            <Button type="submit" className="w-full h-12 shadow-md shadow-primary/20 text-sm tracking-wide active:scale-[0.98] transition-transform" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `Log in as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
            </Button>
          </form>

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

          <div className="mt-8 text-center text-sm font-medium text-slate-400">
             New to HEALTHBIRCH?{' '}
             <Link to="/register" className="text-secondary hover:text-[#93C5FD] transition-colors">
               Create an account
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
