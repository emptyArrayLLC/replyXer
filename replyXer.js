// ==UserScript==
// @name ReplyXer + TweetXer
// @namespace https://github.com/lucahammer/tweetXer/
// @version 2.0.0
// @description Full TweetXer (tweets, likes, DMs, bookmarks, slow delete, unfollow) plus optional replies-only mode for tweets.js.
// @license MIT
// @match https://x.com/*
// @match https://mobile.x.com/*
// @match https://twitter.com/*
// @match https://mobile.twitter.com/*
// @icon https://www.google.com/s2/favicons?domain=twitter.com
// @grant none
// @run-at document-idle
// ==/UserScript==

(function () {
  const TweetsXer = {
    version: '2.0.0',
    TweetCount: 0,
    dId: 'replyXerUpload',
    tIds: [],
    tId: '',
    ratelimitreset: 0,
    more: '[data-testid="tweet"] [data-testid="caret"]',
    skip: 0,
    total: 0,
    dCount: 0,
    deleteURL: '/i/api/graphql/VaenaVgh5q5ih7kvyVjgtg/DeleteTweet',
    unfavURL: '/i/api/graphql/ZYKSe-w7KEslx3JhSIk5LA/UnfavoriteTweet',
    deleteMessageURL: '/i/api/graphql/BJ6DtxA2llfjnRoRjaiIiw/DMMessageDeleteMutation',
    deleteConvoURL: '/i/api/1.1/dm/conversation/USER_ID-CONVERSATION_ID/delete.json',
    deleteDMsOneByOne: false,
    username: '',
    action: '',
    bookmarksURL: '/i/api/graphql/L7vvM2UluPgWOW4GDvWyvw/Bookmarks?',
    bookmarks: [],
    bookmarksNext: '',
    baseUrl: 'https://x.com',
    authorization:
      'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
    ct0: false,
    transaction_id: '',

    async init() {
      this.baseUrl = `https://${window.location.hostname}`
      this.updateTransactionId()
      this.createUploadForm()
      await this.getTweetCount()
      this.ct0 = this.getCookie('ct0')
      this.username = document.location.href.split('/')[3].replace('#', '')
    },

    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    },

    getCookie(name) {
      const match = `; ${document.cookie}`.match(`;\\s*${name}=([^;]+)`)
      return match ? match[1] : null
    },

    updateTransactionId() {
      this.transaction_id = [...crypto.getRandomValues(new Uint8Array(95))]
        .map((x, i) => ((i = (x / 255) * 61) | 0, String.fromCharCode(i + (i > 9 ? (i > 35 ? 61 : 55) : 48))))
        .join``
    },

    updateTitle(text) {
      const el = document.getElementById('tweetXer_title')
      if (el) el.textContent = text
    },

    updateInfo(text) {
      const el = document.getElementById('tweetXer_info')
      if (el) el.textContent = text
    },

    createProgressBar() {
      const progressbar = document.createElement('progress')
      progressbar.id = 'tweetXer_progressbar'
      progressbar.value = this.dCount
      progressbar.max = this.total
      progressbar.style.width = '100%'
      const host =
        document.querySelector(`#${this.dId} .tweetXer-card`) || document.getElementById(this.dId)
      host.appendChild(progressbar)
    },

    updateProgressBar() {
      const bar = document.getElementById('tweetXer_progressbar')
      if (bar) bar.value = this.dCount
      this.updateInfo(`${this.dCount} deleted. ${this.tId}`)
    },

    isReply(tweet) {
      if (!tweet || typeof tweet !== 'object') return false
      const id = tweet.in_reply_to_status_id_str ?? tweet.in_reply_to_status_id
      return id != null && id !== '' && String(id) !== '0'
    },

    tweetIdStr(tweet) {
      return tweet.id_str != null ? String(tweet.id_str) : tweet.id != null ? String(tweet.id) : ''
    },

    processFile() {
      const tn = document.getElementById(`${TweetsXer.dId}_file`)
      if (!tn.files || !tn.files[0]) return

      const repliesOnlyEl = document.getElementById('repliesOnly')
      const repliesOnly = repliesOnlyEl && repliesOnlyEl.checked

      const fr = new FileReader()
      fr.onloadend = function (evt) {
        let cutpoint
        let filestart
        let json
        try {
          cutpoint = evt.target.result.indexOf('= ')
          if (cutpoint < 0) throw new Error('bad file')
          filestart = evt.target.result.slice(0, cutpoint)
          json = JSON.parse(evt.target.result.slice(cutpoint + 1))
        } catch (e) {
          TweetsXer.updateInfo('Could not parse file. Use a .js file from your X data export.')
          console.error(e)
          return
        }

        TweetsXer.action = ''

        if (filestart.includes('.tweet_headers.')) {
          console.log('File contains Tweets (headers).')
          TweetsXer.action = 'untweet'
          TweetsXer.tIds = json.map((x) => x.tweet.tweet_id)
        } else if (filestart.includes('.tweets.') || filestart.includes('.tweet.')) {
          console.log('File contains Tweets.')
          TweetsXer.action = 'untweet'
          if (repliesOnly) {
            TweetsXer.tIds = []
            const rows = Array.isArray(json) ? json : []
            for (const row of rows) {
              const tw = row.tweet
              if (!TweetsXer.isReply(tw)) continue
              const id = TweetsXer.tweetIdStr(tw)
              if (id) TweetsXer.tIds.push(id)
            }
            if (TweetsXer.tIds.length === 0) {
              TweetsXer.updateInfo('No replies found (nothing with in_reply_to). Uncheck “Replies only” to delete all from tweets.js.')
              return
            }
          } else {
            TweetsXer.tIds = json.map((x) => x.tweet.id_str)
          }
        } else if (filestart.includes('.like.')) {
          console.log('File contains Favs.')
          TweetsXer.action = 'unfav'
          TweetsXer.tIds = json.map((x) => x.like.tweetId)
        } else if (
          filestart.includes('.direct_message_headers.') ||
          filestart.includes('.direct_message_group_headers.') ||
          filestart.includes('.direct_messages.') ||
          filestart.includes('.direct_message_groups.')
        ) {
          console.log('File contains Direct Messages.')
          TweetsXer.action = 'undm'
          if (TweetsXer.deleteDMsOneByOne) {
            TweetsXer.tIds = json.map((c) =>
              c.dmConversation.messages.map((m) => (m.messageCreate ? m.messageCreate.id : 0))
            )
            TweetsXer.tIds = TweetsXer.tIds.flat().filter((i) => i != 0)
          } else {
            TweetsXer.tIds = json.map((c) => c.dmConversation.conversationId)
          }
        } else {
          TweetsXer.updateInfo('File not recognized. Use a file from your X data export.')
          console.log('Unrecognized export file.')
          return
        }

        if (TweetsXer.action.length > 0) {
          TweetsXer.total = TweetsXer.tIds.length
          document.getElementById(`${TweetsXer.dId}_file`).remove()
          TweetsXer.createProgressBar()
        }

        const skipEl = document.getElementById('skipCount')
        const skipVal = skipEl && skipEl.value.length > 0 ? skipEl.value : ''

        if (TweetsXer.action === 'untweet') {
          if (repliesOnly) {
            TweetsXer.skip = skipVal.length > 0 ? Math.max(0, parseInt(skipVal, 10) || 0) : 0
            console.log(`Reply-only mode: skipping oldest ${TweetsXer.skip} replies (set skip in Advanced to resume).`)
          } else if (skipVal.length < 1) {
            TweetsXer.skip = TweetsXer.total - TweetsXer.TweetCount - parseInt(TweetsXer.total / 20, 10)
            TweetsXer.skip = Math.max(0, TweetsXer.skip)
          } else {
            TweetsXer.skip = parseInt(skipVal, 10) || 0
          }
          console.log(
            `Skipping oldest ${TweetsXer.skip}. For auto-skip off (TweetXer), enter 0 in skip field before file.`
          )
          TweetsXer.tIds.reverse()
          TweetsXer.tIds = TweetsXer.tIds.slice(TweetsXer.skip)
          TweetsXer.dCount = TweetsXer.skip
          TweetsXer.tIds.reverse()
          const label = repliesOnly ? 'replies' : 'Tweets'
          TweetsXer.updateTitle(`TweetXer: Deleting ${TweetsXer.total} ${label}`)
          TweetsXer.deleteTweets()
        } else if (TweetsXer.action === 'unfav') {
          TweetsXer.skip = skipVal.length > 0 ? parseInt(skipVal, 10) || 0 : 0
          TweetsXer.tIds = TweetsXer.tIds.slice(TweetsXer.skip)
          TweetsXer.dCount = TweetsXer.skip
          TweetsXer.tIds.reverse()
          TweetsXer.updateTitle(`TweetXer: Deleting ${TweetsXer.total} Favs`)
          TweetsXer.deleteFavs()
        } else if (TweetsXer.action === 'undm') {
          TweetsXer.skip = skipVal.length > 0 ? parseInt(skipVal, 10) || 0 : 0
          TweetsXer.tIds = TweetsXer.tIds.slice(TweetsXer.skip)
          TweetsXer.dCount = TweetsXer.skip
          TweetsXer.tIds.reverse()
          if (TweetsXer.deleteDMsOneByOne) {
            TweetsXer.updateTitle(`TweetXer: Deleting ${TweetsXer.total} DMs`)
            TweetsXer.deleteDMs()
          } else {
            TweetsXer.updateTitle(`TweetXer: Deleting ${TweetsXer.total} DM Conversations`)
            TweetsXer.deleteConvos()
          }
        } else {
          TweetsXer.updateTitle('TweetXer: Try a different file')
        }
      }
      fr.readAsText(tn.files[0])
    },

    createUploadForm() {
      const id = this.dId
      const div = document.createElement('div')
      div.id = id
      if (document.getElementById(id)) document.getElementById(id).remove()

      const style = document.createElement('style')
      style.textContent = `
#${id} {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 99999;
  display: block;
  box-sizing: border-box;
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", sans-serif;
  font-size: 15px;
  line-height: 1.5;
  color: #0f1419;
  background: linear-gradient(180deg, #e8f4fc 0%, #d4e9f7 100%);
  border-bottom: 1px solid rgba(15, 20, 25, 0.12);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: 16px 20px;
}
#${id} *, #${id} *::before, #${id} *::after { box-sizing: border-box; }
#${id} .tweetXer-card {
  max-width: 720px;
  margin: 0 auto;
  background: #fff;
  border: 1px solid rgba(15, 20, 25, 0.12);
  border-radius: 12px;
  padding: 20px 22px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
#${id} .tweetXer-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eff3f4;
}
#${id} h2 {
  margin: 0;
  padding: 0;
  border: none;
  display: block;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #0f1419;
  font-family: inherit;
}
#${id} .tweetXer-ver {
  font-size: 0.8rem;
  color: #536471;
  white-space: nowrap;
}
#${id} .tweetXer-info {
  margin: 0 0 16px;
  font-size: 0.95rem;
  line-height: 1.55;
  color: #0f1419;
}
#${id} .tweetXer-info code {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.88em;
  background: #f7f9f9;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #eff3f4;
}
#${id} .tweetXer-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  margin-bottom: 14px;
}
#${id} .tweetXer-row label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #0f1419;
}
#${id} .tweetXer-check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
  font-size: 0.9rem;
  color: #0f1419;
}
#${id} .tweetXer-check input { margin-top: 3px; flex-shrink: 0; }
#${id} input[type="number"] {
  width: 5.5rem;
  padding: 8px 10px;
  font: inherit;
  border: 1px solid #cfd9de;
  border-radius: 8px;
  background: #fff;
  color: #0f1419;
}
#${id} input[type="file"] {
  font: inherit;
  font-size: 0.9rem;
  max-width: 100%;
  color: #0f1419;
}
#${id} #advanced {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eff3f4;
  font-size: 0.88rem;
  color: #536471;
}
#${id} #advanced summary {
  cursor: pointer;
  font-weight: 600;
  color: #1d9bf0;
  padding: 4px 0;
  list-style-position: outside;
}
#${id} #advanced summary:hover { text-decoration: underline; }
#${id} #advanced p, #${id} #advanced .adv-block { margin: 10px 0 0; line-height: 1.5; }
#${id} a {
  color: #1d9bf0;
  text-decoration: none;
}
#${id} a:hover { text-decoration: underline; }
#${id} button.tx-btn {
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 9999px;
  border: 1px solid #cfd9de;
  background: #fff;
  color: #0f1419;
  margin: 4px 8px 4px 0;
}
#${id} button.tx-btn:hover { background: #f7f9f9; }
#${id} progress {
  width: 100%;
  height: 10px;
  margin-top: 12px;
  border-radius: 6px;
  overflow: hidden;
  border: none;
}
#${id} progress::-webkit-progress-bar { background: #eff3f4; border-radius: 6px; }
#${id} progress::-webkit-progress-value { background: #1d9bf0; border-radius: 6px; }
#${id} progress::-moz-progress-bar { background: #1d9bf0; border-radius: 6px; }
`
      div.appendChild(style)

      const card = document.createElement('div')
      card.className = 'tweetXer-card'
      card.innerHTML = `
<div id="start">
<div class="tweetXer-head">
  <h2 id="tweetXer_title">TweetXer + ReplyXer</h2>
  <span class="tweetXer-ver">v${this.version}</span>
</div>
<p class="tweetXer-info" id="tweetXer_info">Loading profile…</p>
<div class="tweetXer-row">
  <label>Skip first N items <span style="color:#536471;font-weight:400">(resume; for tweets, leave empty for auto)</span>
    <input type="number" id="skipCount" min="0" value="" placeholder="auto" />
  </label>
</div>
<div class="tweetXer-check">
  <input type="checkbox" id="repliesOnly" />
  <label for="repliesOnly"><strong>Replies only</strong> — for <code>tweets.js</code> only: delete only posts that are replies (<code>in_reply_to_status_id</code>). Ignored for <code>tweet-headers.js</code>.</label>
</div>
<div class="tweetXer-row">
  <input type="file" id="${id}_file" accept=".js,.json,text/javascript" />
</div>
</div>
<details id="advanced">
  <summary>Advanced: bookmarks, slow delete, unfollow</summary>
  <p>Based on <a href="https://github.com/lucahammer/tweetXer" target="_blank" rel="noopener noreferrer">TweetXer</a>. Automation may trigger limits or account actions.</p>
  <p class="adv-block"><strong>Export files:</strong> <code>tweet-headers.js</code> / <code>tweets.js</code> (delete tweets), <code>like.js</code> (unlike), DM header / group files (delete DMs). With <code>tweets.js</code>, use “Replies only” to skip standalone tweets.</p>
  <p class="adv-block">
    <button type="button" class="tx-btn" id="exportBookmarks">Export bookmarks</button>
    Bookmarks are not in the official archive; downloads JSON when done.
  </p>
  <p class="adv-block">
    <button type="button" class="tx-btn" id="slowDelete">Slow delete without file</button>
    Slower UI automation (~4000/hour cap). Needs profile / tweets tab context.
  </p>
  <p class="adv-block">
    <button type="button" class="tx-btn" id="unfollowEveryone">Unfollow everyone</button>
    Opens Following and unfollows each account (rate limits may apply).
  </p>
</details>
<p style="margin:14px 0 0">
  <button type="button" class="tx-btn" id="tweetXer_remove">Dismiss panel</button>
</p>
`
      div.appendChild(card)

      document.body.insertBefore(div, document.body.firstChild)

      document.getElementById(`${id}_file`).addEventListener('change', this.processFile, false)
      document.getElementById('exportBookmarks').addEventListener('click', this.exportBookmarks, false)
      document.getElementById('slowDelete').addEventListener('click', this.slowDelete, false)
      document.getElementById('unfollowEveryone').addEventListener('click', this.unfollow, false)
      document.getElementById('tweetXer_remove').addEventListener(
        'click',
        () => document.getElementById(id)?.remove(),
        false
      )
    },

    async exportBookmarks() {
      TweetsXer.updateTitle('TweetXer: Exporting bookmarks')
      let variables = ''
      while (TweetsXer.bookmarksNext.length > 0 || TweetsXer.bookmarks.length === 0) {
        if (TweetsXer.bookmarksNext.length > 0) {
          variables = `{"count":20,"cursor":"${TweetsXer.bookmarksNext}","includePromotedContent":false}`
        } else variables = '{"count":20,"includePromotedContent":false}'
        const response = await fetch(
          TweetsXer.baseUrl +
            TweetsXer.bookmarksURL +
            new URLSearchParams({
              variables: variables,
              features:
                '{"graphql_timeline_v2_bookmark_timeline":true,"rweb_tipjar_consumption_enabled":true,"responsive_web_graphql_exclude_directive_enabled":true,"verified_phone_label_enabled":false,"creator_subscriptions_tweet_preview_api_enabled":true,"responsive_web_graphql_timeline_navigation_enabled":true,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"communities_web_enable_tweet_community_results_fetch":true,"c9s_tweet_anatomy_moderator_badge_enabled":true,"articles_preview_enabled":true,"responsive_web_edit_tweet_api_enabled":true,"graphql_is_translatable_rweb_tweet_is_translatable_enabled":true,"view_counts_everywhere_api_enabled":true,"longform_notetweets_consumption_enabled":true,"responsive_web_twitter_article_tweet_consumption_enabled":true,"tweet_awards_web_tipping_enabled":false,"creator_subscriptions_quote_tweet_preview_enabled":false,"freedom_of_speech_not_reach_fetch_enabled":true,"standardized_nudges_misinfo":true,"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled":true,"rweb_video_timestamps_enabled":true,"longform_notetweets_rich_text_read_enabled":true,"longform_notetweets_inline_media_enabled":true,"responsive_web_enhance_cards_enabled":false}',
            }),
          {
            headers: {
              authorization: TweetsXer.authorization,
              'content-type': 'application/json',
              'x-client-transaction-id': TweetsXer.transaction_id,
              'x-csrf-token': TweetsXer.ct0,
              'x-twitter-active-user': 'yes',
              'x-twitter-auth-type': 'OAuth2Session',
            },
            referrer: `${TweetsXer.baseUrl}/i/bookmarks`,
            referrerPolicy: 'strict-origin-when-cross-origin',
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
          }
        )

        if (response.status === 200) {
          const data = await response.json()
          const entries = data?.data?.bookmark_timeline_v2?.timeline?.instructions?.[0]?.entries
          if (entries) {
            entries.forEach((item) => {
              if (item.entryId.includes('tweet')) {
                TweetsXer.dCount++
                TweetsXer.bookmarks.push(item.content.itemContent.tweet_results.result)
              } else if (item.entryId.includes('cursor-bottom')) {
                if (TweetsXer.bookmarksNext !== item.content.value) {
                  TweetsXer.bookmarksNext = item.content.value
                } else {
                  TweetsXer.bookmarksNext = ''
                }
              }
            })
          }
          TweetsXer.updateInfo(`${TweetsXer.dCount} bookmarks collected`)
        } else {
          console.log(response)
        }

        const rem = response.headers.get('x-rate-limit-remaining')
        if (rem != null && Number(rem) < 1) {
          TweetsXer.ratelimitreset = response.headers.get('x-rate-limit-reset')
          let sleeptime = TweetsXer.ratelimitreset - Math.floor(Date.now() / 1000)
          while (sleeptime > 0) {
            sleeptime = TweetsXer.ratelimitreset - Math.floor(Date.now() / 1000)
            TweetsXer.updateInfo(`Ratelimited. Waiting ${sleeptime}s. ${TweetsXer.dCount} collected.`)
            await TweetsXer.sleep(1000)
          }
        }
      }
      const download = new Blob([JSON.stringify(TweetsXer.bookmarks)], { type: 'text/plain' })
      const bookmarksDownload = document.createElement('a')
      bookmarksDownload.id = 'bookmarksDownload'
      bookmarksDownload.textContent = 'Download bookmarks JSON'
      bookmarksDownload.href = window.URL.createObjectURL(download)
      bookmarksDownload.download = 'twitter-bookmarks.json'
      const adv = document.getElementById('advanced')
      if (adv && !document.getElementById('bookmarksDownload')) adv.appendChild(bookmarksDownload)
      TweetsXer.updateTitle('TweetXer + ReplyXer')
    },

    async sendRequest(url, body) {
      const defaultBody = `{\"variables\":{\"tweet_id\":\"${TweetsXer.tId}\",\"dark_request\":false},\"queryId\":\"${url.split('/')[6]}\"}`
      const reqBody = body !== undefined ? body : defaultBody
      return new Promise(async (resolve) => {
        try {
          const response = await fetch(url, {
            headers: {
              authorization: TweetsXer.authorization,
              'content-type': 'application/json',
              'x-client-transaction-id': TweetsXer.transaction_id,
              'x-csrf-token': TweetsXer.ct0,
              'x-twitter-active-user': 'yes',
              'x-twitter-auth-type': 'OAuth2Session',
            },
            referrer: `${TweetsXer.baseUrl}/${TweetsXer.username}/with_replies`,
            referrerPolicy: 'strict-origin-when-cross-origin',
            body: reqBody,
            method: 'POST',
            mode: 'cors',
            credentials: 'include',
            signal: AbortSignal.timeout(5000),
          })

          if (response.status === 200) {
            TweetsXer.dCount++
            TweetsXer.updateProgressBar()

            if (
              response.headers.get('x-rate-limit-remaining') != null &&
              response.headers.get('x-rate-limit-remaining') < 1
            ) {
              TweetsXer.ratelimitreset = response.headers.get('x-rate-limit-reset')
              let sleeptime = TweetsXer.ratelimitreset - Math.floor(Date.now() / 1000)
              while (sleeptime > 0) {
                sleeptime = TweetsXer.ratelimitreset - Math.floor(Date.now() / 1000)
                TweetsXer.updateInfo(`Ratelimited. Waiting ${sleeptime}s. ${TweetsXer.dCount} deleted.`)
                await TweetsXer.sleep(1000)
              }
            }
            resolve()
            return
          }
          if (response.status === 429) {
            TweetsXer.tIds.push(TweetsXer.tId)
            console.log('429 — retrying after 1s')
            await TweetsXer.sleep(1000)
          } else {
            console.log(response)
          }
          resolve()
        } catch (error) {
          if (error.name === 'AbortError') {
            TweetsXer.tIds.push(TweetsXer.tId)
            let sleeptime = 15
            while (sleeptime > 0) {
              sleeptime--
              TweetsXer.updateInfo(`Timeout. Waiting ${sleeptime}s. ${TweetsXer.dCount} deleted.`)
              await TweetsXer.sleep(1000)
            }
          } else {
            console.error(error)
          }
          resolve()
        }
      })
    },

    async deleteTweets() {
      while (this.tIds.length > 0) {
        this.tId = this.tIds.pop()
        await this.sendRequest(this.baseUrl + this.deleteURL)
      }
      this.tId = ''
      this.updateProgressBar()
      this.updateTitle('TweetXer + ReplyXer: Done')
    },

    async deleteFavs() {
      this.updateTitle('TweetXer: Deleting favs')
      while (this.tIds.length > 0) {
        this.tId = this.tIds.pop()
        await this.sendRequest(this.baseUrl + this.unfavURL)
      }
      this.tId = ''
      this.updateTitle('TweetXer + ReplyXer')
      this.updateProgressBar()
    },

    async deleteDMs() {
      while (this.tIds.length > 0) {
        this.tId = this.tIds.pop()
        await this.sendRequest(
          this.baseUrl + this.deleteMessageURL,
          `{\"variables\":{\"messageId\":\"${this.tId}\"},\"requestId\":\"\"}`
        )
      }
      this.tId = ''
      this.updateProgressBar()
    },

    async deleteConvos() {
      while (this.tIds.length > 0) {
        this.tId = this.tIds.pop()
        const url = this.baseUrl + this.deleteConvoURL.replace('USER_ID-CONVERSATION_ID', this.tId)
        const response = await fetch(url, {
          headers: {
            authorization: TweetsXer.authorization,
            'content-type': 'application/x-www-form-urlencoded',
            'x-client-transaction-id': TweetsXer.transaction_id,
            'x-csrf-token': TweetsXer.ct0,
            'x-twitter-active-user': 'yes',
            'x-twitter-auth-type': 'OAuth2Session',
          },
          referrer: `${TweetsXer.baseUrl}/messages`,
          body:
            'dm_secret_conversations_enabled=false&krs_registration_enabled=true&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_ext_limited_action_results=true&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_ext_views=true&dm_users=false&include_groups=true&include_inbox_timelines=true&include_ext_media_color=true&supports_reactions=true&supports_edit=true&include_conversation_info=true',
          method: 'POST',
          mode: 'cors',
          credentials: 'include',
          signal: AbortSignal.timeout(5000),
        })

        if (response.status === 204) {
          TweetsXer.dCount++
          TweetsXer.updateProgressBar()

          if (
            response.headers.get('x-rate-limit-remaining') != null &&
            response.headers.get('x-rate-limit-remaining') < 1
          ) {
            TweetsXer.ratelimitreset = response.headers.get('x-rate-limit-reset')
            let sleeptime = TweetsXer.ratelimitreset - Math.floor(Date.now() / 1000)
            while (sleeptime > 0) {
              sleeptime = TweetsXer.ratelimitreset - Math.floor(Date.now() / 1000)
              TweetsXer.updateInfo(`Ratelimited. Waiting ${sleeptime}s. ${TweetsXer.dCount} deleted.`)
              await TweetsXer.sleep(1000)
            }
          }
          await TweetsXer.sleep(Math.floor(Math.random() * 200))
        } else if (response.status === 429 || response.status === 420) {
          TweetsXer.tIds.push(TweetsXer.tId)
          let sleeptime = 60 * 5
          while (sleeptime > 0) {
            sleeptime--
            TweetsXer.updateInfo(`Ratelimited. Waiting ${sleeptime}s. ${TweetsXer.dCount} deleted.`)
            await TweetsXer.sleep(1000)
          }
        } else {
          console.log(response)
        }
      }
      this.tId = ''
      this.updateProgressBar()
    },

    async getTweetCount() {
      await waitForElemToExist('header')
      await TweetsXer.sleep(1000)
      if (!document.querySelector('[data-testid="UserName"]')) {
        if (document.querySelector('[aria-label="Back"]')) {
          await TweetsXer.sleep(200)
          document.querySelector('[aria-label="Back"]').click()
          await TweetsXer.sleep(1000)
        } else if (document.querySelector('[data-testid="app-bar-back"]')) {
          document.querySelector('[data-testid="app-bar-back"]').click()
          await TweetsXer.sleep(1000)
        }

        if (document.querySelector('[data-testid="AppTabBar_Profile_Link"]')) {
          await TweetsXer.sleep(200)
          document.querySelector('[data-testid="AppTabBar_Profile_Link"]').click()
        } else if (document.querySelector('[data-testid="DashButton_ProfileIcon_Link"]')) {
          await TweetsXer.sleep(100)
          document.querySelector('[data-testid="DashButton_ProfileIcon_Link"]').click()
          await TweetsXer.sleep(1000)
          const icon = document.querySelector('[data-testid="icon"]')
          if (icon && icon.nextElementSibling) icon.nextElementSibling.click()
        }

        await waitForElemToExist('[data-testid="UserName"]')
      }
      await TweetsXer.sleep(1000)

      function extractTweetCount(selector) {
        const element = document.querySelector(selector)
        if (!element) return null
        const match = element.textContent.match(/((\d|,|\.|K)+) (\w+)$/)
        if (!match) return null
        return match[1]
          .replace(/\.(\d+)K/, (_, dec) => dec.padEnd(3, '0'))
          .replace('K', '000')
          .replace(',', '')
          .replace('.', '')
      }

      try {
        TweetsXer.TweetCount = extractTweetCount('[data-testid="primaryColumn"]>div>div>div')
        if (!TweetsXer.TweetCount) {
          TweetsXer.TweetCount = extractTweetCount('[data-testid="TopNavBar"]>div>div')
        }
        if (!TweetsXer.TweetCount) {
          console.log("Couldn't read tweet count; using 1e6 for skip math.")
          TweetsXer.TweetCount = 1000000
        }
      } catch (error) {
        console.log("Couldn't read tweet count; using 1e6 for skip math.")
        TweetsXer.TweetCount = 1000000
      }
      this.updateInfo(
        'Pick an export file below, or open Advanced for bookmarks / slow delete / unfollow. For replies only, use tweets.js and check “Replies only”.'
      )
      console.log(TweetsXer.TweetCount + ' posts (approx) on profile for auto-skip.')
    },

    async slowDelete() {
      const startEl = document.getElementById('start')
      if (startEl) startEl.remove()
      TweetsXer.total = TweetsXer.TweetCount
      TweetsXer.createProgressBar()

      const tabs = document.querySelectorAll('[data-testid="ScrollSnap-List"] a')
      if (tabs.length > 1) tabs[1].click()
      else console.warn('TweetXer: Could not find Posts/Replies tabs — stay on a profile tweets view.')
      await TweetsXer.sleep(2000)

      let unretweet, confirmURT, caret, menu, confirmation
      let consecutiveErrors = 0
      const maxConsecutiveErrors = 5
      const moreSel = '[data-testid="tweet"] [data-testid="caret"]'

      while (document.querySelectorAll(moreSel).length > 0) {
        await TweetsXer.sleep(1200)
        document.querySelectorAll('section [data-testid="cellInnerDiv"]>div>div>div').forEach((x) => x.remove())
        document.querySelectorAll('section [data-testid="cellInnerDiv"]>div>div>[role="link"]').forEach((x) =>
          x.remove()
        )

        try {
          const moreElement = document.querySelector(moreSel)
          if (moreElement) {
            moreElement.scrollIntoView({ behavior: 'smooth' })
          }

          unretweet = document.querySelector('[data-testid="unretweet"]')
          if (unretweet) {
            unretweet.click()
            confirmURT = await waitForElemToExist('[data-testid="unretweetConfirm"]')
            confirmURT.click()
          } else {
            caret = await waitForElemToExist(moreSel)
            caret.click()
            menu = await waitForElemToExist('[role="menuitem"]')
            if (menu.textContent.includes('@')) {
              caret.click()
              const tw = document.querySelector('[data-testid="tweet"]')
              if (tw) tw.remove()
            } else {
              menu.click()
              confirmation = await waitForElemToExist('[data-testid="confirmationSheetConfirm"]')
              if (confirmation) confirmation.click()
            }
          }

          TweetsXer.dCount++
          TweetsXer.updateProgressBar()
          consecutiveErrors = 0
          if (TweetsXer.dCount % 100 === 0) {
            console.log(`${new Date().toUTCString()} Deleted ${TweetsXer.dCount} items (slow delete)`)
          }
        } catch (error) {
          console.error(`Slow delete error: ${error.message}`)
          consecutiveErrors++
          if (consecutiveErrors >= maxConsecutiveErrors) {
            console.log(`${consecutiveErrors} consecutive errors. Stopping.`)
            break
          }
        }
      }

      console.log(`Slow delete finished. Count: ${TweetsXer.dCount}. Reload to verify.`)
    },

    async unfollow() {
      const following = document.querySelector('[href$="/following"]')
      if (following) following.click()
      await TweetsXer.sleep(1200)

      let unfollowCount = 0
      const accounts = '[data-testid="UserCell"]'
      while (document.querySelectorAll('[data-testid="UserCell"] [data-testid$="-unfollow"]').length > 0) {
        const next_unfollow = document.querySelectorAll(accounts)[0]
        next_unfollow.scrollIntoView({ behavior: 'smooth' })
        next_unfollow.querySelector('[data-testid$="-unfollow"]').click()
        const menu = await waitForElemToExist('[data-testid="confirmationSheetConfirm"]')
        menu.click()
        next_unfollow.remove()
        unfollowCount++
        if (unfollowCount % 10 === 0) {
          console.log(`${new Date().toUTCString()} Unfollowed ${unfollowCount}`)
        }
        await TweetsXer.sleep(Math.floor(Math.random() * 200))
      }
      console.log('Unfollow pass done. Reload to verify.')
    },
  }

  const waitForElemToExist = async (selector) => {
    const elem = document.querySelector(selector)
    if (elem) return elem
    return new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector)
        if (el) {
          resolve(el)
          observer.disconnect()
        }
      })
      observer.observe(document.body, { subtree: true, childList: true })
    })
  }

  TweetsXer.init()
})()
