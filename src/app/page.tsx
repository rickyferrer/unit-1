import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/feed");
  }

  const recipes = await prisma.recipe.findMany({
    take: 3,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true } },
      ingredients: { orderBy: { position: "asc" } },
      steps: { orderBy: { position: "asc" } },
      tags: { include: { tag: true } },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Cookbook</h1>
          <p className="mt-3 text-lg text-gray-500">
            A private, invite-only recipe sharing app for friends and family.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Save recipes, track what you cook, and share with the people you love.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <Link
              href="/login"
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Join with invite code
            </Link>
          </div>
        </div>
      </div>

      {/* Sample recipes */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-center text-sm font-medium uppercase tracking-wide text-gray-400 mb-8">
          Here&apos;s a taste of what&apos;s inside
        </h2>

        <div className="space-y-8">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="rounded-lg border border-gray-200 bg-white p-6"
            >
              <h3 className="text-xl font-semibold text-gray-900">
                {recipe.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                by {recipe.author.name}
                {recipe.source && <> &middot; {recipe.source}</>}
              </p>
              {recipe.description && (
                <p className="mt-2 text-sm text-gray-600">{recipe.description}</p>
              )}

              <div className="mt-3 flex gap-4 text-xs text-gray-400">
                {recipe.prepTime && <span>Prep: {recipe.prepTime} min</span>}
                {recipe.cookTime && <span>Cook: {recipe.cookTime} min</span>}
                {recipe.servings && <span>Serves {recipe.servings}</span>}
              </div>

              {recipe.tags.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {recipe.tags.map((t) => (
                    <span
                      key={t.tag.id}
                      className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500"
                    >
                      {t.tag.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Ingredients
                  </h4>
                  <ul className="space-y-1">
                    {recipe.ingredients.map((ing) => (
                      <li
                        key={ing.id}
                        className="text-sm text-gray-600 flex items-start gap-2"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                        {ing.text}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Steps
                  </h4>
                  <ol className="space-y-2">
                    {recipe.steps.map((step, i) => (
                      <li key={step.id} className="text-sm text-gray-600">
                        <span className="font-medium text-gray-700">{i + 1}.</span>{" "}
                        {step.text}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Sign up to save your own recipes, import from the web, and cook with friends.
          </p>
          <Link
            href="/register"
            className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Get started with an invite code
          </Link>
        </div>
      </div>
    </div>
  );
}
