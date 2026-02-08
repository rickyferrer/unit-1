import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

interface ImportedRecipe {
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  ingredients: string[];
  steps: string[];
}

function extractJsonLd(html: string): ImportedRecipe | null {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      let data = JSON.parse(match[1]);

      // Handle @graph arrays
      if (data["@graph"]) {
        data = data["@graph"].find(
          (item: Record<string, string>) =>
            item["@type"] === "Recipe" ||
            (Array.isArray(item["@type"]) && item["@type"].includes("Recipe"))
        );
        if (!data) continue;
      }

      // Handle arrays of objects
      if (Array.isArray(data)) {
        data = data.find(
          (item: Record<string, string>) =>
            item["@type"] === "Recipe" ||
            (Array.isArray(item["@type"]) && item["@type"].includes("Recipe"))
        );
        if (!data) continue;
      }

      const type = data["@type"];
      if (type !== "Recipe" && !(Array.isArray(type) && type.includes("Recipe"))) {
        continue;
      }

      const ingredients: string[] = (data.recipeIngredient || []).map((i: string) =>
        i.replace(/<[^>]*>/g, "").trim()
      );

      const steps: string[] = [];
      const instructions = data.recipeInstructions || [];
      for (const inst of instructions) {
        if (typeof inst === "string") {
          steps.push(inst.replace(/<[^>]*>/g, "").trim());
        } else if (inst["@type"] === "HowToStep") {
          steps.push((inst.text || inst.name || "").replace(/<[^>]*>/g, "").trim());
        } else if (inst["@type"] === "HowToSection") {
          for (const sub of inst.itemListElement || []) {
            if (typeof sub === "string") {
              steps.push(sub.replace(/<[^>]*>/g, "").trim());
            } else {
              steps.push((sub.text || sub.name || "").replace(/<[^>]*>/g, "").trim());
            }
          }
        }
      }

      const parseTime = (iso: string | undefined): number | undefined => {
        if (!iso) return undefined;
        const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        if (!match) return undefined;
        return (parseInt(match[1] || "0") * 60) + parseInt(match[2] || "0");
      };

      const parseServings = (val: unknown): number | undefined => {
        if (!val) return undefined;
        const s = Array.isArray(val) ? val[0] : val;
        const n = parseInt(String(s));
        return isNaN(n) ? undefined : n;
      };

      return {
        title: data.name || "Imported Recipe",
        description: data.description?.replace(/<[^>]*>/g, "").trim() || undefined,
        prepTime: parseTime(data.prepTime),
        cookTime: parseTime(data.cookTime),
        servings: parseServings(data.recipeYield),
        ingredients: ingredients.filter(Boolean),
        steps: steps.filter(Boolean),
      };
    } catch {
      continue;
    }
  }
  return null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const url = body.url;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Fetch the recipe page
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Cookbook/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL (${res.status})` },
        { status: 422 }
      );
    }

    const html = await res.text();
    const imported = extractJsonLd(html);

    if (!imported) {
      return NextResponse.json(
        { error: "No recipe data found on that page. The site may not include structured recipe data." },
        { status: 422 }
      );
    }

    // Save to database
    const recipe = await prisma.recipe.create({
      data: {
        title: imported.title,
        source: url,
        description: imported.description,
        prepTime: imported.prepTime,
        cookTime: imported.cookTime,
        servings: imported.servings,
        authorId: user.id,
        ingredients: {
          create: imported.ingredients.map((text, i) => ({ text, position: i })),
        },
        steps: {
          create: imported.steps.map((text, i) => ({ text, position: i })),
        },
      },
      include: {
        ingredients: { orderBy: { position: "asc" } },
        steps: { orderBy: { position: "asc" } },
        tags: { include: { tag: true } },
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    await prisma.feedEvent.create({
      data: {
        type: "new_recipe",
        userId: user.id,
        recipeId: recipe.id,
      },
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    console.error("[import] error:", error);
    return NextResponse.json(
      { error: "Failed to import recipe" },
      { status: 500 }
    );
  }
}
