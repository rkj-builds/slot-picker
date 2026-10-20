/**
 * DateGrid: a headless month of dates, the WAI-ARIA date grid pattern, with
 * a status, a label and a badge on every day. Base UI conventions:
 * dot-namespaced parts, a `render` prop, `className` as a string or a
 * function of state, state as data attributes, controlled or uncontrolled.
 *
 *   <DateGrid.Root value={date} onValueChange={setDate} getDayInfo={(d) => ({ status, label: "₹800" })}>
 *     <DateGrid.Title />
 *     <DateGrid.PreviousMonth /> <DateGrid.NextMonth />
 *     <DateGrid.Grid>
 *       <DateGrid.Head />
 *       <DateGrid.Body>
 *         {(date) => (
 *           <DateGrid.Cell date={date}>
 *             <DateGrid.Day />
 *           </DateGrid.Cell>
 *         )}
 *       </DateGrid.Body>
 *     </DateGrid.Grid>
 *   </DateGrid.Root>
 */
export * as DateGrid from "@/primitives/date-grid/index.parts";
export type { DateGridRootProps, DateGridRootState } from "@/primitives/date-grid/date-grid-root";
export type {
  DateGridBodyProps,
  DateGridCellProps,
  DateGridDayProps,
  DateGridDayState,
  DateGridGridProps,
  DateGridGridState,
  DateGridHeadCellProps,
  DateGridHeadProps,
  DateGridPageButtonProps,
  DateGridPageButtonState,
  DateGridTitleProps,
  DateGridTitleState,
  DateGridWeekday,
} from "@/primitives/date-grid/date-grid-parts";
export type { DateGridChangeDetails } from "@/primitives/date-grid/date-grid-context";
export { canPage, DEFAULT_STATUS_TEXT, type DateGridKey, type DayInfo, type DayStatus, monthWeeks, moveDate, type MoveOptions, spokenDay } from "@/primitives/date-grid/model";
