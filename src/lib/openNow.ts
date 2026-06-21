const PP_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseEntry(entry: string, dayName: string): { openRaw: string; closeRaw: string } | null {
  const hoursStr = entry.slice(dayName.length + 1).trim();
  if (hoursStr.toLowerCase() === "closed") return null;
  const parts = hoursStr.split("–");
  if (parts.length !== 2) return null;
  return { openRaw: parts[0].trim(), closeRaw: parts[1].trim() };
}

function withPeriod(timeRaw: string, closeRaw: string): string {
  if (/[AP]M/i.test(timeRaw)) return timeRaw;
  const period = /PM/i.test(closeRaw) ? " PM" : /AM/i.test(closeRaw) ? " AM" : "";
  return timeRaw + period;
}

export function getHoursStatus(
  opening_hours: { weekday_text: string[] } | null,
  nowUtc: Date = new Date(),
): { open: boolean; timeLabel: string } | null {
  if (!opening_hours?.weekday_text?.length) return null;

  const ppMs = nowUtc.getTime() + PP_OFFSET_MS;
  const ppDate = new Date(ppMs);
  const todayIdx = ppDate.getUTCDay();
  const nowMinutes = ppDate.getUTCHours() * 60 + ppDate.getUTCMinutes();
  const open = isOpenNow(opening_hours, nowUtc);

  if (open) {
    const todayName = DAYS[todayIdx];
    const entry = opening_hours.weekday_text.find((s) => s.startsWith(todayName + ":"));
    if (!entry) return { open: true, timeLabel: "" };
    const parsed = parseEntry(entry, todayName);
    if (!parsed) return { open: true, timeLabel: "" };
    return { open: true, timeLabel: `Closes ${parsed.closeRaw}` };
  }

  // Find next opening time (check today first in case we're before opening, then future days).
  for (let offset = 0; offset <= 7; offset++) {
    const idx = (todayIdx + offset) % 7;
    const dayName = DAYS[idx];
    const entry = opening_hours.weekday_text.find((s) => s.startsWith(dayName + ":"));
    if (!entry) continue;
    const parsed = parseEntry(entry, dayName);
    if (!parsed) continue;

    if (offset === 0) {
      // Only use today's entry if we're before the opening time.
      const openIsPM = /PM/i.test(parsed.openRaw);
      const openIsAM = /AM/i.test(parsed.openRaw);
      const closeIsPM = /PM/i.test(parsed.closeRaw);
      const closeIsAM = /AM/i.test(parsed.closeRaw);
      const cleanOpen = parsed.openRaw.replace(/[APM]+$/i, "").trim();
      const resolvedPM = openIsPM || (!openIsAM && closeIsPM);
      const resolvedAM = openIsAM || (!openIsPM && closeIsAM);
      const openMin = toMinutes(cleanOpen, resolvedPM, resolvedAM);
      if (nowMinutes >= openMin) continue; // past today's open — already closed for the day
    }

    const displayTime = withPeriod(parsed.openRaw.replace(/[APM]+$/i, "").trim(), parsed.closeRaw) ;
    const suffix = offset === 0 ? "" : offset === 1 ? " tomorrow" : ` ${dayName}`;
    return { open: false, timeLabel: `Opens ${displayTime}${suffix}` };
  }

  return { open: false, timeLabel: "" };
}

function toMinutes(time: string, isPM: boolean, isAM: boolean): number {
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isPM && h !== 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
}

export function isOpenNow(
  opening_hours: { weekday_text: string[] } | null,
  nowUtc: Date = new Date(),
): boolean {
  if (!opening_hours?.weekday_text?.length) return false;

  const ppMs = nowUtc.getTime() + PP_OFFSET_MS;
  const ppDate = new Date(ppMs);
  const todayName = DAYS[ppDate.getUTCDay()];
  const nowMinutes = ppDate.getUTCHours() * 60 + ppDate.getUTCMinutes();

  const entry = opening_hours.weekday_text.find((s) =>
    s.startsWith(todayName + ":"),
  );
  if (!entry) return false;

  const hoursStr = entry.slice(todayName.length + 1).trim();
  if (hoursStr.toLowerCase() === "closed") return false;

  // Format: "2:00 – 10:30 PM" or "6:30 AM – 8:00 PM"
  const parts = hoursStr.split("–").map((s) => s.trim());
  if (parts.length !== 2) return false;

  const [openRaw, closeRaw] = parts;

  // Determine AM/PM — the period token may be on either side.
  const closeIsPM = closeRaw.toUpperCase().includes("PM");
  const closeIsAM = closeRaw.toUpperCase().includes("AM");
  const openIsPM = openRaw.toUpperCase().includes("PM");
  const openIsAM = openRaw.toUpperCase().includes("AM");

  const cleanOpen = openRaw.replace(/[APM]+$/i, "").trim();
  const cleanClose = closeRaw.replace(/[APM]+$/i, "").trim();

  // If open side has no explicit period, inherit from close side.
  const resolvedOpenPM = openIsPM || (!openIsAM && closeIsPM);
  const resolvedOpenAM = openIsAM || (!openIsPM && closeIsAM);

  const openMin = toMinutes(cleanOpen, resolvedOpenPM, resolvedOpenAM);
  const closeMin = toMinutes(cleanClose, closeIsPM, closeIsAM);

  if (openMin <= closeMin) {
    return nowMinutes >= openMin && nowMinutes < closeMin;
  }
  // Overnight (e.g. 10 PM – 2 AM)
  return nowMinutes >= openMin || nowMinutes < closeMin;
}
