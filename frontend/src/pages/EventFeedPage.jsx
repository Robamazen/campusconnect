import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EventCard from '../components/EventCard';
import Aperture from '../components/Aperture';
import RsvpModal from '../components/RsvpModal';
import api from '../services/api';

const CATEGORIES = ['All', 'Academic', 'Social', 'Sports', 'Tech', 'Arts', 'Volunteering', 'Other'];
const TYPES = ['All', 'workshop', 'social', 'competition', 'volunteering', 'other'];

export default function EventFeedPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const [category, setCategory] = useState('All');
  const [type, setType] = useState('All');
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rsvpingId, setRsvpingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState({ open: false, variant: 'success', event: null, registration: null, error: null });


  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (category !== 'All') params.category = category;
      if (type !== 'All') params.type = type;
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/events', { params });
      setEvents(res.data.events);
    } catch {
      setToast({ type: 'error', text: 'Could not load events. Try again.' });
    } finally {
      setLoading(false);
    }
  }, [category, type, search]);

  // Debounce search so we're not firing a request on every keystroke
  useEffect(() => {
    const t = setTimeout(fetchEvents, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchEvents, search]);

  const handleRsvp = async (event) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'student') {
      setToast({ type: 'error', text: 'Only student accounts can RSVP to events.' });
      return;
    }
    setRsvpingId(event._id); // or setActing(true) on Event Details
    try {
      const res = await api.post('/registrations', { eventId: event._id });
      setModal({ open: true, variant: 'success', event, registration: res.data.registration });
      fetchEvents(); // or fetchEvent() on Event Details — refresh so filledSlots updates behind the modal
    } catch (e) {
      setModal({ open: true, variant: 'error', event, error: e.response?.data?.message });
    } finally {
      setRsvpingId(null);
    }
  };

  const clearAll = () => {
    setCategory('All');
    setType('All');
    setSearch('');
  };

  const hasFilters = category !== 'All' || type !== 'All' || search.trim().length > 0;
  const canRsvp = user?.role === 'student';
  const rsvpLabel = !user ? 'Log in' : !canRsvp ? 'Students only' : undefined;

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
            <a href="#feed" className="font-mono text-[11px] tracking-wider uppercase text-text border-b-2 border-accent pb-1">Feed</a>
            {user?.role === 'student' && <Link to="/my-registrations" className="font-mono text-[11px] tracking-wider uppercase text-textFaint hover:text-text">My RSVPs</Link>}
            {user?.role === 'clubLeader' && (
              <Link to="/my-events" className="font-mono text-[11px] tracking-wider uppercase text-textFaint hover:text-text">My Events</Link>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin" className="font-mono text-[11px] tracking-wider uppercase text-textFaint hover:text-text">Admin</Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4.5">
          {user?.role === 'clubLeader' && (
            <span className="font-mono text-[10px] tracking-wider uppercase text-textMuted border border-border px-2.5 py-1.5">
              Club leader · {user.status}
            </span>
          )}
          {user ? (
            <>
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
            </>
          ) : (
            <Link to="/login" className="font-mono text-[11px] tracking-wider uppercase text-text bg-accent px-3 py-2 transition-colors">
              Log in
            </Link>
          )}
        </div>
      </header>

      <section className="relative px-16 pt-16 pb-11 overflow-hidden border-b-2 border-borderMuted">
        <div className="relative flex items-end justify-between gap-16 flex-wrap">
          <div className="max-w-[720px]">
            <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-accent mb-6">
              {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </div>
            <h1 className="font-heading font-black text-6xl md:text-7xl leading-[0.9] tracking-tight">
              Find something<br />to do before<br /><span className="text-accent">Friday.</span>
            </h1>
            <p className="mt-7 text-[16.5px] leading-relaxed text-textMuted max-w-[48ch]">
              Every event posted by a verified club, sorted by what starts soonest. Categories are assigned
              automatically when a leader publishes — filter them below.
            </p>
          </div>
        </div>
      </section>

      <section className="sticky top-[73px] z-[15] px-16 py-7 border-b border-borderMuted bg-bg/94 backdrop-blur-md">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_330px] gap-11 items-start">
          <div className="flex flex-col gap-4.5">
            <FilterRow label="Category" options={CATEGORIES} active={category} onChange={setCategory} />
            <FilterRow label="Type" options={TYPES} active={type} onChange={setType} />
          </div>
          <div>
            <label className="block font-mono text-[10px] tracking-wider uppercase text-[#4A4A54] mb-2.5">Search</label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Event title"
                className="w-full h-11 pl-3.5 pr-11 bg-surface border border-border text-text text-sm"
              />
              <span className="absolute right-3.5 top-3 font-mono text-xs text-textFaint">⌕</span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-16 pt-8 pb-22">
        <div className="flex items-baseline justify-between gap-6 mb-5">
          <div className="font-mono text-[11px] tracking-wider uppercase text-textMuted">
            {loading ? 'Loading…' : `Showing ${events.length} event${events.length === 1 ? '' : 's'}`}
          </div>
        </div>

        {toast && (
          <div
            className={`mb-5 font-mono text-xs px-4 py-3 border-l-2 ${
              toast.type === 'success' ? 'border-accent text-text' : 'border-accentLight text-accentLight'
            } bg-surface`}
          >
            {toast.text}
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((ev) => (
              <EventCard
                key={ev._id}
                event={ev}
                onRsvp={handleRsvp}
                rsvping={rsvpingId === ev._id}
                canRsvp={!user || canRsvp}
                rsvpLabel={rsvpLabel}
              />
            ))}
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="flex items-center gap-14 p-18 bg-surface border border-border flex-wrap">
            <div className="relative w-[132px] h-[132px] flex-none">
              <div className="absolute inset-0 rounded-full border-2 border-[#1C1C22]" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent" style={{ borderTopColor: '#E91E8C', animation: 'cc-spin 14s linear infinite' }} />
              <div className="absolute inset-0 flex items-center justify-center font-heading font-black text-[34px] text-[#26262E]">0</div>
            </div>
            <div className="max-w-[600px]">
              <div className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-accent mb-4.5">No matches</div>
              <h2 className="font-heading font-extrabold text-4xl leading-tight tracking-tight mb-3.5">Nothing here right now.</h2>
              <p className="text-[15.5px] leading-relaxed text-textMuted mb-7">
                {hasFilters ? 'No event matches that combination of filters yet.' : 'No events have been posted yet.'}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="h-12 flex items-center gap-3 px-4.5 bg-accent hover:bg-accentHover font-heading font-bold text-sm text-bg"
                >
                  <span>Show all events</span><span>→</span>
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <RsvpModal
        open={modal.open}
        variant={modal.variant}
        event={modal.event}
        registration={modal.registration}
        errorMessage={modal.error}
        onClose={() => setModal({ ...modal, open: false })}
      />
    </div>
  );
}

function FilterRow({ label, options, active, onChange }) {
  return (
    <div className="flex items-center gap-4">
      <span className="font-mono text-[10px] tracking-wider uppercase text-[#4A4A54] w-16 flex-none">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`cc-chip h-8 px-3 font-mono text-[10.5px] tracking-wider uppercase border transition-colors ${
              active === opt ? 'bg-accent border-accent text-bg' : 'bg-transparent border-border text-textMuted'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
