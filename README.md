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
- ✅ Install as a userscript **or** run directly from browser DevTools

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

#### Option A: Userscript (recommended for repeated use)
- Install [Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/), or [FireMonkey](https://addons.mozilla.org/firefox/addon/firemonkey/)
- Add the script directly from this repo:  
  `https://raw.githubusercontent.com/emptyArrayLLC/replyXer/main/replyXer.js`

#### Option B: Browser Console (no extensions needed – fastest for one-time use)
This method takes about 30 seconds once you have your data files.

1. **Log into X**  
   Open your browser and go to [https://x.com](https://x.com) (or twitter.com). Make sure you are **logged in** with the account you want to clean up.

2. **Open DevTools**  
   - **Windows / Linux**: Press `F12` or `Ctrl` + `Shift` + `I`  
   - **Mac**: Press `Cmd` + `Option` + `I`  
   - Or right-click anywhere on the page → **Inspect** → go to the **Console** tab.

3. **Clear the console** (recommended)  
   Click the **🗑️** (clear) button at the top-left of the console, or just type `clear()` and press Enter.

4. **Copy the full script**  
   Open this link in a **new tab**:  
   [https://raw.githubusercontent.com/emptyArrayLLC/replyXer/main/replyXer.js](https://raw.githubusercontent.com/emptyArrayLLC/replyXer/main/replyXer.js)  
   - Press `Ctrl` + `A` (Windows/Linux) or `Cmd` + `A` (Mac) to select everything.  
   - Press `Ctrl` + `C` / `Cmd` + `C` to copy the entire script.

5. **Paste and run**  
   Go back to the X tab where DevTools is open.  
   Paste the entire script into the console (right-click → Paste or `Ctrl` + `V` / `Cmd` + `V`).  
   Press **Enter**.  

   A light-blue control panel will appear at the top of the page.

### 3. Delete your content
- Click **Choose File** and select your data file (e.g. `tweets.js`)
- **For tweets.js only**: Check the new **"Replies only"** box if you want to delete just replies
- (Optional) Use the advanced options to skip already-deleted items or start from scratch
- Click **Delete** and wait — the script deletes ~5–10 items per second

## Mobile Support

### Android
1. Install Firefox + Tampermonkey
2. Add the userscript from the raw URL above
3. Open x.com in Firefox

### iOS
1. Install the **Userscripts** Safari extension
2. Add the script using the remote URL above
3. Visit x.com in Safari

## Advanced Options
- **Skip count** — resume a previous run
- **Slow mode** — delete without data export
- **Export bookmarks** — downloads all your bookmarks as JSON
- **Unfollow everyone** — removes all follows (may need multiple runs due to rate limits)

## Known Limitations
- Likes older than ~3,200 cannot be bulk-deleted (X limitation)
- Some hidden retweets from banned accounts may remain
- Very large archives (>15k tweets) may cause browser slowdowns — close the console after starting

## License
This project is a fork of [tweetXer](https://github.com/lucahammer/tweetXer) and is released under the same **GPL-3.0** license (see [LICENSE](LICENSE)).

## Credits
- Original **tweetXer** by [lucahammer](https://github.com/lucahammer/tweetXer)
- Reply-only mode & maintenance by [emptyArrayLLC](https://github.com/emptyArrayLLC)

---

Made with ❤️ for people who want to reclaim their digital footprint.  
Star the repo if it helped you! ⭐
