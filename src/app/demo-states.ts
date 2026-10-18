/**
 * Every state of the product a reviewer might want to see, with how to get
 * there: which demo presets to switch on, what to set up (a draft, a held or
 * paid booking) and which screen to open. The Demo control and the States
 * index on #/primitives both read this list.
 */
import type { DemoScenarios } from "@/app/store";
import { TEAM_IDS } from "@/data/mock/seed";
import type { VenueSettings } from "@/lib/venue";

export type StateGroup = "Booking" | "Payment" | "After booking" | "Desk" | "Programmes" | "Money" | "Inbox and team" | "System";

export type StateSetup =
  /** A draft with a day and a time chosen, so the details step opens. */
  | "draft"
  /** A court held for the draft's customer, so the pay step opens. */
  | "hold"
  /** Held and paid in full. */
  | "paid"
  | "cancel-credit"
  | "cancel-refund"
  /** The next load fails, then a retry works. */
  | "fail-load"
  /** The next data request (any screen's read or save) fails, then a retry works. */
  | "fail-request";

export interface DemoState {
  id: string;
  group: StateGroup;
  label: string;
  /** What you will see, in a line. */
  shows: string;
  presets?: Partial<DemoScenarios>;
  setup?: StateSetup;
  /** Where the held or drafted booking falls: the next Saturday, the next Monday to Friday, else tomorrow. */
  day?: "tomorrow" | "weekday" | "weekend";
  /** The screen, as a hash; "{saturday}" is filled with the next Saturday's date. */
  hash: string;
  /** Run the first payment during the jump, so the pay step opens on its outcome (declined, slot taken). */
  opensOutcome?: boolean;
  /** What the details step's draft holds instead of the demo customer (a "draft" setup). */
  fill?: { name: string; phone: string };
  /** The details step opens as if submitted once: the form's own validation has run and its errors show. */
  opensSubmitted?: boolean;
  /** Settings open with these edits made but not saved. */
  unsavedSettings?: Partial<VenueSettings>;
  /** Sign the demo in as this team member first (see TEAM_IDS in src/data/mock/seed.ts), to show a role's view. Otherwise the owner. */
  signInAs?: string;
}

