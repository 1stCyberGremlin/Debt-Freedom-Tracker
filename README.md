# Debt Freedom Tracker

Debt Freedom Tracker is a private, mobile-first Progressive Web App for tracking debts, budget, bills, subscriptions, payments, goals, reminders, charts, and annual progress.

It has no login, no paid backend, and no server database. Your data is saved locally in the browser on the device using IndexedDB.

## What is included

- Dashboard with total debt, paid-this-month/year totals, monthly minimums, extra payment, remaining budget, debt-free estimate, smart reminders, next payments, recent payments, active goals, subscriptions, and quick actions.
- Debt tracker with add, edit, delete, paid-off status, priority order, payoff comparison, interest estimates, record-payment actions, and milestone cards.
- Monthly payoff simulator with minimum, snowball, avalanche, and custom priority methods, quick extra-payment buttons, a slider, invalid-payment warnings, and a month-by-month schedule.
- Payment history with creditor snapshot, payment date, amount, principal, interest, balance before/after, payment method, note, type, search, filters, edit, delete, and totals.
- Goals for debt-free dates, specific debt payoff dates, debt reduction targets, monthly debt-payment goals, interest savings, and subscription reduction.
- Charts built with native SVG/CSS, including projected balance, principal vs interest, debt distribution, bills by category, subscriptions by category, and yearly subscription cost.
- Payment calendar with monthly view, debts, bills, subscriptions, weekly/monthly totals, paid status, and filters.
- Bills section with recurring bills, paid/unpaid status, overdue list, and monthly bill total.
- Subscriptions section with monthly/yearly totals, renewals, paused/canceled status, easy-cancel highlights, and savings.
- Smarter reminders for due dates, overdue payments, renewals, milestones, monthly reviews, annual review, and subscription price review.
- Global search across debts, bills, subscriptions, payments, goals, reminders, categories, and notes.
- Annual Review with year selector, actual-history labels, estimates where needed, monthly breakdown, highlights, print support, and CSV export.
- Privacy & App Lock with optional 4- or 6-digit PIN, salted PIN hash, auto-lock choices, lock-now, rate limiting, and optional WebAuthn device verification when supported.
- Backup tools for JSON export, import preview, merge, replace, sample data, and clear data.
- PWA files: `manifest.json`, `sw.js`, icons, offline caching, and app-like navigation.

## Privacy and local data

The app stores data in IndexedDB inside the browser on the current device. There is no shared server account.

That means:

- Your iPhone data stays on your iPhone browser/app install.
- Another person can open the same app link on their own phone and their data stays separate.
- They cannot see your data unless they use your exact device/browser profile or you give them an exported JSON backup.
- If you clear browser website data or delete the Home Screen app, local data may be removed. Export backups when you want a copy.

## App Lock

App Lock is optional. When enabled, the app hides financial information until the correct PIN is entered.

- Use a 4-digit or 6-digit PIN.
- The plain PIN is not stored.
- The PIN is salted and hashed with the browser Web Crypto API.
- Incorrect attempts add a short delay.
- If you forget the PIN, the app cannot recover it because there is no server account. You may need to clear local app data unless you have another recovery path.
- Optional Face ID or Touch ID-style unlock only appears when the browser supports WebAuthn platform verification. PIN always remains the fallback.

## Reminder note for iPhone

This is an offline PWA with no paid backend. In-app reminders work offline. Browser notifications on iPhone depend on iOS, Safari, install state, and notification permissions. The app does not depend on push notifications and will not repeatedly ask for permission.

## Backup schema and migration

Current backup schema version: `2`.

IndexedDB:

- Database: `debtFreedomTrackerDB`
- Version: `2`
- Existing compatibility store: `appState`
- Added stores: `paymentHistory`, `goals`, `appLock`, `reminderState`, `annualReview`

The app keeps the original `appState` record so older local data and older backups can still be normalized into the new structure. Imports show a preview before replacing data. Merge import keeps stable IDs and skips duplicate records.

## Test locally

Use any simple local web server.

### Python

```bash
python -m http.server 5173
```

Open:

```text
http://localhost:5173
```

### Node

```bash
npx serve .
```

Open the local URL shown in the terminal.

## Suggested testing checklist

1. Open the app.
2. Go to Settings / Backup.
3. Tap Load sample tracker.
4. Add or edit a debt in Debts.
5. Tap Record Payment on a debt.
6. Open Payment History and try search and filters.
7. Open Payoff Simulator and try snowball, avalanche, custom, quick buttons, slider, and a very low payment.
8. Create a goal in Goals.
9. Open Charts and switch chart modes.
10. Open Annual Review and export CSV.
11. Open Search and search for a creditor, bill, subscription, payment, or goal.
12. Open Reminders and dismiss or snooze one.
13. Enable App Lock with a test PIN, lock the app, try a wrong PIN, then unlock with the correct PIN.
14. Export a JSON backup.
15. Import that backup and choose Merge or Replace.
16. Turn off the internet after the app has loaded once and refresh. The app should still open.

## Publish free with GitHub Pages

1. Create a new GitHub repository.
2. Upload all files from this folder.
3. In GitHub, open Settings.
4. Open Pages.
5. Choose Deploy from a branch.
6. Choose the `main` branch and root folder.
7. Save.
8. GitHub will show a free Pages URL after it publishes.

No domain is required.

## Publish free with Netlify

1. Create a free Netlify account.
2. Choose Add new site.
3. Drag this folder into Netlify Drop, or connect the GitHub repository.
4. Leave build command blank.
5. Use the project root as the publish directory.
6. Deploy.

## Publish free with Vercel

1. Create a free Vercel account.
2. Import the GitHub repository.
3. Use framework preset Other.
4. Leave build command blank.
5. Use the project root as the output directory if asked.
6. Deploy.

## Add to iPhone Home Screen

1. Open the published app link in Safari on your iPhone.
2. Tap the Share button.
3. Tap Add to Home Screen.
4. Keep the name or rename it.
5. Tap Add.
6. Open Debt Tracker from your Home Screen.

After first load, the service worker caches the app shell for offline use.

## Source files

- `index.html`: app entry page.
- `assets/styles.css`: mobile app styling, chart styling, print styling, and locked-screen styling.
- `assets/app.js`: app logic, IndexedDB migration, App Lock, payment history, simulator, goals, charts, annual review, reminders, search, forms, calculations, and backup.
- `manifest.json`: PWA install metadata.
- `sw.js`: offline service worker.
- `icons/` and `favicon.ico`: app icons.
- `backups/`: timestamped backup copy of the previous working version.
