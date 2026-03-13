import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion"; // optional for smooth animations

export default function HeroBanner() {
  const [search, setSearch] = useState("");

  return (
    <header className="relative h-screen w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 overflow-hidden">
      {/* Animated Background Shapes */}
      <div className="absolute inset-0">
        <motion.div
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute bg-white/10 rounded-full w-72 h-72 top-10 left-20 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, -25, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute bg-white/20 rounded-full w-96 h-96 bottom-20 right-10 blur-3xl"
        />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center items-start h-full max-w-7xl mx-auto px-6 lg:px-20">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight">
          Connect. Grow. Thrive.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-white/90 max-w-xl">
          Localix is the unified platform for local businesses. Create your business, offer services, hire skilled workers, and post demand for talents—all in one place.
        </p>

        {/* Search / CTA */}
        <div className="mt-8 w-full sm:w-auto flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search services, products, or skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-3 rounded-md w-full sm:w-96 focus:outline-none focus:ring-2 focus:ring-white text-black"
          />
          <Link
            to="/explore"
            className="px-6 py-3 bg-white text-black font-semibold rounded-md hover:bg-white/90 transition-all"
          >
            Explore Now
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl">
          <div className="bg-white/10 p-6 rounded-xl backdrop-blur-md hover:scale-105 transition-transform">
            <h3 className="text-white font-bold text-lg">Create Your Business</h3>
            <p className="text-white/80 mt-2 text-sm">List your products, services, or manpower instantly.</p>
          </div>
          <div className="bg-white/10 p-6 rounded-xl backdrop-blur-md hover:scale-105 transition-transform">
            <h3 className="text-white font-bold text-lg">Hire Skilled Workers</h3>
            <p className="text-white/80 mt-2 text-sm">Find professionals and workers for your projects.</p>
          </div>
          <div className="bg-white/10 p-6 rounded-xl backdrop-blur-md hover:scale-105 transition-transform">
            <h3 className="text-white font-bold text-lg">Post Your Demands</h3>
            <p className="text-white/80 mt-2 text-sm">Request skills or manpower and get instant responses.</p>
          </div>
        </div>
      </div>
    </header>
  );
}
