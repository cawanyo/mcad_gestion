import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAuth } from "./lib/auth";

// Public: the category filter on the (public) equipment list page needs
// this without requiring login.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("equipmentCategories").collect();
    return categories.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    await requireAuth(ctx);

    const trimmed = name.trim();
    if (!trimmed) throw new ConvexError("Le nom de la catégorie est obligatoire");

    // No unique index for this (Convex has none) — dedup by hand so two
    // users typing "Câbles" from the equipment form's inline "+ Nouvelle
    // catégorie" don't create two near-identical entries.
    const existing = await ctx.db.query("equipmentCategories").collect();
    const duplicate = existing.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) return duplicate;

    const categoryId = await ctx.db.insert("equipmentCategories", { name: trimmed, updatedAt: Date.now() });
    return await ctx.db.get(categoryId);
  },
});
