import { NextResponse } from "next/server";
import { appointmentRequestSchema } from "@/lib/appointments";
import { createPublicApiClient } from "@/lib/supabase/server";
import { isValidPreference, type AvailabilityBlock } from "@/lib/availability";

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
  let slotMinutes = 30;
  let blocks: AvailabilityBlock[] = [];
  if (!value.firstAvailable && value.doctorName) {
    const { data: doctor, error: doctorError } = await client.from("doctors").select("id, slot_minutes, doctor_availability(weekday, start_time, end_time, active)").eq("full_name", value.doctorName).eq("active", true).maybeSingle();
    if (doctorError || !doctor) return NextResponse.json({ message: "El profesional seleccionado no está disponible. Elegí otra opción." }, { status: 409 });
    doctorId = doctor.id;
    slotMinutes = doctor.slot_minutes ?? 30;
    blocks = ((doctor.doctor_availability ?? []) as (AvailabilityBlock & { active: boolean })[]).filter((block) => block.active);
  } else {
    // Sin profesional elegido, vale cualquier día en que atienda alguien del equipo.
    const { data: agenda } = await client.from("doctor_availability").select("weekday, start_time, end_time").eq("active", true);
    blocks = (agenda ?? []) as AvailabilityBlock[];
  }

  // Un profesional sin bloques cargados tiene horarios rotativos: no se le exige fecha.
  if (blocks.length) {
    const preferences: [string | undefined, string | undefined][] = [
      [value.preferredDate, value.preferredTimeBand],
      [value.alternativeDate, value.alternativeTimeBand],
      [value.thirdDate, value.thirdTimeBand],
    ];
    if (!preferences.every(([date, time]) => isValidPreference(blocks, slotMinutes, date, time))) {
      return NextResponse.json({ message: "Alguno de los horarios elegidos ya no está disponible. Volvé a cargar la página y elegí otro." }, { status: 409 });
    }
  }
  const requestCode = `CO-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  const { error } = await client.from("appointment_requests").insert({
    request_code: requestCode,
    care_type: value.careType, doctor_id: doctorId, first_available: value.firstAvailable,
    coverage_kind: value.coverageKind, coverage_name: value.coverageName || null, coverage_plan: value.coveragePlan || null, member_number: value.memberNumber || null,
    preferred_date: value.preferredDate || null, preferred_time_band: value.preferredTimeBand || null, alternative_date: value.alternativeDate || null, alternative_time_band: value.alternativeTimeBand || null, third_date: value.thirdDate || null, third_time_band: value.thirdTimeBand || null,
    first_name: value.firstName, last_name: value.lastName, dni: value.dni, phone: value.phone, email: value.email || null, birth_date: value.birthDate || null, returning_patient: value.returningPatient,
  });
  if (error) {
    // La base tiene un índice único por profesional, día y hora. Si dos personas
    // mandan el mismo horario a la vez, la segunda cae acá.
    const ocupado = error.code === "23505" && error.message.includes("slot_unique");
    if (ocupado && isFormSubmission) {
      return NextResponse.redirect(new URL("/turnos/confirmacion?error=ocupado", request.url), { status: 303 });
    }
    if (ocupado) {
      return NextResponse.json({ message: "Ese horario acaba de ser reservado por otra persona. Elegí otro." }, { status: 409 });
    }
    return NextResponse.json({ message: "No pudimos registrar la solicitud. Intentá nuevamente o comunicate por WhatsApp." }, { status: 500 });
  }
  if (isFormSubmission) {
    const destino = new URL("/turnos/confirmacion", request.url);
    destino.searchParams.set("codigo", requestCode);
    if (value.preferredDate) destino.searchParams.set("fecha", value.preferredDate);
    if (value.preferredTimeBand) destino.searchParams.set("hora", value.preferredTimeBand);
    return NextResponse.redirect(destino, { status: 303 });
  }
  return NextResponse.json({ requestCode }, { status: 201 });
}
