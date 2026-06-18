import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
          OKR Tracker
        </h1>
        <p className="text-lg text-slate-500">
          Track objectives and key results across your team
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
        <Link
          href="/objectives"
          className="group bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-5 h-5 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h2 className="font-semibold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
            Objectives
          </h2>
          <p className="text-sm text-slate-500">
            Create and manage your objectives
          </p>
        </Link>

        <Link
          href="/dashboard"
          className="group bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-5 h-5 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h2 className="font-semibold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
            Dashboard
          </h2>
          <p className="text-sm text-slate-500">
            View progress across all objectives
          </p>
        </Link>
      </div>
    </main>
  );
}
