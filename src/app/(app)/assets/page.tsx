"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Asset, Employee } from "@/types";

type AssetType = Asset["type"];
type AssetStatus = Asset["status"];

interface AssetRow extends Asset {
  employees?: { first_name: string; last_name: string } | null;
}

interface FormState {
  name: string;
  type: AssetType;
  serial_number: string;
  assigned_to: string;
  status: AssetStatus;
  purchase_date: string;
  notes: string;
}

const emptyForm: FormState = {
  name: "",
  type: "laptop",
  serial_number: "",
  assigned_to: "",
  status: "available",
  purchase_date: "",
  notes: "",
};

const typeOptions: AssetType[] = [
  "laptop",
  "phone",
  "tablet",
  "key",
  "access_card",
  "other",
];
const statusOptions: AssetStatus[] = [
  "available",
  "assigned",
  "maintenance",
  "retired",
];

const typeIcon: Record<AssetType, string> = {
  laptop: "💻",
  phone: "📱",
  tablet: "📋",
  key: "🔑",
  access_card: "💳",
  other: "📦",
};

const typeLabel: Record<AssetType, string> = {
  laptop: "Laptop",
  phone: "Phone",
  tablet: "Tablet",
  key: "Key",
  access_card: "Access Card",
  other: "Other",
};

const statusStyles: Record<AssetStatus, string> = {
  available: "bg-emerald-50 text-emerald-700",
  assigned: "bg-blue-50 text-blue-700",
  maintenance: "bg-amber-50 text-amber-700",
  retired: "bg-slate-100 text-slate-600",
};

const statusLabel: Record<AssetStatus, string> = {
  available: "Available",
  assigned: "Assigned",
  maintenance: "Maintenance",
  retired: "Retired",
};

