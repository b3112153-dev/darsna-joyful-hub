import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageActionsBar, copyMessage } from "@/components/MessageActions";
import { canEditNow, groupReactions, type ReactionRow } from "@/lib/reactions";
import type { Message } from "@/lib/chat-messages";
import { useLang, t } from "@/lib/i18n";
import { AvatarPic } from "@/components/AvatarPic";
import { profileName } from "@/lib/identity";
import { useMe } from "@/hooks/use-auth";

export const ChatMessage = memo(function ChatMessage({ message: m, own, canDelete, reactions, userId, now, onDelete, onEdit, onReact, onReply, replyPreview }: {
  message: Message;
  own: boolean;
  canDelete: boolean;
  reactions: ReactionRow[];
  userId: string | undefined;
  now: number;
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, content: string) => Promise<boolean>;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
  replyPreview: string | null;
}) {
  const { me } = useMe();
  const { lang } = useLang();
  const admin = m.from_admin || m.sender_role === "admin";
  const moderator = !admin && m.sender_role === "moderator";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.content);
  const [saving, setSaving] = useState(false);
  const editable = own && !m.image_path && canEditNow(m.created_at, now);
  const chips = groupReactions(reactions, m.id, userId);

  async function save() {
    if (saving || !draft.trim()) return;
    setSaving(true);
    try { if (await onEdit(m.id, draft)) setEditing(false); } finally { setSaving(false); }
  }

  return (
    <div className={`flex flex-col ${own ? "items-start" : "items-end"}`}>
      <MessageActionsBar actions={{
        onReact: (emoji) => onReact(m.id, emoji),
        onReply: () => onReply(m),
        onCopy: () => void copyMessage(m.content),
        ...(editable ? { onEdit: () => { setDraft(m.content); setEditing(true); } } : {}),
        ...(canDelete ? { onDelete: () => void onDelete(m.id) } : {}),
      }}>
        <div className={`min-w-0 max-w-[85%] cursor-pointer select-none ${own ? "text-start" : "text-end"}`}>
          <div className="mb-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <AvatarPic profile={m.profiles} className="size-7" />
            <span className="break-words">{admin ? t("فريق درسنا جو") : profileName(m.profiles, !!(me?.isStaff || me?.isSupport || me?.isOwner))}</span>
            {admin && <span className="rounded-full bg-role-badge px-2 py-0.5 text-role-badge-foreground">{t("الإدارة")}</span>}
            {moderator && <span className="rounded-full bg-role-badge px-2 py-0.5 text-role-badge-foreground">{t("مشرف")}</span>}
            {m.sender_role === "support" && <span className="rounded-full bg-role-badge px-2 py-0.5 text-role-badge-foreground">{t("دعم")}</span>}
          </div>
          <div className={`min-w-0 rounded-[20px] px-3 py-2 ${admin ? "border-2 border-staff-border bg-staff text-staff-foreground" : own ? "rounded-bl-[6px] bg-bubble-own text-bubble-own-foreground" : "rounded-br-[6px] border border-border bg-bubble text-card-foreground"}`}>
            {replyPreview !== null && (
              <p className="mb-1.5 truncate rounded-[12px] border-s-4 border-primary/60 bg-background/50 px-2 py-1 text-xs text-muted-foreground">{replyPreview}</p>
            )}
            {editing ? <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="space-y-2">
              <Input aria-label={t("تعديل الرسالة")} value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} />
              <div className="flex gap-1"><Button size="sm" disabled={saving || !draft.trim()}>{t("حفظ")}</Button><Button size="sm" variant="ghost" type="button" disabled={saving} onClick={() => setEditing(false)}>{t("إلغاء")}</Button></div>
            </form> : <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>}
            <p className="mt-1 text-[10px] opacity-70">
              {new Date(m.created_at).toLocaleTimeString(lang === "en" ? "en-US" : "ar-u-nu-latn", { hour: "2-digit", minute: "2-digit" })}
              {m.edited_at && t(" · معدّلة")}
            </p>
          </div>
        </div>
      </MessageActionsBar>
      {chips.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {chips.map((chip) => (
            <button key={chip.emoji} type="button" onClick={() => onReact(m.id, chip.emoji)} aria-label={`تفاعل ${chip.emoji}`}
              className={`rounded-full border px-2 py-0.5 text-xs transition active:scale-90 ${chip.mine ? "border-primary bg-secondary font-bold" : "bg-card"}`}>
              {chip.emoji} {chip.count}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
