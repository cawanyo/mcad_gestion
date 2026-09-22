import { query, mutation, MutationCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAuth } from "./lib/auth";

// Excludes 0/O and 1/I — the code is meant to be printed small and
// occasionally read by eye as a scan fallback, so ambiguous characters are
// worth avoiding even though nothing here parses it by hand normally.
const SHORT_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const SHORT_CODE_LENGTH = 6;

function generateShortCode(): string {
  let code = "";
  for (let i = 0; i < SHORT_CODE_LENGTH; i++) {
    code += SHORT_CODE_ALPHABET[Math.floor(Math.random() * SHORT_CODE_ALPHABET.length)];
  }
  return code;
}

async function generateUniqueShortCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateShortCode();
    const existing = await ctx.db.query("equipment").withIndex("shortCode", (q) => q.eq("shortCode", code)).first();
    if (!existing) return code;
  }
  throw new ConvexError("Impossible de générer un code unique, réessayez");
}

const POLE_CARD_FIELDS = (p: any) =>
  p ? { _id: p._id, name: p.name, color: p.color, icon: p.icon } : null;

const CATEGORY_CARD_FIELDS = (c: any) => (c ? { _id: c._id, name: c.name } : null);

const USER_CARD_FIELDS = (u: any) =>
  u ? { _id: u._id, firstName: u.firstName, lastName: u.lastName, avatar: u.avatar } : null;

async function withRelations(ctx: any, item: any) {
  const [pole, category, createdByUser] = await Promise.all([
    item.poleId ? ctx.db.get(item.poleId) : null,
    item.categoryId ? ctx.db.get(item.categoryId) : null,
    item.createdBy ? ctx.db.get(item.createdBy) : null,
  ]);
  return {
    ...item,
    pole: POLE_CARD_FIELDS(pole),
    category: CATEGORY_CARD_FIELDS(category),
    createdByUser: USER_CARD_FIELDS(createdByUser),
  };
}

// Public: no auth required. The equipment list/detail pages are reachable
// without being logged in (dashboard button, or a direct/QR link).
export const list = query({
  args: {
    search: v.optional(v.string()),
    poleId: v.optional(v.id("poles")),
    categoryId: v.optional(v.id("equipmentCategories")),
  },
  handler: async (ctx, { search, poleId, categoryId }) => {
    const trimmed = search?.trim();
    let items = trimmed
      ? await ctx.db
          .query("equipment")
          .withSearchIndex("search_name", (q) => q.search("name", trimmed).eq("status", "ACTIVE"))
          .collect()
      : await ctx.db
          .query("equipment")
          .withIndex("status", (q) => q.eq("status", "ACTIVE"))
          .order("desc")
          .collect();

    if (poleId) items = items.filter((i) => i.poleId === poleId);
    if (categoryId) items = items.filter((i) => i.categoryId === categoryId);

    return await Promise.all(items.map((item) => withRelations(ctx, item)));
  },
});

// Public: returns null instead of throwing when missing/deleted/malformed
// so a stale or broken link, or a QR code that isn't one of ours, can
// render a friendly "introuvable" state rather than an error page. The id
// arrives as a plain string (not v.id("equipment")) precisely because it's
// taken straight from the URL — normalizeId is what safely turns an
// arbitrary string into a real Id or null, instead of the hard
// ArgumentValidationError a mistyped/garbage id would otherwise throw.
export const get = query({
  args: { equipmentId: v.string() },
  handler: async (ctx, { equipmentId }) => {
    const id = ctx.db.normalizeId("equipment", equipmentId);
    if (!id) return null;
    const item = await ctx.db.get(id);
    if (!item) return null;
    return await withRelations(ctx, item);
  },
});

// Public: turns whatever a scan decoded — the QR's full id (already run
// through extractEquipmentId client-side) or the barcode's short code —
// into a real equipment id. Every scan-consuming flow (search-by-scan,
// add-to-group, record-return) calls this once before touching the id, so
// they don't each need their own id-vs-shortCode branching.
export const resolveCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const trimmed = code.trim();
    if (!trimmed) return null;

    const asId = ctx.db.normalizeId("equipment", trimmed);
    if (asId) {
      const item = await ctx.db.get(asId);
      if (item) return { equipmentId: item._id, name: item.name };
    }

    const byShortCode = await ctx.db
      .query("equipment")
      .withIndex("shortCode", (q) => q.eq("shortCode", trimmed.toUpperCase()))
      .first();
    if (byShortCode) return { equipmentId: byShortCode._id, name: byShortCode.name };

    return null;
  },
});

