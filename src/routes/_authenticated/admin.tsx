import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatLKR, generateBillsPdf, type Bill } from "@/lib/bills-pdf";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard | Bill Manager" },
      { name: "description", content: "View, search and export all submitted bills." },
      { property: "og:title", content: "Admin Dashboard | Bill Manager" },
      { property: "og:description", content: "View, search and export all submitted bills." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "denied" | "error">("loading");
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: u.user!.id, _role: "admin" });
      if (!isAdmin) return setState("denied");
      const { data, error } = await supabase.from("bills").select("*").order("created_at", { ascending: false });
      if (error) { setError(error.message); return setState("error"); }
      setBills((data ?? []) as Bill[]);
      setState("ok");
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return bills;
    return bills.filter((b) => b.bill_title.toLowerCase().includes(s) || b.name.toLowerCase().includes(s));
  }, [bills, q]);
  const total = bills.reduce((s, b) => s + Number(b.amount), 0);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function downloadPdf() {
    setPdfBusy(true);
    try { await generateBillsPdf(bills); } finally { setPdfBusy(false); }
  }

  return (
    <div className="bg-light min-vh-100">
      <nav className="navbar navbar-dark bg-dark">
        <div className="container">
          <span className="navbar-brand fw-semibold">Bill Manager · Admin</span>
          <button className="btn btn-outline-light btn-sm" onClick={signOut}>Sign Out</button>
        </div>
      </nav>
      <div className="container py-4">
        {state === "loading" && <div className="text-center py-5"><div className="spinner-border" /></div>}
        {state === "denied" && <div className="alert alert-warning">This account does not have admin access.</div>}
        {state === "error" && <div className="alert alert-danger">{error}</div>}
        {state === "ok" && (
          <>
            <div className="row g-3 mb-4">
              <div className="col-sm-6">
                <div className="card shadow-sm"><div className="card-body">
                  <div className="text-muted small">Total Bills</div>
                  <div className="fs-3 fw-bold">{bills.length}</div>
                </div></div>
              </div>
              <div className="col-sm-6">
                <div className="card shadow-sm"><div className="card-body">
                  <div className="text-muted small">Total Amount</div>
                  <div className="fs-3 fw-bold">{formatLKR(total)}</div>
                </div></div>
              </div>
            </div>
            <div className="d-flex flex-column flex-md-row gap-2 mb-3">
              <input className="form-control" placeholder="Search by bill title or name..." value={q} onChange={(e) => setQ(e.target.value)} />
              <button className="btn btn-danger text-nowrap" onClick={downloadPdf} disabled={pdfBusy || bills.length === 0}>
                {pdfBusy ? "Generating..." : "Download All Bills as PDF"}
              </button>
            </div>
            <div className="card shadow-sm">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-dark">
                    <tr><th>#</th><th>Title</th><th>Name</th><th className="text-end">Amount</th><th>Date</th><th>Image</th></tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-4">No bills found</td></tr>}
                    {filtered.map((b, i) => (
                      <tr key={b.id}>
                        <td>{i + 1}</td>
                        <td>{b.bill_title}</td>
                        <td>{b.name}</td>
                        <td className="text-end text-nowrap">{formatLKR(Number(b.amount))}</td>
                        <td className="text-nowrap">{b.bill_date}</td>
                        <td>
                          <img src={b.image_base64} alt={b.bill_title} className="img-thumbnail" style={{ width: 64, height: 64, objectFit: "cover", cursor: "pointer" }} onClick={() => setPreview(b.image_base64)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      {preview && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,.6)" }} onClick={() => setPreview(null)}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content"><div className="modal-body text-center">
              <img src={preview} alt="Bill" className="img-fluid" />
            </div></div>
          </div>
        </div>
      )}
    </div>
  );
}
