import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { password, role, department_id, position_id, first_name, last_name, phone, salary, status } = body;

    const supabase = createServerSupabase();

    if (password) {
      const { error: authError } = await supabase.auth.admin.updateUserById(id, {
        password,
        user_metadata: role ? { role } : undefined,
      });
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    } else if (role) {
      const { error: authError } = await supabase.auth.admin.updateUserById(id, {
        user_metadata: { role },
      });
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    }

    const empUpdate: any = {};
    if (first_name) empUpdate.first_name = first_name;
    if (last_name) empUpdate.last_name = last_name;
    if (role) empUpdate.role = role;
    if (department_id !== undefined) empUpdate.department_id = department_id || null;
    if (position_id !== undefined) empUpdate.position_id = position_id || null;
    if (phone !== undefined) empUpdate.phone = phone || null;
    if (salary !== undefined) empUpdate.salary = Number(salary) || 0;
    if (status) empUpdate.status = status;

    if (Object.keys(empUpdate).length > 0) {
      const { data: userData } = await supabase.auth.admin.getUserById(id);
      const { error: empError } = await supabase
        .from("employees")
        .update(empUpdate)
        .eq("email", userData.user?.email || "");
      if (empError) {
        return NextResponse.json({ error: empError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServerSupabase();

    const { data: userData } = await supabase.auth.admin.getUserById(id);
    const email = userData.user?.email;

    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (email) {
      await supabase.from("employees").delete().eq("email", email);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
