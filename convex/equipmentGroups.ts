import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/auth";

const EQUIPMENT_CARD_FIELDS = (e: any) =>
  e ? { _id: e._id, name: e.name, photoUrl: e.photoUrl, quantity: e.quantity } : null;

async function itemsWithProgress(ctx: QueryCtx | MutationCtx, groupId: Id<"equipmentGroups">) {
  const items = await ctx.db.query("equipmentGroupItems").withIndex("groupId", (q) => q.eq("groupId", groupId)).collect();
  let quantityOutTotal = 0;
  let quantityReturnedTotal = 0;
  for (const item of items) {
    quantityOutTotal += item.quantityOut;
    quantityReturnedTotal += item.quantityReturned;
  }
  return { items, quantityOutTotal, quantityReturnedTotal };
}

// A non-template group whose items are all fully returned flips to
// RETURNED automatically. Never runs the other direction — a manual
// `closeGroup` override, or a group already RETURNED, is left alone so
// editing items afterwards doesn't silently reopen something the user
// explicitly closed.
async function maybeAutoComplete(ctx: MutationCtx, groupId: Id<"equipmentGroups">) {
  const group = await ctx.db.get(groupId);
  if (!group || group.isTemplate || group.status !== "OUT") return;

  const { items, quantityOutTotal, quantityReturnedTotal } = await itemsWithProgress(ctx, groupId);
  if (items.length > 0 && quantityReturnedTotal >= quantityOutTotal) {
    await ctx.db.patch(groupId, { status: "RETURNED", updatedAt: Date.now() });
  }
}

// Public: mirrors equipment.ts — reachable without login (dashboard button
// or a direct link), writes are the only thing gated by requireAuth.
export const list = query({
  args: { isTemplate: v.optional(v.boolean()) },
  handler: async (ctx, { isTemplate }) => {
    const groups =
      isTemplate === undefined
        ? await ctx.db.query("equipmentGroups").order("desc").collect()
        : await ctx.db
            .query("equipmentGroups")
            .withIndex("isTemplate", (q) => q.eq("isTemplate", isTemplate))
            .order("desc")
            .collect();

    return await Promise.all(
      groups.map(async (group) => {
        const { items, quantityOutTotal, quantityReturnedTotal } = await itemsWithProgress(ctx, group._id);
        return { ...group, itemCount: items.length, quantityOutTotal, quantityReturnedTotal };
      })
    );
  },
});

export const get = query({
  args: { groupId: v.string() },
  handler: async (ctx, { groupId }) => {
    const id = ctx.db.normalizeId("equipmentGroups", groupId);
    if (!id) return null;
    const group = await ctx.db.get(id);
    if (!group) return null;

    const { items } = await itemsWithProgress(ctx, id);
    const itemsWithEquipment = await Promise.all(
      items.map(async (item) => ({
        ...item,
        equipment: EQUIPMENT_CARD_FIELDS(await ctx.db.get(item.equipmentId)),
      }))
    );

    return { ...group, items: itemsWithEquipment };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isTemplate: v.boolean(),
    poleId: v.optional(v.id("poles")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const name = args.name.trim();
    if (!name) throw new ConvexError("Le nom du groupe est obligatoire");

    const groupId = await ctx.db.insert("equipmentGroups", {
      name,
      description: args.description?.trim() || undefined,
      isTemplate: args.isTemplate,
      status: args.isTemplate ? undefined : "OUT",
      poleId: args.poleId || undefined,
      createdBy: user._id,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(groupId);
  },
});

export const update = mutation({
  args: {
    groupId: v.id("equipmentGroups"),
    name: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    poleId: v.optional(v.union(v.id("poles"), v.null())),
  },
  handler: async (ctx, { groupId, name, description, poleId }) => {
    await requireAuth(ctx);
    const existing = await ctx.db.get(groupId);
    if (!existing) throw new ConvexError("Groupe introuvable");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) throw new ConvexError("Le nom du groupe est obligatoire");
      patch.name = trimmed;
    }
    if (description !== undefined) patch.description = description?.trim() || undefined;
    if (poleId !== undefined) patch.poleId = poleId || undefined;

    await ctx.db.patch(groupId, patch);
    return await ctx.db.get(groupId);
  },
});

export const remove = mutation({
  args: { groupId: v.id("equipmentGroups") },
  handler: async (ctx, { groupId }) => {
    await requireAuth(ctx);
    const existing = await ctx.db.get(groupId);
    if (!existing) throw new ConvexError("Groupe introuvable");

    const items = await ctx.db.query("equipmentGroupItems").withIndex("groupId", (q) => q.eq("groupId", groupId)).collect();
    for (const item of items) await ctx.db.delete(item._id);
    await ctx.db.delete(groupId);

    return { success: true };
  },
});

export const addItem = mutation({
  args: { groupId: v.id("equipmentGroups"), equipmentId: v.id("equipment"), quantity: v.number() },
  handler: async (ctx, { groupId, equipmentId, quantity }) => {
    await requireAuth(ctx);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ConvexError("La quantité doit être un nombre positif");
    }

    const group = await ctx.db.get(groupId);
    if (!group) throw new ConvexError("Groupe introuvable");
    const equipment = await ctx.db.get(equipmentId);
    if (!equipment || equipment.status === "DELETED") throw new ConvexError("Matériel introuvable");

    const existing = await ctx.db
      .query("equipmentGroupItems")
      .withIndex("groupAndEquipment", (q) => q.eq("groupId", groupId).eq("equipmentId", equipmentId))
      .first();

    let newQuantityOut: number;
    if (existing) {
      newQuantityOut = existing.quantityOut + Math.round(quantity);
      await ctx.db.patch(existing._id, { quantityOut: newQuantityOut });
    } else {
      newQuantityOut = Math.round(quantity);
      await ctx.db.insert("equipmentGroupItems", {
        groupId,
        equipmentId,
        quantityOut: newQuantityOut,
        quantityReturned: 0,
      });
    }
    await ctx.db.patch(groupId, { updatedAt: Date.now() });

    return { success: true, equipmentName: equipment.name, quantityOut: newQuantityOut };
  },
});

