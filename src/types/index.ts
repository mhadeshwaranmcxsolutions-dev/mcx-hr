export type Role = "admin" | "hr" | "manager" | "employee";

export interface Department {
  id: string;
  name: string;
  created_at: string;
}

export interface Position {
  id: string;
  title: string;
  department_id: string;
  created_at: string;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  position_id: string | null;
  role: Role;
  status: "active" | "inactive" | "on_leave";
  hire_date: string;
  salary: number;
  avatar_url: string | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: "present" | "absent" | "late" | "on_leave";
  created_at: string;
}

export type LeaveStatus = "pending" | "approved" | "rejected";
export type LeaveType = "annual" | "sick" | "personal" | "unpaid";

export interface LeaveRequest {
  id: string;
  employee_id: string;
  type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
  approved_by: string | null;
  created_at: string;
}

export interface Payroll {
  id: string;
  employee_id: string;
  month: string;
  year: number;
  basic_salary: number;
  overtime: number;
  deductions: number;
  net_salary: number;
  status: "pending" | "paid";
  paid_at: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: Role;
  avatar_url: string | null;
}
