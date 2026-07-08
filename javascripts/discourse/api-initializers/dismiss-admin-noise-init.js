import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";
import { debounce } from "@ember/runloop";

export default apiInitializer("1.8", (api) => {
  const currentUser = api.getCurrentUser();

  if (!currentUser || !currentUser.admin) {
    return;
  }

  if (settings.no_review_queue_badges) {
    const wipeReviewable = () => {
      if (currentUser.reviewable_count > 0) {
        currentUser.set("reviewable_count", 0);
      }
      
      if (currentUser.unread_high_priority_notifications > 0) {
        currentUser.set("unread_high_priority_notifications", 0);
      }
    };
    
    currentUser.addObserver("reviewable_count", wipeReviewable);
    currentUser.addObserver("unread_high_priority_notifications", wipeReviewable);
    
    wipeReviewable();
  }

  const site = api.container.lookup("service:site");
  const appEvents = api.container.lookup("service:app-events");

  const activeDismissTypes = [];
  if (settings.no_new_features_notifications) activeDismissTypes.push("new_features");
  if (settings.no_invitee_accepted_notifications) activeDismissTypes.push("invitee_accepted");
  if (settings.no_membership_accepted_notifications) activeDismissTypes.push("membership_request_accepted");
  if (settings.no_granted_badge_notifications) activeDismissTypes.push("granted_badge");
  if (settings.no_upcoming_change_promoted_notifications) activeDismissTypes.push("upcoming_change_automatically_promoted");

  if (activeDismissTypes.length === 0) return;

  let isCleaning = false;

  async function bulkDismissNoisyNotifications() {
    if (isCleaning || currentUser.unread_notifications === 0) return;
    isCleaning = true;

    try {
      await ajax("/notifications/mark-read", {
        type: "PUT",
        data: { dismiss_types: activeDismissTypes.join(",") },
      });

      const unreadHash = { ...currentUser.grouped_unread_notifications };
      let removedCount = 0;

      activeDismissTypes.forEach((type) => {
        const typeId = site.notification_types[type];
        if (typeId && unreadHash[typeId] > 0) {
          removedCount += unreadHash[typeId];
          delete unreadHash[typeId];
        }
      });

      currentUser.set("grouped_unread_notifications", unreadHash);
      currentUser.set(
        "unread_notifications", 
        Math.max(0, currentUser.unread_notifications - removedCount)
      );

      appEvents.trigger("notifications:changed");

    } catch (e) {
    } finally {
      isCleaning = false;
    }
  }

  function scheduleCleanup() {
    debounce(null, bulkDismissNoisyNotifications, 1000);
  }

  scheduleCleanup();
  currentUser.addObserver("unread_notifications", scheduleCleanup);
});
