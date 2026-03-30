import { NextResponse } from "next/server";
import { resolveSessionUser } from "@/lib/auth";
import { addFavorite, listFavorites, removeFavorite } from "@/lib/userlists";

async function getUserId(request: Request) {
  const sessionUser = await resolveSessionUser(request);
  if (sessionUser) return sessionUser.id;
  const { searchParams } = new URL(request.url);
  return Number(searchParams.get("userId") ?? 2);
}

export async function GET(request: Request) {
  return NextResponse.json({ favorites: await listFavorites(await getUserId(request)) });
}

export async function POST(request: Request) {
  const body = await request.json();
  const sessionUser = await resolveSessionUser(request);
  await addFavorite(Number(sessionUser?.id ?? body.userId ?? 2), Number(body.movieId));
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const sessionUser = await resolveSessionUser(request);
  await removeFavorite(Number(sessionUser?.id ?? body.userId ?? 2), Number(body.movieId));
  return NextResponse.json({ ok: true });
}
