import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Aperture from '../components/Aperture';
import api from '../services/api';

const strengthLabels = [
  'Use 8+ characters',
  'Weak — add a capital or a number',
  'Fair — one more character class',
  'Strong',
  'Very strong'
];

function passwordStrength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) && pw.length >= 12) s++;
  return pw ? Math.max(1, s) : 0;
}

const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default function AuthPage() {
  const [tab, setTab] = useState('login');
  const [role, setRole] = useState('student');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const isLogin = tab === 'login';
  const strength = passwordStrength(regForm.password);

  const switchTab = (t) => {
    setTab(t);
    setErrors({});
  };

  const handleLogin = async () => {
    const err = {};
    if (!loginForm.email) err.email = 'Enter your email.';
    else if (!validEmail(loginForm.email)) err.email = 'That does not look like an email address.';
    if (!loginForm.password) err.password = 'Enter your password.';

    if (Object.keys(err).length) {
      setErrors(err);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/auth/login', {
        email: loginForm.email,
        password: loginForm.password
      });
      login(res.data.token, res.data.user);
      navigate('/'); // Event Feed
    } catch (e) {
      setErrors({ form: e.response?.data?.message || 'Login failed. Try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    const err = {};
    if (!regForm.name.trim()) err.name = 'Enter your full name.';
    if (!regForm.email) err.email = 'Enter your email.';
    else if (!validEmail(regForm.email)) err.email = 'That does not look like an email address.';
    if (!regForm.password) err.password = 'Choose a password.';
    else if (regForm.password.length < 8) err.password = 'Password must be at least 8 characters.';

    if (Object.keys(err).length) {
      setErrors(err);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/auth/register', {
        name: regForm.name,
        email: regForm.email,
        password: regForm.password,
        role: role === 'leader' ? 'clubLeader' : 'student'
      });
      login(res.data.token, res.data.user);
      navigate('/'); // Event Feed
    } catch (e) {
      setErrors({ form: e.response?.data?.message || 'Registration failed. Try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text font-body flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <Aperture size={30} speed="9s" />
          <span className="font-mono text-xs tracking-[0.22em] uppercase">
            Campus<span className="text-textFaint">connect</span>
          </span>
        </div>

        <div className="flex border-b-2 border-borderMuted mb-9">
          <button
            type="button"
            onClick={() => switchTab('login')}
            className={`flex-1 text-left pb-3.5 font-heading font-bold text-lg relative ${
              isLogin ? 'text-text' : 'text-textFaint'
            }`}
          >
            Log in
            {isLogin && <span className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-accent" />}
          </button>
          <button
            type="button"
            onClick={() => switchTab('register')}
            className={`flex-1 text-left pb-3.5 font-heading font-bold text-lg relative ${
              !isLogin ? 'text-text' : 'text-textFaint'
            }`}
          >
            Register
            {!isLogin && <span className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-accent" />}
          </button>
        </div>

        {errors.form && (
          <div className="mb-5 font-mono text-xs text-accentLight border-l-2 border-accent pl-3 py-2">
            {errors.form}
          </div>
        )}

        {isLogin ? (
          <div>
            <h2 className="font-heading font-extrabold text-3xl mb-2 tracking-tight">Welcome back.</h2>
            <p className="text-textMuted text-sm mb-8">Log in to pick up where you left off.</p>

            <Field label="Email" error={errors.email}>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full h-[52px] px-4 bg-surface border border-border text-text text-[15.5px] focus-visible:outline-2 focus-visible:outline-accent"
              />
            </Field>

            <Field label="Password" error={errors.password}>
              <div className="relative">
                <input
                  type={showLoginPw ? 'text' : 'password'}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full h-[52px] pl-4 pr-20 bg-surface border border-border text-text text-[15.5px]"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPw(!showLoginPw)}
                  className="absolute right-px top-px h-[calc(100%-2px)] px-4 border-l border-border font-mono text-[10.5px] tracking-wider uppercase text-textMuted hover:text-text"
                >
                  {showLoginPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>

            <SubmitButton onClick={handleLogin} submitting={submitting} label="Log in to CampusConnect" />
          </div>
        ) : (
          <div>
            <h2 className="font-heading font-extrabold text-3xl mb-2 tracking-tight">Make an account.</h2>
            <p className="text-textMuted text-sm mb-8">Students get in instantly. Club leaders wait on one approval.</p>

            <Field label="Full name" error={errors.name}>
              <input
                type="text"
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                placeholder="Your name"
                className="w-full h-[52px] px-4 bg-surface border border-border text-text text-[15.5px]"
              />
            </Field>

            <Field label="Email" error={errors.email}>
              <input
                type="email"
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full h-[52px] px-4 bg-surface border border-border text-text text-[15.5px]"
              />
            </Field>

            <div className="mb-6">
              <label className="block font-mono text-[10.5px] tracking-[0.18em] uppercase text-textMuted mb-2.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showRegPw ? 'text' : 'password'}
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  placeholder="At least 8 characters"
                  className="w-full h-[52px] pl-4 pr-20 bg-surface border border-border text-text text-[15.5px]"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPw(!showRegPw)}
                  className="absolute right-px top-px h-[calc(100%-2px)] px-4 border-l border-border font-mono text-[10.5px] tracking-wider uppercase text-textMuted hover:text-text"
                >
                  {showRegPw ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="flex gap-1.5 mt-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-[3px] flex-1 ${i < strength ? 'bg-accent' : 'bg-borderMuted'}`} />
                ))}
              </div>
              <div className="font-mono text-[10.5px] tracking-wider uppercase text-textFaint mt-2">
                {strengthLabels[strength]}
              </div>
              {errors.password && <ErrorMsg text={errors.password} />}
            </div>

            <label className="block font-mono text-[10.5px] tracking-[0.18em] uppercase text-textMuted mb-3">
              I am joining as
            </label>
            <div className="grid grid-cols-2 gap-3">
              <RoleOption
                label="Student"
                desc="Browse and RSVP to anything on campus."
                selected={role === 'student'}
                onClick={() => setRole('student')}
              />
              <RoleOption
                label="Club leader"
                desc="Publish events for a registered club."
                selected={role === 'leader'}
                onClick={() => setRole('leader')}
              />
            </div>

            {role === 'leader' && (
              <div className="flex gap-3.5 mt-4 p-4 bg-surface border-l-2 border-accent">
                <Aperture size={18} speed="3.2s" filled={false} />
                <p className="text-[13px] leading-relaxed text-[#C9C9D1] m-0">
                  <strong className="text-text font-semibold">An admin has to approve you first.</strong> You
                  can sign in and browse right away, but posting events unlocks once your account is verified.
                </p>
              </div>
            )}

            <SubmitButton
              onClick={handleRegister}
              submitting={submitting}
              label={role === 'leader' ? 'Request a club leader account' : 'Create my account'}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div className="mb-5">
      <label className="block font-mono text-[10.5px] tracking-[0.18em] uppercase text-textMuted mb-2.5">
        {label}
      </label>
      {children}
      {error && <ErrorMsg text={error} />}
    </div>
  );
}

function ErrorMsg({ text }) {
  return (
    <div className="flex gap-2 mt-2.5 font-mono text-[11px] leading-tight text-accentLight">
      <span>✕</span>
      <span>{text}</span>
    </div>
  );
}

function RoleOption({ label, desc, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-2.5 p-4 pb-[18px] bg-surface border text-left ${
        selected ? 'border-accent' : 'border-border'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            selected ? 'border-accent' : 'border-[#3A3A45]'
          }`}
        >
          {selected && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
        </div>
        <span className="font-heading font-bold text-[15px]">{label}</span>
      </div>
      <span className="text-xs leading-tight text-textMuted">{desc}</span>
    </button>
  );
}

function SubmitButton({ onClick, submitting, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={submitting}
      className="w-full h-14 mt-6 flex items-center justify-between px-5 bg-accent hover:bg-accentHover active:bg-accentActive disabled:opacity-60 font-heading font-bold text-[15px] text-bg"
    >
      <span>{submitting ? 'Please wait…' : label}</span>
      {submitting ? <Aperture size={16} speed="1.2s" filled={false} /> : <span className="text-lg">→</span>}
    </button>
  );
}