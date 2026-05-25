# Dismiss Admin Noise!

### :woman_technologist: Overview
A lightweight Discourse theme component that automatically dismisses (hides) specific system notifications for admins.

This component is designed to reduce UI noise and cognitive load—especially helpful for neurodivergent admins (like me), or those who update their instances frequently and track changes via Discourse Meta (like me), or just YOLO admins who live on the edge in their development forums! (also like me) :grin:

### :gear: Settings
The following notification can be automatically dismissed in the component admin settings:


|Setting | Description|
|--- | ---|
| `No new features notifications` | Hide notifications for new features |
| `No invitee accepted notifications` | Hide notifications for invitees accepted |
| `No membership accepted notifications` | Hide notifications for group membership accepted (note: does not affect consolidation of membership notifications) |
| `No granted badge notifications`  | Hide notifications for granted badges |
| `No upcoming change promoted notifications` | Hide notifications for upcoming changes automatically promoted |


### :bulb: Notes

* Only admin users are affected; for example non-admins will still get notified of their granted badges or accepted invites regardless of the settings enabled in this component.

* If all of the component's setting are enabled, one can end up with an empty `other notifications tab` or `all notifications tab` depending on how busy their forum notifications are. 

* I am not responsible if this component somehow makes you miss an important notification! 


### 🔧 Installation

1. To install, see [installing a theme component](https://meta.discourse.org/t/how-do-i-install-a-theme-or-theme-component/63682).
2. Add the component to your active theme(s)


