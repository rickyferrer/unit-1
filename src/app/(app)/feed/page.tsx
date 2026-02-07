"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import StarRating from "@/components/StarRating";

interface FeedEvent {
  id: string;
  type: string;
  data: string | null;
  createdAt: string;
  recipeId: string | null;
  user: { id: string; name: string; avatarUrl: string | null };
}

export default function FeedPage() {
  const { status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async (cursor?: string) => {
    const url = cursor ? `/api/feed?cursor=${cursor}` : "/api/feed";
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    setEvents((prev) => (cursor ? [...prev, ...data.items] : data.items));
    setNextCursor(data.nextCursor);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchFeed();
    }
  }, [status, router, fetchFeed]);

  function renderEvent(event: FeedEvent) {
    const parsed = event.data ? JSON.parse(event.data) : {};

    switch (event.type) {
      case "cook_entry":
        return (
          <div>
            <p className="text-sm text-gray-900">
              <Link href={`/profile/${event.user.id}`} className="font-medium hover:underline">
                {event.user.name}
              </Link>{" "}
              cooked{" "}
              <Link
                href={`/recipes/${event.recipeId}`}
                className="font-medium text-blue-600 hover:underline"
              >
                {parsed.recipeTitle}
              </Link>
            </p>
            {parsed.rating && (
              <div className="mt-1">
                <StarRating rating={parsed.rating} readonly />
              </div>
            )}
            {parsed.caption && (
              <p className="mt-1 text-sm text-gray-600">{parsed.caption}</p>
            )}
          </div>
        );
      case "new_recipe":
        return (
          <p className="text-sm text-gray-900">
            <Link href={`/profile/${event.user.id}`} className="font-medium hover:underline">
              {event.user.name}
            </Link>{" "}
            added a new recipe{" "}
            {event.recipeId && (
              <Link
                href={`/recipes/${event.recipeId}`}
                className="font-medium text-blue-600 hover:underline"
              >
                View recipe
              </Link>
            )}
          </p>
        );
      case "favorite":
        return (
          <p className="text-sm text-gray-900">
            <Link href={`/profile/${event.user.id}`} className="font-medium hover:underline">
              {event.user.name}
            </Link>{" "}
            favorited{" "}
            <Link
              href={`/recipes/${event.recipeId}`}
              className="font-medium text-blue-600 hover:underline"
            >
              {parsed.recipeTitle}
            </Link>
          </p>
        );
      case "status_change":
        return (
          <p className="text-sm text-gray-900">
            <Link href={`/profile/${event.user.id}`} className="font-medium hover:underline">
              {event.user.name}
            </Link>{" "}
            {parsed.status === "want_to_cook" ? "wants to cook" : "cooked"}{" "}
            <Link
              href={`/recipes/${event.recipeId}`}
              className="font-medium text-blue-600 hover:underline"
            >
              {parsed.recipeTitle}
            </Link>
          </p>
        );
      default:
        return <p className="text-sm text-gray-500">Unknown event</p>;
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading feed...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Feed</h1>
        <Link
          href="/recipes/new"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Recipe
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            No activity yet. Follow some friends or add a recipe to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              {renderEvent(event)}
              <p className="mt-2 text-xs text-gray-400">
                {new Date(event.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}

          {nextCursor && (
            <button
              onClick={() => fetchFeed(nextCursor)}
              className="w-full rounded-md border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
