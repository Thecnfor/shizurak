import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { agentMessages, agentThreads, genuiSpecs } from "../schema";

export interface SavedSpec {
  id: string;
  kind: "json-render" | "openui" | "rsc";
  themeId: string;
  spec: unknown;
}

export const specRepo = {
  async save(input: {
    kind: SavedSpec["kind"];
    spec: unknown;
    themeId: string;
    source: "visitor" | "author";
    threadId?: string;
    shared?: boolean;
  }): Promise<SavedSpec> {
    const [row] = await getDb()
      .insert(genuiSpecs)
      .values({
        kind: input.kind,
        spec: input.spec,
        themeId: input.themeId,
        source: input.source,
        threadId: input.threadId ?? null,
        shared: input.shared ?? false,
      })
      .returning({ id: genuiSpecs.id });
    return {
      id: row.id,
      kind: input.kind,
      themeId: input.themeId,
      spec: input.spec,
    };
  },
  async load(id: string) {
    const [row] = await getDb()
      .select()
      .from(genuiSpecs)
      .where(eq(genuiSpecs.id, id))
      .limit(1);
    return row ?? null;
  },
  async listShared(limit = 20) {
    return getDb()
      .select({
        id: genuiSpecs.id,
        kind: genuiSpecs.kind,
        themeId: genuiSpecs.themeId,
        createdAt: genuiSpecs.createdAt,
      })
      .from(genuiSpecs)
      .where(eq(genuiSpecs.shared, true))
      .orderBy(desc(genuiSpecs.createdAt))
      .limit(limit);
  },
};

export const threadRepo = {
  async ensure(threadId: string | undefined, visitorHash: string | undefined) {
    if (threadId) return threadId;
    const [row] = await getDb()
      .insert(agentThreads)
      .values({ kind: "visitor", visitorHash: visitorHash ?? null })
      .returning({ id: agentThreads.id });
    return row.id;
  },
  async appendMessage(input: {
    threadId: string;
    role: "user" | "assistant";
    parts: unknown;
    tokensIn?: number;
    tokensOut?: number;
  }) {
    await getDb()
      .insert(agentMessages)
      .values({
        threadId: input.threadId,
        role: input.role,
        parts: input.parts,
        tokensIn: input.tokensIn ?? null,
        tokensOut: input.tokensOut ?? null,
      });
  },
};
