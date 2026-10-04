import { z } from 'zod';

export const MarkerSchema = z.object({
  id: z.string(),
  chatUrl: z.string().url(),
  text: z.string(),
  before: z.string(),
  after: z.string(),
  createdAt: z.number(),
});

export type Marker = z.infer<typeof MarkerSchema>;
