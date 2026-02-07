"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/feed"
              className="text-lg font-semibold text-gray-900"
            >
              Cookbook
            </Link>
            <Link
              href="/feed"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Feed
            </Link>
            <Link
              href="/recipes/new"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Add Recipe
            </Link>
            <Link
              href="/lists"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Lists
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={`/profile/${session.user.id}`}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {session.user.name}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