export const listTrash = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const items = await ctx.db
      .query("equipment")
      .withIndex("status", (q) => q.eq("status", "DELETED"))
      .order("desc")
      .collect();
    return await Promise.all(items.map((item) => withRelations(ctx, item)));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    quantity: v.number(),
    // Accepts `null` too (not just undefined) so this validator matches
    // the shape EquipmentFormModal sends for both create and update — see
    // the comment on update's args for why update needs it.
    photoUrl: v.optional(v.union(v.string(), v.null())),
    poleId: v.optional(v.union(v.id("poles"), v.null())),
    categoryId: v.optional(v.union(v.id("equipmentCategories"), v.null())),
    description: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const name = args.name.trim();
    if (!name) throw new ConvexError("Le nom du matériel est obligatoire");
    if (!Number.isFinite(args.quantity) || args.quantity < 0) {
      throw new ConvexError("La quantité doit être un nombre positif");
    }

    const shortCode = await generateUniqueShortCode(ctx);

    const equipmentId = await ctx.db.insert("equipment", {
      name,
      quantity: Math.round(args.quantity),
      photoUrl: args.photoUrl || undefined,
      poleId: args.poleId || undefined,
      categoryId: args.categoryId || undefined,
      description: args.description?.trim() || undefined,
      status: "ACTIVE",
      shortCode,
      createdBy: user._id,
      updatedBy: user._id,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(equipmentId);
  },
});

export const update = mutation({
  args: {
    equipmentId: v.id("equipment"),
    name: v.optional(v.string()),
    quantity: v.optional(v.number()),
    // photoUrl/poleId/description accept `null` in addition to their value
    // type: EquipmentFormModal always resubmits the full form, so it needs
    // a way to say "clear this field" that's distinct from "omitted, leave
    // as-is". A bare `undefined` can't do that — the Convex client drops
    // undefined keys before they reach the handler, so `x !== undefined`
    // below would never see an intentional clear, only ever "not sent".
    photoUrl: v.optional(v.union(v.string(), v.null())),
    poleId: v.optional(v.union(v.id("poles"), v.null())),
    categoryId: v.optional(v.union(v.id("equipmentCategories"), v.null())),
    description: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, { equipmentId, name, quantity, photoUrl, poleId, categoryId, description }) => {
    const user = await requireAuth(ctx);

    const existing = await ctx.db.get(equipmentId);
    if (!existing || existing.status === "DELETED") {
      throw new ConvexError("Matériel introuvable");
    }

    const patch: Record<string, unknown> = { updatedBy: user._id, updatedAt: Date.now() };
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) throw new ConvexError("Le nom du matériel est obligatoire");
      patch.name = trimmedName;
    }
    if (quantity !== undefined) {
      if (!Number.isFinite(quantity) || quantity < 0) {
        throw new ConvexError("La quantité doit être un nombre positif");
      }
      patch.quantity = Math.round(quantity);
    }
    if (photoUrl !== undefined) patch.photoUrl = photoUrl || undefined;
    if (poleId !== undefined) patch.poleId = poleId || undefined;
    if (categoryId !== undefined) patch.categoryId = categoryId || undefined;
    if (description !== undefined) patch.description = description?.trim() || undefined;

    await ctx.db.patch(equipmentId, patch);
    return await ctx.db.get(equipmentId);
  },
});

export const softDelete = mutation({
  args: { equipmentId: v.id("equipment") },
  handler: async (ctx, { equipmentId }) => {
    const user = await requireAuth(ctx);
    const existing = await ctx.db.get(equipmentId);
    if (!existing) throw new ConvexError("Matériel introuvable");

    await ctx.db.patch(equipmentId, {
      status: "DELETED",
      deletedAt: Date.now(),
      updatedBy: user._id,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const restore = mutation({
  args: { equipmentId: v.id("equipment") },
  handler: async (ctx, { equipmentId }) => {
    const user = await requireAuth(ctx);
    const existing = await ctx.db.get(equipmentId);
    if (!existing) throw new ConvexError("Matériel introuvable");

    await ctx.db.patch(equipmentId, {
      status: "ACTIVE",
      deletedAt: undefined,
      updatedBy: user._id,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const permanentDelete = mutation({
  args: { equipmentId: v.id("equipment") },
  handler: async (ctx, { equipmentId }) => {
    await requireAuth(ctx);
    const existing = await ctx.db.get(equipmentId);
    if (!existing) throw new ConvexError("Matériel introuvable");
    if (existing.status !== "DELETED") {
      throw new ConvexError("Seul un matériel dans la corbeille peut être supprimé définitivement");
    }

    await ctx.db.delete(equipmentId);
    return { success: true };
  },
});
