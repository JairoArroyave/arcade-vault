import { Resend } from "resend";

type ContactRequestBody = {
  name: string;
  email: string;
  msg: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ContactRequestBody>;
  const name = body.name?.trim();
  const email = body.email?.trim();
  const msg = body.msg?.trim();

  if (!name || !email || !msg) {
    return Response.json(
      { ok: false, error: "Nombre, correo y mensaje son obligatorios." },
      { status: 400 },
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: process.env.CONTACT_FROM_EMAIL!,
    to: process.env.CONTACT_TO_EMAIL!,
    replyTo: email,
    subject: `Nuevo mensaje de contacto — ${name}`,
    text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${msg}`,
  });

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 502 });
  }

  return Response.json({ ok: true });
}
