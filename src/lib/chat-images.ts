export const CHAT_IMAGE_LIMIT = 5 * 1024 * 1024;
const extensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
export function validateChatImage(file: Pick<File, "type" | "size">) {
  if (!extensions[file.type]) return "اختر صورة png/jpg/webp/gif";
  if (file.size > CHAT_IMAGE_LIMIT) return "حجم الصورة لازم يكون 5MB أو أقل";
  return null;
}
export function chatImagePath(uid: string, id: string, mime: string) {
  const ext = extensions[mime];
  if (!ext) throw new Error("اختر صورة png/jpg/webp/gif");
  return `${uid}/${id}.${ext}`;
}