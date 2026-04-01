import { useMemo, useState } from 'react'

const helpFaqs = [
  {
    question: 'Why can I not log in even with the correct email and password?',
    answer:
      'Please check if there are extra spaces in email/password, confirm Caps Lock is off, and try resetting your password from the reset page. If the problem continues, use Report a Problem with your login email.',
  },
  {
    question: 'I did not receive the password reset email. What should I do?',
    answer:
      'Check Spam/Junk folders first. Then ensure you entered the exact registered email. If still missing, wait a few minutes and request again.',
  },
  {
    question: 'How do I create a new post on Localix?',
    answer:
      'Log in, open Create Post, choose Demand or Supply, fill the details, then submit. Your post appears in the feed after successful creation.',
  },
  {
    question: 'Why is my post not visible in the feed?',
    answer:
      'Your post may not match active filters (location, cost, rating, type). Clear filters on Home Feed and refresh. Also verify your post was saved without errors.',
  },
  {
    question: 'Can logged out users see posts?',
    answer:
      'Yes, public feed browsing is supported. However, actions like Apply, Book, Cart, and profile actions require login.',
  },
  {
    question: 'Why can I not apply/book my own post?',
    answer:
      'Localix blocks self-booking to keep transactions valid. You can manage your post but cannot apply to your own listing.',
  },
  {
    question: 'What is the difference between Demand and Supply posts?',
    answer:
      'Demand means you need a service/product. Supply means you are offering one. Choose the type that matches your role in that request.',
  },
  {
    question: 'How do I edit a post after publishing?',
    answer:
      'Go to Manage Post, open the target post, update fields, then save changes. Refresh the feed to confirm updates.',
  },
  {
    question: 'How can I delete an old or wrong post?',
    answer:
      'Open Manage Post, select the post, and use Delete. This action cannot be undone, so confirm before removing.',
  },
  {
    question: 'Why does location filtering not return expected posts?',
    answer:
      'Location results depend on text match or map coordinates/radius. Try clearing radius, using simpler location text, or selecting location again from the map.',
  },
  {
    question: 'How do I use the map filter correctly?',
    answer:
      'Pick a point on the map (or Use My Current Location), then set a radius in km. Posts inside that radius will be prioritized.',
  },
  {
    question: 'Why is the map not detecting my current location?',
    answer:
      'Your browser may have location permission blocked. Allow location access for the site and try again.',
  },
  {
    question: 'What does rating filter do in Home Feed?',
    answer:
      'Rating filter shows posts from providers meeting the minimum selected rating. If no ratings exist yet, results may reduce.',
  },
  {
    question: 'How does the cart work in Localix?',
    answer:
      'You can add posts to cart for quick access and cost comparison. Checkout and final configuration are completed in the relevant flow pages.',
  },
  {
    question: 'Why is a post already in my cart when I try adding again?',
    answer:
      'Localix prevents duplicate cart entries for the same post. Open Your Cart to review or remove it first.',
  },
  {
    question: 'How do ERP stages (Pending, On Process, Completed) work?',
    answer:
      'Pending means started but not active, On Process means in progress, and Completed means the work was finalized and closed.',
  },
  {
    question: 'Why can I not change ERP stage?',
    answer:
      'Only permitted roles can update ERP stages. Make sure you are logged in with the correct account involved in that ERP.',
  },
  {
    question: 'How can I upload or view ERP PDF slips?',
    answer:
      'In ERP details, use the provided controls to generate/download slip files. If file opening fails, try again after the ERP is fully configured.',
  },
  {
    question: 'Why are notifications not updating?',
    answer:
      'Notifications refresh periodically and on focus. Check internet connection, refresh manually, or re-login if your session expired.',
  },
  {
    question: 'How do I mark all notifications as read?',
    answer:
      'Open the notification dropdown and click Mark all as read. Individual notification menu also supports mark unread or delete.',
  },
  {
    question: 'I cannot send a connection request. What can cause this?',
    answer:
      'You may already have a pending request with that user, or role/permissions may block duplicate requests.',
  },
  {
    question: 'How do I accept or reject connection requests?',
    answer:
      'Open the Connections page, find incoming requests, then choose Accept or Reject.',
  },
  {
    question: 'Why can I not open another user profile/dashboard?',
    answer:
      'Some profile details are available only after login. Ensure you are authenticated and that the target user exists.',
  },
  {
    question: 'How do I update profile photo and personal details?',
    answer:
      'Go to Profile > Edit Profile, update fields/photo, and save. Then refresh to confirm the avatar and info changed.',
  },
  {
    question: 'Why is my WhatsApp link rejected?',
    answer:
      'Localix stores WhatsApp values as phone digits only. Enter a valid number format; symbols are automatically normalized.',
  },
  {
    question: 'How do I change my password securely?',
    answer:
      'Use Profile > Change Password, enter old password and strong new password, then submit. You will receive a password-change notification.',
  },
  {
    question: 'What if I accidentally log out?',
    answer:
      'Log in again with your email and password. If password is forgotten, use reset password flow.',
  },
  {
    question: 'Why does the page open from middle instead of top?',
    answer:
      'This issue was fixed with route-based scroll reset. If you still see it, hard refresh your browser once to load latest frontend code.',
  },
  {
    question: 'Images are not loading in posts or profile. Why?',
    answer:
      'This can happen from slow network, invalid file URL, or backend media serving issues. Refresh and check if media endpoint is reachable.',
  },
  {
    question: 'Can I use Localix on mobile devices?',
    answer:
      'Yes, Localix is responsive and works on mobile browsers. For best experience, use latest Chrome/Edge.',
  },
  {
    question: 'How do I search for people by skills?',
    answer:
      'Use Home Feed search under Find Peoples & Skills. Logged-in users get broader search results including non-posting members.',
  },
  {
    question: 'Why are search results empty even though users exist?',
    answer:
      'Try a shorter keyword or alternative spelling. Also verify you are logged in to access full member search scope.',
  },
  {
    question: 'How do I report abuse, spam, or suspicious behavior?',
    answer:
      'Use Report a Problem with clear details, user/post links, and screenshots if possible. The support team will review quickly.',
  },
  {
    question: 'Can I recover a deleted post?',
    answer:
      'Deleted posts are generally not recoverable from UI. If removed by mistake, create a new post or contact support immediately.',
  },
  {
    question: 'How can I improve my post visibility?',
    answer:
      'Use clear titles, detailed descriptions, accurate location, realistic pricing, and maintain good ratings and response speed.',
  },
  {
    question: 'Why does my session expire and ask me to log in again?',
    answer:
      'For security, access tokens expire after a period. Log in again to continue, and avoid clearing browser storage if you want to stay signed in longer.',
  },
  {
    question: 'Can I change the email address of my account?',
    answer:
      'If email change is not available directly in your profile, submit a request from Report a Problem including your current and new email details.',
  },
  {
    question: 'Why does my uploaded image look too large or cropped?',
    answer:
      'Different cards use fixed preview areas. Use a clear centered image and moderate resolution for better display across devices.',
  },
  {
    question: 'What should I include in a good problem report?',
    answer:
      'Add exact steps, page name, expected result, actual result, and if possible a screenshot. This helps support reproduce and solve faster.',
  },
  {
    question: 'How do I know if my action was saved successfully?',
    answer:
      'Watch for success messages, updated data in the same page, and refreshed entries in feed or management pages after your action.',
  },
  {
    question: 'Why does Create Post fail when I click submit?',
    answer:
      'Usually one or more required fields are missing or invalid. Recheck post type, title/name, and any required cost/input fields, then submit again.',
  },
  {
    question: 'Can I create a post without adding image or website link?',
    answer:
      'Yes, image and website link are optional in most cases. You can publish with text details first and update later from Manage Post.',
  },
  {
    question: 'Why are costs not showing correctly in feed filters?',
    answer:
      'Cost range depends on linked skills/products data. If those sections are empty or zero, min/max cost filters may not behave as expected.',
  },
  {
    question: 'How can I clear all feed filters quickly?',
    answer:
      'Manually reset search, location, radius, cost, and rating fields to blank/default values. Then refresh the feed list.',
  },
  {
    question: 'Why does clicking a notification open a different page than expected?',
    answer:
      'Notifications route by message content (ERP, cart, connection, or direct post link). If content is incomplete, fallback navigation may send you to dashboard.',
  },
  {
    question: 'Can I use one account on multiple devices?',
    answer:
      'Yes, but frequent login/logout across devices can rotate tokens and end older sessions. Re-login if a session becomes invalid.',
  },
  {
    question: 'What file types are safest for profile and post images?',
    answer:
      'Use standard formats like JPG, JPEG, or PNG for best compatibility and faster loading in browser and mobile views.',
  },
  {
    question: 'Why does the app feel slow sometimes?',
    answer:
      'Slow network, large image uploads, or backend load can delay responses. Refresh once, reduce image size, and retry during a stable connection.',
  },
  {
    question: 'How do I safely share my post with others?',
    answer:
      'Open the post and share the direct post link. Avoid sharing personal contact details publicly unless necessary.',
  },
  {
    question: 'What should I do if I find incorrect user information?',
    answer:
      'Do not engage in conflict inside comments/messages. Use Report a Problem with the user/post context so the support team can review.',
  },
]

