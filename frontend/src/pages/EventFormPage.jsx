import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Aperture from '../components/Aperture';
import api from '../services/api';

const TYPES = ['workshop', 'social', 'competition', 'volunteering', 'other'];
const CIRCUMFERENCE = 69.1; // preview dial, r=11

const BLANK = { title: '', club: '', description: '', location: '', date: '', time: '', type: 'workshop', totalSlots: 30, requirements: [] };

// Rough local heuristic ONLY for a live "likely category" hint while typing.
// The real classification is done server-side by huggingFaceService.js on save.
function roughGuess(title, description) {
  const t = (title + ' ' + description).toLowerCase();
  const hit = (words) => words.some((w) => t.includes(w));
  if (hit(['robot', 'code', 'firmware', 'rust', 'hardware', 'solder', 'software'])) return 'Tech';
  if (hit(['lecture', 'exam', 'study', 'seminar', 'research', 'career'])) return 'Academic';
  if (hit(['match', 'tournament', 'football', 'run', 'fitness'])) return 'Sports';
  if (hit(['music', 'poetry', 'gallery', 'theatre', 'film', 'paint'])) return 'Arts';
  if (hit(['volunteer', 'donate', 'blood', 'charity', 'clean-up'])) return 'Volunteering';
  if (hit(['party', 'mixer', 'social', 'open house', 'meet'])) return 'Social';
  return 'Other';
}

