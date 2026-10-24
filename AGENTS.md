<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Admin account is provisioned server-side from ADMIN_EMAIL/ADMIN_PASSWORD secrets by `ensureAdminAccount`; never put credentials in client code.
- Admin access is checked via `public.has_role` + `user_roles`; bills RLS allows public insert, admin-only select.
- UI uses Bootstrap classes (user requirement) rather than shadcn/Tailwind tokens.
