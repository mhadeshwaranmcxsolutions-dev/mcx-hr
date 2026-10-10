"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { JobPosting, Applicant, Department } from "@/types";

type JobStatus = JobPosting["status"];
type EmploymentType = JobPosting["employment_type"];
type ApplicantStatus = Applicant["status"];

interface JobPostingRow extends JobPosting {
  departments?: { name: string } | null;
}

interface ApplicantRow extends Applicant {
  job_postings?: { title: string } | null;
}

interface JobFormState {
  title: string;
  department_id: string;
  description: string;
  requirements: string;
  employment_type: EmploymentType;
  status: JobStatus;
  posted_date: string;
  closing_date: string;
}

const emptyJobForm: JobFormState = {
  title: "",
  department_id: "",
  description: "",
  requirements: "",
  employment_type: "full_time",
  status: "open",
  posted_date: new Date().toISOString().slice(0, 10),
  closing_date: "",
};

const jobStatusStyles: Record<JobStatus, string> = {
  open: "bg-emerald-50 text-emerald-700",
  closed: "bg-slate-100 text-slate-600",
  draft: "bg-amber-50 text-amber-700",
};

const applicantStatusStyles: Record<ApplicantStatus, string> = {
  applied: "bg-slate-100 text-slate-600",
  screening: "bg-blue-50 text-blue-700",
  interview: "bg-amber-50 text-amber-700",
  offer: "bg-purple-50 text-purple-700",
  hired: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

const employmentTypeOptions: EmploymentType[] = [
  "full_time",
  "part_time",
  "contract",
  "internship",
];

const jobStatusOptions: JobStatus[] = ["open", "closed", "draft"];

const applicantStatusOptions: ApplicantStatus[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
];

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatEmploymentType = (t: EmploymentType) => t.replace("_", " ");

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20";

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

const StarRating = ({ rating }: { rating: number }) => {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          viewBox="0 0 24 24"
          className={`h-4 w-4 ${s <= r ? "text-amber-400" : "text-slate-200"}`}
          fill="currentColor"
        >
          <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
};

const KpiCard = ({
  title,
  value,
  icon,
  iconBg,
}: {
  title: string;
  value: string | number;
  icon: string;
  iconBg: string;
}) => (
  <div className="rounded-2xl bg-white p-5 shadow-card">
    <div className="flex items-center gap-3">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={icon} />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-brand-navy">{value}</p>
      </div>
    </div>
  </div>
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-orange" />
  </div>
);

const EmptyState = ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7 text-slate-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    </div>
    <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
    <p className="mt-1 text-sm text-slate-500">{message}</p>
  </div>
);

