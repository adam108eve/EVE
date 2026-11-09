import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  college: z.string().max(200).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const hackathonSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  rules: z.string().min(10),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: z.enum(["UPCOMING", "LIVE", "ENDED"]),
  totalSlots: z.number().int().min(1).max(10000).default(100),
  maxRealParticipants: z.number().int().min(1).max(100).default(5),
}).refine((value) => new Date(value.endAt) >= new Date(value.startAt), {
  message: "End time must be after start time.",
  path: ["endAt"],
});

export const submissionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  repoUrl: z.string().url().optional().or(z.literal("")),
});

export const evaluationSchema = z.object({
  score: z.number().min(0).max(100),
  adminFeedback: z.string().max(2000).optional(),
});

export const announcementSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(5),
  hackathonId: z.string().optional(),
});

export const rankAssignmentSchema = z.object({
  assignments: z.array(
    z.object({
      registrationId: z.string(),
      rank: z.number().int().min(1),
      displayName: z.string().min(1),
      score: z.number().min(0).max(100),
    })
  ),
});
