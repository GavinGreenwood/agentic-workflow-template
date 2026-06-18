import Link from "next/link";

export function Navbar() {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            href="/"
            className="font-bold text-slate-900 text-lg tracking-tight"
          >
            OKR Tracker
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/objectives"
              className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
            >
              Objectives
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
