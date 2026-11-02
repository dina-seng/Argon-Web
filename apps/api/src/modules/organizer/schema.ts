/** modules/organizer/schema.ts */
import { z } from 'zod';
export const eventIdParamSchema = z.object({ eventId: z.string().uuid() });
export const issueStaffBodySchema = z.object({ name: z.string().min(1), email: z.string().email() });
export type IssueStaffBody = z.infer<typeof issueStaffBodySchema>;
