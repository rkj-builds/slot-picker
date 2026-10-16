/**
 * SlotGrid: a headless, unstyled grid of time slots with one tab stop and a
 * full keyboard model. Base UI conventions: dot-namespaced parts, a `render`
 * prop on every part, `className` as a string or a function of state, and
 * state exposed as data attributes for styling.
 *
 *   <SlotGrid.Root value={id} onValueChange={setId} aria-label="Start time">
 *     <SlotGrid.Group aria-label="Evening">
 *       <SlotGrid.Row>
 *         <SlotGrid.Cell value="19:00">7:00 pm</SlotGrid.Cell>
 *         <SlotGrid.Cell value="19:30" disabled reason="booked">7:30 pm</SlotGrid.Cell>
 *       </SlotGrid.Row>
 *     </SlotGrid.Group>
 *   </SlotGrid.Root>
 */
export * as SlotGrid from "@/primitives/slot-grid/index.parts";
export type { SlotGridRootProps, SlotGridRootState } from "@/primitives/slot-grid/slot-grid-root";
export type { SlotGridCellProps, SlotGridCellState, SlotGridGroupProps, SlotGridGroupState, SlotGridRowProps, SlotGridRowState } from "@/primitives/slot-grid/slot-grid-parts";
export type { SlotGridChangeDetails, SlotGridSelectionMode } from "@/primitives/slot-grid/slot-grid-context";
export { nextIndex, type SlotGridKey, type SlotGridOrientation } from "@/primitives/slot-grid/navigation";
