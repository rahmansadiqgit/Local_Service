import { Link } from "react-router-dom"

export default function HeroHeader() {
  return (
    <header className="relative h-[600px] w-full overflow-hidden">

      {/* Background Image */}
      <img
        src="/images/hero.png"
        alt="Local services"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50"></div>

      {/* NAVBAR */}
      <div className="absolute top-0 left-0 w-full z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 text-white">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black">
              LX
            </div>
            Localix
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-8 font-medium">
            <Link to="/" className="hover:text-yellow-300">Home</Link>
            <Link to="/services" className="hover:text-yellow-300">Services</Link>
            <Link to="/about" className="hover:text-yellow-300">About</Link>
            <Link to="/contact" className="hover:text-yellow-300">Contact</Link>
            <Link
              to="/login"
              className="rounded-full border border-white px-4 py-2 hover:bg-white hover:text-black"
            >
              Login
            </Link>
          </div>
        </div>
      </div>

      {/* HERO CONTENT */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
        <h1 className="max-w-3xl text-4xl font-bold md:text-6xl">
          Find Trusted Local Services Near You
        </h1>
        <p className="mt-4 max-w-xl text-lg text-gray-200">
          Connect with plumbers, electricians, cleaners, and other professionals in your area.
        </p>

        {/* Search Box */}
        <div className="mt-8 flex w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-lg">
          <input
            type="text"
            placeholder="Search services..."
            className="flex-1 px-4 py-3 text-black outline-none"
          />
          <button className="bg-yellow-400 px-6 font-semibold text-black hover:bg-yellow-500">
            Search
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <Link
            to="/services"
            className="rounded-full bg-yellow-400 px-6 py-3 font-semibold text-black hover:bg-yellow-500"
          >
            Browse Services
          </Link>
          <Link
            to="/register"
            className="rounded-full border border-white px-6 py-3 font-semibold hover:bg-white hover:text-black"
          >
            Become a Provider
          </Link>
        </div>
      </div>

    </header>
  )
}
