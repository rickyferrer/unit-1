"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  isFollowing: boolean;
  _count: {
    followers: number;
    following: number;
    recipes: number;
    cookEntries: number;
  };
}

interface Recipe {
  id: string;
  title: string;
  createdAt: string;
  _count: { cookEntries: number; favorites: number };
}

export default function ProfilePage() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"recipes" | "followers" | "following">("recipes");
  const [followers, setFollowers] = useState<{ id: string; name: string }[]>([]);
  const [followingList, setFollowingList] = useState<{ id: string; name: string }[]>([]);

  const isOwnProfile = session?.user?.id === userId;

  const fetchProfile = useCallback(async () => {
    const res = await fetch(`/api/users/${userId}`);
    if (!res.ok) return;
    setProfile(await res.json());
    setLoading(false);
  }, [userId]);

  const fetchRecipes = useCallback(async () => {
    const res = await fetch(`/api/recipes?authorId=${userId}`);
    if (!res.ok) return;
    const data = await res.json();
    setRecipes(data.recipes || []);
  }, [userId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchProfile();
      fetchRecipes();
    }
  }, [status, router, fetchProfile, fetchRecipes]);

  async function toggleFollow() {
    const method = profile?.isFollowing ? "DELETE" : "POST";
    await fetch(`/api/users/${userId}/follow`, { method });
    fetchProfile();
  }

  async function loadFollowers() {
    const res = await fetch(`/api/users/${userId}/followers`);
    if (res.ok) setFollowers(await res.json());
    setTab("followers");
  }

  async function loadFollowing() {
    const res = await fetch(`/api/users/${userId}/following`);
    if (res.ok) setFollowingList(await res.json());
    setTab("following");
  }

  if (loading || !profile) {
    return <p className="text-sm text-gray-500">Loading profile...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
          {profile.bio && (
            <p className="mt-1 text-sm text-gray-600">{profile.bio}</p>
          )}
          <div className="mt-2 flex gap-4 text-sm text-gray-500">
            <button onClick={() => setTab("recipes")} className="hover:text-gray-900">
              {profile._count.recipes} recipes
            </button>
            <button onClick={loadFollowers} className="hover:text-gray-900">
              {profile._count.followers} followers
            </button>
            <button onClick={loadFollowing} className="hover:text-gray-900">
              {profile._count.following} following
            </button>
            <span>{profile._count.cookEntries} cook entries</span>
          </div>
        </div>

        {!isOwnProfile && (
          <button
            onClick={toggleFollow}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              profile.isFollowing
                ? "border border-gray-300 text-gray-600 hover:bg-gray-50"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {profile.isFollowing ? "Unfollow" : "Follow"}
          </button>
        )}
      </div>

      {/* Tab content */}
      {tab === "recipes" && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Recipes
          </h2>
          {recipes.length === 0 ? (
            <p className="text-sm text-gray-400">No recipes yet.</p>
          ) : (
            recipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50"
              >
                <p className="text-sm font-medium text-gray-900">
                  {recipe.title}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {recipe._count.cookEntries} cook entries &middot;{" "}
                  {recipe._count.favorites} favorites
                </p>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === "followers" && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Followers
          </h2>
          {followers.length === 0 ? (
            <p className="text-sm text-gray-400">No followers yet.</p>
          ) : (
            followers.map((u) => (
              <Link
                key={u.id}
                href={`/profile/${u.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50 text-sm text-gray-900"
              >
                {u.name}
              </Link>
            ))
          )}
        </div>
      )}

      {tab === "following" && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Following
          </h2>
          {followingList.length === 0 ? (
            <p className="text-sm text-gray-400">Not following anyone yet.</p>
          ) : (
            followingList.map((u) => (
              <Link
                key={u.id}
                href={`/profile/${u.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50 text-sm text-gray-900"
              >
                {u.name}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
