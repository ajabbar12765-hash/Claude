// Schedules are local wall-clock times in an IANA zone, so 07:00 stays 07:00 across DST.
// schedule = { freq: 'once'|'hourly'|'daily'|'weekdays'|'weekly', time: 'HH:MM', days: [1..7] (Mon=1), at: ISO (once) }

export function validZone(tz) {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

function parts(date, tz) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' });
  const o = {};
  for (const p of f.formatToParts(date)) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, s: +o.second, wd: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(o.weekday) + 1 };
}
const offsetAt = (ms, tz) => { const p = parts(new Date(ms), tz); return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000; };

// Local wall time -> UTC instant. A time skipped by DST moves forward; a repeated one takes the first.
export function zonedToUtc(y, m, d, h, mi, tz) {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let t = guess - offsetAt(guess, tz);
  t = guess - offsetAt(t, tz);
  return new Date(t);
}

export function normalize(s = {}) {
  const freq = ['once', 'hourly', 'daily', 'weekdays', 'weekly'].includes(s.freq) ? s.freq : 'daily';
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time || '') ? s.time : '08:00';
  const days = [...new Set((Array.isArray(s.days) ? s.days : []).map(Number).filter((n) => n >= 1 && n <= 7))].sort();
  const out = { freq, time };
  if (freq === 'weekly') out.days = days.length ? days : [1];
  if (freq === 'once') out.at = s.at && !isNaN(new Date(s.at)) ? new Date(s.at).toISOString() : null;
  return out;
}

export function nextRun(schedule, tz, after = new Date()) {
  const s = normalize(schedule);
  const from = after.getTime();
  if (s.freq === 'once') return s.at && new Date(s.at).getTime() > from ? new Date(s.at) : null;
  const [hh, mm] = s.time.split(':').map(Number);
  if (s.freq === 'hourly') {
    const p = parts(after, tz);
    for (let k = 0; k < 26; k++) {
      const t = zonedToUtc(p.y, p.m, p.d, p.h + k, mm, tz);
      if (t.getTime() > from) return t;
    }
  }
  const p = parts(after, tz);
  for (let k = 0; k < 9; k++) {
    const day = new Date(Date.UTC(p.y, p.m - 1, p.d + k));
    const wd = ((day.getUTCDay() + 6) % 7) + 1;
    if (s.freq === 'weekdays' && wd > 5) continue;
    if (s.freq === 'weekly' && !s.days.includes(wd)) continue;
    const t = zonedToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), hh, mm, tz);
    if (t.getTime() > from) return t;
  }
  return null;
}

const DAY = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export function describe(schedule, tz) {
  const s = normalize(schedule);
  if (s.freq === 'once') return s.at ? `Once, ${new Date(s.at).toLocaleString('en-GB', { timeZone: tz, dateStyle: 'medium', timeStyle: 'short' })}` : 'Once';
  if (s.freq === 'hourly') return `Every hour at :${s.time.slice(3)}`;
  if (s.freq === 'daily') return `Every day at ${s.time}`;
  if (s.freq === 'weekdays') return `Weekdays at ${s.time}`;
  return `${s.days.map((d) => DAY[d]).join(', ')} at ${s.time}`;
}
