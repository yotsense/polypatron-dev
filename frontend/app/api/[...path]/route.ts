import { NextRequest } from "next/server";

const API_BASE = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://api:8000";

async function proxy(req: NextRequest, ctx: { params: { path?: string[] } }) {
  const path = (ctx.params?.path || []).join("/");
  const url = new URL(req.url);

  // Reenviar querystring tal cual
  const target = `${API_BASE}/${path}${url.search}`;

  const headers = new Headers(req.headers);
  // Evita problemas de host/origin
  headers.delete("host");

  const init: RequestInit = {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer(),
    // importante: no cache en endpoints
    cache: "no-store",
  };

  const res = await fetch(target, init);

  const outHeaders = new Headers(res.headers);
  // opcional: limpiar headers conflictivos
  outHeaders.delete("content-encoding");

  return new Response(await res.arrayBuffer(), {
    status: res.status,
    headers: outHeaders,
  });
}

export async function GET(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
export async function POST(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
export async function PUT(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: any) {
  return proxy(req, ctx);
}
