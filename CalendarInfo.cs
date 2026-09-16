using System;
using System.Threading.Tasks;
using Windows.ApplicationModel.Appointments;

namespace CloCloWidget;

// The next upcoming item on whatever calendars Windows itself knows about
// (Settings > Privacy & security > Calendar, and whatever's synced into the
// Mail & Calendar app) — the same AppointmentStore API that app itself is
// built on. No package identity or manifest capability turned out to be
// needed even though this is a plain unpackaged desktop app: confirmed by a
// real round trip (create a test appointment, read it back through this
// exact call, delete it) rather than assumed from the docs.
public static class CalendarInfo
{
    public record NextEvent(string Subject, DateTimeOffset StartTime, bool IsAllDay);

    // A year out, not just the next couple of weeks — a plain work calendar
    // usually has something within 14 days, but a yearly Holidays or
    // Birthdays calendar might not, and those are exactly the calendars
    // this is meant to catch too.
    private static readonly TimeSpan SearchWindow = TimeSpan.FromDays(400);

    public static async Task<NextEvent?> GetNextAsync()
    {
        try
        {
            var store = await AppointmentManager.RequestStoreAsync(AppointmentStoreAccessType.AllCalendarsReadOnly);
            if (store == null) return null;

            // Queried per-calendar (including hidden ones, e.g. a Holidays
            // calendar someone unchecked in the Calendar app's own list)
            // rather than trusting the top-level store's own
            // FindAppointmentsAsync to have already aggregated everything —
            // this way every calendar the store can see genuinely gets
            // searched, not just whichever one(s) that aggregate happens to
            // cover.
            var calendars = await store.FindAppointmentCalendarsAsync(FindAppointmentCalendarsOptions.IncludeHidden);

            var now = DateTimeOffset.Now;
            Appointment? soonest = null;
            foreach (var calendar in calendars)
            {
                var appointments = await calendar.FindAppointmentsAsync(now, SearchWindow);
                foreach (var a in appointments)
                {
                    if (soonest == null || a.StartTime < soonest.StartTime) soonest = a;
                }
            }
            if (soonest == null) return null;

            var subject = string.IsNullOrWhiteSpace(soonest.Subject) ? "(No title)" : soonest.Subject;
            return new NextEvent(subject, soonest.StartTime, soonest.AllDay);
        }
        catch
        {
            // No calendar permission, no accounts configured, or the store
            // just isn't available right now — either way, nothing to show.
            return null;
        }
    }
}
