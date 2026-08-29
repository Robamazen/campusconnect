import { downloadEventICS } from '../utils/ics';

function RecapRow({ label, value, accent }) {
  return (
    <div className="grid grid-cols-[64px_1fr] gap-3.5 py-3.5 border-t border-borderMuted">
      <span className="font-mono text-[10px] tracking-wider uppercase text-[#4A4A54] pt-0.5">{label}</span>
      <span className={`text-[14.5px] leading-snug ${accent ? 'text-text font-semibold' : 'text-[#C9C9D1]'}`}>{value}</span>
    </div>
  );
}

function Mark({ success }) {
  return (
    <div className="relative w-26" style={{ width: 104, height: 104 }}>
      {success && <div className="absolute inset-2 rounded-full bg-accent" />}
      <svg viewBox="0 0 104 104" width="104" height="104" className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="52" cy="52" r="48" fill="none"
          stroke={success ? '#E91E8C' : '#8E8E99'} strokeWidth="3"
          strokeDasharray={success ? '301.6' : '10 8'}
          style={success ? { animation: 'cc-ring-draw 640ms cubic-bezier(0.2,0.8,0.2,1) 120ms both' } : undefined}
        />
      </svg>
      <svg viewBox="0 0 104 104" width="104" height="104" className="absolute inset-0">
        {success ? (
          <polyline
            points="36,53 47,64 69,42" fill="none" stroke="#0B0B0D" strokeWidth="5"
            strokeLinecap="square" strokeDasharray="40"
            style={{ animation: 'cc-tick-draw 320ms ease 640ms both' }}
          />
        ) : (
          <line x1="38" y1="52" x2="66" y2="52" stroke="#8E8E99" strokeWidth="4" strokeLinecap="square" />
        )}
      </svg>
    </div>
  );
}

export default function RsvpModal({ open, variant, event, registration, errorMessage, onClose }) {
  if (!open) return null;
  const success = variant === 'success';

  const timestamp = new Date().toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-[#070709]/82 backdrop-blur-md"
        style={{ animation: 'cc-scrim-in 220ms ease both' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-[520px] bg-surface border border-border shadow-[0_40px_90px_rgba(0,0,0,0.6)] overflow-hidden"
        style={{ animation: 'cc-modal-in 260ms cubic-bezier(0.2,0.8,0.2,1) both' }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: success ? '#E91E8C' : '#3A3A45' }}
        />

        <div className="relative flex items-start justify-between gap-5 px-7.5 pt-7.5">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase pt-2" style={{ color: success ? '#E91E8C' : '#8E8E99' }}>
            {success ? `RSVP confirmed · ${timestamp}` : 'RSVP not completed'}
          </span>
          <button type="button" onClick={onClose} className="cc-close w-8.5 h-8.5 flex-none flex items-center justify-center border border-[#26262E] font-mono text-sm text-textFaint" style={{ width: 34, height: 34 }}>
            ×
          </button>
        </div>

        <div className="relative px-7.5 pt-6.5">
          <Mark success={success} />
        </div>

        <div className="relative px-7.5 pt-7">
          <h2 className="font-heading font-black text-[44px] leading-[0.98] tracking-tight m-0">
            {success ? "You're in." : 'It just filled up.'}
          </h2>
          <p className="mt-3.5 text-[15.5px] leading-relaxed text-textMuted max-w-[44ch]">
            {success
              ? 'The event is now in your registrations — you can cancel any time from My Registrations.'
              : errorMessage || 'Between opening this page and confirming, this event reached capacity.'}
          </p>
        </div>

        <div className="relative px-7.5 pt-6.5">
          {success && event ? (
            <div className="border-b border-borderMuted">
              <RecapRow label="Event" value={event.title} accent />
              <RecapRow label="Club" value={event.club} />
              <RecapRow
                label="When"
                value={new Date(event.eventDate).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              />
              <RecapRow label="Where" value={event.location} />
              <RecapRow label="Status" value={registration?.status || 'pending'} />
            </div>
          ) : (
            !success &&
            event && (
              <div className="flex gap-5.5 pt-1">
                <div>
                  <div className="font-heading font-extrabold text-xl tracking-tight">
                    {event.totalSlots}/{event.totalSlots}
                  </div>
                  <div className="font-mono text-[9.5px] tracking-wider uppercase text-[#4A4A54] mt-1.5">Seats taken</div>
                </div>
              </div>
            )
          )}
        </div>

        <div className="relative flex flex-col gap-2.5 px-7.5 pb-7.5 pt-6.5">
          {success ? (
            <>
              <button type="button" onClick={onClose} className="cc-primary w-full h-14 flex items-center justify-between px-5 bg-accent font-heading font-bold text-[15.5px] text-bg">
                <span>Done</span><span className="text-lg">→</span>
              </button>
              <button
                type="button"
                onClick={() => downloadEventICS(event)}
                className="cc-outline w-full h-12 flex items-center justify-between px-5 bg-transparent border border-border font-heading font-semibold text-sm text-text"
              >
                <span>Add to calendar</span>
                <span className="font-mono text-[10px] tracking-wider text-textFaint">ICS</span>
              </button>
            </>
          ) : (
            <button type="button" onClick={onClose} className="cc-outline w-full h-14 flex items-center justify-between px-5 bg-transparent border border-border font-heading font-bold text-[15.5px] text-text">
              <span>Back to event</span><span className="text-lg">←</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}