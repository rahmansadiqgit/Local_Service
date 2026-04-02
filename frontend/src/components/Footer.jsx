import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="relative bg-slate-800 text-white">

      <div className="mx-auto max-w-7xl px-6 py-12 relative z-10">

        {/* Top Section */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">

          {/* Left Section */}
          <div>
            <Link
              to="/"
              className="text-2xl font-extrabold tracking-wide text-white drop-shadow-lg hover:text-yellow-300 transition"
            >
              Localix
            </Link>

            <p className="mt-4 text-sm text-white/90 drop-shadow">
              Your local marketplace to connect with nearby businesses and services.
            </p>
          </div>

          {/* Middle Section */}
          <div>
            <h3 className="text-lg font-bold text-white drop-shadow mb-3">
              Quick Links
            </h3>

            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/"
                  className="text-white drop-shadow hover:text-yellow-300 transition"
                >
                  Feed
                </Link>
              </li>
              <li>
                <Link
                  to="/services"
                  className="text-white drop-shadow hover:text-yellow-300 transition"
                >
                  Services
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-white drop-shadow hover:text-yellow-300 transition"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/help-centre"
                  className="text-white drop-shadow hover:text-yellow-300 transition"
                >
                  Help Centre
                </Link>
              </li>
              <li>
                <Link
                  to="/report"
                  className="text-white drop-shadow hover:text-yellow-300 transition"
                >
                  Report a Problem
                </Link>
              </li>
            </ul>
          </div>

          {/* Right Section */}
          <div>
            <h3 className="text-lg font-bold text-white drop-shadow mb-3">
              Contact Us
            </h3>

            <div className="flex items-center gap-3 text-white drop-shadow">
              <a
                href="mailto:antu2305341317@diu.edu.bd"
                className="group inline-flex items-center transition hover:text-yellow-300"
                aria-label="Email Localix"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/30 transition group-hover:bg-yellow-300/15 group-hover:ring-yellow-300/40">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                    <path d="M3 6.75A2.75 2.75 0 0 1 5.75 4h12.5A2.75 2.75 0 0 1 21 6.75v10.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25V6.75Zm2.05-.25 6.57 5.5a.6.6 0 0 0 .76 0l6.57-5.5H5.05Zm14.45 1.1-6.16 5.15a2.1 2.1 0 0 1-2.68 0L4.5 7.6v9.65c0 .69.56 1.25 1.25 1.25h12.5c.69 0 1.25-.56 1.25-1.25V7.6Z" />
                  </svg>
                </span>
              </a>

              <a
                href="tel:+8801709913594"
                className="group inline-flex items-center transition hover:text-yellow-300"
                aria-label="Call Localix"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/30 transition group-hover:bg-yellow-300/15 group-hover:ring-yellow-300/40">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                    <path d="M6.62 2.25A2.1 2.1 0 0 1 8.76 3.9l.6 2.8c.14.65-.08 1.32-.58 1.75l-1.22 1.05a14.2 14.2 0 0 0 6.94 6.94l1.05-1.22c.43-.5 1.1-.72 1.75-.58l2.8.6a2.1 2.1 0 0 1 1.65 2.14v2.01A2.6 2.6 0 0 1 19.15 22C9.68 22 2 14.32 2 4.85a2.6 2.6 0 0 1 2.61-2.6h2.01Zm2.61 4.82-.55-2.58a.6.6 0 0 0-.6-.49H6.07a1.1 1.1 0 0 0-1.1 1.1c0 8.1 6.58 14.68 14.68 14.68a1.1 1.1 0 0 0 1.1-1.1v-2.01a.6.6 0 0 0-.49-.6l-2.58-.55-1.47 1.71a1.5 1.5 0 0 1-1.6.43 15.7 15.7 0 0 1-8.2-8.2 1.5 1.5 0 0 1 .43-1.6l1.71-1.47Z" />
                  </svg>
                </span>
              </a>

              <a
                href="https://wa.me/8801709913594"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center transition hover:text-yellow-300"
                aria-label="WhatsApp Localix"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/30 transition group-hover:bg-yellow-300/15 group-hover:ring-yellow-300/40">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                    <path d="M12.04 2C6.56 2 2.1 6.42 2.1 11.86c0 1.92.56 3.79 1.62 5.39L2 22l4.9-1.64a9.97 9.97 0 0 0 5.14 1.41h.01c5.48 0 9.94-4.42 9.94-9.87S17.53 2 12.04 2Zm0 17.93h-.01a8.3 8.3 0 0 1-4.22-1.15l-.3-.18-2.91.97.98-2.84-.2-.3a8.16 8.16 0 0 1-1.28-4.38c0-4.49 3.69-8.14 8.23-8.14 2.2 0 4.27.85 5.83 2.39a8.05 8.05 0 0 1 2.42 5.74c0 4.49-3.69 8.14-8.24 8.14Zm4.51-6.06c-.25-.12-1.49-.73-1.72-.81-.23-.09-.4-.13-.56.12-.16.24-.65.8-.79.96-.15.16-.29.18-.54.06-.25-.12-1.06-.39-2.03-1.24-.75-.66-1.25-1.47-1.4-1.72-.15-.24-.02-.37.11-.49.12-.12.25-.31.37-.46.12-.15.16-.25.25-.43.08-.18.04-.34-.02-.46-.06-.12-.56-1.34-.77-1.84-.2-.47-.41-.41-.56-.42h-.48c-.16 0-.43.06-.65.31-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.15 1.69 2.67 4.1 3.64.57.24 1.02.39 1.37.5.58.18 1.11.15 1.53.09.47-.07 1.49-.61 1.7-1.2.21-.58.21-1.09.15-1.2-.06-.12-.23-.18-.48-.31Z" />
                  </svg>
                </span>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Section */}
        <div className="mt-12 border-t border-white/30 pt-6 text-center text-sm text-white drop-shadow">
          © 2026 Localix. All rights reserved.
        </div>

      </div>
    </footer>
  );
}