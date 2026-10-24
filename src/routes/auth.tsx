import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ensureAdminAccount } from "@/lib/admin-setup.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin Login | Bill Manager" },
      { name: "description", content: "Sign in to the Bill Manager admin dashboard." },
      { property: "og:title", content: "Admin Login | Bill Manager" },
      { property: "og:description", content: "Sign in to the Bill Manager admin dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Idempotently provisions the admin account from server-side secrets.
  useEffect(() => { ensureAdminAccount().catch(() => {}); }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return setError("Invalid email or password");
    navigate({ to: "/admin" });
  }

  return (
    <div className="bg-light min-vh-100 d-flex align-items-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-8 col-md-5">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h1 className="h4 mb-4 text-center">Admin Login</h1>
                {error && <div className="alert alert-danger">{error}</div>}
                <form onSubmit={onSubmit}>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="email">Email</label>
                    <input id="email" type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="mb-4">
                    <label className="form-label" htmlFor="password">Password</label>
                    <input id="password" type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <button className="btn btn-dark w-100" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>
                </form>
                <div className="text-center mt-3"><Link to="/">Back to bill form</Link></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
