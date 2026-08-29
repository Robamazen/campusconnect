import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Aperture from '../components/Aperture';
import api from '../services/api';

const ROLES = ['All', 'student', 'clubLeader', 'admin'];
const STATUSES = ['All', 'pending', 'approved', 'rejected'];

function initialsOf(name) {
  return (name || '?').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [role, setRole] = useState('All');
  const [status, setStatus] = useState('All');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setToast(null);
    try {
      const params = {};
      if (role !== 'All') params.role = role;
      if (status !== 'All') params.status = status;
      const res = await api.get('/users', { params });
      setUsers(res.data.users);
    } catch (e) {
      setToast({ type: 'error', text: e.response?.data?.message || 'Could not load users.' });
    } finally {
      setLoading(false);
    }
  }, [role, status]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await api.get('/events');
      setEvents(res.data.events);
    } catch (e) {
      setToast({ type: 'error', text: e.response?.data?.message || 'Could not load events.' });
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const visibleUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q));
  }, [query, users]);

  const counts = useMemo(() => ({
    total: users.length,
    pending: users.filter((u) => u.role === 'clubLeader' && u.status === 'pending').length,
    leaders: users.filter((u) => u.role === 'clubLeader').length,
    admins: users.filter((u) => u.role === 'admin').length
  }), [users]);

  const eventStats = useMemo(() => {
    const now = new Date();
    const upcoming = events.filter((event) => new Date(event.eventDate) >= now && event.status !== 'closed');
    const closed = events.filter((event) => new Date(event.eventDate) < now || event.status === 'closed');
    const totalCapacity = events.reduce((sum, event) => sum + (event.totalSlots || 0), 0);
    const seatsHeld = events.reduce((sum, event) => sum + (event.filledSlots || 0), 0);
    const full = events.filter((event) => event.totalSlots != null && (event.filledSlots || 0) >= event.totalSlots).length;

    return {
      total: events.length,
      upcoming: upcoming.length,
      closed: closed.length,
      seatsHeld,
      fillRate: totalCapacity > 0 ? Math.round((seatsHeld / totalCapacity) * 100) : 0,
      full
    };
  }, [events]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const updateStatus = async (target, nextStatus) => {
    setBusyId(target._id);
    setToast(null);
    try {
      await api.put(`/users/${target._id}/status`, { status: nextStatus });
      await fetchUsers();
      setToast({ type: 'success', text: `${target.name} is now ${nextStatus}.` });
    } catch (e) {
      setToast({ type: 'error', text: e.response?.data?.message || 'Status update failed.' });
    } finally {
      setBusyId(null);
    }
  };

  const updateRole = async (target, nextRole) => {
    if (target._id === user?.id && nextRole !== 'admin') {
      setToast({ type: 'error', text: 'You cannot remove your own admin role from here.' });
      return;
    }

    setBusyId(target._id);
    setToast(null);
    try {
      await api.put(`/users/${target._id}/role`, { role: nextRole });
      await fetchUsers();
      setToast({ type: 'success', text: `${target.name} role changed to ${nextRole}.` });
    } catch (e) {
      setToast({ type: 'error', text: e.response?.data?.message || 'Role update failed.' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text font-body">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-8 px-16 py-5 border-b border-borderMuted bg-bg/92 backdrop-blur-md">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <Aperture size={26} speed="9s" />
            <span className="font-mono text-[11.5px] tracking-[0.22em] uppercase">Campus<span className="text-textMuted">connect</span></span>
          </div>
          <nav className="flex items-center gap-7">
            <Link to="/" className="font-mono text-[11px] tracking-wider uppercase text-textFaint hover:text-text">Feed</Link>
            <a href="#users" className="font-mono text-[11px] tracking-wider uppercase text-text border-b-2 border-accent pb-1">Users</a>
            <a href="#events" className="font-mono text-[11px] tracking-wider uppercase text-textFaint hover:text-text">Events</a>
          </nav>
        </div>
        <div className="flex items-center gap-4.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-accent flex items-center justify-center font-heading font-extrabold text-[12.5px] text-bg">
              {initialsOf(user?.name)}
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
        <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-accent mb-5.5">Admin workspace</div>
        <h1 className="font-heading font-black text-6xl leading-[0.94] tracking-tight">Platform control.</h1>
        <p className="mt-5 text-base leading-relaxed text-textMuted max-w-[56ch]">
          Review club leader requests, change roles, and monitor event activity from one admin view.
        </p>
      </section>

      <section id="users" className="px-16 pt-10 pb-9 border-b-2 border-borderMuted">
        <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-accent mb-4">Users</div>
        <h2 className="font-heading font-black text-4xl leading-tight tracking-tight">Account control.</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 mt-11 border-t-2 border-borderMuted">
          <Stat value={counts.total} label="Visible users" />
          <Stat value={counts.pending} label="Pending leaders" accent />
          <Stat value={counts.leaders} label="Club leaders" />
          <Stat value={counts.admins} label="Admins" />
        </div>
      </section>

      <section className="px-16 py-6 border-b border-borderMuted flex items-end justify-between gap-8 flex-wrap">
        <div className="flex flex-col gap-4">
          <FilterRow label="Role" options={ROLES} active={role} onChange={setRole} />
          <FilterRow label="Status" options={STATUSES} active={status} onChange={setStatus} />
        </div>
        <div className="relative w-[320px]">
          <label className="block font-mono text-[10px] tracking-wider uppercase text-[#4A4A54] mb-2.5">Search</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or email"
            className="w-full h-11 pl-3.5 pr-10 bg-surface border border-border text-text text-sm"
          />
          <span className="absolute right-3.5 bottom-3 font-mono text-xs text-textFaint">⌕</span>
        </div>
      </section>

      {toast && (
        <div className="px-16 pt-5">
          <div className={`font-mono text-xs px-4 py-3 border-l-2 bg-surface ${toast.type === 'success' ? 'border-accent text-text' : 'border-accentLight text-accentLight'}`}>
            {toast.text}
          </div>
        </div>
      )}

      {loading ? null : visibleUsers.length > 0 ? (
        <section className="px-16 pb-16">
          <div className="grid grid-cols-[1.4fr_2fr_132px_132px_260px] items-center gap-5 py-3.5 px-4 border-b-2 border-borderMuted">
            {['User', 'Email', 'Role', 'Status', 'Actions'].map((h) => (
              <span key={h} className={`font-mono text-[9.5px] tracking-wider uppercase text-textMuted ${h === 'Actions' ? 'text-right' : ''}`}>{h}</span>
            ))}
          </div>
          {visibleUsers.map((account) => (
            <UserRow
              key={account._id}
              account={account}
              selfId={user?.id}
              busy={busyId === account._id}
              onStatus={updateStatus}
              onRole={updateRole}
            />
          ))}
        </section>
      ) : (
        <section className="px-16 py-16">
          <div className="p-11 border border-border">
            <h2 className="font-heading font-extrabold text-2xl tracking-tight mb-2.5">No users in this view.</h2>
            <p className="text-[14.5px] leading-relaxed text-textMuted">Change the filters or search term to widen the list.</p>
          </div>
        </section>
      )}

      <section id="events" className="px-16 pt-10 pb-9 border-y-2 border-borderMuted">
        <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-accent mb-4">Events</div>
        <h2 className="font-heading font-black text-4xl leading-tight tracking-tight">Event health.</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 mt-11 border-t-2 border-borderMuted">
          <Stat value={eventStats.total} label="Total events" />
          <Stat value={eventStats.upcoming} label="Upcoming" accent />
          <Stat value={eventStats.closed} label="Closed or past" />
          <Stat value={eventStats.seatsHeld} label="Seats held" />
          <Stat value={`${eventStats.fillRate}%`} label="Fill rate" />
          <Stat value={eventStats.full} label="Full events" />
        </div>
      </section>

      {eventsLoading ? null : events.length > 0 ? (
        <section className="px-16 pb-20">
          <div className="grid grid-cols-[1.7fr_1.2fr_110px_130px_110px_96px] items-center gap-5 py-3.5 px-4 border-b-2 border-borderMuted">
            {['Event', 'Club', 'Type', 'Date', 'Capacity', 'Status'].map((h) => (
              <span key={h} className="font-mono text-[9.5px] tracking-wider uppercase text-textMuted">{h}</span>
            ))}
          </div>
          {events.map((event) => (
            <EventRow key={event._id} event={event} />
          ))}
        </section>
      ) : (
        <section className="px-16 py-16">
          <div className="p-11 border border-border">
            <h2 className="font-heading font-extrabold text-2xl tracking-tight mb-2.5">No events yet.</h2>
            <p className="text-[14.5px] leading-relaxed text-textMuted">Events created by approved club leaders will appear here.</p>
          </div>
        </section>
      )}
    </div>
  );
}

function UserRow({ account, selfId, busy, onStatus, onRole }) {
  const isLeader = account.role === 'clubLeader';
  const isSelf = account._id === selfId;

  return (
    <div className="grid grid-cols-[1.4fr_2fr_132px_132px_260px] items-center gap-5 py-3.5 px-4 border-b border-[#1C1C22]">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-[34px] h-[34px] flex-none flex items-center justify-center bg-surface border border-border font-heading font-extrabold text-[11px] text-accent">
          {initialsOf(account.name)}
        </span>
        <span className="text-[14.5px] font-medium truncate">{account.name}</span>
      </div>
      <span className="font-mono text-xs text-textMuted truncate">{account.email}</span>
      <span className="font-mono text-[10px] tracking-wider uppercase text-[#C9C9D1]">{account.role}</span>
      <span
        className="font-mono text-[10px] tracking-wider uppercase"
        style={{ color: account.status === 'pending' ? '#FF5FB2' : account.status === 'approved' ? '#C9C9D1' : '#8E8E99' }}
      >
        {account.status}
      </span>
      <div className="flex justify-end gap-2">
        {isLeader && account.status !== 'approved' && (
          <ActionBtn label="Approve" solid busy={busy} onClick={() => onStatus(account, 'approved')} />
        )}
        {isLeader && account.status !== 'rejected' && (
          <ActionBtn label="Reject" busy={busy} onClick={() => onStatus(account, 'rejected')} />
        )}
        {account.role !== 'student' && !isSelf && (
          <ActionBtn label="Student" busy={busy} onClick={() => onRole(account, 'student')} />
        )}
        {account.role !== 'clubLeader' && (
          <ActionBtn label="Leader" busy={busy} onClick={() => onRole(account, 'clubLeader')} />
        )}
        {account.role !== 'admin' && (
          <ActionBtn label="Admin" busy={busy} onClick={() => onRole(account, 'admin')} />
        )}
      </div>
    </div>
  );
}

function FilterRow({ label, options, active, onChange }) {
  return (
    <div className="flex items-center gap-4">
      <span className="font-mono text-[10px] tracking-wider uppercase text-[#4A4A54] w-14 flex-none">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`h-8 px-3 font-mono text-[10.5px] tracking-wider uppercase border transition-colors ${
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

function ActionBtn({ label, solid, busy, onClick }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="h-8 px-3 font-heading font-semibold text-xs disabled:opacity-50"
      style={{
        background: solid ? '#E91E8C' : 'transparent',
        border: `1px solid ${solid ? '#E91E8C' : '#2A2A33'}`,
        color: solid ? '#0B0B0D' : '#C9C9D1'
      }}
    >
      {busy ? '...' : label}
    </button>
  );
}

function EventRow({ event }) {
  const isPast = new Date(event.eventDate) < new Date();
  const closed = isPast || event.status === 'closed';
  const capacity = event.totalSlots == null ? 'Open' : `${event.filledSlots || 0}/${event.totalSlots}`;

  return (
    <div className="grid grid-cols-[1.7fr_1.2fr_110px_130px_110px_96px] items-center gap-5 py-3.5 px-4 border-b border-[#1C1C22]">
      <Link to={`/events/${event._id}`} className="font-heading font-semibold text-[14.5px] hover:text-accent truncate">
        {event.title}
      </Link>
      <span className="text-[13px] text-textMuted truncate">{event.club}</span>
      <span className="font-mono text-[10px] tracking-wider uppercase text-[#C9C9D1]">{event.type}</span>
      <span className="font-mono text-[11px] text-textMuted">
        {new Date(event.eventDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
      <span className="font-mono text-[11px] text-[#C9C9D1]">{capacity}</span>
      <span className="font-mono text-[10px] tracking-wider uppercase" style={{ color: closed ? '#8E8E99' : '#FF5FB2' }}>
        {closed ? 'Closed' : 'Open'}
      </span>
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
