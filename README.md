# Court Booking

A court-booking product for a two-court pickleball venue, built end to end with [coss ui](https://coss.com/ui).

**UI primitives are coss ui ([cosscom/ui](https://github.com/cosscom/ui), MIT), installed with the shadcn CLI and unmodified; product components are composed from them.**

**[Live demo →](https://rkj-builds.github.io/slot-picker/)** · the case study it comes from: [Project 831](https://rkj-builds.github.io/project-831-case-study/)

At [Project 831](https://project831.in) in Jamshedpur, self-serve bookings with nothing paid were cancelled 45% of the time, with ten no-shows; bookings paid in full or in part, 7% and none. So the booking engine learned to ask for money before it holds a court: a 50% deposit at weekends, full payment for people who have ghosted before, a 15-minute hold while they pay. This repo rebuilds that product, customer side and venue side, with invented customers and no real money.

<p>
  <img src="docs/desk-light.png" alt="The venue desk: a day of two courts in half-hour rows, with paid, part-paid and due-at-venue bookings, a stats strip and a red now-line." width="100%" />
</p>

<table>
  <tr>
    <td width="34%"><img src="docs/book-light.png" alt="Step 2 of the booking flow on a phone: a day stepper, durations and a grid of start times, with taken slots struck through." /></td>
    <td><img src="docs/insights-dark.png" alt="Insights in dark mode: 48% of unpaid self-serve bookings cancelled against 8% of paid ones, 11 no-shows against 0, and weekly bars where unpaid bookings thin out after pay-first went live." /></td>
  </tr>
</table>

## What's in it

- **Book** (`#/book`, phone first). Five steps with their own URLs: court, time, details, hold and pay, done. The payment step offers what the policy decides (pay at the venue or now on a weekday; 50% or full at the weekend; full for a pay-first customer), holds the court with a visible countdown, and handles a declined payment, an expired hold and a slot taken mid-payment. Done has the paid and due split, an `.ics`, a WhatsApp share and cancellation with credit or refund. A **Scenarios** popover forces each of those states in seconds.
- **Desk** (`#/desk`, desktop and tablet first; phones get a list). The day as courts by half hours, every booking's ledger in a side sheet; record cash, mark no-show, cancel, flag pay-first, copy a payment link, each with a toast and an Undo. Plus a searchable bookings table with CSV export, and **Insights** charts drawn from the same store.
- **Settings** (`#/desk/settings`). Deposit, prepay days, hold length, pay-first list, hours and prices. Save a 30% deposit and the next customer on `#/book` is asked for 30%.
- **Components** (`#/components`). The 41 coss ui components this product uses, in their states and as the product uses them, light and dark side by side, with the app's own compositions labelled.

## What I obsessed over

- **The policy is one pure function.** `decidePayment(policy, slot, customer)` decides every option a customer sees; the checkout, the desk seed and the tests all call it.
- **Money is integer paise.** Splits put the rounding on one side, so ₹700.01 at 33% still adds back to the paisa; paid and due are derived from the ledger, never stored.
- **A hold is real.** It blocks the slot for everyone, counts down in a meter that announces milestones rather than every second, and releases itself the moment it expires, or when you walk back past "Pay".
- **States are never colour alone.** Every desk block has an icon, a word and a border or texture; every chart has a table for screen readers.
- **One tab stop per grid.** The slot grid and the desk grid both use roving focus; desk cells read "Court 2, 7:00 pm, empty, ₹800 an hour".
- **Durations are never decimal and times keep their zone.** "1 hour 30 minutes", Asia/Kolkata everywhere, `Intl` only, no date library.
- **Nothing is faked to look finished.** 300–600 ms of latency in the store makes every skeleton real; `?offline=1` shows the error states.

## Components

### coss ui, as installed

`src/components/ui`, `src/hooks` and the coss files in `src/lib` (`segmented-control.ts`, `composer-*.ts`, `utils.ts`) were written by

```sh
npx shadcn@latest add @coss/ui @coss/colors-neutral   # registry: https://coss.com/ui/r/{name}.json (components.json)
```

and are not edited here. To check: reinstall into an empty copy of the project and diff, or `npx shadcn@latest add @coss/ui --diff`. Theme tokens in `src/styles/theme.css` are coss's neutral palette as the CLI wrote them, plus the font contract and base layer from `@coss/style`; the app's own additions there are marked. Fonts are Inter and Geist Mono from `@fontsource-variable`, the Vite equivalent of `@coss/fonts`. Dark mode is coss's `.dark` class on `<html>` (set from the OS when the theme is "system").

All 55 coss primitives are installed. The product uses 41: accordion, alert, alert-dialog, avatar, badge, breadcrumb, button, card, checkbox, collapsible, combobox, dialog, empty, field, frame, input, input-group, kbd, label, menu, meter, number-field, pagination, popover, progress, radio-group, scroll-area, select, separator, sheet, skeleton, slider, spinner, switch, table, tabs, textarea, toast, toggle, toggle-group, tooltip.

Only two project settings bend around the vendored code, and neither touches a coss file: ESLint skips the coss files (they are linted upstream under different rules), and `tsconfig.json` sets `noUnusedLocals: false` because `src/lib/composer-editor.ts` has one unused type import upstream. typescript-eslint's `no-unused-vars` still checks all app code.

### The app's compositions

What coss does not ship is built from coss parts, outside `src/components/ui`:

- `src/components/compositions/segmented-control.tsx`: coss Radio Group primitives with coss's `@coss/segmented-control` recipe, the way coss's segmented-control guide says to build a one-of-many choice.
- `src/components/compositions/radio-card.tsx`: coss's card-radio pattern, a `Label` wrapping a `Radio`.
- `src/components/compositions/stepper.tsx`: the booking flow's numbered steps.
- `src/components/booking/`: `BookingSlotPicker`, `SlotGrid`, `DayStepper`, `DurationPicker`, `TimeZoneHint`, still exported from `src/index.ts`. The slot grid keeps its own roving-focus radio group (Page Up/Down between periods, geometry-aware Up/Down, focusable-but-disabled slots that say why), which Base UI's Radio Group has no hook for.
- The desk grid, booking blocks, page headers and charts in `src/app`.

## Run it

```sh
npm install
npm run dev          # http://localhost:5173 — then #/book, #/desk, #/components
npm test             # Vitest + Testing Library + axe (flows, policy, holds, reducer)
npm run typecheck    # tsc, strict
npm run lint         # ESLint with jsx-a11y and react-hooks
npm run build        # tsc + vite build, served from /slot-picker/
npm run screenshots  # headless Chrome → docs/{book,desk,insights}-{light,dark}.png
```

URL switches: `?theme=light|dark`, `?now=2026-10-17T05:30:00Z` to pin the clock, `?offline=1` for the error states. **Reset demo data** lives in the Scenarios popover and in Settings.

## Stack

React 19, TypeScript, Vite, Tailwind v4, coss ui on `@base-ui/react`, Vitest. No router, state, chart or date library: a hash router, a reducer in context, inline SVG and `Intl`.

MIT © Rahul Jha. coss ui is MIT © coss.com; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
