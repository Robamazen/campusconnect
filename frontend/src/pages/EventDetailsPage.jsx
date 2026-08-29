import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Aperture from '../components/Aperture';
import RsvpModal from '../components/RsvpModal';
import ConfirmModal from '../components/ConfirmModal';
import api from '../services/api';
import { downloadEventICS } from '../utils/ics';

const CIRCUMFERENCE = 301.59; // 2πr for r=48

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function EventDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState({ open: false, variant: 'success', event: null, registration: null, error: null });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);


  const fetchEvent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data.event);
    } catch {
      setToast({ type: 'error', text: 'Could not load this event.' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  if (loading) return <div className="min-h-screen bg-bg" />;
  if (!event) return <div className="min-h-screen bg-bg text-text p-16">Event not found.</div>;

  const capacity = event.totalSlots;
  const taken = event.filledSlots || 0;
  const left = capacity != null ? Math.max(0, capacity - taken) : null;
  const isPast = new Date(event.eventDate) < new Date();
  const status = isPast || event.status === 'closed' ? 'closed' : capacity != null && taken >= capacity ? 'full' : 'open';
  const nearlyFull = status === 'open' && capacity != null && left > 0 && left / capacity <= 0.2;

  const pct = status === 'closed' || capacity == null ? 0 : Math.min(1, taken / capacity);
  const dialOffset = CIRCUMFERENCE - CIRCUMFERENCE * pct;
  const dialColor = status === 'closed' ? '#3A3A45' : status === 'full' || nearlyFull ? '#E91E8C' : '#8E8E99';
  const dialNumber = status === 'closed' ? '—' : status === 'full' ? '0' : left;
  const dialNumberColor = status === 'closed' ? '#5B5B66' : nearlyFull || status === 'full' ? '#FF5FB2' : '#F4F4F5';

  const capacityLine =
    capacity == null ? `${taken} going` : status === 'closed' ? 'Registration closed' : status === 'full' ? `Full — ${capacity} / ${capacity}` : `${left} / ${capacity} spots left`;
  const capacityNote = status === 'closed' ? 'This event has ended' : status === 'full' ? 'At capacity' : nearlyFull ? 'Filling fast' : `${taken} going`;

  const isOwner = user?.role === 'clubLeader' && event.createdBy?._id === user?.id;
  const isAdmin = user?.role === 'admin';

  const handleRsvp = async (event) => {
    setActing(true);
    try {
      const res = await api.post('/registrations', { eventId: event._id });
      setModal({ open: true, variant: 'success', event, registration: res.data.registration });
      fetchEvent(); // refresh so filledSlots updates behind the modal
    } catch (e) {
      setModal({ open: true, variant: 'error', event, error: e.response?.data?.message });
    } finally {
      setActing(false);
    }
  };

  const handleDelete = () => setShowDeleteConfirm(true);

  const confirmDelete = async () => {
    setActing(true);
    try {
      await api.delete(`/events/${event._id}`);
      navigate(isOwner ? '/my-events' : '/');
    } catch (e) {
      setToast({ type: 'error', text: e.response?.data?.message || 'Delete failed.' });
    } finally {
      setActing(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text font-body">
      {toast && (
        <div className={`fixed top-20 right-6 z-30 font-mono text-xs px-4 py-3 border-l-2 bg-surface ${toast.type === 'success' ? 'border-accent text-text' : 'border-accentLight text-accentLight'}`}>
          {toast.text}
        </div>
      )}

      <section className="relative px-16 pt-13 pb-10 overflow-hidden border-b-2 border-borderMuted">
        <Link to="/" className="inline-block font-mono text-[10.5px] tracking-wider uppercase text-textMuted mb-7">← Back to feed</Link>
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="font-mono text-[10px] tracking-wider uppercase px-[9px] py-[5px] bg-accent text-bg border border-accent">{event.category}</span>
          <span className="font-mono text-[10px] tracking-wider uppercase text-textFaint">{event.type}</span>
          <span className="w-px h-3.5 bg-borderMuted" />
          <span className="font-mono text-[10px] tracking-wider uppercase text-textFaint">Category assigned automatically</span>
        </div>
        <h1 className="max-w-[19ch] font-heading font-black text-6xl md:text-7xl leading-[0.92] tracking-tight">{event.title}</h1>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_400px]">
        <div className="px-8 md:px-16 py-12 border-r border-borderMuted">
          <div className="flex items-center gap-4 pb-6.5 border-b border-borderMuted flex-wrap">
            <div className="w-11 h-11 flex-none bg-surface border border-border flex items-center justify-center font-heading font-extrabold text-[13px] text-accent">
              {event.club.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-heading font-bold text-base tracking-tight">{event.club}</div>
              <div className="text-[13px] text-textMuted mt-0.5">
                Hosted by <span className="text-[#C9C9D1] font-medium">{event.createdBy?.name || 'Unknown'}</span>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <div className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-accent mb-4.5">About this event</div>
            <p className="text-[16.5px] leading-relaxed text-[#C9C9D1] max-w-[62ch] whitespace-pre-line">{event.description}</p>
          </div>

          {event.requirements?.length > 0 && (
            <div className="pt-9">
              <div className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-accent mb-5">What to bring</div>
              <ul className="max-w-[62ch]">
                {event.requirements.map((req, i) => (
                  <li key={i} className="flex gap-4 py-3.5 border-t border-borderMuted text-[15.5px] leading-relaxed text-[#C9C9D1] last:border-b">
                    <span className="font-mono text-[11px] text-accent pt-0.5">{String(i + 1).padStart(2, '0')}</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 mt-11 border-t-2 border-borderMuted">
            <div className="pt-5.5 pr-6">
              <div className="font-mono text-[10px] tracking-wider uppercase text-[#4A4A54] mb-3">Date</div>
              <div className="font-heading font-bold text-lg tracking-tight">{formatDate(event.eventDate)}</div>
              <div className="text-[13.5px] text-textMuted mt-1.5">{formatTime(event.eventDate)}</div>
            </div>
            <div className="pt-5.5 pl-0 sm:pl-6 sm:border-l border-borderMuted">
              <div className="font-mono text-[10px] tracking-wider uppercase text-[#4A4A54] mb-3">Location</div>
              <div className="font-heading font-bold text-lg tracking-tight">{event.location}</div>
            </div>
          </div>
        </div>

        <aside className="px-8 md:px-16 lg:pr-16 lg:pl-10 py-12">
          <div className="lg:sticky lg:top-24">
            <div className="bg-surface border border-border p-7">
              <div className="flex items-center gap-5.5 pb-6 border-b border-borderMuted">
                <div className="relative w-26 h-26 flex-none" style={{ width: 104, height: 104 }}>
                  <svg viewBox="0 0 104 104" width="104" height="104" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="52" cy="52" r="48" fill="none" stroke="#26262E" strokeWidth="3" />
                    <circle cx="52" cy="52" r="48" fill="none" stroke={dialColor} strokeWidth="3" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dialOffset} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-heading font-black text-[28px] tracking-tight leading-none" style={{ color: dialNumberColor }}>{dialNumber}</span>
                    <span className="font-mono text-[9px] tracking-wider uppercase text-textFaint mt-1">left</span>
                  </div>
                </div>
                <div>
                  <div className="font-heading font-extrabold text-lg tracking-tight" style={{ color: status === 'open' ? (nearlyFull ? '#FF5FB2' : '#F4F4F5') : '#8E8E99' }}>
                    {capacityLine}
                  </div>
                  <div className="text-[13px] leading-snug text-textMuted mt-1.5">{capacityNote}</div>
                </div>
              </div>

              <div className="pt-6">
                {isAdmin ? (
                  <AdminActions onDelete={handleDelete} acting={acting} />
                ) : isOwner ? (
                  <OwnerActions event={event} onDelete={handleDelete} acting={acting} />
                ) : (
                  <StudentActions
                    status={status}
                    nearlyFull={nearlyFull}
                    left={left}
                    onRsvp={() => handleRsvp(event)}
                    onAddToCalendar={() => downloadEventICS(event)}
                    acting={acting}
                    loggedIn={!!user}
                  />
                )}
              </div>
            </div>
          </div>
        </aside>
      </section>

      <RsvpModal
        open={modal.open}
        variant={modal.variant}
        event={modal.event}
        registration={modal.registration}
        errorMessage={modal.error}
        onClose={() => setModal({ ...modal, open: false })}
      />

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete this event?"
        message="This removes it for everyone, including anyone already registered. This cannot be undone."
        confirmLabel="Delete event"
        cancelLabel="Keep it"
        confirming={acting}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

function PrimaryButton({ label, onClick, disabled, acting }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || acting}
      className="cc-primary w-full h-[60px] flex items-center justify-between px-5 bg-accent border-0 disabled:opacity-50 disabled:cursor-not-allowed font-heading font-bold text-base text-bg text-left"
    >
      <span>{acting ? 'Please wait…' : label}</span>
      <span className="text-lg">→</span>
    </button>
  );
}

function OutlineButton({ label, trail, onClick }) {
  return (
    <button type="button" onClick={onClick} className="cc-outline w-full h-[46px] flex items-center justify-between px-4.5 bg-transparent border border-border font-heading font-semibold text-[13.5px] text-text text-left">
      <span>{label}</span>
      {trail && <span className="font-mono text-[10px] tracking-wider text-textFaint">{trail}</span>}
    </button>
  );
}

function DangerButton({ label, onClick, big, acting }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={acting}
      className={`cc-danger w-full ${big ? 'h-[60px] text-base' : 'h-[46px] text-[13.5px]'} flex items-center justify-between px-4.5 bg-transparent border border-[#3A3A45] disabled:opacity-50 font-heading font-semibold text-textMuted text-left`}
    >
      <span>{acting ? 'Deleting…' : label}</span>
      <span>×</span>
    </button>
  );
}

function StudentActions({ status, nearlyFull, left, onRsvp, onAddToCalendar, acting, loggedIn }) {
  if (status === 'open') {
    return (
      <>
        <PrimaryButton label={nearlyFull ? `RSVP now — ${left} spots left` : 'RSVP — hold my spot'} onClick={onRsvp} acting={acting} />
        <div className="mt-3.5"><OutlineButton label="Add to my calendar" trail="ICS" onClick={onAddToCalendar} /></div>
        <p className="mt-4 text-[12.5px] leading-relaxed text-textFaint">
          {loggedIn ? 'Cancel any time from My Registrations.' : 'Log in to RSVP to this event.'}
        </p>
      </>
    );
  }
  if (status === 'full') {
    return (
      <>
        <button type="button" disabled className="w-full h-[60px] flex items-center justify-between px-5 bg-transparent border border-[#3A3A45] text-[#C9C9D1] font-heading font-bold text-base text-left cursor-not-allowed">
          <span>Event full</span>
        </button>
        <p className="mt-4 text-[12.5px] leading-relaxed text-textFaint">All spots are taken. Check back — spots can open up if someone cancels.</p>
      </>
    );
  }
  return (
    <>
      <button type="button" disabled className="w-full h-[60px] flex items-center px-5 bg-transparent border border-borderMuted text-textFaint font-heading font-bold text-base text-left cursor-not-allowed">
        RSVP closed
      </button>
      <p className="mt-4 text-[12.5px] leading-relaxed text-textFaint">This event has already run.</p>
    </>
  );
}

function OwnerActions({ event, onDelete, acting }) {
  return (
    <>
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-bg border-l-2 border-accent mb-4">
        <span className="font-mono text-[10px] tracking-wider uppercase text-[#C9C9D1]">Your club owns this event</span>
      </div>
      <Link to={`/events/${event._id}/edit`}>
        <div className="cc-primary w-full h-[60px] flex items-center justify-between px-5 bg-accent font-heading font-bold text-base text-bg">
          <span>Edit event</span><span className="text-lg">→</span>
        </div>
      </Link>
      <div className="flex flex-col gap-2.5 mt-3.5">
        <Link to={`/events/${event._id}/registrants`}>
          <OutlineButton label="Attendee list" trail={String(event.filledSlots || 0)} />
        </Link>
        <DangerButton label="Delete event" onClick={onDelete} acting={acting} />
      </div>
      <p className="mt-4 text-[12.5px] leading-relaxed text-textFaint">Deleting this event cannot be undone.</p>
    </>
  );
}

function AdminActions({ onDelete, acting }) {
  return (
    <>
      <div className="flex gap-3 px-3.5 py-3 bg-bg border-l-2 border-accent mb-4">
        <Aperture size={15} speed="3.4s" filled={false} />
        <span className="text-[12.5px] leading-snug text-[#C9C9D1]">
          You are viewing as <strong className="text-text font-semibold">admin</strong>. You cannot RSVP or edit club content — moderation only.
        </span>
      </div>
      <DangerButton label="Delete event" onClick={onDelete} big acting={acting} />
      <p className="mt-4 text-[12.5px] leading-relaxed text-textFaint">Deletion permanently removes this event.</p>
    </>
  );
}