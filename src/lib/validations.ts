import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100),
  inviteCode: z.string().min(1, "Invite code is required"),
});

export const recipeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  source: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  prepTime: z.number().int().positive().optional(),
  cookTime: z.number().int().positive().optional(),
  servings: z.number().int().positive().optional(),
  ingredients: z.array(
    z.object({
      text: z.string().min(1),
      position: z.number().int().min(0),
    })
  ),
  steps: z.array(
    z.object({
      text: z.string().min(1),
      position: z.number().int().min(0),
    })
  ),
  tags: z.array(z.string()).optional(),
});

export const cookEntrySchema = z.object({
  cookedAt: z.string().datetime().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  caption: z.string().max(1000).optional(),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().optional(),
});

export const noteSchema = z.object({
  content: z.string().min(1).max(5000),
  isPublic: z.boolean().optional(),
});

export const listSchema = z.object({
  name: z.string().min(1).max(100),
});

export const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});
