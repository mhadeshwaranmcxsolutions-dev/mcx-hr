"use client";

import Link from "next/link";
import { useState } from "react";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20";

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-medium text-slate-700">
      {label}
    </span>
    {children}
  </label>
);

const BackButton = () => (
  <Link
    href="/settings"
    className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-brand-navy"
  >
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
    Back to Settings
  </Link>
);

export default function CompanySettingsPage() {
  const [company, setCompany] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <BackButton />

      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Company Settings</h1>
        <p className="text-sm text-slate-500">
          Your organization's contact details
        </p>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-card">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Company name">
              <input
                type="text"
                value={company.name}
                onChange={(e) =>
                  setCompany((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="MCX Solution Sdn Bhd"
                className={inputClass}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={company.email}
                onChange={(e) =>
                  setCompany((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="contact@mcxsolution.com"
                className={inputClass}
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                value={company.phone}
                onChange={(e) =>
                  setCompany((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="+60 3-1234 5678"
                className={inputClass}
              />
            </Field>
            <Field label="Address">
              <input
                type="text"
                value={company.address}
                onChange={(e) =>
                  setCompany((p) => ({ ...p, address: e.target.value }))
                }
                placeholder="Kuala Lumpur, Malaysia"
                className={inputClass}
              />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-orangeDark disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Saved successfully
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