export default function EventFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const reqInputRef = useRef(null);
  const { user, logout } = useAuth();
  const pendingApproval = user?.role === 'clubLeader' && user?.status !== 'approved';

  const [form, setForm] = useState(BLANK);
  const [original, setOriginal] = useState(null); // holds fetched event in edit mode
  const [descTouched, setDescTouched] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null); // holds { event } after a successful save
  const [reqDraft, setReqDraft] = useState('');

  const fetchEvent = useCallback(async () => {
    if (!isEditing) return;
    setLoading(true);
    try {
      const res = await api.get(`/events/${id}`);
      const ev = res.data.event;
      const d = new Date(ev.eventDate);
      // Both date and time must come from the same (local) clock — mixing
      // toISOString (UTC) with toTimeString (local) can show the wrong day
      // whenever the local offset pushes the event across a UTC date boundary.
      const pad = (n) => String(n).padStart(2, '0');
      setForm({
        title: ev.title,
        club: ev.club,
        description: ev.description,
        location: ev.location,
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        type: ev.type,
        totalSlots: ev.totalSlots ?? 30,
        requirements: ev.requirements || []
      });
      setOriginal(ev);
    } catch {
      setError('Could not load this event.');
    } finally {
      setLoading(false);
    }
  }, [id, isEditing]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  const upd = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === 'description') setDescTouched(true);
  };

  const addRequirement = () => {
    const val = reqDraft.trim();
    if (!val) return;
    setForm((f) => ({ ...f, requirements: [...f.requirements, val] }));
    setReqDraft('');
    reqInputRef.current?.focus();
  };

  const removeRequirement = (i) => setForm((f) => ({ ...f, requirements: f.requirements.filter((_, j) => j !== i) }));

  const belowRegisteredCount = isEditing && original && form.totalSlots < (original.filledSlots || 0);

  const handleSave = async () => {
    setError(null);
    if (!form.title || !form.club || !form.description || !form.location || !form.date || !form.time) {
      setError('Fill in title, club, description, location, date, and time.');
      return;
    }
    if (belowRegisteredCount) {
      setError(`Cannot drop capacity below the ${original.filledSlots} students already registered.`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        club: form.club,
        description: form.description,
        requirements: form.requirements,
        location: form.location,
        eventDate: new Date(`${form.date}T${form.time}`).toISOString(),
        type: form.type,
        totalSlots: Number(form.totalSlots)
      };

      const res = isEditing ? await api.put(`/events/${id}`, payload) : await api.post('/events', payload);
      setSaved({ event: res.data.event });
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-bg" />;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (pendingApproval) {
    return (
      <div className="min-h-screen bg-bg text-text font-body flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <Aperture size={30} speed="3.2s" filled={false} />
          <h1 className="mt-6 font-heading font-extrabold text-3xl tracking-tight">Not approved yet.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-textMuted">
            An admin has to approve your club leader account before you can publish or edit events. You can browse
            the feed in the meantime.
          </p>
          <Link to="/" className="inline-flex h-12 items-center gap-2.5 px-5 mt-6 bg-accent font-heading font-bold text-sm text-bg">
            <span>Back to feed</span><span>→</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="block mx-auto mt-4 font-mono text-[11px] tracking-wider uppercase text-textFaint hover:text-text border border-border px-3 py-2 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  const predicted = descTouched ? roughGuess(form.title, form.description) : null;

  return (
    <div className="min-h-screen bg-bg text-text font-body">
      <section className="relative px-16 pt-11 pb-8 overflow-hidden border-b-2 border-borderMuted">
        <div className="flex items-center justify-between gap-6 mb-6">
          <Link to="/my-events" className="inline-block font-mono text-[10.5px] tracking-wider uppercase text-textMuted">← My events</Link>
          <button
            type="button"
            onClick={handleLogout}
            className="font-mono text-[11px] tracking-wider uppercase text-textFaint hover:text-text border border-border px-3 py-2 transition-colors"
          >
            Log out
          </button>
        </div>
        <div className="flex items-end justify-between gap-12 flex-wrap">
          <div>
            <div className="font-mono text-[11px] tracking-[0.24em] uppercase text-accent mb-5">
              {form.club || 'Your club'} · {isEditing ? 'Editing' : 'New event'}
            </div>
            <h1 className="font-heading font-black text-6xl leading-[0.94] tracking-tight">{isEditing ? 'Edit this event.' : 'Put something on the board.'}</h1>
            <p className="mt-4.5 text-[15.5px] leading-relaxed text-textMuted max-w-[56ch]">
              {isEditing
                ? `${original?.filledSlots || 0} students are already registered. Category re-runs automatically if you change the description.`
                : 'Everything here can be changed afterwards, so publish early and refine later.'}
            </p>
          </div>
        </div>
      </section>

      {saved && (
        <div className="px-16 pt-6">
          <div className="flex items-center gap-5.5 p-5.5 bg-surface border border-border border-l-2 border-l-accent flex-wrap">
            <div className="relative w-13 h-13 flex-none" style={{ width: 52, height: 52 }}>
              <div className="absolute inset-1 rounded-full bg-accent" />
            </div>
            <div className="flex-1 min-w-[220px]">
              <div className="font-heading font-extrabold text-lg tracking-tight">{isEditing ? 'Changes saved.' : "You're live."}</div>
              <div className="text-[13.5px] text-textMuted mt-1">{isEditing ? 'The updated details are reflected in the feed.' : 'This event now appears in the feed.'}</div>
            </div>
            <div className="flex items-center gap-3.5 px-5 border-l border-borderMuted">
              <div>
                <div className="font-mono text-[9.5px] tracking-wider uppercase text-textMuted mb-2">Category assigned</div>
                <span className="inline-block font-mono text-[11px] tracking-wider uppercase px-2.5 py-1.5 bg-accent text-bg">{saved.event.category}</span>
              </div>
            </div>
            <div className="flex gap-2.5">
              <Link to={`/events/${saved.event._id}`} className="h-11 flex items-center gap-2.5 px-4 bg-accent font-heading font-bold text-[13.5px] text-bg">
                <span>View event</span><span>→</span>
              </Link>
              <button type="button" onClick={() => setSaved(null)} className="h-11 px-3.5 bg-transparent border border-border font-heading font-semibold text-[13.5px] text-text">Keep editing</button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="px-16 pt-6">
          <div className="font-mono text-xs text-accentLight border-l-2 border-accent bg-surface px-4 py-3">{error}</div>
        </div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_380px]">
        <div className="px-8 md:px-16 py-10 border-r border-borderMuted">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5.5">
            <Field label="Event title">
              <input type="text" value={form.title} onChange={(e) => upd('title', e.target.value.slice(0, 90))} placeholder="What is it called?" className="w-full h-13 px-4 bg-surface border border-border text-text text-[15.5px]" style={{ height: 52 }} />
              <div className="flex justify-between mt-2 font-mono text-[10px] text-textMuted"><span>Shown on the card and the feed</span><span>{form.title.length} / 90</span></div>
            </Field>
            <Field label="Hosting club">
              <input type="text" value={form.club} onChange={(e) => upd('club', e.target.value)} placeholder="Which club is this for?" className="w-full h-13 px-4 bg-surface border border-border text-text text-[15.5px]" style={{ height: 52 }} />
            </Field>
          </div>

          <div className="mt-6.5">
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => upd('description', e.target.value)}
                placeholder="What happens, who it is for, what they will walk away with."
                className="w-full h-44 px-4 py-3.5 bg-surface border border-border text-text text-[15px] leading-relaxed resize-y"
              />
              <div className="flex items-start gap-3 mt-3 px-4 py-3.5 bg-bg border-l-2 border-accent">
                <Aperture size={15} speed="3.6s" filled={false} />
                <p className="m-0 text-[12.5px] leading-relaxed text-[#C9C9D1]">
                  Category is not something you pick — it's read from this description when you save, using an AI model, and re-read whenever the description changes.
                </p>
              </div>
            </Field>
          </div>

          <div className="mt-6.5">
            <label className="block font-mono text-[10.5px] tracking-[0.18em] uppercase text-textMuted mb-2.5">Requirements</label>
            <div className="flex gap-2.5">
              <input
                ref={reqInputRef}
                type="text"
                value={reqDraft}
                onChange={(e) => setReqDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                placeholder="One thing attendees must bring or know — press Enter"
                className="flex-1 h-12 px-4 bg-surface border border-border text-text text-[14.5px]"
              />
              <button type="button" onClick={addRequirement} className="h-12 flex items-center gap-2.5 px-4 bg-transparent border border-border font-heading font-semibold text-[13.5px] text-text">
                <span className="text-base leading-none">+</span><span>Add</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2.5 mt-3.5">
              {form.requirements.length === 0 && <span className="text-[13px] italic text-textFaint">No requirements yet — plenty of events need none.</span>}
              {form.requirements.map((r, i) => (
                <span key={i} className="inline-flex items-center gap-2.5 pl-3 pr-2 py-2 bg-bg border border-border text-[13px] text-[#C9C9D1] max-w-full">
                  <span className="font-mono text-[9.5px] text-accent">{String(i + 1).padStart(2, '0')}</span>
                  <span>{r}</span>
                  <button type="button" onClick={() => removeRequirement(i)} className="w-[22px] h-[22px] flex-none flex items-center justify-center border border-border font-mono text-[11px] text-textMuted">×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6.5">
            <label className="block font-mono text-[10.5px] tracking-[0.18em] uppercase text-textMuted mb-3">Event type</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => upd('type', t)}
                  className="flex flex-col items-start gap-2.5 py-3.5 px-3 bg-surface border text-left"
                  style={{ borderColor: form.type === t ? '#E91E8C' : '#2A2A33' }}
                >
                  <span className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: form.type === t ? '#E91E8C' : '#3A3A45' }}>
                    {form.type === t && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                  </span>
                  <span className="font-heading font-bold text-[13px] capitalize" style={{ color: form.type === t ? '#F4F4F5' : '#C9C9D1' }}>{t}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5.5 mt-6.5">
            <Field label="Location">
              <input type="text" value={form.location} onChange={(e) => upd('location', e.target.value)} placeholder="Building and room" className="w-full h-13 px-4 bg-surface border border-border text-text text-[15.5px]" style={{ height: 52 }} />
            </Field>
            <Field label="Date">
              <input type="date" value={form.date} onChange={(e) => upd('date', e.target.value)} className="w-full h-13 px-3.5 bg-surface border border-border text-text text-[15px]" style={{ height: 52, colorScheme: 'dark' }} />
            </Field>
            <Field label="Start time">
              <input type="time" value={form.time} onChange={(e) => upd('time', e.target.value)} className="w-full h-13 px-3.5 bg-surface border border-border text-text text-[15px]" style={{ height: 52, colorScheme: 'dark' }} />
            </Field>
          </div>

          <div className="mt-6.5 max-w-[340px]">
            <label className="block font-mono text-[10.5px] tracking-[0.18em] uppercase text-textMuted mb-2.5">Total slots</label>
            <div className="flex">
              <button type="button" onClick={() => upd('totalSlots', Math.max(1, Number(form.totalSlots) - 1))} className="w-13 h-13 flex-none bg-transparent border border-border border-r-0 font-mono text-base text-text" style={{ width: 52, height: 52 }}>−</button>
              <input type="number" value={form.totalSlots} onChange={(e) => upd('totalSlots', Math.max(1, parseInt(e.target.value || '1', 10)))} className="flex-1 min-w-0 h-13 px-4 bg-surface border border-border text-text font-heading font-bold text-lg text-center" style={{ height: 52 }} />
              <button type="button" onClick={() => upd('totalSlots', Math.min(500, Number(form.totalSlots) + 1))} className="w-13 h-13 flex-none bg-transparent border border-border border-l-0 font-mono text-base text-text" style={{ width: 52, height: 52 }}>+</button>
            </div>
            {isEditing && (
              <div className="mt-2.5 font-mono text-[10px] text-textMuted">{original?.filledSlots || 0} already registered — capacity can't drop below that.</div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-9 pt-6.5 border-t-2 border-borderMuted">
            <button type="button" onClick={handleSave} disabled={saving} className="h-14 flex items-center gap-3.5 px-5.5 bg-accent disabled:opacity-60 font-heading font-bold text-[15.5px] text-bg">
              <span>{saving ? 'Saving…' : isEditing ? 'Save changes' : 'Publish event'}</span><span className="text-lg">→</span>
            </button>
            <Link to="/my-events" className="ml-auto font-mono text-[10.5px] tracking-wider uppercase text-textMuted">Discard</Link>
          </div>
        </div>

        <aside className="px-8 md:px-16 lg:px-9 py-10">
          <div className="lg:sticky lg:top-6 flex flex-col gap-4">
            <div className="bg-surface border border-border p-5.5">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent mb-5">Category</div>
              {isEditing ? (
                <div>
                  <div className="flex items-center gap-3 pb-4.5 border-b border-borderMuted">
                    <span className="font-mono text-[11px] tracking-wider uppercase px-2.5 py-1.5 bg-accent text-bg">{original?.category}</span>
                    <span className="font-mono text-[9.5px] text-textMuted">Currently assigned</span>
                  </div>
                  <p className="mt-4.5 text-[13px] leading-relaxed text-[#C9C9D1]">
                    {descTouched
                      ? `You changed the description — the classifier will run again on save and may move this away from ${original?.category}.`
                      : 'Leaders never set this directly. It comes from the description, and re-runs whenever that changes.'}
                  </p>
                  {descTouched && (
                    <div className="flex items-center gap-2.5 mt-4 px-3.5 py-3 bg-bg border-l-2 border-accent">
                      <span className="font-mono text-[9.5px] text-textMuted">Rough local guess</span>
                      <span className="font-heading font-bold text-[13px]" style={{ color: '#FF5FB2' }}>{predicted}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 pb-4.5 border-b border-borderMuted">
                    <Aperture size={22} speed="4s" filled={false} />
                    <span className="font-heading font-bold text-sm text-textMuted">Assigned after you save</span>
                  </div>
                  <p className="mt-4.5 text-[13px] leading-relaxed text-[#C9C9D1]">
                    One of Academic, Social, Sports, Tech, Arts, Volunteering, or Other is chosen from your description — you never pick it.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-surface border border-border p-5.5">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent mb-4.5">Card preview</div>
              <div className="border border-borderMuted p-4 bg-bg">
                <div className="flex items-center justify-between gap-2.5 mb-3.5">
                  <span className="font-mono text-[9.5px] tracking-wider uppercase px-2 py-1 border border-border text-textMuted">{isEditing ? original?.category : 'Pending'}</span>
                  <span className="font-mono text-[9.5px] tracking-wider uppercase text-textMuted">{form.type}</span>
                </div>
                <div className="font-heading font-extrabold text-base leading-tight">{form.title || 'Untitled event'}</div>
                <div className="text-xs text-textMuted mt-2">{form.club || 'Your club'}</div>
                <div className="flex items-center gap-2.5 mt-3.5 pt-3 border-t border-borderMuted">
                  <svg viewBox="0 0 26 26" width="26" height="26" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="13" cy="13" r="11" fill="none" stroke="#26262E" strokeWidth="2" />
                  </svg>
                  <span className="font-heading font-bold text-[12.5px]">{form.totalSlots} spots</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block font-mono text-[10.5px] tracking-[0.18em] uppercase text-textMuted mb-2.5">{label}</label>
      {children}
    </div>
  );
}