export const removeItem = mutation({
  args: { groupId: v.id("equipmentGroups"), equipmentId: v.id("equipment") },
  handler: async (ctx, { groupId, equipmentId }) => {
    await requireAuth(ctx);
    const existing = await ctx.db
      .query("equipmentGroupItems")
      .withIndex("groupAndEquipment", (q) => q.eq("groupId", groupId).eq("equipmentId", equipmentId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
    await ctx.db.patch(groupId, { updatedAt: Date.now() });

    return { success: true };
  },
});

export const setItemQuantity = mutation({
  args: { groupId: v.id("equipmentGroups"), equipmentId: v.id("equipment"), quantityOut: v.number() },
  handler: async (ctx, { groupId, equipmentId, quantityOut }) => {
    await requireAuth(ctx);
    if (!Number.isFinite(quantityOut) || quantityOut <= 0) {
      throw new ConvexError("La quantité doit être un nombre positif");
    }

    const existing = await ctx.db
      .query("equipmentGroupItems")
      .withIndex("groupAndEquipment", (q) => q.eq("groupId", groupId).eq("equipmentId", equipmentId))
      .first();
    if (!existing) throw new ConvexError("Cet article ne fait pas partie du groupe");

    const rounded = Math.round(quantityOut);
    await ctx.db.patch(existing._id, {
      quantityOut: rounded,
      // Keep the invariant quantityReturned <= quantityOut when the ceiling is lowered below what's already back.
      quantityReturned: Math.min(existing.quantityReturned, rounded),
    });
    await ctx.db.patch(groupId, { updatedAt: Date.now() });
    await maybeAutoComplete(ctx, groupId);

    return { success: true };
  },
});

// Scan (delta: +1 each decode) and the manual +1/-1 steppers both call
// this — a scan of an item not in the group fails loudly with a clear
// message instead of silently no-op'ing, so the UI can surface it.
export const recordReturn = mutation({
  args: { groupId: v.id("equipmentGroups"), equipmentId: v.id("equipment"), delta: v.optional(v.number()) },
  handler: async (ctx, { groupId, equipmentId, delta }) => {
    await requireAuth(ctx);

    const group = await ctx.db.get(groupId);
    if (!group) throw new ConvexError("Groupe introuvable");
    if (group.isTemplate) throw new ConvexError("Un kit ne suit pas de retour — créez un groupe depuis ce kit");

    const existing = await ctx.db
      .query("equipmentGroupItems")
      .withIndex("groupAndEquipment", (q) => q.eq("groupId", groupId).eq("equipmentId", equipmentId))
      .first();
    if (!existing) throw new ConvexError("Ce matériel ne fait pas partie de ce groupe");

    const step = delta ?? 1;
    const nextReturned = Math.max(0, Math.min(existing.quantityOut, existing.quantityReturned + step));
    await ctx.db.patch(existing._id, { quantityReturned: nextReturned });
    await ctx.db.patch(groupId, { updatedAt: Date.now() });
    await maybeAutoComplete(ctx, groupId);

    const equipment = await ctx.db.get(equipmentId);
    return { success: true, equipmentName: equipment?.name, quantityOut: existing.quantityOut, quantityReturned: nextReturned };
  },
});

export const closeGroup = mutation({
  args: { groupId: v.id("equipmentGroups") },
  handler: async (ctx, { groupId }) => {
    await requireAuth(ctx);
    const group = await ctx.db.get(groupId);
    if (!group || group.isTemplate) throw new ConvexError("Groupe introuvable");

    await ctx.db.patch(groupId, { status: "RETURNED", updatedAt: Date.now() });
    return { success: true };
  },
});

export const createFromTemplate = mutation({
  args: { templateGroupId: v.id("equipmentGroups"), name: v.optional(v.string()), poleId: v.optional(v.id("poles")) },
  handler: async (ctx, { templateGroupId, name, poleId }) => {
    const user = await requireAuth(ctx);
    const template = await ctx.db.get(templateGroupId);
    if (!template || !template.isTemplate) throw new ConvexError("Kit introuvable");

    const groupId = await ctx.db.insert("equipmentGroups", {
      name: name?.trim() || `${template.name} (sortie)`,
      description: template.description,
      isTemplate: false,
      status: "OUT",
      poleId: poleId || template.poleId,
      createdBy: user._id,
      updatedAt: Date.now(),
    });

    const templateItems = await ctx.db
      .query("equipmentGroupItems")
      .withIndex("groupId", (q) => q.eq("groupId", templateGroupId))
      .collect();
    for (const item of templateItems) {
      await ctx.db.insert("equipmentGroupItems", {
        groupId,
        equipmentId: item.equipmentId,
        quantityOut: item.quantityOut,
        quantityReturned: 0,
      });
    }

    return await ctx.db.get(groupId);
  },
});
