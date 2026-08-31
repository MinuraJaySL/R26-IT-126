import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import loginBg from './login.png';

const LEAF_POSITIONS = [
  { left: '10%', top: '20%', size: 28, delay: 0.1, rotate: -30 },
  { left: '85%', top: '12%', size: 22, delay: 0.5, rotate: 40  },
  { left: '4%',  top: '60%', size: 18, delay: 0.9, rotate: 20  },
  { left: '90%', top: '55%', size: 26, delay: 0.3, rotate: -55 },
  { left: '48%', top: '6%',  size: 16, delay: 0.7, rotate: 70  },
  { left: '22%', top: '82%', size: 20, delay: 1.1, rotate: -15 },
  { left: '72%', top: '80%', size: 14, delay: 0.2, rotate: 85  },
];

function FloatingLeaf({ left, top, size, delay, rotate }) {
  return (
    <motion.div
      style={{
        position: 'absolute', left, top,
        width: size, height: size,
        opacity: 0.12, pointerEvents: 'none',
      }}
      animate={{ y: [0, -16, 0], rotate: [rotate, rotate + 12, rotate] }}
      transition={{ duration: 5.5 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
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

function StrengthBar({ password }) {
  let strength = 0;
  if (password.length >= 6) strength++;
  if (password.length >= 10) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];

  if (!password) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= strength ? colors[strength - 1] : 'rgba(255,255,255,0.1)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <p style={{ fontSize: 11, color: strength > 0 ? colors[strength - 1] : '#64748b', marginTop: 4 }}>
        {strength > 0 ? labels[strength - 1] : ''}
      </p>
    </div>
  );
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName]                 = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPw, setConfirmPw]       = useState('');
  const [showPw, setShowPw]             = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [focused, setFocused]           = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirmPw) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function inputStyle(field) {
    return {
      ...styles.input,
      borderColor: focused === field ? '#10b981' : 'rgba(255,255,255,0.12)',
      boxShadow: focused === field ? '0 0 0 3px rgba(16,185,129,0.15)' : 'none',
    };
  }

  return (
    <div style={styles.page}>
      <div style={styles.blob1} />
      <div style={styles.blob2} />
      <div style={styles.blob3} />
      {LEAF_POSITIONS.map((p, i) => <FloatingLeaf key={i} {...p} />)}

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={styles.card}
      >
        {/* Brand */}
        {/* <div style={styles.brand}>
          <div>
            <p style={styles.brandSub}>Municipal Council</p>
            <h1 style={styles.brandTitle}>Waste Management</h1>
          </div>
        </div> */}

        <h2 style={styles.heading}>Create account</h2>
        <p style={styles.subheading}>Join the waste management platform</p>

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
          {/* Full Name */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="reg-name">Full name</label>
            <div style={{ position: 'relative' }}>
              <span style={{ ...styles.inputIcon, color: focused === 'name' ? '#10b981' : '#94a3b8' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input
                id="reg-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused('')}
                placeholder="John Perera"
                required
                style={{ ...inputStyle('name'), paddingLeft: 38 }}
              />
            </div>
          </div>

          {/* Email */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="reg-email">Email address</label>
            <div style={{ position: 'relative' }}>
              <span style={{ ...styles.inputIcon, color: focused === 'email' ? '#10b981' : '#94a3b8' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </span>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused('')}
                placeholder="you@example.com"
                required
                style={{ ...inputStyle('email'), paddingLeft: 38 }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="reg-password">Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ ...styles.inputIcon, color: focused === 'password' ? '#10b981' : '#94a3b8' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                id="reg-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused('')}
                placeholder="Min. 6 characters"
                required
                style={{ ...inputStyle('password'), paddingLeft: 38, paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} style={styles.eyeBtn} tabIndex={-1}>
                <EyeIcon open={showPw} />
              </button>
            </div>
            <StrengthBar password={password} />
          </div>

          {/* Confirm Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="reg-confirm-password">Confirm password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ ...styles.inputIcon, color: focused === 'confirm' ? '#10b981' : '#94a3b8' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                id="reg-confirm-password"
                type={showConfirmPw ? 'text' : 'password'}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                onFocus={() => setFocused('confirm')}
                onBlur={() => setFocused('')}
                placeholder="Repeat your password"
                required
                style={{
                  ...inputStyle('confirm'),
                  paddingLeft: 38, paddingRight: 44,
                  borderColor: confirmPw && confirmPw !== password
                    ? '#ef4444'
                    : focused === 'confirm' ? '#10b981' : 'rgba(255,255,255,0.12)',
                }}
              />
              <button type="button" onClick={() => setShowConfirmPw(v => !v)} style={styles.eyeBtn} tabIndex={-1}>
                <EyeIcon open={showConfirmPw} />
              </button>
            </div>
            {confirmPw && confirmPw !== password && (
              <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Passwords don't match</p>
            )}
          </div>

          {/* Submit */}
          <motion.button
            id="register-submit-btn"
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            style={{ ...styles.submitBtn, opacity: loading ? 0.75 : 1 }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={styles.spinner} />
                Creating account…
              </span>
            ) : (
              'Create Account'
            )}
          </motion.button>
        </form>

        <p style={styles.switchText}>
          Already have an account?{' '}
          <Link to="/login" style={styles.switchLink}>Sign in</Link>
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
    top: '-100px', left: '-120px', pointerEvents: 'none',
  },
  blob2: {
    position: 'absolute', borderRadius: '50%',
    width: 400, height: 400,
    background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)',
    bottom: '-60px', right: '-100px', pointerEvents: 'none',
  },
  blob3: {
    position: 'absolute', borderRadius: '50%',
    width: 280, height: 280,
    background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)',
    top: '35%', right: '12%', pointerEvents: 'none',
  },
  card: {
    position: 'relative', zIndex: 1,
    width: '100%', maxWidth: 440,
    background: 'rgba(15,23,42,0.75)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24, padding: '36px 36px',
    boxShadow: '0 32px 64px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.08)',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
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
  brandTitle: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  heading: { fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px 0' },
  subheading: { fontSize: 14, color: '#64748b', margin: '0 0 20px 0' },
  errorBanner: {
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 10, padding: '10px 14px',
    color: '#fca5a5', fontSize: 13, marginBottom: 18,
    display: 'flex', alignItems: 'center',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 13, fontWeight: 600, color: '#94a3b8' },
  inputIcon: {
    position: 'absolute', left: 12, top: '50%',
    transform: 'translateY(-50%)',
    transition: 'color 0.2s', display: 'flex', alignItems: 'center',
  },
  input: {
    width: '100%', height: 46, borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)',
    color: '#f1f5f9', fontSize: 14, outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box', paddingRight: 14,
  },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%',
    transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#64748b', display: 'flex', alignItems: 'center', padding: 0,
    transition: 'color 0.2s',
  },
  submitBtn: {
    marginTop: 6, height: 48, borderRadius: 12,
    background: '#308468ff',
    border: 'none', cursor: 'pointer',
    color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '0.02em',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'opacity 0.2s',
    boxShadow: '0 4px 24px rgba(16,185,129,0.3)',
  },
  spinner: {
    width: 16, height: 16,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff', borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
  },
  switchText: { textAlign: 'center', marginTop: 18, fontSize: 13, color: '#64748b' },
  switchLink: { color: '#10b981', fontWeight: 600, textDecoration: 'none' },
};
