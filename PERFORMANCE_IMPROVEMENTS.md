# Performance Improvements (Nov 2025)

## What's Fixed

### 1. Non-blocking email delivery
- All endpoints now call `sendEmailInBackground()` so HTTP responses return immediately.
- Affected areas: property/furniture requests, service bookings, rentals, payment confirmations, invoice emails, admin reminders.
- Errors are logged with full context without blocking the user flow.

### 2. Query/pagination optimizations
- Property & furniture listings already paginated; furniture queries now use `.lean()` to avoid expensive hydration.
- Service booking lists (`getBookings`, `getMyBookings`) now stream lean documents to the UI.

### 3. MongoDB indexing
- `Property`, `Furniture`, `PropertyForm`, `FurnitureForm` schemas now include compound indexes for `property_id`, `furniture_id`, status, city, createdAt, etc., dramatically speeding up admin filters and dashboards.

## Impact
- Property/furniture requests submit in milliseconds even if SMTP is slow.
- Admin actions (status changes, reminders, invoices) no longer freeze the UI while emails send.
- List pages (properties, furniture, service bookings) load faster thanks to indexes + lean projections.

## Next Steps
1. **Monitor logs** for `sendEmailInBackground` to ensure email providers stay healthy.
2. **Pagination everywhere**: extend lean/pagination to any remaining list endpoints (e.g., rental admin tables if needed).
3. **Job queues**: consider moving recurring cron + email dispatch into a worker (BullMQ / Agenda) for even smoother scaling.
4. **Frontend**: ensure UI components request paginated data (page & limit) to leverage backend optimizations.

