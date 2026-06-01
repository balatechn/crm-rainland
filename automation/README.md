# n8n Automation Workflows

Import any of the JSON files in this folder into n8n (Settings → Import from File).

Required env vars on n8n:
- `RAINLAND_API`   → e.g. `http://api.rainland.local/api`
- `RAINLAND_TOKEN` → JWT for a CRM service user (Admin or CRM_MANAGER)

## Included workflows
1. **01-auto-assign-lead.json** – Generic webhook → posts to `/leads` (auto-assigns branch + executive).
2. **02-followup-reminder.json** – Every 6h checks `/dashboard/followups` and sends a WhatsApp nudge for leads idle >48h.
3. **03-whatsapp-inbound.json** – Receives WhatsApp Business webhook → forwards to `/whatsapp/webhook` which auto-creates a lead and logs the message.

## Suggested extensions
- **Booking confirmation** → on `LeadStatus = BOOKING_CONFIRMED`, email/WhatsApp branch manager.
- **Delivery notification** → on `LeadStatus = DELIVERED`, notify HO dashboard + send customer feedback request.
