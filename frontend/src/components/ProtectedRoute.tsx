import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getMe } from '../lib/api';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'auth' | 'unauth'>('loading');

  useEffect(() => {
    getMe()
      .then(() => setStatus('auth'))
      .catch(() => setStatus('unauth'));
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Memuat...</p>
      </div>
    );
  }

  if (status === 'unauth') return <Navigate to="/login" replace />;

  return <>{children}</>;
}
