'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import Link from 'next/link';
import { Activity } from 'lucide-react';

const C = {
  paper: "#F6F3EA",
  line: "#E3DCC9",
  ink: "#221F19",
  muted: "#6E6650",
  faint: "#9A927A",
  red: "#B23A2A",
  moss: "#4C6444",
  brass: "#A87C2C",
  screen: "#151F17",
  phosphor: "#9AC98F",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  const inputStyle = {
    width: '100%', padding: '10px 14px', fontSize: 14,
    border: `1px solid ${C.line}`, borderRadius: 8,
    background: C.paper, color: C.ink,
    outline: 'none', transition: 'border-color 0.2s',
    fontFamily: "'Work Sans', sans-serif",
    boxSizing: 'border-box' as const,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const supabase = getSupabaseBrowser();

    if (mode === 'signup') {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      setLoading(false);

      if (authError) {
        setError(authError.message);
        return;
      }

      // Supabase returns a user with identities = [] if email already exists
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError('Email ini sudah terdaftar. Silakan masuk.');
        return;
      }

      setVerificationEmail(email);
      setNeedsVerification(true);
      setSuccess('Akun berhasil dibuat! Silakan cek email Anda untuk verifikasi.');
      return;
    }

    // Sign in
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (authError) {
      // Check if user exists but email not confirmed
      if (authError.message.toLowerCase().includes('email not confirmed')) {
        setVerificationEmail(email);
        setNeedsVerification(true);
        setError('Email Anda belum diverifikasi. Silakan cek kotak masuk email Anda, atau kirim ulang email verifikasi.');
        return;
      }
      setError(authError.message);
      return;
    }

    // Double-check: if user email is not confirmed (fallback)
    if (data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      setVerificationEmail(email);
      setNeedsVerification(true);
      setError('Email Anda belum diverifikasi. Silakan cek kotak masuk email Anda, atau kirim ulang email verifikasi.');
      return;
    }

    router.refresh();
    router.push(next);
  }

  async function handleResendVerification() {
    if (!verificationEmail) return;
    setResending(true);
    setError(null);
    setSuccess(null);

    const supabase = getSupabaseBrowser();
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: verificationEmail,
    });

    setResending(false);

    if (resendError) {
      setError(resendError.message);
      return;
    }

    setSuccess(`Email verifikasi telah dikirim ulang ke ${verificationEmail}. Silakan cek kotak masuk dan folder spam Anda.`);
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Work+Sans:wght@400;500;600;700&display=swap');
      ` }} />
      <main style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: C.paper, fontFamily: "'Work Sans', sans-serif",
        padding: '24px',
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: C.ink, marginBottom: 32 }}>
          <Activity size={22} color={C.red} strokeWidth={2.25} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, letterSpacing: '0.01em' }}>Booknesia</span>
        </Link>

        {/* Card */}
        <div style={{
          width: '100%', maxWidth: 400,
          background: '#FFFFFF', border: `1px solid ${C.line}`,
          borderRadius: 12, padding: '36px 32px',
          boxShadow: '0 4px 24px rgba(34,31,25,0.06)',
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.ink, margin: '0 0 6px' }}>
            {mode === 'signin' ? 'Masuk ke Akun Anda' : 'Buat Akun Baru'}
          </h1>
          <p style={{ fontSize: 14, color: C.muted, margin: '0 0 28px', lineHeight: 1.5 }}>
            {mode === 'signin'
              ? 'Selamat datang kembali di Booknesia.'
              : 'Mulai lacak performa landing page Anda.'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = C.red}
                  onBlur={(e) => e.target.style.borderColor = C.line}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="anda@perusahaan.com"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = C.red}
                onBlur={(e) => e.target.style.borderColor = C.line}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Kata Sandi</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = C.red}
                onBlur={(e) => e.target.style.borderColor = C.line}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: `${C.red}10`, border: `1px solid ${C.red}30`,
                fontSize: 13, color: C.red, lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: `${C.moss}10`, border: `1px solid ${C.moss}30`,
                fontSize: 13, color: C.moss, lineHeight: 1.5,
              }}>
                {success}
              </div>
            )}

            {/* Resend Verification */}
            {needsVerification && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending}
                style={{
                  width: '100%', padding: '10px 16px',
                  background: `${C.brass}15`, color: C.brass,
                  border: `1px solid ${C.brass}40`, borderRadius: 8,
                  fontSize: 13, fontWeight: 600,
                  cursor: resending ? 'not-allowed' : 'pointer',
                  opacity: resending ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                  fontFamily: "'Work Sans', sans-serif",
                }}
              >
                {resending ? 'Mengirim ulang…' : '📩 Kirim Ulang Email Verifikasi'}
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px 16px',
                background: C.red, color: '#FFFFFF',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s ease',
                fontFamily: "'Work Sans', sans-serif",
                boxShadow: '0 2px 12px rgba(178,58,42,0.2)',
              }}
            >
              {loading ? 'Memproses…' : mode === 'signin' ? 'Masuk' : 'Daftar'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
                setSuccess(null);
                setNeedsVerification(false);
              }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: C.muted, fontFamily: "'Work Sans', sans-serif",
                transition: 'color 0.15s',
              }}
              onMouseOver={(e) => (e.target as HTMLElement).style.color = C.red}
              onMouseOut={(e) => (e.target as HTMLElement).style.color = C.muted}
            >
              {mode === 'signin'
                ? 'Belum punya akun? Daftar sekarang'
                : 'Sudah punya akun? Masuk'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p style={{ marginTop: 24, fontSize: 12, color: C.faint, textAlign: 'center' }}>
          © {new Date().getFullYear()} Booknesia · Privasi terjamin, tanpa cookie
        </p>
      </main>
    </>
  );
}
