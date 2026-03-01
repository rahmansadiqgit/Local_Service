import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-12">

        {/* Top Section */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">

          {/* Left Section */}
          <div>
            <Link
              to="/"
              className="text-xl font-semibold text-slate-800 hover:text-brand-500 dark:text-white"
            >
              Localix
            </Link>

            <p className="mt-4 text-sm text-slate-500">
              A local online business platform to resolve your needs.
            </p>
          </div>

          {/* Middle Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              Quick Links
            </h3>

            <ul className="mt-4 space-y-2 text-sm text-slate-500">
              <li>
                <Link to="/feed" className="hover:text-brand-500">
                  Feed
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-brand-500">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-brand-500">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/report" className="hover:text-brand-500">
                  Report a Problem
                </Link>
              </li>
            </ul>
          </div>

          {/* Right Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              Contact Us
            </h3>

            <div className="mt-4 space-y-2 text-sm text-slate-500">
              <p>Email: antu2305341317@diu.edu.bd</p>
              <p>Phone: 01709913594</p>
            </div>
          </div>

        </div>

        {/* Bottom Section */}
        <div className="mt-12 border-t border-slate-200 pt-6 text-center text-sm text-slate-500 dark:border-slate-800">
          © 2026 Localix. All rights reserved.
        </div>

      </div>
    </footer>
  );
}