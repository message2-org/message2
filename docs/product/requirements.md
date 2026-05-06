# Product requirements (v1/v2)

## v1 scope

- Registration/login via phone or email + password.
- One-to-one and group chats.
- Message types: text, image, video, audio, generic file.
- Message actions: edit, delete, reply, react.
- Media preview cards for images/video/audio.
- Read receipts, typing indicator, online presence.
- Push notifications for Android/Web.
- Light/Dark themes.

## v2 scope

- Custom themes.
- Channels and bot integrations.
- Sticker packs and GIF panel.
- Multi-device management UI.
- Advanced moderation/admin features.

## Non-functional requirements (SLA/SLO)

- API availability: 99.9% monthly.
- Message send p95 latency: <= 400ms in one region.
- Realtime delivery p95 after enqueue: <= 200ms.
- File upload success ratio: >= 99.5%.
- RPO for metadata: <= 15 minutes.
- RTO for primary region restore: <= 60 minutes.
