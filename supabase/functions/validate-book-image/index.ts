// validate-book-image
//
// Edge function de validation magic bytes pour les uploads d'images de
// livres et de pièces jointes de chat. Reçoit un fichier en multipart,
// vérifie les premiers octets pour détecter le vrai format (PNG/JPEG/WebP)
// indépendamment du Content-Type ou de l'extension fournis par le client.
// Upload via service_role pour pouvoir verrouiller RLS et empêcher tout
// upload direct non validé.
//
// Cf. audit sécurité finding #3.

import { corsHeaders, admin } from "../_shared/email.ts";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB, aligné sur publish.tsx
type ImageFormat = "jpeg" | "png" | "webp";

function detectFormat(buf: Uint8Array): ImageFormat | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "png";
  }
  // WebP: "RIFF"....WEBP" (bytes 0-3 = RIFF, 8-11 = WEBP)
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeRole(input: string): string {
  // Autorise lettres, chiffres, tiret, underscore — borne à 32 caractères.
  // Évite l'injection de chemin via "../" ou des caractères spéciaux.
  const cleaned = input.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
  return cleaned || "image";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  try {
    // 1) Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return jsonResponse(401, { error: "Unauthorized" });

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return jsonResponse(401, { error: "Unauthorized" });
    const userId = userData.user.id;

    // 2) Parse multipart
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return jsonResponse(400, { error: "invalid_multipart" });
    }
    const file = form.get("file");
    const kindRaw = (form.get("kind") ?? "book").toString();
    const role = sanitizeRole((form.get("role") ?? "image").toString());

    if (!(file instanceof File)) return jsonResponse(400, { error: "no_file" });
    if (file.size === 0) return jsonResponse(400, { error: "empty_file" });
    if (file.size > MAX_SIZE) return jsonResponse(413, { error: "file_too_large" });

    // 3) Magic bytes
    const buf = new Uint8Array(await file.arrayBuffer());
    const detected = detectFormat(buf);
    if (!detected) {
      return jsonResponse(415, { error: "invalid_image_format" });
    }

    // 4) Build path — séparation book vs chat-attachment pour traçabilité
    const ext = detected === "jpeg" ? "jpg" : detected;
    const ts = Date.now();
    const path =
      kindRaw === "chat"
        ? `chat-attachments/${userId}/${ts}-${role}.${ext}`
        : `${userId}/${ts}-${role}.${ext}`;

    // 5) Upload via service_role (contourne RLS — l'edge function est le
    //    seul chemin d'upload autorisé une fois la migration appliquée)
    const { error: upErr } = await admin.storage.from("book-images").upload(path, buf, {
      contentType: `image/${detected}`,
      upsert: false,
    });
    if (upErr) {
      console.error("storage upload failed", upErr);
      return jsonResponse(500, { error: upErr.message });
    }

    const { data: pub } = admin.storage.from("book-images").getPublicUrl(path);
    return jsonResponse(200, {
      ok: true,
      path,
      publicUrl: pub.publicUrl,
      format: detected,
    });
  } catch (e) {
    console.error(e);
    return jsonResponse(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
