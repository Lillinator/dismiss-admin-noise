# Discourse Dismiss Admin Noise

## 👩‍💻 Overview

A lightweight Discourse theme component that automatically dismisses system notifications for "New Features" and "Upcoming Changes."

Because these updates are already indicated with a badge in the admin dashboard sidebar, the user menu notifications are often redundant. This component is designed to reduce UI noise and cognitive load—especially helpful for neurodivergent admins, or those who update their instances frequently and track changes via Meta.

## 💡 Features

- Hides from Dropdown: Uses CSS to completely remove these specific notification rows from the user menu history.
- Clears Avatar Badges: Uses a lightweight boot initializer to silently mark these notifications as read via the Discourse API, ensuring your unread avatar badge isn't triggered by them.
- Targeted: Leaves all other important notifications (PMs, mentions, replies) completely untouched.

## ⚙️ Configuration

You can toggle exactly which notifications you want to dismiss in the Theme Settings:

* `no_new_features_notifications`: Dismisses "New Features" notifications. (Default: `true`)
* `no_upcoming_changes_notifications`: Dismisses "Upcoming Changes" notifications. (Default: `true`)

## 🔧 Installation

1. To install, see [installing a theme component](https://meta.discourse.org/t/how-do-i-install-a-theme-or-theme-component/63682).
2. Add the component to your active theme(s)


🎵 ## Note
More info here: https://meta.discourse.org/t/-/392894/23
