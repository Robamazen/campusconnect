import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EventCard from '../components/EventCard';
import Aperture from '../components/Aperture';
import api from '../services/api';

export default function MyEventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [deletingId, setDeletingId] = useState(null);

  const fetchMine = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/events/my/created');
      setEvents(res.data.events);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMine(); }, [fetchMine]);

  const handleEdit = (event, target) => {
    navigate(target === 'registrants' ? `/events/${event._id}/registrants` : `/events/${event._id}/edit`);
  };

  const handleDelete = async (event) => {
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    setDeletingId(event._id);
    try {
      await api.delete(`/events/${event._id}`);
      fetchMine();
    } finally {
      setDeletingId(null);
    }
  };

  const isPast = (ev) => new Date(ev.eventDate) < new Date() || ev.status === 'closed';
  const filtered = events.filter((ev) => (filter === 'All' ? true : filter === 'Upcoming' ? !isPast(ev) : isPast(ev)));

  const totalRegistrants = events.reduce((n, ev) => n + (ev.filledSlots || 0), 0);
  const thisWeek = events.filter((ev) => {
    const d = new Date(ev.eventDate);
    const now = new Date();
    const weekOut = new Date(now.getTime() + 7 * 86400000);
    return d >= now && d <= weekOut;
  }).length;
  const totalCapacity = events.reduce((n, ev) => n + (ev.totalSlots || 0), 0);
  const fillRate = totalCapacity > 0 ? Math.round((100 * totalRegistrants) / totalCapacity) : 0;

  return (
    <div className="min-h-screen bg-bg text-text font-body">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-8 px-16 py-5 border-b border-borderMuted bg-bg/92 backdrop-blur-md">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <Aperture size={26} speed="9s" />
            <span className="font-mono text-[11.5px] tracking-[0.22em] uppercase">Campus<span className="text-textMuted">connect</span></span>
          </div>
          <nav className="flex items-center gap-7">
            <Link to="/feed" className="font-mono text-[11px] tracking-wider uppercase text-textFaint hover:text-text">Feed</Link>
            <a href="#my-events" className="font-mono text-[11px] tracking-wider uppercase text-text border-b-2 border-accent pb-1">My events</a>
          </nav>
        </div>
        <div className="flex items-center gap-4.5">
          <span className="font-mono text-[10px] tracking-wider uppercase text-textMuted border border-border px-2.5 py-1.5">Club leader · {user?.status}</span>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-accent flex items-center justify-center font-heading font-extrabold text-[12.5px] text-bg">{user?.name?.slice(0, 2).toUpperCase()}</div>
            <span className="text-[13.5px] font-medium">{user?.name}</span>
          </div>
        </div>
      </header>

      <section className="px-16 pt-13 pb-9 border-b-2 border-borderMuted">
        <div className="flex items-end justify-between gap-12 flex-wrap">
          <div>
            <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-accent mb-5.5">Leader workspace</div>
            <h1 className="font-heading font-black text-6xl leading-[0.94] tracking-tight">What you&apos;re running.</h1>
            <p className="mt-5 text-base leading-relaxed text-textMuted max-w-[52ch]">Every event your club has published, newest first.</p>
          </div>
          <Link to="/events/new" className="flex-none h-14 flex items-center gap-3.5 px-5.5 bg-accent font-heading font-bold text-[15.5px] text-bg">
            <span className="text-lg leading-none">+</span><span>Create event</span>
          </Link>
        </div>

        {events.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 mt-11 border-t-2 border-borderMuted">
            <Stat value={events.length} label="Events created" />
            <Stat value={totalRegistrants} label="Total registrants" />
            <Stat value={thisWeek} label="Happening this week" accent />
            <Stat value={`${fillRate}%`} label="Average fill rate" />
          </div>
        )}
      </section>

      {loading ? null : events.length === 0 ? (
        <section className="px-16 py-16">
          <div className="flex items-center gap-16 p-16 bg-surface border border-border flex-wrap">
            <div className="relative w-[148px] h-[148px] flex-none">
              <div className="absolute inset-0 rounded-full border-2 border-[#1C1C22]" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent" style={{ borderTopColor: '#E91E8C', animation: 'cc-spin 16s linear infinite' }} />
              <div className="absolute inset-0 flex items-center justify-center font-heading font-black text-[44px] text-accent">+</div>
            </div>
            <div className="max-w-[620px]">
              <div className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-accent mb-4.5">Nothing published yet</div>
              <h2 className="font-heading font-extrabold text-4xl leading-tight tracking-tight mb-3.5">Your club&apos;s first event starts here.</h2>
              <p className="text-[15.5px] leading-relaxed text-textMuted mb-7">
                A title, a time, a room, and a headcount are all it takes — the category is assigned for you automatically.
              </p>
              <Link to="/events/new" className="inline-flex h-13 items-center gap-3.5 px-5 bg-accent font-heading font-bold text-[15px] text-bg" style={{ height: 52 }}>
                <span className="text-lg leading-none">+</span><span>Create your first event</span>
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="px-16 pt-8 pb-22">
          <div className="flex items-baseline justify-between gap-6 mb-5">
            <div className="font-mono text-[11px] tracking-wider uppercase text-textMuted">
              {filter === 'All' ? `All ${events.length} events · newest first` : `Showing ${filtered.length} ${filter.toLowerCase()}`}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((ev) => (
              <EventCard key={ev._id} event={ev} mode="owner" onEdit={handleEdit} onDelete={handleDelete} deleting={deletingId === ev._id} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ value, label, accent }) {
  return (
    <div className="pt-5.5 pr-7 border-l border-borderMuted first:border-l-0 first:pl-0">
      <div className="font-heading font-extrabold text-[42px] leading-none tracking-tight" style={{ color: accent ? '#E91E8C' : '#F4F4F5' }}>{value}</div>
      <div className="font-mono text-[10px] tracking-wider uppercase text-textMuted mt-2.5">{label}</div>
    </div>
  );
}