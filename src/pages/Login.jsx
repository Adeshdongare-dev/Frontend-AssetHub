import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import bgVideo from '../assets/gemini_generated_video_ed452d34.mp4';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password, remember);
      if (!result.ok) {
        setError(result.message || 'Invalid username or password.');
        return;
      }
      const dest = location.state?.from?.pathname || '/';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="video-login-screen">
      {/* Background MP4 Video Loop */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="bg-video-element"
      >
        <source src={bgVideo} type="video/mp4" />
      </video>

      {/* Ambient Dark Overlay */}
      <div className="video-overlay" />

      {/* Single Centered Glassmorphism Login Card */}
      <div className="assethub-card-wrapper">
        <div className="assethub-glass-card">
          <div className="card-brand-header">
            <div className="brand-logo-row">
              <div className="brand-logo-glow-wrapper">
                <svg width="48" height="48" viewBox="0 0 44 44" fill="none" className="brand-logo-svg">
                  <path
                    d="M 22 4 L 38 38 H 30.5 L 22 19 L 13.5 38 H 6 Z"
                    stroke="#00f2fe"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 16 25 C 16 21.5, 28 21.5, 28 25 C 28 28.5, 16 28.5, 16 25 Z"
                    stroke="#00f2fe"
                    strokeWidth="2.5"
                    fill="none"
                  />
                </svg>
              </div>
              <div className="brand-text-col">
                <h1 className="brand-title">Asset <span className="brand-title-cyan">Management</span></h1>
                <p className="brand-subtitle">IT Asset Management</p>
              </div>
            </div>

            <h2 className="card-welcome-title">Welcome Back</h2>
            <p className="card-welcome-sub">Access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="card-form">
            <div className="card-field">
              <div className="card-input-box">
                <User size={20} className="card-input-icon" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username / Email"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="card-field">
              <div className="card-input-box">
                <Lock size={20} className="card-input-icon" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="card-eye-btn"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && <div className="card-error-msg">{error}</div>}

            <div className="card-glow-btn-wrap">
              <div className="btn-ambient-ring" />
              <button
                type="submit"
                className="card-glow-btn"
                disabled={loading}
              >
                {loading ? 'Signing in…' : (<>Login <ArrowRight size={18} /></>)}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

