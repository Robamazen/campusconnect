import { Link } from 'react-router-dom';

const ACCENT_CATEGORIES = ['Academic', 'Tech'];
const CIRCUMFERENCE = 100.53;

function deriveStatus(event) {
  if (new Date(event.eventDate) < new Date()) return 'closed';
  if (event.status === 'closed') return 'closed';
  if (event.totalSlots != null && event.filledSlots >= event.totalSlots) return 'full';
  return 'open';
}

function formatWhen(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function EventCard({ event, mode = 'public', onRsvp, onEdit, onDelete, rsvping, deleting }) {
  const isOwner = mode === 'owner';
  const capacity = event.totalSlots;
  const taken = event.filledSlots || 0;
  const status = deriveStatus(event);
  const left = capacity != null ? Math.max(0, capacity - taken) : null;
  const nearlyFull = status === 'open' && capacity != null && left > 0 && left / capacity <= 0.2;
  const isAccentTag = ACCENT_CATEGORIES.includes(event.category);

  // Owners see the fill level even on a closed event (attendance record); public view shows an empty dial once closed
  const pct = status === 'closed' && !isOwner ? 0 : capacity != null ? Math.min(1, taken / capacity) : 0;
  const dialOffset = CIRCUMFERENCE - CIRCUMFERENCE * pct;
  const dialColor = status === 'closed' ? (isOwner ? '#5B5B66' : '#3A3A45') : status === 'full' || nearlyFull ? '#E91E8C' : '#8E8E99';

  const cta = {
    open: { label: nearlyFull ? 'RSVP now' : 'RSVP', bg: '#E91E8C', border: '#E91E8C', color: '#0B0B0D', arrow: '→', disabled: false },
    full: { label: 'Full', bg: 'transparent', border: '#26262E', color: '#5B5B66', arrow: '', disabled: true },
    closed: { label: 'Closed', bg: 'transparent', border: '#26262E', color: '#5B5B66', arrow: '', disabled: true }
  }[status];

  const capacityLine =
    capacity == null
      ? `${taken} going`
      : status === 'closed'
      ? isOwner
        ? `${taken} / ${capacity} attended`
        : 'Registration closed'
      : status === 'full'
      ? `Full — ${capacity} / ${capacity}`
      : `${left} / ${capacity} spots left`;

  const capacityNote = isOwner
    ? status === 'closed'
      ? 'Event over'
      : status === 'full'
      ? 'At capacity'
      : taken === 0
      ? 'Just published — no sign-ups yet'
      : `${taken} registered`
    : status === 'closed'
    ? 'This event has ended'
    : status === 'full'
    ? 'At capacity'
    : nearlyFull
    ? 'Filling fast'
    : `${taken} going`;

  const ownerPrimaryLabel = status === 'closed' ? 'Wrap-up' : 'Edit event';

  return (
    <article className="cc-card group relative flex flex-col h-full min-h-[288px] bg-surface border border-border px-5 pt-5 overflow-hidden transition-colors">
      {status !== 'open' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#3A3A45]" />}

      <Link to={isOwner ? '#' : `/events/${event._id}`} onClick={(e) => { if (isOwner) e.preventDefault(); }} className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between gap-3 mb-[18px]">
          <span
            className="font-mono text-[10px] tracking-[0.18em] uppercase px-[9px] py-[5px] border"
            style={{ background: isAccentTag ? '#E91E8C' : 'transparent', color: isAccentTag ? '#0B0B0D' : '#8E8E99', borderColor: isAccentTag ? '#E91E8C' : '#3A3A45' }}
          >
            {event.category}
          </span>
          <span className="font-mono text-[10px] tracking-wider uppercase text-textFaint">{event.type}</span>
        </div>

        <h3 className="cc-title mb-3 font-heading font-extrabold text-xl leading-tight tracking-tight transition-colors" style={{ color: status === 'open' ? '#F4F4F5' : '#8E8E99' }}>
          {event.title}
        </h3>

        <div className="flex items-center gap-2 mb-5">
          <span className="w-[5px] h-[5px] rounded-full bg-accent flex-none" />
          <span className="text-[13.5px] font-medium text-textMuted">{event.club}</span>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 mt-auto pb-5">
          <span className="font-mono text-[10px] tracking-wider uppercase text-[#4A4A54] pt-0.5">When</span>
          <span className="text-[13px] text-[#C9C9D1]">{formatWhen(event.eventDate)}</span>
          <span className="font-mono text-[10px] tracking-wider uppercase text-[#4A4A54] pt-0.5">Where</span>
          <span className="text-[13px] text-[#C9C9D1]">{event.location}</span>
        </div>
      </Link>

      <div className="flex items-center gap-3.5 -mx-5 px-5 py-4 border-t border-borderMuted">
        <div className="relative w-[38px] h-[38px] flex-none">
          <svg viewBox="0 0 38 38" width="38" height="38" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="19" cy="19" r="16" fill="none" stroke="#26262E" strokeWidth="2" />
            <circle cx="19" cy="19" r="16" fill="none" stroke={dialColor} strokeWidth="2" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dialOffset} />
          </svg>
          {status !== 'open' && !isOwner && (
            <span className="absolute inset-0 flex items-center justify-center font-mono text-[11px] text-textMuted">×</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading font-bold text-[13.5px] tracking-tight" style={{ color: status === 'open' ? (nearlyFull ? '#FF5FB2' : '#F4F4F5') : '#8E8E99' }}>
            {capacityLine}
          </div>
          <div className="font-mono text-[10px] tracking-wider uppercase text-[#4A4A54] mt-1">{capacityNote}</div>
        </div>
        {!isOwner && (
          <button
            type="button"
            disabled={cta.disabled || rsvping}
            onClick={() => onRsvp?.(event)}
            className="cc-cta h-[38px] flex items-center gap-2 px-3.5 border font-heading font-bold text-[12.5px] disabled:cursor-not-allowed"
            style={{ background: cta.bg, borderColor: cta.border, color: cta.color }}
          >
            <span>{rsvping ? 'Sending…' : cta.label}</span>
            {cta.arrow && <span className="cc-arrow text-sm transition-transform">{cta.arrow}</span>}
          </button>
        )}
      </div>

      {isOwner && (
        <div className="flex items-center gap-2 -mx-5 px-5 py-3.5 border-t border-borderMuted bg-[#101015]">
          <button
            type="button"
            onClick={() => onEdit?.(event, 'registrants')}
            className="h-9 flex items-center gap-2 px-3 border border-border font-heading font-semibold text-[12.5px] text-text"
          >
            <span>Registrants</span>
            <span className="font-mono text-[10px] tracking-wider text-textFaint">{taken}</span>
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => onDelete?.(event)}
            className="w-9 h-9 flex-none flex items-center justify-center border border-border font-mono text-[13px] text-textMuted disabled:opacity-50"
            title="Delete event"
          >
            {deleting ? '…' : '×'}
          </button>
          <button
            type="button"
            onClick={() => onEdit?.(event)}
            disabled={status === 'closed'}
            className="ml-auto h-9 flex items-center gap-2 px-3.5 font-heading font-bold text-[12.5px]"
            style={{
              background: status === 'closed' ? 'transparent' : '#E91E8C',
              border: `1px solid ${status === 'closed' ? '#3A3A45' : '#E91E8C'}`,
              color: status === 'closed' ? '#C9C9D1' : '#0B0B0D'
            }}
          >
            <span>{ownerPrimaryLabel}</span>
            {status !== 'closed' && <span className="text-sm">→</span>}
          </button>
        </div>
      )}
    </article>
  );
}