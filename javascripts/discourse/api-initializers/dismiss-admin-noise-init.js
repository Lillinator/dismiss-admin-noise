import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";
import { debounce } from "@ember/runloop";

export default apiInitializer("1.8", (api) => {
  const currentUser = api.getCurrentUser();

  if (!currentUser || !currentUser.admin) {
    return;
  }

  if (settings.no_review_queue_badges && !currentUser.moderator) {
    if (currentUser.reviewable_count > 0) {
      currentUser.set("reviewable_count", 0);
    }
    currentUser.addObserver("reviewable_count", () => {
      if (currentUser.reviewable_count > 0) {
        currentUser.set("reviewable_count", 0);
      }
    });
  }

  const site = api.container.lookup("service:site");
  const appEvents = api.container.lookup("service:app-events"); // <-- The Silver Bullet
  const types = site.notification_types;

  const notificationMapping = {
    no_new_features_notifications: types.new_features,
    no_invitee_accepted_notifications: types.invitee_accepted,
    no_membership_accepted_notifications: types.membership_request_accepted,
    no_granted_badge_notifications: types.granted_badge,
    no_upcoming_change_promoted_notifications: types.upcoming_change_automatically_promoted,
  };

  const validNoisyTypes = [];
  for (const [settingName, typeId] of Object.entries(notificationMapping)) {
    if (settings[settingName] && typeId !== undefined) {
      validNoisyTypes.push(typeId);
    }
  }

  async function checkAndDismissNoisyNotifications() {
    if (validNoisyTypes.length === 0 || currentUser.unread_notifications === 0) {
      return;
    }

    try {
      const data = await ajax("/notifications.json");
      const notificationsToDismiss = data.notifications.filter(
        (n) => !n.read && validNoisyTypes.includes(n.notification_type)
      );

      if (notificationsToDismiss.length > 0) {
        for (const n of notificationsToDismiss) {
          await ajax(`/notifications/${n.id}`, {
            type: "PUT",
            data: { read: true },
          });
        }

        const grouped = currentUser.grouped_unread_notifications || {};
        notificationsToDismiss.forEach((n) => {
          if (grouped[n.notification_type] && grouped[n.notification_type] > 0) {
            grouped[n.notification_type]--;
          }
        });

        currentUser.notifyPropertyChange("grouped_unread_notifications");
        currentUser.notifyPropertyChange("unread_notifications");

        appEvents.trigger("notifications:changed");
      }
    } catch (e) {
    }
  }

  function debouncedCheck() {
    debounce(null, checkAndDismissNoisyNotifications, 2000);
  }

  debouncedCheck();
  currentUser.addObserver("unread_notifications", debouncedCheck);
});
