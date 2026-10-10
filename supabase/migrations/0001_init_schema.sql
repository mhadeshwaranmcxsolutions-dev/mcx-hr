-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Departments
create table if not exists departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Positions
create table if not exists positions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  department_id uuid references departments(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Profiles (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  role text not null default 'employee' check (role in ('admin','hr','manager','employee')),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Employees
create table if not exists employees (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text,
  department_id uuid references departments(id) on delete set null,
  position_id uuid references positions(id) on delete set null,
  role text not null default 'employee' check (role in ('admin','hr','manager','employee')),
  status text not null default 'active' check (status in ('active','inactive','on_leave')),
  hire_date date not null default current_date,
  salary numeric(12,2) not null default 0,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Attendance
create table if not exists attendance (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null,
  clock_in timestamptz,
  clock_out timestamptz,
  status text not null default 'present' check (status in ('present','absent','late','on_leave')),
  created_at timestamptz not null default now(),
  unique (employee_id, date)
);

-- Leave requests
create table if not exists leave_requests (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  type text not null check (type in ('annual','sick','personal','unpaid')),
  start_date date not null,
  end_date date not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_by uuid references employees(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Payroll
create table if not exists payroll (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  month text not null,
  year integer not null,
  basic_salary numeric(12,2) not null default 0,
  overtime numeric(12,2) not null default 0,
  deductions numeric(12,2) not null default 0,
  net_salary numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (employee_id, month, year)
);

-- Seed default departments
insert into departments (name) values
  ('Human Resources'),
  ('Finance'),
  ('Sales'),
  ('Operations'),
  ('IT'),
  ('Customer Service')
on conflict (name) do nothing;

-- Enable RLS
alter table departments enable row level security;
alter table positions enable row level security;
alter table profiles enable row level security;
alter table employees enable row level security;
alter table attendance enable row level security;
alter table leave_requests enable row level security;
alter table payroll enable row level security;

-- RLS policies (all authenticated users can read/write for MVP; tighten later)
create policy "allow all authenticated" on departments
  for all to authenticated using (true) with check (true);
create policy "allow all authenticated" on positions
  for all to authenticated using (true) with check (true);
create policy "allow all authenticated" on profiles
  for all to authenticated using (true) with check (true);
create policy "allow all authenticated" on employees
  for all to authenticated using (true) with check (true);
create policy "allow all authenticated" on attendance
  for all to authenticated using (true) with check (true);
create policy "allow all authenticated" on leave_requests
  for all to authenticated using (true) with check (true);
create policy "allow all authenticated" on payroll
  for all to authenticated using (true) with check (true);
