import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";
import { debounce } from "@ember/runloop";

export default apiInitializer("1.8", (api) => {
  const currentUser = api.getCurrentUser();

  if (!currentUser || !currentUser.admin) {
    return;
  }

  if (settings.no_review_queue_badges && !currentUser.moderator) {
    const wipeReviewable = () => {
      if (currentUser.reviewable_count > 0) {
        currentUser.set("reviewable_count", 0);
      }
    };
    currentUser.addObserver("reviewable_count", wipeReviewable);
    wipeReviewable();
  }

  const site = api.container.lookup("service:site");
  const appEvents = api.container.lookup("service:app-events");
  const types = site.notification_types;

  const notificationMapping = {
    no_new_features_notifications: types.new_features,
    no_invitee_accepted_notifications: types.invitee_accepted,
    no_membership_accepted_notifications: types.membership_request_accepted,
    no_granted_badge_notifications: types.granted_badge,
    no_upcoming_change_promoted_notifications: types.upcoming_change_automatically_promoted,
  };

  const validNoisyTypes = [];
  for (const [key, id] of Object.entries(notificationMapping)) {
    if (settings[key] && id !== undefined) validNoisyTypes.push(id);
  }

  if (validNoisyTypes.length === 0) return;

  let isCleaning = false;

  async function performBackgroundCleanup() {
    if (isCleaning) return;
    isCleaning = true;

    try {
      let foundNoisy = true;
      let loops = 0;

      while (foundNoisy && loops < 10) {
        loops++;
        
        const data = await ajax(`/notifications.json?_t=${Date.now()}`);
        
        const noisy = data.notifications.filter(
          (n) => !n.read && validNoisyTypes.includes(n.notification_type)
        );

        if (noisy.length === 0) {
          foundNoisy = false;
          break; 
        }

        for (const n of noisy) {
          await ajax(`/notifications/${n.id}`, { type: "PUT", data: { read: true } });
          await new Promise(r => setTimeout(r, 50)); // Avoid rate limits
        }
      }

      await new Promise(r => setTimeout(r, 600));

      currentUser.notifyPropertyChange("grouped_unread_notifications");
      appEvents.trigger("notifications:changed");

    } catch (e) {
    } finally {
      isCleaning = false;
    }
  }

  function scheduleCleanup() {
    if (currentUser.unread_notifications > 0) {
      debounce(null, performBackgroundCleanup, 500);
    }
  }

  scheduleCleanup();
  currentUser.addObserver("unread_notifications", scheduleCleanup);
});
