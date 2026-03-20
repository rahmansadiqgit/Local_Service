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

            <div className="space-y-2 text-sm text-white drop-shadow">
              <p>
                Email:{" "}
                <a
                  href="mailto:antu2305341317@diu.edu.bd"
                  className="hover:text-yellow-300 transition"
                >
                  antu2305341317@diu.edu.bd
                </a>
              </p>
              <p>
                Phone:{" "}
                <a
                  href="tel:+8801709913594"
                  className="hover:text-yellow-300 transition"
                >
                  01709913594
                </a>
              </p>
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