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
          <p className="mt-0.5 text-xs text-violet-800/80 sm:text-sm">
            Find answers to common Localix issues and usage questions.
          </p>
          <img
            src="/images/help_centre.png"
            alt="Help Centre header illustration"
            className="pointer-events-none absolute right-4 top-1/2 h-28 w-28 -translate-y-1/2 object-contain sm:h-32 sm:w-32 lg:h-36 lg:w-36"
          />
        </div>
      </section>

      <section className="card border border-violet-200/80 bg-gradient-to-br from-[#efe6ff]/85 via-[#e7dcff]/78 to-[#f3e9ff]/80 shadow-lg">
        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">Search questions</label>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by keyword, for example: login, post, ERP, cart"
          className="mt-1.5 w-full rounded-xl border border-violet-200 bg-white/90 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
        />
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
              <summary className="cursor-pointer list-none text-sm font-bold text-violet-900">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-extrabold text-violet-700">
                  {index + 1}
                </span>
                {item.question}
              </summary>
              <p className="mt-3 text-sm leading-6 text-slate-700">{item.answer}</p>
            </details>
          ))
        )}
      </section>
    </div>
  )
}