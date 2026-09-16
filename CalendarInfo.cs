using System;
using System.Threading.Tasks;
using Windows.ApplicationModel.Appointments;
using Windows.ApplicationModel.Contacts;

namespace CloCloWidget;

// The next upcoming thing Windows itself knows about — real calendar
// appointments (Settings > Privacy & security > Calendar, and whatever's
// synced into Mail & Calendar) plus contacts' birthdays (Settings >
// Privacy & security > Contacts, and whatever's synced into the People
// app) — via the same AppointmentStore/ContactStore WinRT APIs those apps
// are built on. Neither needed a package identity or manifest capability
// even though this is a plain unpackaged desktop app: confirmed by real
// round trips (create a test appointment/contact, read it back through
// these exact calls, delete it) rather than assumed from the docs.
public static class CalendarInfo
{
    public record NextEvent(string Subject, DateTimeOffset StartTime, bool IsAllDay);

    // A year out, not just the next couple of weeks — a plain work calendar
    // usually has something within 14 days, but a yearly Holidays calendar
    // (or a birthday) might not, and those are exactly what this is meant
    // to catch too.
    private static readonly TimeSpan SearchWindow = TimeSpan.FromDays(400);

    public static async Task<NextEvent?> GetNextAsync()
    {
        // Tried separately, not inside one shared try — calendar access
        // being denied (or contacts being denied) shouldn't silently hide
        // the other source's results too.
        NextEvent? fromCalendars = null;
        try { fromCalendars = await GetNextFromCalendarsAsync(); } catch { }

        NextEvent? fromBirthdays = null;
        try { fromBirthdays = await GetNextBirthdayAsync(); } catch { }

        if (fromCalendars == null) return fromBirthdays;
        if (fromBirthdays == null) return fromCalendars;
        return fromCalendars.StartTime <= fromBirthdays.StartTime ? fromCalendars : fromBirthdays;
    }

    private static async Task<NextEvent?> GetNextFromCalendarsAsync()
    {
        var store = await AppointmentManager.RequestStoreAsync(AppointmentStoreAccessType.AllCalendarsReadOnly);
        if (store == null) return null;

        // Queried per-calendar (including hidden ones, e.g. a Holidays
        // calendar someone unchecked in the Calendar app's own list) rather
        // than trusting the top-level store's own FindAppointmentsAsync to
        // have already aggregated everything.
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

    private static async Task<NextEvent?> GetNextBirthdayAsync()
    {
        var store = await ContactManager.RequestStoreAsync(ContactStoreAccessType.AllContactsReadOnly);
        if (store == null) return null;

        var contacts = await store.FindContactsAsync();
        var today = DateTimeOffset.Now.Date;

        NextEvent? soonest = null;
        foreach (var contact in contacts)
        {
            foreach (var date in contact.ImportantDates)
            {
                if (date.Kind != ContactDateKind.Birthday || date.Month == null || date.Day == null) continue;

                DateTimeOffset next;
                try
                {
                    // Only month/day matter for "next occurrence" — the
                    // stored Year is the birth year, not relevant here. If
                    // it's already passed this year, it's next year instead.
                    next = new DateTimeOffset(new DateTime(today.Year, (int)date.Month, (int)date.Day));
                    if (next.Date < today) next = new DateTimeOffset(new DateTime(today.Year + 1, (int)date.Month, (int)date.Day));
                }
                catch (ArgumentOutOfRangeException)
                {
                    continue; // e.g. Feb 29 stored with no Feb 29 this year or next
                }

                if (soonest != null && next >= soonest.StartTime) continue;
                var name = string.IsNullOrWhiteSpace(contact.DisplayName) ? "Someone" : contact.DisplayName;
                soonest = new NextEvent($"{name}'s Birthday", next, true);
            }
        }
        return soonest;
    }
}
