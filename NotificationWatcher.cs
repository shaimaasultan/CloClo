using System;
using System.Linq;
using System.Threading.Tasks;
using Windows.UI.Notifications;
using Windows.UI.Notifications.Management;

namespace CloCloWidget;

public readonly record struct LatestNotification(string AppName, string Title, string Body);

// The most recent toast notification, via UserNotificationListener — the
// same store Windows' own Action Center reads from. This API has
// historically required a package identity, which an unpackaged Win32 exe
// like this one doesn't have — but RequestAccessAsync() returned Allowed
// without incident when tested on this machine, so it's evidently not a
// hard requirement on this Windows version.
public static class NotificationWatcher
{
    public static async Task<LatestNotification?> GetLatestAsync()
    {
        try
        {
            var listener = UserNotificationListener.Current;
            var status = await listener.RequestAccessAsync();
            if (status != UserNotificationListenerAccessStatus.Allowed) return null;

            var notifications = await listener.GetNotificationsAsync(NotificationKinds.Toast);
            var latest = notifications.OrderByDescending(n => n.CreationTime).FirstOrDefault();
            if (latest == null) return null;

            var appName = latest.AppInfo?.DisplayInfo?.DisplayName ?? "Notification";
            var lines = latest.Notification.Visual
                .GetBinding(KnownNotificationBindings.ToastGeneric)
                ?.GetTextElements()
                .Select(t => t.Text)
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .ToArray() ?? Array.Empty<string>();

            var title = lines.Length > 0 ? lines[0] : appName;
            var body = lines.Length > 1 ? string.Join(" ", lines.Skip(1)) : "";
            return new LatestNotification(appName, title, body);
        }
        catch
        {
            return null;
        }
    }
}
