import React from "react";

export default function Navbar({ user, appName = "Sheetbell" }) {
  return (
    <nav className="w-full flex items-center py-4 mb-0">
      <a
        href="/"
        className="font-mono text-lg font-bold text-white hover:text-blue-400 transition-colors"
      >
        {appName}
      </a>
      <a
        href="/docs"
        className="ml-4 text-sm text-gray-400 hover:text-blue-400 font-mono transition-colors"
      >
        Docs
      </a>
      {user && (
        <>
          <span className="mx-2 text-gray-600">·</span>
          <span className="text-sm text-gray-400 font-mono">{user.name}</span>
          <span className="mx-2 text-gray-600">·</span>
          <a
            href="/api/auth/logout"
            className="text-sm px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white font-mono transition-colors"
          >
            Log out
          </a>
        </>
      )}
      <a
        href="/slackphoto"
        className="ml-auto inline-block px-4 py-2 rounded bg-blue-700 hover:bg-blue-600 text-white font-mono font-semibold transition-colors"
      >
        Slack Photo Flair →
      </a>
    </nav>
  );
}
