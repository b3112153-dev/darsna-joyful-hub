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

## Architecture rules
- Permissions are enforced by RLS using `has_role` / `is_staff` / `is_banned` security-definer functions; client checks are UI-only. Why: the browser client is untrusted.
- Roles live only in `user_roles`, bans only in `user_bans` (admin/mod-writable). Why: avoid self-escalation via profile edits.
- The first user to sign up becomes admin (signup trigger). Why: bootstraps admin access without manual SQL.
- Avatars live in a private bucket; `profiles.avatar_url` stores the storage path, resolved via signed URLs in `UserAvatar`. Why: public buckets are blocked in this workspace.
- Chat updates use Realtime on `messages` that invalidate the room's query. Why: single source of truth via react-query.
