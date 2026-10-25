import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageActionsBar, copyMessage } from "@/components/MessageActions";
import { canEditNow, type ReactionRow } from "@/lib/reactions";
import type { Message } from "@/lib/chat-messages";
import { useLang, t } from "@/lib/i18n";
import { AvatarPic } from "@/components/AvatarPic";
import { profileName } from "@/lib/identity";
import { ReactionBar } from "@/components/ReactionBar";
import { MessageRole } from "@/components/MessageRole";
import { ChatImage, type ImageBucket } from "@/components/ChatImage";
import { ReplyQuote, type Quote } from "@/components/ReplyQuote";
import { useMe } from "@/hooks/use-auth";

export const ChatMessage = memo(function ChatMessage({ message: m, own, canDelete, reactions, userId, now, onDelete, onEdit, onReact, onReply, replyPreview, replyQuote, imageBucket = "chat-images" }: {
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
  replyPreview?: string | null;
  replyQuote?: Quote | null;
  imageBucket?: ImageBucket;
}) {
  const { me } = useMe();
  const { lang } = useLang();
  const admin = m.from_admin || m.sender_role === "admin";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.content);
  const [saving, setSaving] = useState(false);
  const editable = own && canEditNow(m.created_at, now);

  async function save() {
    if (saving || (!draft.trim() && !m.image_path)) return;
    setSaving(true);
    try { if (await onEdit(m.id, draft)) setEditing(false); } finally { setSaving(false); }
  }

  return (
    <div className={`flex max-w-full flex-col px-8 ${own ? "items-start" : "items-end"}`}>
      <MessageActionsBar actions={{
        onReact: (emoji) => onReact(m.id, emoji),
        onReply: () => onReply(m),
        onCopy: () => void copyMessage(m.content),
        ...(editable ? { onEdit: () => { setDraft(m.content); setEditing(true); } } : {}),
        ...(canDelete ? { onDelete: () => void onDelete(m.id) } : {}),
      }}>
        <div className={`min-w-0 max-w-full cursor-pointer select-none ${own ? "text-start" : "text-end"}`}>
          <div className="mb-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <AvatarPic profile={m.profiles} className="size-7" />
            <span className="break-words">{admin ? t("فريق درسنا جو") : profileName(m.profiles, !!(me?.isStaff || me?.isSupport || me?.isOwner))}</span>
            <MessageRole role={m.sender_role} admin={admin} />
          </div>
          <div className={`min-w-0 rounded-[20px] px-3 py-2 ${admin ? "border-2 border-staff-border bg-staff text-staff-foreground" : own ? "rounded-bl-[6px] bg-bubble-own text-bubble-own-foreground" : "rounded-br-[6px] border border-border bg-bubble text-card-foreground"}`}>
            {(replyQuote || replyPreview) && <ReplyQuote quote={replyQuote ?? { content: replyPreview ?? "" }} bucket={imageBucket} />}
            {m.image_path && <ChatImage path={m.image_path} bucket={imageBucket} />}
            {editing ? <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="space-y-2">
              <Input aria-label={t("تعديل الرسالة")} value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} />
              <div className="flex gap-1"><Button size="sm" disabled={saving || (!draft.trim() && !m.image_path)}>{t("حفظ")}</Button><Button size="sm" variant="ghost" type="button" disabled={saving} onClick={() => setEditing(false)}>{t("إلغاء")}</Button></div>
            </form> : <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>}
            <p className="mt-1 text-[10px] opacity-70">
              {new Date(m.created_at).toLocaleTimeString(lang === "en" ? "en-US" : "ar-u-nu-latn", { hour: "2-digit", minute: "2-digit" })}
              {m.edited_at && t(" · معدّلة")}
            </p>
          </div>
        </div>
      </MessageActionsBar>
      <ReactionBar rows={reactions} id={m.id} userId={userId} onReact={(emoji) => onReact(m.id, emoji)} />
    </div>
  );
});