export const DEMO_STATES: readonly DemoState[] = [
  { id: "court", group: "Booking", label: "Start: pick a court", shows: "Step 1 with the court cards.", hash: "#/book/court" },
  { id: "when-weekend", group: "Booking", label: "Weekend: deposit applies", shows: "Step 2 opens on Saturday, peak prices and the club's 4 – 5 pm hold.", presets: { weekend: true }, hash: "#/book/when" },
  { id: "fully-booked", group: "Booking", label: "Fully booked day", shows: "No slots left today, with a button to the next free day.", presets: { fullyBooked: true }, hash: "#/book/when" },
  { id: "closed-today", group: "Booking", label: "Venue closed today", shows: "Step 2 says closed today and offers the next open day.", presets: { closedToday: true }, hash: "#/book/when" },
  { id: "details", group: "Booking", label: "Details and the WhatsApp code", shows: "Step 3 filled in; press Hold to see the code field and the demo code.", setup: "draft", hash: "#/book/you" },
  { id: "details-errors", group: "Booking", label: "Details with errors", shows: "Step 3 after pressing Hold with no name and a short number: each field says what is wrong.", setup: "draft", fill: { name: "", phone: "98765" }, opensSubmitted: true, hash: "#/book/you" },
  { id: "otp-expired", group: "Booking", label: "Code expired on the first try", shows: "The right code is refused once as expired; the second try works.", presets: { otpExpires: true }, setup: "draft", hash: "#/book/you" },
  { id: "pay-first", group: "Booking", label: "Pay-first customer", shows: "A flagged number: the notice on step 3, full payment on step 4.", presets: { flagged: true }, setup: "draft", hash: "#/book/you" },
  { id: "trusted", group: "Booking", label: "Trusted regular", shows: "A known regular on step 3, who may pay at the venue even at the weekend.", presets: { trusted: true, weekend: true }, setup: "draft", day: "weekend", hash: "#/book/you" },

  { id: "pay-weekday", group: "Payment", label: "Hold and pay, weekday", shows: "Step 4 with the countdown: pay at the venue or now.", setup: "hold", day: "weekday", hash: "#/book/pay" },
  { id: "pay-weekend", group: "Payment", label: "Weekend: 50% or full", shows: "Step 4 at the weekend: a deposit or the full amount.", setup: "hold", day: "weekend", hash: "#/book/pay" },
  { id: "declined", group: "Payment", label: "Payment declined, then retry", shows: "Checkout opens on a declined payment; a retry goes through.", presets: { paymentFails: true }, setup: "hold", hash: "#/book/pay", opensOutcome: true },
  { id: "race", group: "Payment", label: "Slot taken mid-payment", shows: "Opens after someone else got the court mid-payment; nearby times are offered.", presets: { slotRace: true }, setup: "hold", hash: "#/book/pay", opensOutcome: true },
  { id: "expired", group: "Payment", label: "Hold runs out", shows: "A 30-second hold: watch it turn amber, red, then release the court.", presets: { shortHold: true }, setup: "hold", hash: "#/book/pay" },

  { id: "done", group: "After booking", label: "Booked and paid", shows: "Step 5: paid and due, calendar file, WhatsApp share, cancel.", setup: "paid", hash: "#/book/done" },
  { id: "cancel-credit", group: "After booking", label: "Cancelled, kept as credit", shows: "Step 5 after a cancellation that kept the money as credit.", setup: "cancel-credit", hash: "#/book/done" },
  { id: "cancel-refund", group: "After booking", label: "Cancelled, refunded", shows: "Step 5 after a cancellation with a refund.", setup: "cancel-refund", hash: "#/book/done" },

  { id: "desk-today", group: "Desk", label: "Today on the desk", shows: "A live hold counting down, paid, part-paid and due-at-venue bookings, coaching.", hash: "#/desk" },
  { id: "desk-weekend", group: "Desk", label: "Weekend with the club hold", shows: "Off-Screen Club Juniors blocks both courts 4 – 5 pm (a repeating block).", hash: "#/desk?date={saturday}" },
  { id: "desk-cancelled", group: "Desk", label: "Cancelled bookings shown", shows: "The day with cancelled and expired bookings as ghosts.", hash: "#/desk?cancelled=1" },
  { id: "block-courts", group: "Desk", label: "Block courts on repeat", shows: "The Block courts dialog with the Repeat editor.", hash: "#/desk?date={saturday}&block=1" },
  { id: "back-to-back", group: "Desk", label: "Back-to-back half hours", shows: "Short bookings packed through the evening on both courts.", presets: { backToBack: true }, hash: "#/desk" },
  { id: "long-names", group: "Desk", label: "Very long names", shows: "Long customer names in the bookings table and on the grid.", presets: { longNames: true }, hash: "#/desk/bookings" },
  { id: "desk-closed", group: "Desk", label: "Closed day", shows: "The desk on a day the venue is shut.", presets: { closedToday: true }, hash: "#/desk" },
  { id: "desk-empty", group: "Desk", label: "Nothing booked", shows: "An empty day, with the hint to add a booking.", presets: { emptyVenue: true }, hash: "#/desk" },
  { id: "bookings-empty", group: "Desk", label: "No bookings in range", shows: "The bookings list with nothing in its dates.", presets: { emptyVenue: true }, hash: "#/desk/bookings" },
  { id: "no-results", group: "Desk", label: "No search results", shows: "A search that matches nobody.", hash: "#/desk/bookings?q=Nobody%20Here" },
  { id: "insights-empty", group: "Desk", label: "Insights with no data", shows: "Insights before any day has finished.", presets: { emptyVenue: true }, hash: "#/desk/insights" },
  { id: "settings", group: "Desk", label: "Settings", shows: "The rules: change one to see the unsaved bar, save, undo.", hash: "#/desk/settings" },
  { id: "settings-unsaved", group: "Desk", label: "Settings with unsaved changes", shows: "The deposit changed from 50% to 30% and not saved yet: the save bar offers Save and Discard.", unsavedSettings: { depositPercent: 30 }, hash: "#/desk/settings" },

  // Money (payments, dues, credits): src/app/screens/money.
  { id: "money-waiting", group: "Money", label: "Cash waiting for approval", shows: "Payments filtered to the desk's cash that a manager hasn't approved yet; tick lines to approve them in bulk.", hash: "#/desk/money?approval=waiting" },
  { id: "money-dues-mixed", group: "Money", label: "One customer owing in two places", shows: "Dues with a customer opened who owes for court bookings and a programme; take payment for either.", hash: "#/desk/money/dues?open=mixed" },
  { id: "money-credit-payout", group: "Money", label: "Paying out more credit than they hold", shows: "The Adjust credit dialog set to pay out ₹50,000: the amount field says how much they really have.", hash: "#/desk/money/credits?adjust=largest&payout=50000" },
  { id: "money-staff", group: "Money", label: "Front desk: can't approve", shows: "Signed in as the front desk: payments and dues work, but approving and moving credit say who can.", signInAs: TEAM_IDS.desk, hash: "#/desk/money?approval=waiting" },
  { id: "money-fails", group: "Money", label: "A money read fails", shows: "The next request fails: the list or the tile it was for says it couldn't load and offers Try again, which works.", setup: "fail-request", hash: "#/desk/money" },

  { id: "slow", group: "System", label: "Slow network", shows: "Every round trip takes seconds: the skeletons stay up.", presets: { slowNetwork: true }, hash: "#/book/when" },
  { id: "load-fails", group: "System", label: "Load fails, then retry", shows: "The error state with Try again; the retry works.", setup: "fail-load", hash: "#/desk" },
];

