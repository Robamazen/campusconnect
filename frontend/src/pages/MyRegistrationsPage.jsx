import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Aperture from '../components/Aperture';
import ConfirmModal from '../components/ConfirmModal';
import api from '../services/api';
import { downloadEventICS } from '../utils/ics';

function formatWhen(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function MyRegistrationsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [cancellingId, setCancellingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // registration pending cancel confirmation

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fetchMine = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/registrations/my');
      setRegistrations(res.data.registrations);
    } catch {
      setToast({ type: 'error', text: 'Could not load your registrations.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMine(); }, [fetchMine]);

  const handleCancel = (registration) => setConfirmTarget(registration);

  const confirmCancel = async () => {
    if (!confirmTarget) return;
    setCancellingId(confirmTarget._id);
    try {
      await api.delete(`/registrations/${confirmTarget._id}`);
      fetchMine();
    } catch (e) {
      setToast({ type: 'error', text: e.response?.data?.message || 'Could not cancel this registration.' });
    } finally {
      setCancellingId(null);
      setConfirmTarget(null);
    }
  };

  const isPast = (r) => !r.event || new Date(r.event.eventDate) < new Date() || r.event.status === 'closed';
  const filtered = registrations.filter((r) => (filter === 'All' ? true : filter === 'Upcoming' ? !isPast(r) : isPast(r)));

  return (
    <div className="min-h-screen bg-bg text-text font-body">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-8 px-16 py-5 border-b border-borderMuted bg-bg/92 backdrop-blur-md">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <Aperture size={26} speed="9s" />
            <span className="font-mono text-[11.5px] tracking-[0.22em] uppercase">
              Campus<span className="text-textMuted">connect</span>
            </span>
          </div>
          <nav className="flex items-center gap-7">
            <Link to="/" className="font-mono text-[11px] tracking-wider uppercase text-textFaint hover:text-text">Feed</Link>
            <a href="#my-registrations" className="font-mono text-[11px] tracking-wider uppercase text-text border-b-2 border-accent pb-1">My RSVPs</a>
          </nav>
        </div>
        <div className="flex items-center gap-4.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-accent flex items-center justify-center font-heading font-extrabold text-[12.5px] text-bg">
              {user?.name?.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-[13.5px] font-medium">{user?.name}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="font-mono text-[11px] tracking-wider uppercase text-textFaint hover:text-text border border-border px-3 py-2 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      <section className="px-16 pt-13 pb-9 border-b-2 border-borderMuted">
        <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-accent mb-5.5">Your registrations</div>
        <h1 className="font-heading font-black text-6xl leading-[0.94] tracking-tight">What you&apos;re signed up for.</h1>
        <p className="mt-5 text-base leading-relaxed text-textMuted max-w-[52ch]">Every event you&apos;ve RSVPed to, across every club.</p>
      </section>

      {toast && (
        <div className="px-16 pt-6">
          <div className={`font-mono text-xs px-4 py-3 border-l-2 bg-surface ${toast.type === 'error' ? 'border-accentLight text-accentLight' : 'border-accent text-text'}`}>
            {toast.text}
          </div>
        </div>
      )}

      {loading ? null : registrations.length === 0 ? (
        <section className="px-16 py-16">
          <div className="flex items-center gap-16 p-16 bg-surface border border-border flex-wrap">
            <div className="relative w-[148px] h-[148px] flex-none">
              <div className="absolute inset-0 rounded-full border-2 border-[#1C1C22]" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent" style={{ borderTopColor: '#E91E8C', animation: 'cc-spin 16s linear infinite' }} />
              <div className="absolute inset-0 flex items-center justify-center font-heading font-black text-[34px] text-[#26262E]">0</div>
            </div>
            <div className="max-w-[600px]">
              <div className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-accent mb-4.5">Nothing yet</div>
              <h2 className="font-heading font-extrabold text-4xl leading-tight tracking-tight mb-3.5">No RSVPs on record.</h2>
              <p className="text-[15.5px] leading-relaxed text-textMuted mb-7">Once you RSVP to something in the feed, it'll show up here.</p>
              <Link to="/" className="inline-flex h-12 items-center gap-3 px-4.5 bg-accent hover:bg-accentHover font-heading font-bold text-sm text-bg">
                <span>Browse the feed</span><span>→</span>
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="px-16 pt-8 pb-22">
          <div className="flex items-baseline justify-between gap-6 mb-5">
            <div className="font-mono text-[11px] tracking-wider uppercase text-textMuted">
              {filter === 'All' ? `All ${registrations.length} registrations` : `Showing ${filtered.length} ${filter.toLowerCase()}`}
            </div>
            <div className="flex gap-2">
              {['All', 'Upcoming', 'Past'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`h-[30px] px-3 font-mono text-[10px] tracking-wider uppercase border ${filter === f ? 'bg-accent border-accent text-bg' : 'bg-transparent border-border text-textMuted'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3.5">
            {filtered.map((r) => (
              <RegistrationRow
                key={r._id}
                registration={r}
                onCancel={() => handleCancel(r)}
                cancelling={cancellingId === r._id}
              />
            ))}
          </div>
        </section>
      )}

      <ConfirmModal
        open={!!confirmTarget}
        title="Cancel this RSVP?"
        message={
          confirmTarget?.event
            ? `You'll give up your spot for "${confirmTarget.event.title}". You can RSVP again later if space is still open.`
            : 'This removes the record from your registrations.'
        }
        confirmLabel="Cancel RSVP"
        cancelLabel="Keep my spot"
        confirming={cancellingId === confirmTarget?._id}
        onConfirm={confirmCancel}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}

function RegistrationRow({ registration, onCancel, cancelling }) {
  const event = registration.event;

  if (!event) {
    return (
      <div className="flex items-center justify-between gap-6 p-5 bg-surface border border-border flex-wrap">
        <span className="text-[14px] text-textMuted">This event was removed by its organizer.</span>
        <button
          type="button"
          disabled={cancelling}
          onClick={onCancel}
          className="h-9 px-3.5 border border-border font-heading font-semibold text-[12.5px] text-text disabled:opacity-50"
        >
          {cancelling ? 'Removing…' : 'Dismiss'}
        </button>
      </div>
    );
  }

  const past = new Date(event.eventDate) < new Date() || event.status === 'closed';

  return (
    <div className="flex items-center gap-6 p-5 bg-surface border border-border flex-wrap">
      <div className="flex-1 min-w-[220px]">
        <div className="flex items-center gap-2.5 mb-2">
          <span
            className="font-mono text-[9.5px] tracking-wider uppercase px-2 py-1 border"
            style={{
              color: registration.status === 'confirmed' ? '#0B0B0D' : '#8E8E99',
              background: registration.status === 'confirmed' ? '#E91E8C' : 'transparent',
              borderColor: registration.status === 'confirmed' ? '#E91E8C' : '#3A3A45'
            }}
          >
            {registration.status}
          </span>
          {past && <span className="font-mono text-[9.5px] tracking-wider uppercase text-textFaint">Past</span>}
        </div>
        <Link to={`/events/${event._id}`} className="font-heading font-bold text-lg tracking-tight hover:text-accent">
          {event.title}
        </Link>
        <div className="text-[13px] text-textMuted mt-1">{event.club}</div>
        <div className="text-[13px] text-[#C9C9D1] mt-1.5">{formatWhen(event.eventDate)} · {event.location}</div>
      </div>
      <div className="flex gap-2.5 flex-none">
        {!past && (
          <button
            type="button"
            onClick={() => downloadEventICS(event)}
            className="h-10 px-3.5 border border-border font-heading font-semibold text-[12.5px] text-text"
          >
            Add to calendar
          </button>
        )}
        <button
          type="button"
          disabled={cancelling || past}
          onClick={onCancel}
          title={past ? 'This event has already happened' : undefined}
          className="h-10 px-3.5 border border-[#3A3A45] font-heading font-semibold text-[12.5px] text-textMuted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancelling ? 'Cancelling…' : 'Cancel RSVP'}
        </button>
      </div>
    </div>
  );
}
