import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import loginBg from './login.png';

const LEAF_POSITIONS = [
  { left: '8%', top: '15%', size: 32, delay: 0, rotate: -20 },
  { left: '88%', top: '10%', size: 24, delay: 0.4, rotate: 35 },
  { left: '5%', top: '70%', size: 20, delay: 0.8, rotate: 15 },
  { left: '92%', top: '65%', size: 28, delay: 0.2, rotate: -45 },
  { left: '50%', top: '5%', size: 18, delay: 0.6, rotate: 60 },
  { left: '20%', top: '88%', size: 22, delay: 1.0, rotate: -10 },
  { left: '75%', top: '85%', size: 16, delay: 0.3, rotate: 80 },
];

function FloatingLeaf({ left, top, size, delay, rotate }) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        opacity: 0.12,
        pointerEvents: 'none',
      }}
      animate={{ y: [0, -18, 0], rotate: [rotate, rotate + 15, rotate] }}
      transition={{ duration: 5 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2C6 2 3 7 3 12c0 5.5 4 9 9 9 1-3 1-6-1-9 2 1 5 1 7-1-1-4-3-9-6-9z"
          fill="#10b981"
        />
      </svg>
    </motion.div>
  );
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      {/* Animated background blobs */}
      <div style={styles.blob1} />
      <div style={styles.blob2} />
      <div style={styles.blob3} />

      {/* Floating leaves */}
      {LEAF_POSITIONS.map((p, i) => <FloatingLeaf key={i} {...p} />)}

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={styles.card}
      >
        {/* Logo / brand */}
        {/* <div style={styles.brand}>
          <div>
            <p style={styles.brandSub}>Municipal Council</p>
            <h1 style={styles.brandTitle}>Waste Management</h1>
          </div>
        </div> */}

        <h2 style={styles.heading}>Welcome back</h2>
        <p style={styles.subheading}>Sign in to the dashboard</p>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={styles.errorBanner}
            >
              <span style={{ marginRight: 6 }}>⚠</span>{error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          {/* Email */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="login-email">Email address</label>
            <div style={{ position: 'relative' }}>
              <span style={{ ...styles.inputIcon, color: focused === 'email' ? '#10b981' : '#94a3b8' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused('')}
                placeholder="you@example.com"
                required
                style={{
                  ...styles.input,
                  borderColor: focused === 'email' ? '#10b981' : 'rgba(255,255,255,0.12)',
                  boxShadow: focused === 'email' ? '0 0 0 3px rgba(16,185,129,0.15)' : 'none',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="login-password">Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ ...styles.inputIcon, color: focused === 'password' ? '#10b981' : '#94a3b8' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused('')}
                placeholder="••••••••"
                required
                style={{
                  ...styles.input,
                  paddingRight: 44,
                  borderColor: focused === 'password' ? '#10b981' : 'rgba(255,255,255,0.12)',
                  boxShadow: focused === 'password' ? '0 0 0 3px rgba(16,185,129,0.15)' : 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                style={styles.eyeBtn}
                tabIndex={-1}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={showPw} />
              </button>
            </div>
          </div>

          {/* Submit */}
          <motion.button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            style={{ ...styles.submitBtn, opacity: loading ? 0.75 : 1 }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={styles.spinner} />
                Signing in…
              </span>
            ) : (
              'Sign In'
            )}
          </motion.button>
        </form>

        <p style={styles.switchText}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.switchLink}>Create one</Link>
        </p>
      </motion.div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: `linear-gradient(135deg, rgba(10, 22, 40, 0.35) 0%, rgba(15, 45, 26, 0.25) 50%, rgba(10, 22, 40, 0.40) 100%), url(${loginBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    position: 'relative',
    overflow: 'hidden',
    padding: '24px',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  blob1: {
    position: 'absolute', borderRadius: '50%',
    width: 500, height: 500,
    background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
    top: '-120px', left: '-100px', pointerEvents: 'none',
  },
  blob2: {
    position: 'absolute', borderRadius: '50%',
    width: 400, height: 400,
    background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)',
    bottom: '-80px', right: '-80px', pointerEvents: 'none',
  },
  blob3: {
    position: 'absolute', borderRadius: '50%',
    width: 300, height: 300,
    background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)',
    top: '40%', right: '10%', pointerEvents: 'none',
  },
  card: {
    position: 'relative', zIndex: 1,
    width: '100%', maxWidth: 420,
    background: 'rgba(15,23,42,0.75)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: '40px 36px',
    boxShadow: '0 32px 64px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.08)',
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28,
  },
  logoRing: {
    width: 52, height: 52,
    background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.2))',
    border: '1px solid rgba(16,185,129,0.3)',
    borderRadius: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  brandSub: {
    fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
    color: '#10b981', textTransform: 'uppercase', marginBottom: 2,
  },
  brandTitle: {
    fontSize: 14, fontWeight: 700,
    color: '#f1f5f9', margin: 0,
  },
  heading: {
    fontSize: 26, fontWeight: 800, color: '#f1f5f9',
    margin: '0 0 4px 0',
  },
  subheading: {
    fontSize: 14, color: '#64748b', margin: '0 0 24px 0',
  },
  errorBanner: {
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 10, padding: '10px 14px',
    color: '#fca5a5', fontSize: 13, marginBottom: 20,
    display: 'flex', alignItems: 'center',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#94a3b8' },
  inputIcon: {
    position: 'absolute', left: 12, top: '50%',
    transform: 'translateY(-50%)',
    transition: 'color 0.2s',
    display: 'flex', alignItems: 'center',
  },
  input: {
    width: '100%', paddingLeft: 38, paddingRight: 14,
    height: 46, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)',
    color: '#f1f5f9', fontSize: 14, outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%',
    transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#64748b', display: 'flex', alignItems: 'center',
    padding: 0,
    transition: 'color 0.2s',
  },
  submitBtn: {
    marginTop: 4, height: 48, borderRadius: 12,
    background: '#308468ff',
    border: 'none', cursor: 'pointer',
    color: '#fff', fontSize: 15, fontWeight: 700,
    letterSpacing: '0.02em',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'opacity 0.2s',
    boxShadow: '0 4px 24px rgba(16,185,129,0.3)',
  },
  spinner: {
    width: 16, height: 16,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
  },
  switchText: { textAlign: 'center', marginTop: 20, fontSize: 13, color: '#64748b' },
  switchLink: { color: '#10b981', fontWeight: 600, textDecoration: 'none' },
};
