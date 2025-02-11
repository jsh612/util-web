import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-5xl font-extrabold mb-12 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
          Util Web
        </h1>
        <div className="flex flex-col gap-6 w-full max-w-md">
          <Link
            href="/figma-to-component"
            className="group px-6 py-4 bg-slate-700/50 backdrop-blur-sm rounded-xl hover:bg-slate-700/70 transition-all duration-300 border border-slate-600/50 hover:border-slate-500/50 shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">Figma 컴포넌트 생성</span>
              <svg
                className="w-6 h-6 text-teal-400 group-hover:translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
          <Link
            href="/crawler"
            className="group px-6 py-4 bg-slate-700/50 backdrop-blur-sm rounded-xl hover:bg-slate-700/70 transition-all duration-300 border border-slate-600/50 hover:border-slate-500/50 shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">뉴스 크롤러</span>
              <svg
                className="w-6 h-6 text-teal-400 group-hover:translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
