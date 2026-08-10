import { z } from "zod";
import { PROJECT_ROLES } from "../repositories/project-members.repository";

/**
 * Membership is added/updated by email (resolved server-side via `UsersRepository.findByEmail`),
 * never by raw `userId` (BE-010: never trust a client-supplied id directly).
 */
export const addOrAssignMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("must be a valid email address"),
  role: z.enum(PROJECT_ROLES),
});
export type AddOrAssignMemberDto = z.infer<typeof addOrAssignMemberSchema>;
