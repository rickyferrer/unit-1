import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  // Create a bootstrap invite code for the first user
  const bootstrapCode = randomBytes(4).toString("hex");

  // Create initial user
  const passwordHash = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@cookbook.local" },
    update: {},
    create: {
      email: "demo@cookbook.local",
      passwordHash,
      name: "Demo User",
      bio: "I love cooking!",
    },
  });

  // Create some invite codes
  const codes = [];
  for (let i = 0; i < 5; i++) {
    const code = await prisma.inviteCode.create({
      data: {
        code: randomBytes(4).toString("hex"),
        createdById: user.id,
      },
    });
    codes.push(code.code);
  }

  // Create some tags
  const tagNames = [
    "vegetarian",
    "vegan",
    "weeknight",
    "dessert",
    "breakfast",
    "lunch",
    "dinner",
    "snack",
    "gluten-free",
    "comfort-food",
  ];

  for (const name of tagNames) {
    await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Create a sample recipe
  await prisma.recipe.create({
    data: {
      title: "Classic Pasta Aglio e Olio",
      source: "Family recipe",
      description:
        "Simple, fast, and incredibly flavorful. The key is not to burn the garlic.",
      prepTime: 5,
      cookTime: 15,
      servings: 4,
      authorId: user.id,
      ingredients: {
        create: [
          { text: "1 lb spaghetti", position: 0 },
          { text: "6 cloves garlic, thinly sliced", position: 1 },
          { text: "1/2 cup extra virgin olive oil", position: 2 },
          { text: "1/2 tsp red pepper flakes", position: 3 },
          { text: "1/4 cup fresh parsley, chopped", position: 4 },
          { text: "Salt to taste", position: 5 },
          { text: "1/2 cup reserved pasta water", position: 6 },
        ],
      },
      steps: {
        create: [
          {
            text: "Bring a large pot of salted water to a boil. Cook spaghetti according to package directions until al dente. Reserve 1 cup of pasta water before draining.",
            position: 0,
          },
          {
            text: "While pasta cooks, heat olive oil in a large skillet over medium-low heat. Add sliced garlic and cook slowly until golden (not brown), about 4-5 minutes.",
            position: 1,
          },
          {
            text: "Add red pepper flakes and cook for 30 seconds more.",
            position: 2,
          },
          {
            text: "Add drained pasta to the skillet. Toss with the oil and garlic, adding pasta water a splash at a time until the sauce coats the noodles.",
            position: 3,
          },
          {
            text: "Remove from heat, toss with parsley, and season with salt. Serve immediately.",
            position: 4,
          },
        ],
      },
      tags: {
        create: [
          {
            tag: { connect: { name: "weeknight" } },
          },
          {
            tag: { connect: { name: "dinner" } },
          },
          {
            tag: { connect: { name: "vegetarian" } },
          },
        ],
      },
    },
  });

  console.log("Seed complete!");
  console.log(`Demo user: demo@cookbook.local / password123`);
  console.log(`Available invite codes: ${codes.join(", ")}`);
  console.log(`Bootstrap invite code: ${bootstrapCode}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
