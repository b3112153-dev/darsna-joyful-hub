import { memo, useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Message } from "@/lib/chat-messages";

export const ChatMessage = memo(function ChatMessage({ message: m, own, canDelete, onDelete, onEdit }: {
  message: Message; own: boolean; canDelete: boolean; onDelete: (id: string) => Promise<void>; onEdit: (id: string, content: string) => Promise<boolean>;
}) {
  const admin = m.from_admin || m.sender_role === "admin";
  const moderator = !admin && m.sender_role === "moderator";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.content);
  const [saving, setSaving] = useState(false);
  async function save() {
    if (saving || !draft.trim()) return;
    setSaving(true);
    try { if (await onEdit(m.id, draft)) setEditing(false); } finally { setSaving(false); }
  }
  return (
    <div className={`group flex items-end gap-1 ${own ? "flex-row-reverse" : ""}`}>
      <div className="min-w-0 max-w-[78%]">
        <div className="mb-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <span>{admin ? "فريق درسنا جو" : m.profiles?.display_name}</span>
          {admin && <span className="rounded-full bg-role-badge px-2 py-0.5 text-role-badge-foreground">الإدارة</span>}
          {moderator && <span className="rounded-full bg-role-badge px-2 py-0.5 text-role-badge-foreground">مشرف</span>}
        </div>
        <div className={`min-w-0 rounded-[20px] px-3 py-2 ${admin ? "border-2 border-staff-border bg-staff text-staff-foreground" : own ? "rounded-bl-[6px] bg-bubble-own text-bubble-own-foreground" : "rounded-br-[6px] border border-border bg-bubble text-card-foreground"}`}>
        {editing ? <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="space-y-2">
          <Input aria-label="تعديل الرسالة" value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} />
          <div className="flex gap-1"><Button size="sm" disabled={saving || !draft.trim()}>حفظ</Button><Button size="sm" variant="ghost" type="button" disabled={saving} onClick={() => setEditing(false)}>إلغاء</Button></div>
        </form> : <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>}
        <p className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      </div>
      {(own || canDelete) && <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="خيارات الرسالة" className="size-8 shrink-0 text-muted-foreground"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {own && <DropdownMenuItem onSelect={() => { setDraft(m.content); setEditing(true); }}><Pencil /> تعديل</DropdownMenuItem>}
          {canDelete && <DropdownMenuItem onSelect={() => void onDelete(m.id)} className="text-destructive"><Trash2 /> حذف الرسالة</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>}
    </div>
  );
});