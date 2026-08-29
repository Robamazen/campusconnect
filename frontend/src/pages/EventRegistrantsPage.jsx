import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const CIRCUMFERENCE = 182.2; // r=29

const TONE = {
  confirmed: { dot: '#E91E8C', color: '#F4F4F5', label: 'Confirmed' },
  pending: { dot: '#8E8E99', color: '#C9C9D1', label: 'Pending' },
  cancelled: { dot: '#3A3A45', color: '#8E8E99', label: 'Cancelled' }
};

function initialsOf(name) {
  return (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function downloadCSV(event, rows) {
  const header = ['Name', 'Email', 'Status', 'Registered'];
  const lines = rows.map((r) => [r.user?.name, r.user?.email, r.status, new Date(r.registeredAt).toLocaleString()]);
  const csv = [header, ...lines].map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/\s+/g, '-')}-registrants.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EventRegistrantsPage() {
  const { id } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('All');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [evRes, regRes] = await Promise.all([api.get(`/events/${id}`), api.get(`/registrations/event/${id}`)]);
      setEvent(evRes.data.event);
      setRows(regRes.data.registrants);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load registrants.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setStatus = async (registrationId, status) => {
    setBusyId(registrationId);
    try {
      await api.put(`/registrations/${registrationId}`, { status });
      await fetchData();
    } catch (e) {
      setError(e.response?.data?.message || 'Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmAllPending = async () => {
    const pending = rows.filter((r) => r.status === 'pending');
    for (const r of pending) {
      await setStatus(r._id, 'confirmed'); // sequential — no bulk endpoint on the backend
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen bg-bg" />;
  if (!event) {
    return (
      <div className="min-h-screen bg-bg text-text p-5 sm:p-8 lg:p-16">
        <div className="flex items-center justify-between gap-6 mb-8">
          <Link to="/" className="font-mono text-[10.5px] tracking-wider uppercase text-textMuted">← Back to feed</Link>
          <button
            type="button"
            onClick={handleLogout}
            className="font-mono text-[11px] tracking-wider uppercase text-textFaint hover:text-text border border-border px-3 py-2 transition-colors"
          >
            Log out
          </button>
        </div>
        {error || 'Event not found.'}
      </div>
    );
  }

  const counts = {
    All: rows.length,
    Pending: rows.filter((r) => r.status === 'pending').length,
    Confirmed: rows.filter((r) => r.status === 'confirmed').length,
    Cancelled: rows.filter((r) => r.status === 'cancelled').length
  };

  const q = query.trim().toLowerCase();
  const filtered = rows.filter(
    (r) => (tab === 'All' || r.status === tab.toLowerCase()) && (!q || `${r.user?.name} ${r.user?.email}`.toLowerCase().includes(q))
  );

  const capacity = event.totalSlots;
  const taken = event.filledSlots || 0;
  const pct = capacity != null ? Math.min(1, taken / capacity) : 0;
  const dialOffset = CIRCUMFERENCE - CIRCUMFERENCE * pct;

  return (
    <div className="min-h-screen bg-bg text-text font-body">
      <section className="relative px-5 sm:px-8 lg:px-16 pt-8 pb-6.5 border-b-2 border-borderMuted overflow-hidden">
        <div className="flex items-end justify-between gap-12 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-6 mb-4">
              <Link to={`/events/${id}`} className="inline-block font-mono text-[10.5px] tracking-wider uppercase text-textMuted">← {event.title} · event page</Link>
              <button
                type="button"
                onClick={handleLogout}
                className="font-mono text-[11px] tracking-wider uppercase text-textFaint hover:text-text border border-border px-3 py-2 transition-colors"
              >
                Log out
              </button>
            </div>
            <div className="flex items-center gap-3 mb-3.5 flex-wrap">
              <span className="font-mono text-[10px] tracking-wider uppercase px-2.5 py-1.5 bg-accent text-bg">{event.category}</span>
              <span className="font-mono text-[10px] tracking-wider uppercase text-textMuted">
                {event.type} · {new Date(event.eventDate).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · {event.location}
              </span>
            </div>
            <h1 className="font-heading font-black text-5xl leading-none tracking-tight">Registrants</h1>
            <p className="mt-3 text-[14.5px] text-textMuted">{event.title}</p>
          </div>

          <div className="flex-none flex flex-col sm:flex-row sm:items-center gap-5 lg:gap-6.5 w-full lg:w-auto">
            <div className="flex items-center gap-4 sm:pr-6.5 sm:border-r border-borderMuted">
              <div className="relative w-16 h-16 flex-none">
                <svg viewBox="0 0 64 64" width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="32" cy="32" r="29" fill="none" stroke="#26262E" strokeWidth="3" />
                  <circle cx="32" cy="32" r="29" fill="none" stroke="#E91E8C" strokeWidth="3" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dialOffset} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-heading font-black text-[17px]">{taken}</div>
              </div>
              <div>
                <div className="font-heading font-extrabold text-[17px]">{taken} / {capacity ?? '∞'} seats held</div>
                <div className="font-mono text-[9.5px] tracking-wider uppercase text-textMuted mt-1.5">
                  {counts.Confirmed} confirmed · {counts.Pending} pending · {counts.Cancelled} cancelled
                </div>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button type="button" onClick={() => downloadCSV(event, rows)} className="h-11 flex items-center gap-2.5 px-3.5 bg-transparent border border-border font-heading font-semibold text-[13.5px] text-text">
                <span>Export</span><span className="font-mono text-[10px] text-textMuted">CSV</span>
              </button>
              <Link to={`/events/${id}/edit`} className="h-11 flex items-center gap-2.5 px-4 bg-accent font-heading font-bold text-[13.5px] text-bg">
                <span>Edit event</span><span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {error && <div className="px-5 sm:px-8 lg:px-16 pt-5 font-mono text-xs text-accentLight">{error}</div>}

      <section className="px-5 sm:px-8 lg:px-16 py-5.5 border-b border-borderMuted flex items-center justify-between gap-5 lg:gap-8 flex-wrap">
        <div className="flex">
          {['All', 'Pending', 'Confirmed', 'Cancelled'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="flex items-center gap-2.5 pb-3 pr-4.5 mr-4.5 font-heading font-bold text-[15px]"
              style={{ borderBottom: `2px solid ${tab === t ? '#E91E8C' : 'transparent'}`, color: tab === t ? '#F4F4F5' : '#8E8E99' }}
            >
              <span>{t}</span>
              <span className="font-mono text-[10px]" style={{ color: tab === t ? '#E91E8C' : '#5B5B66' }}>{counts[t]}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {counts.Pending > 0 && (
            <button type="button" onClick={confirmAllPending} className="h-10 flex items-center gap-2.5 px-3.5 bg-transparent border border-border font-heading font-semibold text-[13px] text-text">
              <span>Confirm all pending</span><span className="font-mono text-[10px] text-textMuted">{counts.Pending}</span>
            </button>
          )}
          <div className="relative w-full sm:w-[280px]">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or email" className="w-full h-10 pl-3.5 pr-9 bg-surface border border-border text-text text-[13.5px]" />
            <span className="absolute right-3.5 top-2.5 font-mono text-xs text-textFaint">⌕</span>
          </div>
        </div>
      </section>

      {filtered.length > 0 ? (
        <section className="px-5 sm:px-8 lg:px-16 pb-20 overflow-x-auto">
          <div className="min-w-[920px]">
            <div className="grid grid-cols-[30px_1.45fr_2.15fr_132px_126px_152px] items-center gap-5 py-3.5 px-4 border-b-2 border-borderMuted">
              {['#', 'Student', 'Email', 'Status', 'Registered', 'Actions'].map((h) => (
                <span key={h} className={`font-mono text-[9.5px] tracking-wider uppercase text-textMuted ${h === 'Actions' ? 'text-right' : ''}`}>{h}</span>
              ))}
            </div>
            {filtered.map((r, i) => {
              const t = TONE[r.status];
              return (
                <div key={r._id} className="cc-row grid grid-cols-[30px_1.45fr_2.15fr_132px_126px_152px] items-center gap-5 py-3.5 px-4 border-b border-[#1C1C22]">
                <span className="font-mono text-[11px] text-textMuted">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-[30px] h-[30px] flex-none flex items-center justify-center bg-surface border border-border font-heading font-extrabold text-[11px] text-accent">{initialsOf(r.user?.name)}</span>
                  <span className="text-[14.5px] font-medium truncate" style={{ color: r.status === 'cancelled' ? '#8E8E99' : '#F4F4F5' }}>{r.user?.name}</span>
                </div>
                <span className="font-mono text-xs text-textMuted truncate">{r.user?.email}</span>
                <span className="inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: t.dot }} />
                  <span className="font-mono text-[10px] tracking-wider uppercase" style={{ color: t.color }}>{t.label}</span>
                </span>
                <span className="font-mono text-[11px] text-textMuted">{new Date(r.registeredAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · {new Date(r.registeredAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                <div className="flex justify-end gap-2">
                  {r.status === 'pending' && (
                    <>
                      <ActionBtn label="Cancel" onClick={() => setStatus(r._id, 'cancelled')} busy={busyId === r._id} />
                      <ActionBtn label="Confirm" solid onClick={() => setStatus(r._id, 'confirmed')} busy={busyId === r._id} />
                    </>
                  )}
                  {r.status === 'confirmed' && <ActionBtn label="Cancel" onClick={() => setStatus(r._id, 'cancelled')} busy={busyId === r._id} />}
                  {r.status === 'cancelled' && <ActionBtn label="Reinstate" onClick={() => setStatus(r._id, 'confirmed')} busy={busyId === r._id} />}
                </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-6 pt-4.5 px-4">
            <span className="font-mono text-[10.5px] tracking-wider uppercase text-textMuted">
              {tab === 'All' ? `All ${rows.length} registrants` : `Showing ${filtered.length} ${tab.toLowerCase()}`}
            </span>
            <span className="font-mono text-[10.5px] tracking-wider uppercase text-textMuted">Cancelling frees a slot for future registrations</span>
          </div>
        </section>
      ) : (
        <section className="px-5 sm:px-8 lg:px-16 py-12 lg:py-16">
          <div className="flex items-center gap-6 lg:gap-9 p-6 sm:p-11 border border-border flex-wrap">
            <div className="w-18 h-18 rounded-full border-2 border-[#1C1C22] flex-none" style={{ width: 72, height: 72 }} />
            <div>
              <h2 className="font-heading font-extrabold text-2xl tracking-tight mb-2.5">Nobody in this view.</h2>
              <p className="text-[14.5px] leading-relaxed text-textMuted mb-5 max-w-[56ch]">
                {rows.length === 0 ? 'No one has registered for this event yet.' : 'No registrants match this filter or search.'}
              </p>
              {rows.length > 0 && (
                <button type="button" onClick={() => { setTab('All'); setQuery(''); }} className="h-11 px-4 bg-transparent border border-border font-heading font-semibold text-[13.5px] text-text">
                  Show all registrants
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function ActionBtn({ label, solid, onClick, busy }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="h-8 px-3 font-heading font-semibold text-xs disabled:opacity-50"
      style={{ background: solid ? '#E91E8C' : 'transparent', border: `1px solid ${solid ? '#E91E8C' : '#2A2A33'}`, color: solid ? '#0B0B0D' : '#C9C9D1' }}
    >
      {busy ? '…' : label}
    </button>
  );
}
