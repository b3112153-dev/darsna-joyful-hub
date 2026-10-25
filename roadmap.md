# Roadmap (current batch)

- [ ] Unify room/support/topic tools, private images and quoted thumbnails.
- [ ] Moderator stars and scoped deletion across messages and content.
- [ ] Verify tests, build and signed-in RTL/LTR message flow.

- [x] Simplify student chats to three entries and move Rooms to home; selection/privacy rules tested.
- [x] Staff chats inbox, grouped rooms, review and scoped tools; real staff session opens inbox and full-screen history.
- [x] Unified composed avatars and nickname privacy; explicit profile field reads; nickname dialog save remains visible.
- [x] Latin numerals and English Rooms terminology; 75 tests pass, build OK; 375/768/1280 RTL/LTR layouts checked.
- [ ] Reported-message count: blocked by absence of an existing reporting table/column; displays — rather than invented data.

Current verification limitations: review queue is empty, so no live approval/rejection was submitted; account has no nickname/art, so wardrobe save was not performed to avoid imposing a nickname lock. Student-only view and moderator restrictions are covered by concrete unit tests, not a second user's live session.

- [x] (1) Instagram-style message menu: ChatMessage + SupportThread — reactions (6 emojis, toggle, realtime), reply/edit(15min)/delete/copy, admin golden bubble + role badges
- [x] (2) Study sounds: Web Audio API (rain/fire/sea/nature), bottom sheet on home+focus, mixing, volume, Quran "soon" card
- [x] (3) Focus attendance check every 60min (10s countdown, auto-pause) + "choose hours" auto session splitting (50/10, 20 after 3)
- [x] (4a) /dhikr daily checklist + streak + story of day + /admin/dhikr CRUD
- [x] (4b) /study-rooms list + create + /study-rooms/$roomId with avatars/realtime/close
- [x] Build passes (tsgo clean), 65 tests pass, no horizontal scroll at 390px
- [~] Unverified: creating a study room end-to-end (test account not onboarded → DB rule "not allowed" fired correctly), attendance overlay (needs 60min), sound playback, admin/dhikr CRUD, support thread menu