export default function RecruitmentPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"jobs" | "applicants">("jobs");

  const [jobs, setJobs] = useState<JobPostingRow[]>([]);
  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPostingRow | null>(null);
  const [jobForm, setJobForm] = useState<JobFormState>(emptyJobForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteJobTarget, setDeleteJobTarget] =
    useState<JobPostingRow | null>(null);
  const [deleteApplicantTarget, setDeleteApplicantTarget] =
    useState<ApplicantRow | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const [jobsRes, applicantsRes, deptRes] = await Promise.all([
      supabase
        .from("job_postings")
        .select("*, departments(name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("applicants")
        .select("*, job_postings(title)")
        .order("created_at", { ascending: false }),
      supabase.from("departments").select("*").order("name"),
    ]);

    if (jobsRes.error || applicantsRes.error || deptRes.error) {
      setError("Failed to load recruitment data. Please try again.");
      setLoading(false);
      return;
    }

    setJobs((jobsRes.data as JobPostingRow[]) || []);
    setApplicants((applicantsRes.data as ApplicantRow[]) || []);
    setDepartments(deptRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const applicantCounts = useMemo(() => {
    const counts = new Map<string, number>();
    applicants.forEach((a) => {
      counts.set(a.job_id, (counts.get(a.job_id) || 0) + 1);
    });
    return counts;
  }, [applicants]);

  const kpis = useMemo(
    () => ({
      openJobs: jobs.filter((j) => j.status === "open").length,
      totalApplicants: applicants.length,
      hired: applicants.filter((a) => a.status === "hired").length,
      inInterview: applicants.filter((a) => a.status === "interview").length,
    }),
    [jobs, applicants]
  );

  const updateJobField = <K extends keyof JobFormState>(
    key: K,
    value: JobFormState[K]
  ) => {
    setJobForm((prev) => ({ ...prev, [key]: value }));
  };

  const openCreateJob = () => {
    setEditingJob(null);
    setJobForm(emptyJobForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditJob = (job: JobPostingRow) => {
    setEditingJob(job);
    setJobForm({
      title: job.title,
      department_id: job.department_id || "",
      description: job.description || "",
      requirements: job.requirements || "",
      employment_type: job.employment_type,
      status: job.status,
      posted_date: job.posted_date || "",
      closing_date: job.closing_date || "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setEditingJob(null);
  };

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobForm.title.trim()) {
      setFormError("Job title is required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);

    const payload = {
      title: jobForm.title.trim(),
      department_id: jobForm.department_id || null,
      description: jobForm.description.trim() || null,
      requirements: jobForm.requirements.trim() || null,
      employment_type: jobForm.employment_type,
      status: jobForm.status,
      posted_date: jobForm.posted_date || null,
      closing_date: jobForm.closing_date || null,
    };

    if (editingJob) {
      const { data, error: err } = await supabase
        .from("job_postings")
        .update(payload)
        .eq("id", editingJob.id)
        .select("*, departments(name)")
        .single();
      if (err) {
        setFormError(err.message);
        setSubmitting(false);
        return;
      }
      setJobs((prev) =>
        prev.map((j) => (j.id === editingJob.id ? (data as JobPostingRow) : j))
      );
    } else {
      const { data, error: err } = await supabase
        .from("job_postings")
        .insert(payload)
        .select("*, departments(name)")
        .single();
      if (err) {
        setFormError(err.message);
        setSubmitting(false);
        return;
      }
      setJobs((prev) => [data as JobPostingRow, ...prev]);
    }

    setSubmitting(false);
    setModalOpen(false);
    setEditingJob(null);
  };

  const confirmDeleteJob = async (job: JobPostingRow) => {
    const snapshot = jobs;
    setDeleteJobTarget(null);
    setJobs((prev) => prev.filter((j) => j.id !== job.id));
    const { error: err } = await supabase
      .from("job_postings")
      .delete()
      .eq("id", job.id);
    if (err) {
      setJobs(snapshot);
      setError(`Failed to delete job posting: ${err.message}`);
    }
  };

  const updateApplicantStatus = async (
    applicant: ApplicantRow,
    status: ApplicantStatus
  ) => {
    const previous = applicant.status;
    setApplicants((prev) =>
      prev.map((a) => (a.id === applicant.id ? { ...a, status } : a))
    );
    const { error: err } = await supabase
      .from("applicants")
      .update({ status })
      .eq("id", applicant.id);
    if (err) {
      setApplicants((prev) =>
        prev.map((a) => (a.id === applicant.id ? { ...a, status: previous } : a))
      );
      setError(`Failed to update applicant status: ${err.message}`);
    }
  };

  const confirmDeleteApplicant = async (applicant: ApplicantRow) => {
    const snapshot = applicants;
    setDeleteApplicantTarget(null);
    setApplicants((prev) => prev.filter((a) => a.id !== applicant.id));
    const { error: err } = await supabase
      .from("applicants")
      .delete()
      .eq("id", applicant.id);
    if (err) {
      setApplicants(snapshot);
      setError(`Failed to delete applicant: ${err.message}`);
    }
  };

  const tabs: { id: "jobs" | "applicants"; label: string }[] = [
    { id: "jobs", label: "Job Postings" },
    { id: "applicants", label: "Applicants" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Recruitment</h1>
          <p className="text-sm text-slate-500">
            Manage job postings and track applicants through the hiring pipeline.
          </p>
        </div>
        {activeTab === "jobs" && (
          <button
            onClick={openCreateJob}
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
            Post Job
          </button>
        )}
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
          title="Open Jobs"
          value={kpis.openJobs}
          icon="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm13 14v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
          iconBg="bg-brand-orange"
        />
        <KpiCard
          title="Total Applicants"
          value={kpis.totalApplicants}
          icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
          iconBg="bg-brand-navy"
        />
        <KpiCard
          title="Hired"
          value={kpis.hired}
          icon="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"
          iconBg="bg-emerald-500"
        />
        <KpiCard
          title="In Interview"
          value={kpis.inInterview}
          icon="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM22 11v6M19 14h6"
          iconBg="bg-amber-500"
        />
      </div>

      <div className="rounded-2xl bg-white p-1.5 shadow-card">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-brand-orange text-white shadow-glow"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white shadow-card">
          <LoadingSpinner />
        </div>
      ) : activeTab === "jobs" ? (
        <div className="overflow-hidden rounded-2xl bg-white shadow-card">
          {jobs.length === 0 ? (
            <EmptyState
              title="No job postings yet"
              message="Create your first job posting to start receiving applications."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4 font-semibold">Title</th>
                    <th className="px-5 py-4 font-semibold">Department</th>
                    <th className="px-5 py-4 font-semibold">Employment</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Posted</th>
                    <th className="px-5 py-4 font-semibold">Closing</th>
                    <th className="px-5 py-4 font-semibold">Applicants</th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => (
                    <tr key={job.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-medium text-brand-navy">
                        {job.title}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {job.departments?.name || "—"}
                      </td>
                      <td className="px-5 py-3.5 capitalize text-slate-600">
                        {formatEmploymentType(job.employment_type)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${jobStatusStyles[job.status]}`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {formatDate(job.posted_date)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {formatDate(job.closing_date)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-brand-orange/10 px-2 text-xs font-bold text-brand-orange">
                          {applicantCounts.get(job.id) || 0}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditJob(job)}
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
                            onClick={() => setDeleteJobTarget(job)}
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
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-card">
          {applicants.length === 0 ? (
            <EmptyState
              title="No applicants yet"
              message="Applicants will appear here once they apply for your job postings."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4 font-semibold">Name</th>
                    <th className="px-5 py-4 font-semibold">Email</th>
                    <th className="px-5 py-4 font-semibold">Job</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Rating</th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applicants.map((applicant) => (
                    <tr
                      key={applicant.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-3.5 font-medium text-brand-navy">
                        {applicant.full_name}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {applicant.email}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {applicant.job_postings?.title || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${applicantStatusStyles[applicant.status]}`}
                        >
                          {applicant.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StarRating rating={applicant.rating} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={applicant.status}
                            onChange={(e) =>
                              updateApplicantStatus(
                                applicant,
                                e.target.value as ApplicantStatus
                              )
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                          >
                            {applicantStatusOptions.map((s) => (
                              <option key={s} value={s}>
                                {s.replace("_", " ")}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => setDeleteApplicantTarget(applicant)}
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
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-brand-navy">
                {editingJob ? "Edit Job Posting" : "Post Job"}
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
            <form onSubmit={handleSubmitJob} className="space-y-4 px-6 py-5">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                  {formError}
                </div>
              )}
              <Field label="Job title" required>
                <input
                  type="text"
                  value={jobForm.title}
                  onChange={(e) => updateJobField("title", e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className={inputClass}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Department">
                  <select
                    value={jobForm.department_id}
                    onChange={(e) =>
                      updateJobField("department_id", e.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Employment type">
                  <select
                    value={jobForm.employment_type}
                    onChange={(e) =>
                      updateJobField(
                        "employment_type",
                        e.target.value as EmploymentType
                      )
                    }
                    className={inputClass}
                  >
                    {employmentTypeOptions.map((t) => (
                      <option key={t} value={t}>
                        {formatEmploymentType(t)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Status">
                  <select
                    value={jobForm.status}
                    onChange={(e) =>
                      updateJobField("status", e.target.value as JobStatus)
                    }
                    className={inputClass}
                  >
                    {jobStatusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Posted date">
                  <input
                    type="date"
                    value={jobForm.posted_date}
                    onChange={(e) =>
                      updateJobField("posted_date", e.target.value)
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Closing date">
                <input
                  type="date"
                  value={jobForm.closing_date}
                  onChange={(e) =>
                    updateJobField("closing_date", e.target.value)
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={jobForm.description}
                  onChange={(e) =>
                    updateJobField("description", e.target.value)
                  }
                  rows={4}
                  placeholder="Describe the role, responsibilities, and what we're looking for..."
                  className={`${inputClass} resize-none`}
                />
              </Field>
              <Field label="Requirements">
                <textarea
                  value={jobForm.requirements}
                  onChange={(e) =>
                    updateJobField("requirements", e.target.value)
                  }
                  rows={4}
                  placeholder="List the skills, experience, and qualifications required..."
                  className={`${inputClass} resize-none`}
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
                    : editingJob
                      ? "Save changes"
                      : "Post job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteJobTarget && (
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
              Delete job posting?
            </h3>
            <p className="mt-2 text-center text-sm text-slate-500">
              This will permanently remove{" "}
              <span className="font-medium text-slate-700">
                {deleteJobTarget.title}
              </span>{" "}
              and all associated applicants. This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setDeleteJobTarget(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDeleteJob(deleteJobTarget)}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteApplicantTarget && (
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
              Delete applicant?
            </h3>
            <p className="mt-2 text-center text-sm text-slate-500">
              This will permanently remove{" "}
              <span className="font-medium text-slate-700">
                {deleteApplicantTarget.full_name}
              </span>
              . This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setDeleteApplicantTarget(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDeleteApplicant(deleteApplicantTarget)}
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
