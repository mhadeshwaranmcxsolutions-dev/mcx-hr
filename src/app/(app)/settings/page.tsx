"use client";

import Link from "next/link";

const tabs = [
  {
    href: "/settings/company",
    label: "Company Settings",
    desc: "Your organization's contact details",
    icon: "M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01",
  },
  {
    href: "/settings/departments",
    label: "Departments",
    desc: "Organize teams and their structure",
    icon: "M3 21h18M5 21V7l7-4 7 4v14M9 9h6M9 13h6M9 17h6",
  },
  {
    href: "/settings/positions",
    label: "Positions",
    desc: "Job titles mapped to departments",
    icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm13 14v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    href: "/settings/users",
    label: "User Management",
    desc: "Create users, set roles & departments",
    icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M19 3.13a4 4 0 0 1 0 7.75M19 8v6M22 11h-6",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Settings</h1>
        <p className="text-sm text-slate-500">
          Manage company information, departments, and positions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-brand-orange hover:shadow-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange transition group-hover:bg-brand-orange group-hover:text-white">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={tab.icon} />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-bold text-brand-navy">
              {tab.label}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{tab.desc}</p>
            <div className="mt-3 flex items-center gap-1 text-sm font-medium text-brand-orange">
              Open
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 transition group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
