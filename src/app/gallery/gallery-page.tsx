"use client";

import { BellIcon, CircleCheckIcon, InfoIcon, PlusIcon, SearchIcon, TriangleAlertIcon } from "lucide-react";
import * as React from "react";
import { Anchor } from "@/app/anchor";
import { STATE_META, stateLabel } from "@/app/desk/booking-visuals";
import { useClock } from "@/app/clock";
import { makeReservations, schedule, spaces } from "@/app/gallery/fixtures";
import { BookingSlotPicker } from "@/components/booking/booking-slot-picker";
import { DayStepper } from "@/components/booking/day-stepper";
import { DurationPicker } from "@/components/booking/duration-picker";
import { SlotGrid, type SlotGridStatus } from "@/components/booking/slot-grid";
import { TimeZoneHint } from "@/components/booking/time-zone-hint";
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Combobox, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup } from "@/components/ui/combobox";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Frame, FrameFooter, FramePanel } from "@/components/ui/frame";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Meter, MeterIndicator, MeterLabel, MeterTrack } from "@/components/ui/meter";
import { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput } from "@/components/ui/number-field";
import { Popover, PopoverDescription, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue } from "@/components/ui/progress";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { RadioCard } from "@/components/compositions/radio-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SegmentedControl, SegmentedControlItem } from "@/components/compositions/segmented-control";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetDescription, SheetHeader, SheetPanel, SheetPopup, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Stepper, StepperItem } from "@/components/compositions/stepper";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { computeDaySlots } from "@/lib/availability";
import type { DeskState } from "@/lib/booking";
import { todayIn } from "@/lib/plain-date";
import { cn } from "@/lib/utils";

const SECTIONS = [
  "Button", "Badge", "Field and Input", "Number field", "Checkbox, Switch, Radio", "Radio card", "Toggle and Toggle group",
  "Segmented control", "Slider", "Meter and Progress", "Select and Combobox", "Tabs", "Accordion and Collapsible", "Alert",
  "Card", "Frame, Input group, Pagination", "Table", "Avatar, Kbd, Separator", "Stepper and Breadcrumb", "Skeleton, Spinner, Empty", "Overlays", "Scroll area",
  "Booking blocks", "Slot picker",
] as const;

/**
 * Every coss component the product uses, in its states, light and dark side
 * by side. Each panel carries coss's own `.dark` (or the app's `.light`
 * opt-out) class, so both themes render at once from coss's tokens.
 */
