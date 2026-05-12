import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";

export default apiInitializer("1.8", (api) => {
  // PERFORMANCE: Short-circuit if both settings are disabled
  if (
    !settings.no_new_features_notifications &&
    !settings.no_upcoming_changes_notifications
  ) {
    return;
  }

  const currentUser = api.getCurrentUser();

  if (!currentUser || currentUser.unread_notifications === 0) {
    return;
  }

  ajax("/notifications.json").then((data) => {
    const site = api.container.lookup("service:site");
    const types = site.notification_types;

    // Conditionally build the array based on theme settings
    const noisyTypes = [];

    if (settings.no_new_features_notifications) {
      noisyTypes.push(types.new_features);
    }

    if (settings.no_upcoming_changes_notifications) {
      noisyTypes.push(types.upcoming_change_available);
    }

    const validNoisyTypes = noisyTypes.filter(Boolean);

    // Bail if types aren't found in this Discourse version
    if (validNoisyTypes.length === 0) {
      return; 
    }

    const notificationsToDismiss = data.notifications.filter(
      (n) => !n.read && validNoisyTypes.includes(n.notification_type)
    );

    if (notificationsToDismiss.length > 0) {
      notificationsToDismiss.forEach((n) => {
        ajax(`/notifications/${n.id}`, {
          type: "PUT",
          data: { read: true },
        }).then(() => {
          if (currentUser.unread_notifications > 0) {
            currentUser.set(
              "unread_notifications",
              currentUser.unread_notifications - 1
            );
          }
        });
      });
    }
  });
});