export default function HelpCentre() {
  const [search, setSearch] = useState('')

  const filteredFaqs = useMemo(() => {
    const query = String(search || '').trim().toLowerCase()
    if (!query) return helpFaqs

    return helpFaqs.filter((item) => {
      const question = String(item?.question || '').toLowerCase()
      const answer = String(item?.answer || '').toLowerCase()
      return question.includes(query) || answer.includes(query)
    })
  }, [search])

  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden border-0 bg-gradient-to-r from-[#c9b6ff] via-[#e6d7ff] to-[#f2eaff] p-0 text-slate-800 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_58%)]" />
        <div className="relative px-6 py-3.5 pr-32 sm:px-8 sm:py-4 sm:pr-36 lg:pr-40">
          <h2 className="text-xl font-extrabold tracking-tight text-violet-900 sm:text-3xl">Help Centre</h2>
          <p className="mt-0.5 text-xs font-semibold text-violet-800/80 sm:text-sm">
            Find answers to common Localix issues and usage questions.
          </p>
          <img
            src="/images/help_centre.png"
            alt="Help Centre header illustration"
            className="pointer-events-none absolute right-4 top-1/2 h-32 w-32 -translate-y-1/2 object-contain sm:h-36 sm:w-36 lg:h-40 lg:w-40"
          />
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-white/45 bg-gradient-to-r from-orange-200/45 via-amber-100/35 to-orange-300/35 p-4 shadow-[0_14px_30px_rgba(251,146,60,0.22)] sm:p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_52%)]" />
        <div className="absolute -left-10 -top-10 h-24 w-24 rounded-full bg-white/35 blur-2xl" />
        <div className="absolute -right-10 -bottom-10 h-24 w-24 rounded-full bg-orange-200/45 blur-2xl" />
        <div className="relative mb-3 flex items-center justify-between gap-3 border-b border-white/45 pb-3">
          <p className="text-sm font-extrabold tracking-wide text-orange-900">Find Questions</p>
          <p className="text-xs text-slate-600">Search by keyword from common Localix issues</p>
        </div>

        <div className="relative mt-1.5 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search questions like login, post, ERP, cart"
            className="h-11 min-w-[240px] flex-1 rounded-xl border border-white/50 bg-white/45 px-3 text-sm text-slate-800 shadow-sm placeholder:text-slate-500 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200/80"
          />
          <button
            type="button"
            onClick={() => setSearch((prev) => String(prev || '').trim())}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-fuchsia-700"
          >
            Search
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-600">
          {filteredFaqs.length} question{filteredFaqs.length === 1 ? '' : 's'} found
        </p>
      </section>

      <section className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="card border border-violet-200/80 bg-white text-sm text-slate-600">
            No matching questions found. Try another keyword.
          </div>
        ) : (
          filteredFaqs.map((item, index) => (
            <details
              key={`${item.question}-${index}`}
              className="card border border-violet-200/80 bg-gradient-to-r from-white via-violet-50/45 to-fuchsia-50/45"
            >
              <summary className="cursor-pointer list-none text-sm font-bold text-violet-900">{item.question}</summary>
              <p className="mt-3 text-sm leading-6 text-slate-700">{item.answer}</p>
            </details>
          ))
        )}
      </section>
    </div>
  )
}