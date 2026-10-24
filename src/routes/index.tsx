import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Submit a Bill | Bill Manager" },
      { name: "description", content: "Submit your bill with title, amount in LKR, date and a photo." },
      { property: "og:title", content: "Submit a Bill | Bill Manager" },
      { property: "og:description", content: "Submit your bill with title, amount in LKR, date and a photo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UserPanel,
});

const MAX_BYTES = 2 * 1024 * 1024;

const schema = z.object({
  bill_title: z.string().trim().min(1, "Bill title is required").max(150),
  name: z.string().trim().min(1, "Name is required").max(100),
  amount: z.number({ message: "Enter a valid amount" }).min(0, "Amount must be positive").max(9999999999),
  bill_date: z.string().min(1, "Date is required"),
});

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function UserPanel() {
  const [form, setForm] = useState({ bill_title: "", name: "", amount: "", bill_date: "" });
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    const parsed = schema.safeParse({ ...form, amount: form.amount === "" ? NaN : Number(form.amount) });
    if (!parsed.success) return setMsg({ type: "danger", text: parsed.error.issues[0].message });
    if (!file) return setMsg({ type: "danger", text: "Please choose a bill image" });
    if (!file.type.startsWith("image/")) return setMsg({ type: "danger", text: "File must be an image" });
    if (file.size > MAX_BYTES) return setMsg({ type: "danger", text: "Image must be under 2 MB" });

    setSaving(true);
    try {
      const image_base64 = await fileToBase64(file);
      const { error } = await supabase.from("bills").insert({ ...parsed.data, image_base64 });
      if (error) throw error;
      setMsg({ type: "success", text: "Bill saved successfully!" });
      setForm({ bill_title: "", name: "", amount: "", bill_date: "" });
      setFile(null);
      setFileKey((k) => k + 1);
    } catch (err) {
      setMsg({ type: "danger", text: err instanceof Error ? err.message : "Could not save bill" });
    } finally {
      setSaving(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="bg-light min-vh-100">
      <nav className="navbar navbar-dark bg-dark">
        <div className="container">
          <span className="navbar-brand fw-semibold">Bill Manager</span>
          <Link to="/auth" className="btn btn-outline-light btn-sm">Admin Login</Link>
        </div>
      </nav>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h1 className="h4 mb-4">Submit a Bill</h1>
                {msg && <div className={`alert alert-${msg.type}`} role="alert">{msg.text}</div>}
                <form onSubmit={onSubmit} noValidate>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="title">Bill Title</label>
                    <input id="title" className="form-control" maxLength={150} value={form.bill_title} onChange={set("bill_title")} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="name">Name</label>
                    <input id="name" className="form-control" maxLength={100} value={form.name} onChange={set("name")} required />
                  </div>
                  <div className="row">
                    <div className="col-sm-6 mb-3">
                      <label className="form-label" htmlFor="amount">Amount (LKR)</label>
                      <input id="amount" type="number" min="0" step="0.01" className="form-control" value={form.amount} onChange={set("amount")} required />
                    </div>
                    <div className="col-sm-6 mb-3">
                      <label className="form-label" htmlFor="date">Date</label>
                      <input id="date" type="date" className="form-control" value={form.bill_date} onChange={set("bill_date")} required />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="form-label" htmlFor="image">Bill Image</label>
                    <input key={fileKey} id="image" type="file" accept="image/*" className="form-control" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
                    <div className="form-text">PNG or JPG, max 2 MB.</div>
                  </div>
                  <button type="submit" className="btn btn-primary w-100" disabled={saving}>
                    {saving ? "Saving..." : "Save Bill"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
