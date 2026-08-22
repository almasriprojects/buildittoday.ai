import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  return NextResponse.json({ message: "Signed out" });
}
