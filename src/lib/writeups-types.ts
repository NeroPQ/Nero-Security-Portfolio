import type { z } from 'zod';
import type { reportSchema } from './writeups-core.mjs';

export type Writeup = z.infer<typeof reportSchema> & {
  markdown: string;
  html: string;
  headings: { depth: number; text: string; id: string }[];
  approved: boolean;
  readingMinutes: number;
};
