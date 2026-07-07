import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";

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

  let isEnforcing = false;

  function enforceCleanUI() {
    if (isEnforcing || !currentUser.grouped_unread_notifications) return;

    let dirty = false;
    let subtractAmount = 0;
    
    const cleanGrouped = { ...currentUser.grouped_unread_notifications };

    for (const type of validNoisyTypes) {
      if (cleanGrouped[type] > 0) {
        subtractAmount += cleanGrouped[type];
        cleanGrouped[type] = 0; 
        dirty = true;
      }
    }

    if (dirty) {
      isEnforcing = true;
      
      currentUser.set("grouped_unread_notifications", cleanGrouped);
      
      currentUser.set(
        "unread_notifications",
        Math.max(0, currentUser.unread_notifications - subtractAmount)
      );
      
      isEnforcing = false;

      triggerBackgroundCleanup();
    }
  }

  let isCleaning = false;
  let needsAnotherPass = false;

  async function triggerBackgroundCleanup() {
    if (isCleaning) {
      needsAnotherPass = true;
      return;
    }
    
    isCleaning = true;

    try {
      do {
        needsAnotherPass = false;
        
        const data = await ajax(`/notifications.json`);
        const noisy = data.notifications.filter(
          (n) => !n.read && validNoisyTypes.includes(n.notification_type)
        );

        for (const n of noisy) {
          await ajax(`/notifications/${n.id}`, { type: "PUT", data: { read: true } });
          await new Promise((r) => setTimeout(r, 100)); // Be gentle to the server
        }
      } while (needsAnotherPass); 
    } catch (e) {
    } finally {
      isCleaning = false;
    }
  }

  currentUser.addObserver("grouped_unread_notifications", enforceCleanUI);
  currentUser.addObserver("unread_notifications", enforceCleanUI);
  
  enforceCleanUI();
});
