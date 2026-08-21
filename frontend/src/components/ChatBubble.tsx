import { useEffect, useRef, useState, useCallback } from 'react';
import { getChatHistory, sendChat, clearChatHistory } from '../lib/api';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  date_created: string;
}

export default function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await getChatHistory();
      setMessages(res.data);
    } catch {
      // silent fail
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Fetch history hanya sekali saat pertama kali dibuka
  useEffect(() => {
    if (isOpen && !initialized) {
      fetchHistory();
      setInitialized(true);
    }
  }, [isOpen, initialized, fetchHistory]);

  // Scroll ke bawah saat popup buka
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    }
  }, [isOpen]);

  // Scroll ke bawah saat ada pesan baru
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');

    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      date_created: new Date().toISOString(),
    }]);
    setLoading(true);

    try {
      const res = await sendChat(userMessage);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.data.message,
        date_created: new Date().toISOString(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Maaf, terjadi kesalahan. Coba lagi.',
        date_created: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Hapus semua riwayat chat?')) return;
    await clearChatHistory();
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    });

  const popupStyle: React.CSSProperties = isMobile ? {
    position: 'fixed',
    top: '48px',
    left: 0,
    right: 0,
    bottom: '64px',
    background: 'var(--bg)',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    borderTop: '1px solid var(--border)',
  } : {
    position: 'fixed',
    bottom: '92px',
    right: '24px',
    width: '380px',
    height: '520px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  return (
    <>
      {/* Popup */}
      {isOpen && (
        <div style={popupStyle}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-card)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🤖</span>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>AI Chat</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {messages.length > 0 && (
                <button onClick={handleClear} style={btnGhost}>Hapus</button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '0 4px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            {loadingHistory ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '32px', fontSize: '14px' }}>
                Memuat riwayat...
              </p>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '32px' }}>
                <p style={{ fontSize: '32px', marginBottom: '8px' }}>🌱</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6 }}>
                  Tanya apa saja tentang tanaman lo.<br />
                  Gua punya akses ke data tanaman, jadwal, sensor, dan log pompa.
                </p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: '4px',
                }}>
                  <div style={{
                    maxWidth: '85%',
                    padding: '8px 12px',
                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: msg.role === 'user' ? 'var(--green)' : 'var(--bg)',
                    border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                    color: msg.role === 'user' ? '#fff' : 'var(--text)',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {formatTime(msg.date_created)}
                  </span>
                </div>
              ))
            )}

            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '14px 14px 14px 4px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                }}>
                  Sedang berpikir...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            borderTop: '1px solid var(--border)',
            padding: '12px 16px',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end',
            background: 'var(--bg-card)',
            flexShrink: 0,
          }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Tulis pesan... (Enter kirim)"
              rows={1}
              style={{
                flex: 1,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '8px 12px',
                color: 'var(--text)',
                fontSize: '13px',
                resize: 'none',
                outline: 'none',
                lineHeight: 1.5,
                maxHeight: '96px',
                overflowY: 'auto',
              }}
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 96) + 'px';
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: 'none',
                background: 'var(--green)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !input.trim() ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              Kirim
            </button>
          </div>
        </div>
      )}

      {/* Bubble Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          position: 'fixed',
          bottom: isMobile ? '80px' : '24px',
          right: isMobile ? '16px' : '24px',
          width: isMobile ? '48px' : '56px',
          height: isMobile ? '48px' : '56px',
          borderRadius: '50%',
          background: 'var(--green)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(14,165,233,0.4)',
          zIndex: 201,
          fontSize: isMobile ? '22px' : '26px',
        }}
      >
        {isOpen ? '✕' : '🤖'}
      </button>
    </>
  );
}

const btnGhost: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-muted)',
  borderRadius: '6px',
  padding: '4px 10px',
  cursor: 'pointer',
  fontSize: '12px',
};