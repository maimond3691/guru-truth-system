import { z } from 'zod';

export const CitationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('section'), ref: z.string().min(1) }),
  z.object({ type: z.literal('evidence'), id: z.string().min(1), path: z.string().optional(), sha: z.string().optional() }),
]);

export const CardSchema = z.object({
  title: z.string().min(3),
  audience: z.enum(['tech_new_hire', 'tech_your_team', 'tech_other_team', 'biz', 'expert']),
  pain: z.string().min(3),
  context: z.object({
    user_category: z.enum(['tech_new_hire', 'tech_your_team', 'tech_other_team', 'biz', 'expert']),
    specific_pain: z.string().min(1),
    when_where: z.string().min(1),
    current_state: z.string().min(1),
    desired_outcome: z.string().min(1),
  }),
  content_markdown: z.string().min(1),
  // Full Guru document body in HTML for direct creation, separate from markdown above.
  content_html: z.string().min(1),
  citations: z.array(CitationSchema).default([]),
  tags: z.array(z.string()).default([]),
  collection_hint: z.string().nullable().default(null),
  related_card_titles: z.array(z.string()).default([]),
  assets: z.object({
    images: z.array(z.object({
      slot: z.enum(['top', 'after_intro', 'before_conclusion', 'appendix']).default('after_intro'),
      description: z.string().min(1),
      source_ref: z.string().optional(),
    })).default([]),
    mermaid: z.array(z.object({
      slot: z.enum(['top', 'after_intro', 'before_conclusion', 'appendix']).default('before_conclusion'),
      description: z.string().min(1),
      based_on: z.array(CitationSchema).default([]),
    })).default([]),
  }).default({ images: [], mermaid: [] }),
});

export const Phase2ResponseSchema = z.object({
  cards: z.array(CardSchema),
  exhaustiveness_notes: z.string().default(''),
  complete: z.boolean().default(true),
  card_count: z.number().int().nonnegative(),
});

export type Phase2Response = z.infer<typeof Phase2ResponseSchema>;
export type Phase2Card = z.infer<typeof CardSchema>;
