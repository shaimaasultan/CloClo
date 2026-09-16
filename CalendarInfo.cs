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

    public static async Task<NextEvent?> GetNextAsync()
    {
        try
        {
            var store = await AppointmentManager.RequestStoreAsync(AppointmentStoreAccessType.AllCalendarsReadOnly);
            if (store == null) return null;

            var appointments = await store.FindAppointmentsAsync(DateTimeOffset.Now, TimeSpan.FromDays(14));
            Appointment? soonest = null;
            foreach (var a in appointments)
            {
                if (soonest == null || a.StartTime < soonest.StartTime) soonest = a;
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
