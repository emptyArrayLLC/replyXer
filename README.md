# replyXer

**Delete all your Tweets/Replies — and more — for free.**

A fork of **[lucahammer/tweetXer](https://github.com/lucahammer/tweetXer)** with one powerful addition: **Replies-only mode**.

> **replyXer** is a free, open-source JavaScript userscript that lets you permanently delete your entire posting history on X (formerly Twitter), including old or hidden tweets that don't appear on your profile.  
> It works by using your official X data export and now gives you the option to delete **only replies** while keeping your original tweets.

## ✨ New in replyXer
- **Replies-only mode** (for `tweets.js`): Check the box to delete *only* replies (posts that have an `in_reply_to_status_id`). Perfect for cleaning up conversations without losing your original content.
- Full original TweetXer functionality is preserved (tweets, likes, DMs, bookmarks, slow-delete, unfollow, etc.).

## Features
- ✅ Delete **all** your tweets (including old/hidden ones) using your data export
- ✅ **New**: Delete **only replies** from `tweets.js`
- ✅ Delete likes (unfavorite)
- ✅ Delete Direct Messages (one-by-one or by conversation)
- ✅ Export bookmarks (not included in X’s data export)
- ✅ Slow-delete mode (no data export needed — scrolls your profile)
- ✅ Unfollow everyone (handles rate limits)
- ✅ Resume interrupted deletions
- ✅ Works on desktop, Android, and iOS
- ✅ Install as a userscript (Tampermonkey / Violentmonkey / FireMonkey) or paste into console

## Installation & Usage

### 1. Get your X Data Export
1. Go to [X Settings → Your account → Download an archive of your data](https://x.com/settings/your_twitter_data)
2. Request the archive and wait for the email (can take up to 24 hours)
3. Unzip the downloaded file — you’ll need:
   - `tweets.js` (for tweets & replies)
   - `tweet-headers.js`
   - `like.js`
   - `direct_messages*.js` (for DMs)

### 2. Run replyXer

**Option A: Userscript (recommended)**
- Install [Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/), or [FireMonkey](https://addons.mozilla.org/firefox/addon/firemonkey/) 
- Add the script directly from this repo:
  ```js
  https://raw.githubusercontent.com/emptyArrayLLC/replyXer/main/replyXer.js
