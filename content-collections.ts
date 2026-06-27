import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import { z } from "zod";

const dispatch = defineCollection({
  name: "dispatch",
  directory: "content/dispatch",
  include: "*.mdx",
  schema: z.object({
    title: z.string(),
    kicker: z.string(),
    section: z.string(),
    date: z.string(),           // ISO: "2026-06-26"
    time: z.string(),           // "14:32:07"
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    hero: z.string().optional(),
    live: z.boolean().default(false),
    author: z.string().default("Tel Masası"),
    readMinutes: z.number().default(4),
  }),
  transform: async (doc, ctx) => {
    const body = await compileMDX(ctx, doc);
    return { ...doc, slug: doc._meta.path, body };
  },
});

const page = defineCollection({
  name: "page",
  directory: "content/pages",
  include: "*.mdx",
  schema: z.object({
    title: z.string(),
    kicker: z.string().default("Kurumsal"),
    summary: z.string(),
    updated: z.string().optional(),
  }),
  transform: async (doc, ctx) => {
    const body = await compileMDX(ctx, doc);
    return { ...doc, slug: doc._meta.path, body };
  },
});

export default defineConfig({ collections: [dispatch, page] });
