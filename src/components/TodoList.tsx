import { memo, useState } from "react";
import { CheckCheck, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PageState } from "@/components/PageState";
import { useTodos } from "@/hooks/use-todos";
import { TODO_TEXT_LIMIT, validTodoText } from "@/lib/todos";

export const TodoList = memo(function TodoList({ userId }: { userId: string }) {
  const [text, setText] = useState("");
  const tasks = useTodos(userId);
  return <section className="min-w-0 space-y-4" aria-label="مهامي">
    <h2 className="flex items-center gap-2 text-xl font-bold"><CheckCheck className="size-5 text-primary" /> مهامي</h2>
    <form className="flex gap-2" onSubmit={async (event) => {
      event.preventDefault(); if (!validTodoText(text) || tasks.pending) return;
      if (await tasks.act({ kind: "add", text, id: crypto.randomUUID() })) setText("");
    }}>
      <Input aria-label="مهمة جديدة" placeholder="شو بدك تنجز اليوم؟" maxLength={TODO_TEXT_LIMIT} value={text} onChange={(event) => setText(event.target.value)} className="min-w-0" disabled={tasks.pending || tasks.isLoading || tasks.isError} />
      <Button type="submit" size="icon" aria-label="إضافة مهمة" disabled={!validTodoText(text) || tasks.pending || tasks.isLoading || tasks.isError}>{tasks.pending ? <LoaderCircle className="animate-spin" /> : <Plus />}</Button>
    </form>
    {tasks.isLoading ? <PageState loading /> : tasks.isError ? <PageState error retry={() => void tasks.refetch()} /> : <>
      {!tasks.rows.length && <p className="py-4 text-center text-sm text-muted-foreground">يوم جديد، خطوة جديدة.</p>}
      <ul className="space-y-2">{tasks.rows.map((task) => <li key={task.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
        <Checkbox id={`todo-${task.id}`} checked={task.done} disabled={tasks.pending} onCheckedChange={(checked) => void tasks.act({ kind: "toggle", id: task.id, done: checked === true })} aria-label={`إنجاز ${task.text}`} />
        <label htmlFor={`todo-${task.id}`} className={`min-w-0 flex-1 break-words text-sm ${task.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.text}</label>
        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" aria-label={`حذف ${task.text}`} disabled={tasks.pending} onClick={() => void tasks.act({ kind: "delete", id: task.id })}><Trash2 className="size-4" /></Button>
      </li>)}</ul>
    </>}
  </section>;
});