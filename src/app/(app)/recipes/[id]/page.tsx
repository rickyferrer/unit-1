"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import StarRating from "@/components/StarRating";

interface Recipe {
  id: string;
  title: string;
  source: string | null;
  description: string | null;
  prepTime: number | null;
  cookTime: number | null;
  servings: number | null;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
  ingredients: { id: string; text: string; position: number }[];
  steps: { id: string; text: string; position: number }[];
  tags: { tag: { id: string; name: string } }[];
  cookEntries: {
    id: string;
    cookedAt: string;
    rating: number | null;
    caption: string | null;
    user: { id: string; name: string; avatarUrl: string | null };
  }[];
  _count: { cookEntries: number; comments: number; favorites: number };
  userStatus: string | null;
  isFavorited: boolean;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
  replies: Comment[];
}

export default function RecipeDetailPage() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const recipeId = params.id as string;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [cookRating, setCookRating] = useState(0);
  const [cookCaption, setCookCaption] = useState("");
  const [showCookForm, setShowCookForm] = useState(false);

  const fetchRecipe = useCallback(async () => {
    const res = await fetch(`/api/recipes/${recipeId}`);
    if (!res.ok) return;
    const data = await res.json();
    setRecipe(data);
    setLoading(false);
  }, [recipeId]);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/recipes/${recipeId}/comments`);
    if (!res.ok) return;
    const data = await res.json();
    setComments(data);
  }, [recipeId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchRecipe();
      fetchComments();
    }
  }, [status, router, fetchRecipe, fetchComments]);

  async function toggleFavorite() {
    const res = await fetch(`/api/recipes/${recipeId}/favorite`, {
      method: "POST",
    });
    if (res.ok) fetchRecipe();
  }

  async function setStatus(newStatus: string | null) {
    await fetch(`/api/recipes/${recipeId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchRecipe();
  }

  async function submitCookEntry(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/recipes/${recipeId}/cook-entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: cookRating || undefined,
        caption: cookCaption || undefined,
      }),
    });
    if (res.ok) {
      setShowCookForm(false);
      setCookRating(0);
      setCookCaption("");
      fetchRecipe();
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    const res = await fetch(`/api/recipes/${recipeId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment }),
    });
    if (res.ok) {
      setNewComment("");
      fetchComments();
    }
  }

  if (loading || !recipe) {
    return <p className="text-sm text-gray-500">Loading recipe...</p>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{recipe.title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          by{" "}
          <Link
            href={`/profile/${recipe.author.id}`}
            className="text-blue-600 hover:underline"
          >
            {recipe.author.name}
          </Link>
        </p>
        {recipe.source && (
          <p className="mt-1 text-sm text-gray-400">Source: {recipe.source}</p>
        )}
        {recipe.description && (
          <p className="mt-2 text-sm text-gray-700">{recipe.description}</p>
        )}
      </div>

      {/* Meta */}
      <div className="flex gap-6 text-sm text-gray-500">
        {recipe.prepTime && <span>Prep: {recipe.prepTime} min</span>}
        {recipe.cookTime && <span>Cook: {recipe.cookTime} min</span>}
        {recipe.servings && <span>Servings: {recipe.servings}</span>}
        <span>{recipe._count.favorites} favorites</span>
        <span>{recipe._count.cookEntries} cook entries</span>
      </div>

      {/* Tags */}
      {recipe.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {recipe.tags.map((t) => (
            <span
              key={t.tag.id}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
            >
              {t.tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={toggleFavorite}
          className={`rounded-md px-3 py-1.5 text-sm font-medium border ${
            recipe.isFavorited
              ? "bg-yellow-50 border-yellow-300 text-yellow-700"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {recipe.isFavorited ? "Favorited" : "Favorite"}
        </button>
        <button
          onClick={() => setStatus("want_to_cook")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium border ${
            recipe.userStatus === "want_to_cook"
              ? "bg-blue-50 border-blue-300 text-blue-700"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          Want to Cook
        </button>
        <button
          onClick={() => setShowCookForm(!showCookForm)}
          className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
        >
          I Cooked This
        </button>
        {recipe.userStatus && (
          <button
            onClick={() => setStatus(null)}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Clear status
          </button>
        )}
      </div>

      {/* Cook Entry Form */}
      {showCookForm && (
        <form
          onSubmit={submitCookEntry}
          className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
        >
          <h3 className="text-sm font-medium text-gray-900">Log a cook entry</h3>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Rating</label>
            <StarRating rating={cookRating} onChange={setCookRating} />
          </div>
          <div>
            <label htmlFor="caption" className="block text-sm text-gray-600 mb-1">
              Caption / Notes
            </label>
            <textarea
              id="caption"
              rows={2}
              value={cookCaption}
              onChange={(e) => setCookCaption(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
          >
            Save Cook Entry
          </button>
        </form>
      )}

      {/* Ingredients */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Ingredients</h2>
        <ul className="space-y-1">
          {recipe.ingredients.map((ing) => (
            <li key={ing.id} className="text-sm text-gray-700 flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-400 flex-shrink-0" />
              {ing.text}
            </li>
          ))}
        </ul>
      </div>

      {/* Steps */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Steps</h2>
        <ol className="space-y-3">
          {recipe.steps.map((step, i) => (
            <li key={step.id} className="text-sm text-gray-700">
              <span className="font-medium text-gray-900">Step {i + 1}.</span>{" "}
              {step.text}
            </li>
          ))}
        </ol>
      </div>

      {/* Recent Cook Entries */}
      {recipe.cookEntries.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Recent Cook Entries
          </h2>
          <div className="space-y-3">
            {recipe.cookEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-gray-200 bg-white p-3"
              >
                <div className="flex items-center gap-2">
                  <Link
                    href={`/profile/${entry.user.id}`}
                    className="text-sm font-medium text-gray-900 hover:underline"
                  >
                    {entry.user.name}
                  </Link>
                  <span className="text-xs text-gray-400">
                    {new Date(entry.cookedAt).toLocaleDateString()}
                  </span>
                </div>
                {entry.rating && (
                  <StarRating rating={entry.rating} readonly />
                )}
                {entry.caption && (
                  <p className="mt-1 text-sm text-gray-600">{entry.caption}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Comments ({recipe._count.comments})
        </h2>

        <form onSubmit={submitComment} className="flex gap-2 mb-4">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Post
          </button>
        </form>

        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-2">
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href={`/profile/${comment.user.id}`}
                    className="text-sm font-medium text-gray-900 hover:underline"
                  >
                    {comment.user.name}
                  </Link>
                  <span className="text-xs text-gray-400">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{comment.content}</p>
              </div>
              {/* Replies */}
              {comment.replies?.map((reply) => (
                <div
                  key={reply.id}
                  className="ml-6 rounded-lg border border-gray-100 bg-gray-50 p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/profile/${reply.user.id}`}
                      className="text-sm font-medium text-gray-900 hover:underline"
                    >
                      {reply.user.name}
                    </Link>
                    <span className="text-xs text-gray-400">
                      {new Date(reply.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{reply.content}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Delete (only for author) */}
      {session?.user?.id === recipe.author.id && (
        <div className="border-t pt-4">
          <button
            onClick={async () => {
              if (!confirm("Delete this recipe?")) return;
              const res = await fetch(`/api/recipes/${recipeId}`, {
                method: "DELETE",
              });
              if (res.ok) router.push("/feed");
            }}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Delete recipe
          </button>
        </div>
      )}
    </div>
  );
}
