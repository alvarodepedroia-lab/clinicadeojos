import { NextResponse } from "next/server";
import { appointmentRequestSchema } from "@/lib/appointments";
import { createPublicApiClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const client = createPublicApiClient();
  if (!client) return NextResponse.json({ message: "El sistema de solicitudes todavía no está configurado." }, { status: 503 });
  const isFormSubmission = request.headers.get("content-type")?.includes("application/x-www-form-urlencoded");
  const formData = isFormSubmission ? await request.formData() : null;
  const body = formData ? {
    careType: formData.get("careType"), doctorName: formData.get("doctorName") || undefined, firstAvailable: !formData.get("doctorName"),
    coverageKind: formData.get("coverageKind"), coverageName: formData.get("coverageName") || undefined, coveragePlan: formData.get("coveragePlan") || undefined, memberNumber: formData.get("memberNumber") || undefined,
    preferredDate: formData.get("preferredDate") || undefined, preferredTimeBand: formData.get("preferredTimeBand") || undefined, alternativeDate: formData.get("alternativeDate") || undefined, alternativeTimeBand: formData.get("alternativeTimeBand") || undefined, thirdDate: formData.get("thirdDate") || undefined, thirdTimeBand: formData.get("thirdTimeBand") || undefined,
    firstName: formData.get("firstName"), lastName: formData.get("lastName"), dni: formData.get("dni"), phone: formData.get("phone"), email: formData.get("email") || "", birthDate: formData.get("birthDate") || undefined, returningPatient: false,
  } : await request.json().catch(() => null);
  const parsed = appointmentRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Revisá los datos ingresados.", issues: parsed.error.flatten() }, { status: 400 });
  const value = parsed.data;
  let doctorId: string | null = null;
  if (!value.firstAvailable && value.doctorName) {
    const { data: doctor, error: doctorError } = await client.from("doctors").select("id").eq("full_name", value.doctorName).eq("active", true).maybeSingle();
    if (doctorError || !doctor) return NextResponse.json({ message: "El profesional seleccionado no está disponible. Elegí otra opción." }, { status: 409 });
    doctorId = doctor.id;
  }
  const requestCode = `CO-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  const { error } = await client.from("appointment_requests").insert({
    request_code: requestCode,
    care_type: value.careType, doctor_id: doctorId, first_available: value.firstAvailable,
    coverage_kind: value.coverageKind, coverage_name: value.coverageName || null, coverage_plan: value.coveragePlan || null, member_number: value.memberNumber || null,
    preferred_date: value.preferredDate || null, preferred_time_band: value.preferredTimeBand || null, alternative_date: value.alternativeDate || null, alternative_time_band: value.alternativeTimeBand || null, third_date: value.thirdDate || null, third_time_band: value.thirdTimeBand || null,
    first_name: value.firstName, last_name: value.lastName, dni: value.dni, phone: value.phone, email: value.email || null, birth_date: value.birthDate || null, returning_patient: value.returningPatient,
  });
  if (error) return NextResponse.json({ message: "No pudimos registrar la solicitud. Intentá nuevamente o comunicate por WhatsApp." }, { status: 500 });
  if (isFormSubmission) return NextResponse.redirect(new URL(`/turnos/confirmacion?codigo=${requestCode}`, request.url), { status: 303 });
  return NextResponse.json({ requestCode }, { status: 201 });
}