export function GalleryPage(): React.ReactElement {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-semibold text-3xl tracking-tight">Components</h1>
        <p className="max-w-2xl text-muted-foreground">
          The real{" "}
          <Button className="h-auto px-0 py-0 align-baseline text-base underline sm:h-auto sm:text-base" render={<Anchor href="https://coss.com/ui" rel="noreferrer" target="_blank" />} variant="link">
            coss ui
          </Button>{" "}
          components ({COSS_COUNT} of them), installed from the coss registry with the shadcn CLI and left unmodified, shown the way this product uses them. Segmented control,
          radio card, stepper and the booking blocks are this app&apos;s own compositions, built from coss parts. Each row shows light and dark at once.
        </p>
        <nav aria-label="Sections">
          <ul className="flex flex-wrap gap-1.5">
            {SECTIONS.map((s) => (
              <li key={s}>
                <Button
                  className="rounded-full font-normal text-muted-foreground before:rounded-full"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    document.getElementById(slug(s))?.scrollIntoView({ behavior: "smooth" });
                  }}
                  render={<Anchor href="#/components" />}
                  size="xs"
                  variant="outline"
                >
                  {s}
                </Button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <Section title="Button">
        <Row>
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="destructive-outline">Destructive outline</Button>
        </Row>
        <Row>
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button aria-label="Add" size="icon" variant="outline">
            <PlusIcon aria-hidden="true" />
          </Button>
          <Button loading>Paying</Button>
          <Button disabled>Disabled</Button>
        </Row>
      </Section>

      <Section title="Badge">
        <Row>
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="success">Paid</Badge>
          <Badge variant="info">Part-paid</Badge>
          <Badge variant="warning">Due</Badge>
          <Badge variant="destructive">No-show</Badge>
        </Row>
      </Section>

      <Section title="Field and Input">
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input placeholder="Who is booking" />
            <FieldDescription>As it should appear at the desk.</FieldDescription>
          </Field>
          <Field invalid>
            <FieldLabel>Mobile number</FieldLabel>
            <Input defaultValue="98765" />
            <FieldError match>That is too short. A mobile number has 10 digits.</FieldError>
          </Field>
          <Field disabled>
            <FieldLabel>Disabled</FieldLabel>
            <Input disabled placeholder="Not editable" />
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea placeholder="Need paddles?" />
          </Field>
        </div>
      </Section>

      <Section title="Number field">
        <Row>
          <NumberField defaultValue={4} max={8} min={1}>
            <NumberFieldGroup className="w-32">
              <NumberFieldDecrement aria-label="Fewer" />
              <NumberFieldInput aria-label="Players" />
              <NumberFieldIncrement aria-label="More" />
            </NumberFieldGroup>
          </NumberField>
          <NumberField defaultValue={800} format={{ style: "currency", currency: "INR", maximumFractionDigits: 0 }} locale="en-IN" step={50}>
            <NumberFieldGroup className="w-36">
              <NumberFieldDecrement aria-label="₹50 less" />
              <NumberFieldInput aria-label="Price" />
              <NumberFieldIncrement aria-label="₹50 more" />
            </NumberFieldGroup>
          </NumberField>
          <NumberField defaultValue={2} disabled>
            <NumberFieldGroup className="w-32">
              <NumberFieldDecrement aria-label="Fewer" />
              <NumberFieldInput aria-label="Disabled" />
              <NumberFieldIncrement aria-label="More" />
            </NumberFieldGroup>
          </NumberField>
        </Row>
      </Section>

      <Section title="Checkbox, Switch, Radio">
        <Row>
          <Label>
            <Checkbox /> Off
          </Label>
          <Label>
            <Checkbox defaultChecked /> On
          </Label>
          <Label>
            <Checkbox indeterminate /> Some
          </Label>
          <Label>
            <Checkbox disabled /> Disabled
          </Label>
          <Label>
            <Switch /> Off
          </Label>
          <Label>
            <Switch defaultChecked /> On
          </Label>
          <Label>
            <Switch disabled /> Disabled
          </Label>
        </Row>
        <RadioGroup aria-label="Court" className="flex-row gap-4" defaultValue="1">
          <Label>
            <Radio value="1" /> Court 1
          </Label>
          <Label>
            <Radio value="2" /> Court 2
          </Label>
          <Label>
            <Radio disabled value="3" /> Court 3 (soon)
          </Label>
        </RadioGroup>
      </Section>

      <Section note="App composition: coss's card-radio pattern, a Label wrapping a Radio." title="Radio card">
        <RadioGroup aria-label="How to pay" className="w-full" defaultValue="part">
          <RadioCard value="part">
            <span className="font-medium text-sm">Pay a deposit</span>
            <span className="text-muted-foreground text-sm">₹400 now, ₹400 at the venue.</span>
          </RadioCard>
          <RadioCard value="full">
            <span className="font-medium text-sm">Pay in full</span>
            <span className="text-muted-foreground text-sm">₹800 now. Nothing to pay at the venue.</span>
          </RadioCard>
          <RadioCard disabled value="venue">
            <span className="font-medium text-sm">Pay at the venue</span>
            <span className="text-muted-foreground text-sm">Not offered at weekends.</span>
          </RadioCard>
        </RadioGroup>
      </Section>

      <Section title="Toggle and Toggle group">
        <Row>
          <Toggle aria-label="Notify">
            <BellIcon aria-hidden="true" />
          </Toggle>
          <Toggle defaultPressed>Pressed</Toggle>
          <ToggleGroup aria-label="Prepay days" defaultValue={["sat", "sun"]} multiple>
            {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => (
              <ToggleGroupItem key={d} value={d}>
                {d[0]?.toUpperCase()}
                {d.slice(1)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Row>
      </Section>

      <Section note="App composition: coss Radio Group primitives with coss's @coss/segmented-control recipe." title="Segmented control">
        <Row>
          <SegmentedControl aria-label="View" defaultValue="day">
            <SegmentedControlItem value="day">Day</SegmentedControlItem>
            <SegmentedControlItem value="week">Week</SegmentedControlItem>
            <SegmentedControlItem disabled value="month">
              Month
            </SegmentedControlItem>
          </SegmentedControl>
          <DurationPicker durations={[60, 90, 120]} locale="en-IN" onValueChange={() => undefined} value={90} />
        </Row>
      </Section>

      <Section title="Slider">
        <div className="flex w-full max-w-sm flex-col gap-4">
          <Slider defaultValue={50} getAriaLabel={() => "Deposit"} step={5} />
          <Slider defaultValue={30} disabled getAriaLabel={() => "Disabled"} />
        </div>
      </Section>

      <Section title="Meter and Progress">
        <div className="grid w-full gap-4 sm:grid-cols-3">
          <Meter max={900} value={720}>
            <MeterLabel>Held · 12:00</MeterLabel>
            <MeterTrack className="rounded-full">
              <MeterIndicator />
            </MeterTrack>
          </Meter>
          <Meter max={900} value={150}>
            <MeterLabel>Held · 2:30</MeterLabel>
            <MeterTrack className="rounded-full">
              <MeterIndicator className="bg-warning" />
            </MeterTrack>
          </Meter>
          <Meter max={900} value={40}>
            <MeterLabel>Held · 0:40</MeterLabel>
            <MeterTrack className="rounded-full">
              <MeterIndicator className="bg-destructive" />
            </MeterTrack>
          </Meter>
          <Progress value={64}>
            <div className="flex justify-between">
              <ProgressLabel>Upload</ProgressLabel>
              <ProgressValue />
            </div>
            <ProgressTrack>
              <ProgressIndicator />
            </ProgressTrack>
          </Progress>
          <Progress value={null}>
            <ProgressLabel>Waiting for the bank</ProgressLabel>
            <ProgressTrack>
              <ProgressIndicator />
            </ProgressTrack>
          </Progress>
        </div>
      </Section>

      <Section title="Select and Combobox">
        <Row>
          <Select defaultValue={90} items={[60, 90, 120].map((v) => ({ value: v, label: `${v / 60 >= 1 ? Math.floor(v / 60) : 0} hr${v % 60 ? " 30 min" : ""}` }))}>
            <SelectTrigger aria-label="Duration">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value={60}>1 hr</SelectItem>
              <SelectItem value={90}>1 hr 30 min</SelectItem>
              <SelectItem value={120}>2 hr</SelectItem>
            </SelectPopup>
          </Select>
          <div className="w-64">
            <Combobox items={["Aarav Sharma", "Diya Patel", "Meera Nair", "Rohan Mehta"]}>
              <ComboboxInput aria-label="Customer" placeholder="Search customers" />
              <ComboboxPopup>
                <ComboboxEmpty>No match.</ComboboxEmpty>
                <ComboboxList>
                  {(name: string) => (
                    <ComboboxItem key={name} value={name}>
                      {name}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxPopup>
            </Combobox>
          </div>
        </Row>
      </Section>

      <Section title="Tabs">
        <div className="flex w-full flex-col gap-4">
          <Tabs defaultValue="upi">
            <TabsList aria-label="Method">
              <TabsTab value="upi">UPI</TabsTab>
              <TabsTab value="card">Card</TabsTab>
              <TabsTab disabled value="cash">
                Cash
              </TabsTab>
            </TabsList>
            <TabsPanel className="text-muted-foreground text-sm" value="upi">
              A collect request goes to your UPI app.
            </TabsPanel>
            <TabsPanel className="text-muted-foreground text-sm" value="card">
              Demo card ending 4242.
            </TabsPanel>
          </Tabs>
          <Tabs defaultValue="day">
            <TabsList aria-label="Desk" variant="underline">
              <TabsTab value="day">Day</TabsTab>
              <TabsTab value="bookings">Bookings</TabsTab>
              <TabsTab value="insights">Insights</TabsTab>
            </TabsList>
          </Tabs>
        </div>
      </Section>

      <Section note="A different item starts open in each panel: an open panel is a named region, and region names must be unique." title="Accordion and Collapsible">
        {(scope) => (
          <div className="flex w-full flex-col gap-4">
            <Accordion defaultValue={[scope === "light" ? "a" : "b"]}>
              <AccordionItem value="a">
                <AccordionTrigger>Cancellation policy</AccordionTrigger>
                <AccordionPanel>Whatever you paid becomes credit, or a refund in 5–7 working days.</AccordionPanel>
              </AccordionItem>
              <AccordionItem value="b">
                <AccordionTrigger>On the day</AccordionTrigger>
                <AccordionPanel>Come ten minutes early.</AccordionPanel>
              </AccordionItem>
            </Accordion>
            <Collapsible>
              <CollapsibleTrigger className="rounded-md font-medium text-sm underline-offset-4 hover:underline">Show the ledger</CollapsibleTrigger>
              <CollapsiblePanel>
                <p className="pt-2 text-muted-foreground text-sm">Deposit ₹400 by UPI · Cash ₹400 at the desk.</p>
              </CollapsiblePanel>
            </Collapsible>
          </div>
        )}
      </Section>

      <Section title="Alert">
        <div className="grid w-full gap-3">
          <Alert variant="info">
            <InfoIcon aria-hidden="true" />
            <AlertTitle>This booking needs payment up front</AlertTitle>
            <AlertDescription>Once it is paid, the court is yours.</AlertDescription>
          </Alert>
          <Alert variant="success">
            <CircleCheckIcon aria-hidden="true" />
            <AlertTitle>Welcome back, Diya</AlertTitle>
          </Alert>
          <Alert variant="warning">
            <TriangleAlertIcon aria-hidden="true" />
            <AlertTitle>That time just went</AlertTitle>
            <AlertDescription>These are still free: 6:30 pm, 8:00 pm.</AlertDescription>
          </Alert>
          <Alert variant="error">
            <TriangleAlertIcon aria-hidden="true" />
            <AlertTitle>The payment did not go through</AlertTitle>
          </Alert>
        </div>
      </Section>

      <Section title="Card">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Court 2 · Sat, 17 Oct · 7:00 – 8:30 pm</CardDescription>
          </CardHeader>
          <CardPanel className="text-sm">₹1,200 · ₹600 now, ₹600 at the venue</CardPanel>
          <CardFooter>
            <Button size="sm">Pay ₹600</Button>
          </CardFooter>
        </Card>
      </Section>

      <Section note="As on the desk's bookings list: a card Table inside a Frame, with coss Pagination." title="Frame, Input group, Pagination">
        {(scope) => (
          <div className="flex w-full flex-col gap-3">
            <InputGroup className="max-w-xs">
              <InputGroupInput aria-label={`Search, ${scope}`} placeholder="Name or phone" type="search" />
              <InputGroupAddon>
                <SearchIcon aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
            <Frame>
              <FramePanel className="text-sm">Showing 1–12 of 159 bookings</FramePanel>
              <FrameFooter className="p-2">
                <Pagination aria-label={`Pages, ${scope}`} className="justify-end">
                  <PaginationContent className="gap-2">
                    <PaginationItem>
                      <PaginationPrevious render={<Button disabled size="sm" variant="outline" />} />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext render={<Button size="sm" variant="outline" />} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </FrameFooter>
            </Frame>
          </div>
        )}
      </Section>

      <Section title="Table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-end">Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Meera Nair</TableCell>
              <TableCell>
                <Badge variant="success">Paid</Badge>
              </TableCell>
              <TableCell className="text-end">—</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Kabir Singh</TableCell>
              <TableCell>
                <Badge variant="warning">Due</Badge>
              </TableCell>
              <TableCell className="text-end">₹800</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section title="Avatar, Kbd, Separator">
        <Row>
          <Avatar>
            <AvatarFallback>DP</AvatarFallback>
          </Avatar>
          <Avatar className="size-10">
            <AvatarFallback>AS</AvatarFallback>
          </Avatar>
          <Separator className="h-6" orientation="vertical" />
          <KbdGroup>
            <Kbd>←</Kbd>
            <Kbd>→</Kbd>
            <Kbd>Home</Kbd>
            <Kbd>PgDn</Kbd>
          </KbdGroup>
        </Row>
      </Section>

      <Section note="The stepper is an app composition; the breadcrumb is coss." title="Stepper and Breadcrumb">
        {(scope) => (
          <div className="flex w-full flex-col gap-4">
            <Stepper>
              {["Court", "When", "You", "Pay", "Done"].map((label, i) => (
                <StepperItem index={i} key={label} label={label} onSelect={() => undefined} state={i < 2 ? "complete" : i === 2 ? "current" : "upcoming"} />
              ))}
            </Stepper>
            <Breadcrumb aria-label={`Breadcrumb, ${scope}`}>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#/desk">Desk</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Settings</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        )}
      </Section>

      <Section title="Skeleton, Spinner, Empty">
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10" />
            <Spinner />
          </div>
          <Empty className="rounded-xl border border-dashed py-6 md:py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Nothing matches</EmptyTitle>
              <EmptyDescription>Try another name.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" variant="outline">
                Clear filters
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      </Section>

      <Section note="Overlays open in a portal on the page's own theme." title="Overlays">
        <Row>
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>Dialog</DialogTrigger>
            <DialogPopup>
              <DialogHeader>
                <DialogTitle>Record cash</DialogTitle>
                <DialogDescription>Diya Patel · Court 1, 7:00 pm</DialogDescription>
              </DialogHeader>
              <DialogPanel className="text-sm">₹400 is due.</DialogPanel>
              <DialogFooter>
                <Button>Record ₹400</Button>
              </DialogFooter>
            </DialogPopup>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" />}>Alert dialog</AlertDialogTrigger>
            <AlertDialogPopup>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                <AlertDialogDescription>The court goes back on sale straight away.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogClose render={<Button variant="ghost" />}>Keep it</AlertDialogClose>
                <AlertDialogClose render={<Button variant="destructive" />}>Cancel booking</AlertDialogClose>
              </AlertDialogFooter>
            </AlertDialogPopup>
          </AlertDialog>
          <Sheet>
            <SheetTrigger render={<Button variant="outline" />}>Sheet</SheetTrigger>
            <SheetPopup>
              <SheetHeader>
                <SheetTitle>Meera Nair</SheetTitle>
                <SheetDescription>Court 2 · 7:00 – 8:30 pm</SheetDescription>
              </SheetHeader>
              <SheetPanel className="text-sm">The booking panel from the desk.</SheetPanel>
            </SheetPopup>
          </Sheet>
          <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>Popover</PopoverTrigger>
            <PopoverPopup>
              <PopoverTitle>Demo scenarios</PopoverTitle>
              <PopoverDescription>Force a state to see it.</PopoverDescription>
            </PopoverPopup>
          </Popover>
          <Menu>
            <MenuTrigger render={<Button variant="outline" />}>Menu</MenuTrigger>
            <MenuPopup align="start">
              <MenuGroup>
                <MenuGroupLabel>Booking</MenuGroupLabel>
                <MenuItem>Open</MenuItem>
                <MenuItem>Record cash</MenuItem>
              </MenuGroup>
              <MenuSeparator />
              <MenuItem variant="destructive">Cancel</MenuItem>
            </MenuPopup>
          </Menu>
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" />}>Tooltip</TooltipTrigger>
            <TooltipPopup>7:00 pm · ₹800 an hour · peak</TooltipPopup>
          </Tooltip>
          <Button
            onClick={() =>
              toastManager.add({
                title: "₹400 cash recorded",
                description: "Diya Patel · fully paid",
                type: "success",
                actionProps: { children: "Undo", onClick: () => toastManager.add({ title: "Undone", type: "info" }) },
              })
            }
            variant="outline"
          >
            Toast with Undo
          </Button>
        </Row>
      </Section>

      <Section title="Scroll area">
        {(scope) => (
          <ScrollArea aria-label={`Customers, ${scope}`} className="h-32 w-full max-w-xs rounded-xl border" role="region">
            <ul className="p-3 text-sm">
              {["Aarav Sharma", "Diya Patel", "Ishaan Verma", "Ananya Iyer", "Kabir Singh", "Meera Nair", "Rohan Mehta", "Saanvi Gupta", "Vihaan Reddy", "Tara Banerjee"].map((n) => (
                <li className="py-1" key={n}>
                  {n}
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </Section>

      <Section note="The desk grid's states. Each has an icon, a word and a border or texture, never colour alone." title="Booking blocks">
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
          {(["paid", "part-paid", "due", "held", "coaching", "blocked", "no-show", "cancelled", "expired"] as DeskState[]).map((s) => {
            const Icon = STATE_META[s].icon;
            return (
              <div className={cn("flex flex-col gap-0.5 rounded-lg border px-2 py-1.5 text-xs", STATE_META[s].block)} key={s}>
                <span className="flex items-center gap-1.5 font-medium" data-name="">
                  <Icon aria-hidden="true" className="size-3.5" />
                  Diya Patel
                </span>
                <span className="text-muted-foreground">{stateLabel(s)}</span>
              </div>
            );
          })}
        </div>
      </Section>

      <SlotPickerSection />
    </main>
  );
}

function SlotPickerSection(): React.ReactElement {
  const { now } = useClock();
  const [at] = React.useState(now);
  const reservations = React.useMemo(() => makeReservations(at), [at]);
  const today = todayIn(schedule.timeZone, at);
  const slots = computeDaySlots({ schedule, date: today, spaceId: "court-1", durationMinutes: 60, reservations, now: at });
  const gone = slots.map((s) => ({ ...s, status: "past" as const }));
  const states: { label: string; status: SlotGridStatus; slots: typeof slots }[] = [
    { label: "Loading", status: "loading", slots: [] },
    { label: "Error", status: "error", slots: [] },
    { label: "Nothing left", status: "ready", slots: gone },
  ];
  return (
    <>
      <Section note="The original component, with live mock reservations. Arrow keys, Home/End, Page Up/Down." title="Slot picker">
        {(scope) => (
          <div className="flex w-full flex-col gap-4">
            <Row>
              <DayStepper locale="en-IN" onValueChange={() => undefined} timeZone={schedule.timeZone} value={today} />
              <TimeZoneHint locale="en-IN" timeZone={schedule.timeZone} viewerTimeZone="America/New_York" />
            </Row>
            <BookingSlotPicker heading={`Book a court (${scope})`} locale="en-IN" now={at} reservations={reservations} schedule={schedule} spaces={spaces} viewerTimeZone="Asia/Kolkata" />
          </div>
        )}
      </Section>
      <Section title="Slot grid states">
        <div className="grid w-full gap-4 md:grid-cols-3">
          {states.map((s) => (
            <div className="flex flex-col gap-2" key={s.label}>
              <span className="text-muted-foreground text-xs">{s.label}</span>
              <SlotGrid aria-label={`Start time, ${s.label.toLowerCase()}`} nextAvailableLabel={s.label === "Nothing left" ? "Sat, 17 Oct" : null} onNextAvailable={() => undefined} onRetry={() => undefined} onValueChange={() => undefined} slots={s.slots} status={s.status} timeZone={schedule.timeZone} value={null} />
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/** The coss ui files under src/components/ui that this product imports. */
const COSS_COUNT = 41;

function slug(title: string): string {
  return title.toLowerCase().replaceAll(/[^a-z]+/g, "-");
}

/** One row of the gallery: a heading, then the same content in a light and a dark panel. */
type Scope = "light" | "dark";

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  /** A function when the content needs a per-panel name (landmarks must be unique). */
  children: React.ReactNode | ((scope: Scope) => React.ReactNode);
}): React.ReactElement {
  return (
    <section aria-labelledby={slug(title)} className="flex scroll-mt-16 flex-col gap-3" data-slot="gallery-section">
      <div className="flex flex-col">
        <h2 className="font-semibold text-lg tracking-tight" id={slug(title)}>
          {title}
        </h2>
        {note && <p className="text-muted-foreground text-sm">{note}</p>}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {(["light", "dark"] as const).map((scope: Scope) => (
          <div
            aria-label={`${title}, ${scope} theme`}
            className={`${scope} flex min-w-0 flex-col gap-4 rounded-2xl border bg-background p-5 text-foreground`}
            data-theme-scope={scope}
            key={scope}
            role="group"
          >
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{scope}</span>
            {typeof children === "function" ? children(scope) : children}
          </div>
        ))}
      </div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}
