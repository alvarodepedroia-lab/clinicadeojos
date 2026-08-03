import { z } from "zod";

export const careTypes = ["first_consultation", "follow_up", "study", "other_service"] as const;
const optionalDate = z.preprocess((value) => value === "" ? undefined : value, z.string().date().optional());

export const appointmentRequestSchema = z.object({
  careType: z.enum(careTypes),
  doctorName: z.string().trim().max(120).optional(),
  firstAvailable: z.boolean(),
  coverageKind: z.enum(["obra_social", "prepaga", "particular"]),
  coverageName: z.string().trim().max(120).optional(),
  coveragePlan: z.string().trim().max(80).optional(),
  memberNumber: z.string().trim().max(60).optional(),
  preferredDate: optionalDate,
  preferredTimeBand: z.string().trim().max(40).optional(),
  alternativeDate: optionalDate,
  alternativeTimeBand: z.string().trim().max(40).optional(),
  thirdDate: optionalDate,
  thirdTimeBand: z.string().trim().max(40).optional(),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  dni: z.string().trim().regex(/^\d{7,9}$/),
  phone: z.string().trim().min(8).max(30),
  email: z.string().trim().email().optional().or(z.literal("")),
  birthDate: optionalDate,
  returningPatient: z.boolean(),
}).superRefine((value, ctx) => {
  if (!value.firstAvailable && !value.doctorName) ctx.addIssue({ code: "custom", path: ["doctorName"], message: "Elegí un profesional o la primera disponibilidad." });
});

export type AppointmentRequestInput = z.infer<typeof appointmentRequestSchema>;