const Field = ({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-medium text-slate-700">
      {label}
      {required && <span className="text-brand-orange"> *</span>}
    </span>
    {children}
  </label>
);

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20";

const KpiCard = ({
  title,
  value,
  icon,
  iconBg,
}: {
  title: string;
  value: number;
  icon: string;
  iconBg: string;
}) => (
  <div className="rounded-2xl bg-white p-5 shadow-card">
    <div className="flex items-start justify-between">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${iconBg}`}
      >
        {icon}
      </div>
    </div>
    <p className="mt-4 text-sm font-medium text-slate-500">{title}</p>
    <p className="mt-1 text-3xl font-bold text-brand-navy">{value}</p>
  </div>
);

export default function AssetsPage() {
  const { user } = useAuth();

  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AssetRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AssetRow | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const [assetRes, empRes] = await Promise.all([
      supabase
        .from("assets")
        .select("*, employees!assets_assigned_to_fkey(first_name, last_name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("employees")
        .select("id, first_name, last_name")
        .order("first_name"),
    ]);
    if (assetRes.error || empRes.error) {
      setError("Failed to load assets. Please try again.");
      setLoading(false);
      return;
    }
    setAssets((assetRes.data as AssetRow[]) || []);
    setEmployees((empRes.data as Employee[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const kpis = useMemo(() => {
    return {
      total: assets.length,
      available: assets.filter((a) => a.status === "available").length,
      assigned: assets.filter((a) => a.status === "assigned").length,
      maintenance: assets.filter((a) => a.status === "maintenance").length,
    };
  }, [assets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      const matchesSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.serial_number ?? "").toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || a.type === typeFilter;
      const matchesStatus =
        statusFilter === "all" || a.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [assets, search, typeFilter, statusFilter]);

  const updateField = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (asset: AssetRow) => {
    setEditing(asset);
    setForm({
      name: asset.name,
      type: asset.type,
      serial_number: asset.serial_number ?? "",
      assigned_to: asset.assigned_to ?? "",
      status: asset.status,
      purchase_date: asset.purchase_date ?? "",
      notes: asset.notes ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Asset name is required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      serial_number: form.serial_number.trim() || null,
      assigned_to: form.assigned_to || null,
      status: form.status,
      purchase_date: form.purchase_date || null,
      notes: form.notes.trim() || null,
    };

    const selectClause =
      "*, employees!assets_assigned_to_fkey(first_name, last_name)";

    if (editing) {
      const { data, error: err } = await supabase
        .from("assets")
        .update(payload)
        .eq("id", editing.id)
        .select(selectClause)
        .single();
      if (err) {
        setFormError(err.message);
        setSubmitting(false);
        return;
      }
      setAssets((prev) =>
        prev.map((a) => (a.id === editing.id ? (data as AssetRow) : a))
      );
    } else {
      const { data, error: err } = await supabase
        .from("assets")
        .insert(payload)
        .select(selectClause)
        .single();
      if (err) {
        setFormError(err.message);
        setSubmitting(false);
        return;
      }
      setAssets((prev) => [data as AssetRow, ...prev]);
    }
    setSubmitting(false);
    setModalOpen(false);
    setEditing(null);
  };

  const confirmDelete = async (asset: AssetRow) => {
    const snapshot = assets;
    setDeleteTarget(null);
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    const { error: err } = await supabase
      .from("assets")
      .delete()
      .eq("id", asset.id);
    if (err) {
      setAssets(snapshot);
      setError(`Failed to delete ${asset.name}.`);
    }
  };

  const assigneeName = (a: AssetRow) =>
    a.employees
      ? `${a.employees.first_name} ${a.employees.last_name}`
      : "Unassigned";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Assets</h1>
          <p className="text-sm text-slate-500">
            Track company equipment and assignments.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-orangeDark"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Asset
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Assets"
          value={kpis.total}
          icon="📦"
          iconBg="bg-brand-orange/10"
        />
        <KpiCard
          title="Available"
          value={kpis.available}
          icon="✅"
          iconBg="bg-emerald-50"
        />
        <KpiCard
          title="Assigned"
          value={kpis.assigned}
          icon="👤"
          iconBg="bg-blue-50"
        />
        <KpiCard
          title="In Maintenance"
          value={kpis.maintenance}
          icon="🔧"
          iconBg="bg-amber-50"
        />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or serial..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
          >
            <option value="all">All types</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {typeLabel[t]}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
          >
            <option value="all">All statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-orange" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-3xl">
              📦
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">
              {assets.length === 0 ? "No assets yet" : "No assets match your filters"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {assets.length === 0
                ? "Add your first asset to get started."
                : "Try adjusting your search or filters."}
            </p>
            {assets.length === 0 && (
              <button
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-orangeDark"
              >
                Add Asset
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-4 font-semibold">Name</th>
                  <th className="px-5 py-4 font-semibold">Type</th>
                  <th className="px-5 py-4 font-semibold">Serial No.</th>
                  <th className="px-5 py-4 font-semibold">Assigned To</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((asset) => (
                  <tr key={asset.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-brand-navy">
                        {asset.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
                        <span>{typeIcon[asset.type]}</span>
                        {typeLabel[asset.type]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                      {asset.serial_number || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {assigneeName(asset)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[asset.status]}`}
                      >
                        {statusLabel[asset.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(asset)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand-navy"
                          title="Edit"
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
                            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(asset)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                          title="Delete"
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
                            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-brand-navy">
                {editing ? "Edit Asset" : "Add Asset"}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                  {formError}
                </div>
              )}
              <Field label="Asset name" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Type">
                  <select
                    value={form.type}
                    onChange={(e) =>
                      updateField("type", e.target.value as AssetType)
                    }
                    className={inputClass}
                  >
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>
                        {typeIcon[t]} {typeLabel[t]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) =>
                      updateField("status", e.target.value as AssetStatus)
                    }
                    className={inputClass}
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel[s]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Serial number">
                  <input
                    type="text"
                    value={form.serial_number}
                    onChange={(e) =>
                      updateField("serial_number", e.target.value)
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Purchase date">
                  <input
                    type="date"
                    value={form.purchase_date}
                    onChange={(e) =>
                      updateField("purchase_date", e.target.value)
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Assigned to">
                <select
                  value={form.assigned_to}
                  onChange={(e) => updateField("assigned_to", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Unassigned</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Notes">
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  className={`${inputClass} resize-none`}
                  placeholder="Optional notes about this asset..."
                />
              </Field>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-orangeDark disabled:opacity-60"
                >
                  {submitting
                    ? "Saving..."
                    : editing
                      ? "Save changes"
                      : "Add asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            </div>
            <h3 className="mt-4 text-center text-lg font-bold text-brand-navy">
              Delete asset?
            </h3>
            <p className="mt-2 text-center text-sm text-slate-500">
              This will permanently remove{" "}
              <span className="font-medium text-slate-700">
                {deleteTarget.name}
              </span>
              . This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(deleteTarget)}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
