"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface List {
  id: string;
  name: string;
  _count: { items: number };
  items: { recipe: { id: string; title: string } }[];
}

export default function ListsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchLists = useCallback(async () => {
    const res = await fetch("/api/lists");
    if (!res.ok) return;
    setLists(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchLists();
    }
  }, [status, router, fetchLists]);

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName }),
    });
    setCreating(false);
    if (res.ok) {
      setNewListName("");
      fetchLists();
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading lists...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">My Lists</h1>

      <form onSubmit={createList} className="flex gap-2">
        <input
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          placeholder="New list name..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Create
        </button>
      </form>

      {lists.length === 0 ? (
        <p className="text-sm text-gray-400">
          No lists yet. Create one to organize your recipes.
        </p>
      ) : (
        <div className="space-y-3">
          {lists.map((list) => (
            <div
              key={list.id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium text-gray-900">
                  {list.name}
                </h2>
                <span className="text-xs text-gray-400">
                  {list._count.items} recipes
                </span>
              </div>
              {list.items.length > 0 && (
                <div className="space-y-1">
                  {list.items.map((item) => (
                    <Link
                      key={item.recipe.id}
                      href={`/recipes/${item.recipe.id}`}
                      className="block text-sm text-blue-600 hover:underline"
                    >
                      {item.recipe.title}
                    </Link>
                  ))}
                  {list._count.items > 4 && (
                    <p className="text-xs text-gray-400">
                      + {list._count.items - 4} more
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