/** The switches, grouped as the Demo control shows them. */
export const PRESET_GROUPS: { group: StateGroup; items: { key: keyof DemoScenarios; label: string; line: string }[] }[] = [
  {
    group: "Booking",
    items: [
      { key: "weekend", label: "Weekend date", line: "Step 2 opens on Saturday, where a 50% deposit applies." },
      { key: "flagged", label: "Pay-first customer", line: "Step 3 is filled with a number the venue asks to pay first." },
      { key: "trusted", label: "Trusted regular", line: "Step 3 is filled with a regular who may pay at the venue." },
      { key: "otpExpires", label: "Code expires once", line: "The first right WhatsApp code is refused as expired." },
      { key: "fullyBooked", label: "Fully booked today", line: "Every court is taken today and tomorrow." },
      { key: "closedToday", label: "Closed today", line: "The venue is shut today." },
    ],
  },
  {
    group: "Payment",
    items: [
      { key: "paymentFails", label: "Payment fails", line: "The first payment is declined, then a retry works." },
      { key: "slotRace", label: "Slot race", line: "Someone else books the court while you pay." },
      { key: "shortHold", label: "Short hold", line: "Holds last 30 seconds instead of 15 minutes." },
    ],
  },
  {
    group: "Desk",
    items: [
      { key: "backToBack", label: "Back-to-back half hours", line: "Short bookings packed through today's evening." },
      { key: "longNames", label: "Long names", line: "Half the customers get very long names." },
      { key: "emptyVenue", label: "Empty venue", line: "No bookings anywhere: every empty state." },
    ],
  },
  {
    group: "System",
    items: [{ key: "slowNetwork", label: "Slow network", line: "Round trips take 2.5–4 seconds; skeletons stay up." }],
  },
];
