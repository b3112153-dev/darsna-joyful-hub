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
- Chat history uses cursor-paginated Query pages; Realtime merges only changed messages into that cache. Why: loaded history must survive new messages without full-list refetches.
- Heavy page views live in `src/components/pages` and load via `lazyRouteComponent`; route metadata stays eager. Why: navigation downloads only the selected experience.
- Only the global FocusWatcher completes expired timers. Why: timer views must not duplicate completion requests or notifications.
- The protected layout owns the global focus-mode provider and swaps its shell for the focus screen; dismissal is session-specific and never cancels the timer. Why: active sessions stay usable across navigation without exposing navigation during focus mode.
- Automatic focus-screen entry respects a user-scoped, safely hydrated browser preference; explicit entry remains available regardless of it. Why: students can change presentation without changing timer persistence.
- Personal tasks share a user-scoped Query cache with serialized optimistic mutations and rollback. Why: the home and focus screen show the same tasks without racing concurrent edits.
- Brand and message-role colors are semantic global CSS tokens, including legacy background utilities. Why: palette changes must update the entire platform without per-page hardcoded colors.
