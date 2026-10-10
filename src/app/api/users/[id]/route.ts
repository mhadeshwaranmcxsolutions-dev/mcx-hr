import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { password, role, department_id, position_id, first_name, last_name, phone, salary, status, landing_page } = body;

    const supabase = createServerSupabase();

    // id is the employee record ID — fetch the employee to get the email
    const { data: empData, error: empFetchError } = await supabase
      .from("employees")
      .select("email")
      .eq("id", id)
      .single();

    if (empFetchError || !empData) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const email = empData.email;

    // Find the auth user by email
    const { data: authList } = await supabase.auth.admin.listUsers();
    const authUser = authList.users.find((u) => u.email === email);

    if (!authUser) {
      return NextResponse.json({ error: "Auth user not found" }, { status: 404 });
    }

    // Update auth user if password or role changed
    if (password || role) {
      const updatePayload: any = {};
      if (password) updatePayload.password = password;
      if (role) updatePayload.user_metadata = { role };
      const { error: authError } = await supabase.auth.admin.updateUserById(authUser.id, updatePayload);
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    }

    // Update employee record
    const empUpdate: any = {};
    if (first_name) empUpdate.first_name = first_name;
    if (last_name) empUpdate.last_name = last_name;
    if (role) empUpdate.role = role;
    if (department_id !== undefined) empUpdate.department_id = department_id || null;
    if (position_id !== undefined) empUpdate.position_id = position_id || null;
    if (phone !== undefined) empUpdate.phone = phone || null;
    if (salary !== undefined) empUpdate.salary = Number(salary) || 0;
    if (landing_page !== undefined) empUpdate.landing_page = landing_page || "/dashboard";
    if (status) empUpdate.status = status;

    if (Object.keys(empUpdate).length > 0) {
      const { error: empError } = await supabase
        .from("employees")
        .update(empUpdate)
        .eq("id", id);
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

    // id is the employee record ID — fetch the employee to get the email
    const { data: empData, error: empFetchError } = await supabase
      .from("employees")
      .select("email")
      .eq("id", id)
      .single();

    if (empFetchError || !empData) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const email = empData.email;

    // Find and delete the auth user by email
    const { data: authList } = await supabase.auth.admin.listUsers();
    const authUser = authList.users.find((u) => u.email === email);

    if (authUser) {
      const { error: authError } = await supabase.auth.admin.deleteUser(authUser.id);
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    }

    // Delete the employee record
    await supabase.from("employees").delete().eq("id", id);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
