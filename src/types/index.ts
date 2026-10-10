export type Role = "admin" | "hr" | "manager" | "employee";

export interface Permission {
  id: string;
  role: Role;
  page: string;
  user_id: string | null;
  can_access: boolean;
  created_at: string;
  updated_at: string;
}

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
  landing_page: string | null;
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

export interface LeaveBalance {
  id: string;
  employee_id: string;
  year: number;
  annual_total: number;
  annual_used: number;
  sick_total: number;
  sick_used: number;
  personal_total: number;
  personal_used: number;
}

export interface PublicHoliday {
  id: string;
  name: string;
  date: string;
  year: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_by: string | null;
  created_at: string;
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  reviewer_id: string | null;
  period: string;
  rating: number;
  self_review: string | null;
  manager_review: string | null;
  status: "pending" | "submitted" | "completed";
  goals: any;
  created_at: string;
}

export interface ExpenseClaim {
  id: string;
  employee_id: string;
  category: "travel" | "meals" | "office" | "equipment" | "other";
  amount: number;
  description: string | null;
  receipt_url: string | null;
  status: "pending" | "approved" | "rejected" | "paid";
  approved_by: string | null;
  created_at: string;
}

export interface Asset {
  id: string;
  name: string;
  type: "laptop" | "phone" | "tablet" | "key" | "access_card" | "other";
  serial_number: string | null;
  assigned_to: string | null;
  status: "available" | "assigned" | "maintenance" | "retired";
  purchase_date: string | null;
  notes: string | null;
}

export interface TrainingCourse {
  id: string;
  title: string;
  description: string | null;
  provider: string | null;
  duration_hours: number | null;
  assigned_to: string;
  status: "not_started" | "in_progress" | "completed";
  completion_date: string | null;
  certificate_url: string | null;
  created_at: string;
}

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  days: string[];
  assigned_to: string | null;
}

export interface JobPosting {
  id: string;
  title: string;
  department_id: string | null;
  description: string | null;
  requirements: string | null;
  employment_type: "full_time" | "part_time" | "contract" | "internship";
  status: "open" | "closed" | "draft";
  posted_date: string | null;
  closing_date: string | null;
}

export interface Applicant {
  id: string;
  job_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  resume_url: string | null;
  status: "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
  rating: number;
  notes: string | null;
  created_at: string;
}

export interface OnboardingTask {
  id: string;
  employee_id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  due_date: string | null;
  assigned_to: string | null;
  created_at: string;
}

export interface BonusAllowance {
  id: string;
  employee_id: string;
  type: "bonus" | "allowance" | "deduction" | "epf" | "socso" | "pcb";
  amount: number;
  description: string | null;
  month: number;
  year: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  details: any;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  is_read: boolean;
  link: string | null;
  created_at: string;
}
