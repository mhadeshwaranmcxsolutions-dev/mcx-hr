import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, first_name, last_name, role, department_id, position_id, phone, salary, landing_page } = body;

    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: role || "employee", first_name, last_name },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const { error: empError } = await supabase.from("employees").insert({
      first_name,
      last_name,
      email,
      phone: phone || null,
      department_id: department_id || null,
      position_id: position_id || null,
      role: role || "employee",
      status: "active",
      salary: salary || 0,
      landing_page: landing_page || "/dashboard",
    });

    if (empError) {
      return NextResponse.json({ error: empError.message }, { status: 400 });
    }

    return NextResponse.json({ user: authData.user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
