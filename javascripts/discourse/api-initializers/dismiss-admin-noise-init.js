import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";

export default apiInitializer("1.8", (api) => {
  const currentUser = api.getCurrentUser();

  // 1. Core validations (do NOT check unread count here)
  if (!currentUser || !currentUser.admin) {
    return;
  }

  const site = api.container.lookup("service:site");
  const types = site.notification_types;

  // 2. Map theme settings directly to Discourse notification types
  const notificationMapping = {
    no_new_features_notifications: types.new_features,
    no_invitee_accepted_notifications: types.invitee_accepted,
    no_membership_accepted_notifications: types.membership_request_accepted,
    no_granted_badge_notifications: types.granted_badge,
    no_upcoming_change_promoted_notifications: types.upcoming_change_automatically_promoted,
  };

  const validNoisyTypes = [];

  // Loop through the mapping and collect enabled types
  for (const [settingName, typeId] of Object.entries(notificationMapping)) {
    if (settings[settingName] && typeId !== undefined) {
      validNoisyTypes.push(typeId);
    }
  }

  // Short-circuit if no settings are enabled
  if (validNoisyTypes.length === 0) {
    return;
  }

  // 3. Define the dismissal logic
  function checkAndDismissNoisyNotifications() {
    // Only exit the function if there's nothing unread
    if (currentUser.unread_notifications === 0) {
      return;
    }

    ajax("/notifications.json").then((data) => {
      const notificationsToDismiss = data.notifications.filter(
        (n) => !n.read && validNoisyTypes.includes(n.notification_type)
      );

      if (notificationsToDismiss.length > 0) {
        notificationsToDismiss.forEach((n) => {
          ajax(`/notifications/${n.id}`, {
            type: "PUT",
            data: { read: true },
          }).then(() => {
            // Update the UI badge
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
  }

  // 4. Run once on boot
  checkAndDismissNoisyNotifications();

  // 5. Attach observer for real-time background updates
  currentUser.addObserver(
    "unread_notifications",
    checkAndDismissNoisyNotifications
  );
});
