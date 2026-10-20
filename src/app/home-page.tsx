import { ArrowRightIcon, ArrowUpRightIcon, BlocksIcon, BookOpenIcon, CodeXmlIcon, GitPullRequestIcon, LayoutGridIcon, ShapesIcon } from "lucide-react";
import type * as React from "react";
import { LogoMark } from "@/app/app-shell";
import { Anchor } from "@/app/anchor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyMedia } from "@/components/ui/empty";

const SITE = "https://rkj-builds.github.io/";
const REPO = "https://github.com/rkj-builds/slot-picker";
const PR = "https://github.com/cosscom/ui/pull/890";

const SURFACES = [
  {
    href: "#/book",
    icon: BookOpenIcon,
    title: "Book a court",
    line: "The customer's side, on a phone: court, time, details, payment, done.",
  },
  {
    href: "#/desk",
    icon: LayoutGridIcon,
    title: "Venue desk",
    line: "The venue's side: the day's courts, every booking's money, the numbers behind the policy.",
  },
  {
    href: "#/components",
    icon: ShapesIcon,
    title: "Components",
    line: "Every coss component in every state, light and dark side by side.",
  },
  {
    href: "#/primitives",
    icon: BlocksIcon,
    title: "Primitives",
    line: "SlotGrid, Recurrence and TimeZone: headless, bare and in two skins.",
  },
] as const;

export function HomePage(): React.ReactElement {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-12 sm:py-20">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <LogoMark className="size-8" />
          <Badge variant="outline">Demo · mock data</Badge>
        </div>
        <h1 className="text-balance font-semibold text-3xl tracking-tight sm:text-4xl">Court booking that asks for money before it holds a court.</h1>
        <p className="max-w-2xl text-pretty text-muted-foreground">
          At Project 831, a two-court pickleball venue in Jamshedpur, self-serve bookings with nothing paid were cancelled 45% of the time.
          Paid ones, 7%. This is the booking product that followed: deposits on weekends, pay-first for people who ghost, a hold while you pay.
          Built with Cal.com's coss ui components, unmodified, plus headless primitives of my own on Base UI.
        </p>
        {/* Who made it and where the source is, on the first screen: the page is the lead link of an application. */}
        <div className="flex flex-col gap-3" data-slot="byline">
          <p className="text-sm">
            Designed and built by{" "}
            <a className="font-medium underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground" href={SITE}>
              Rahul Jha
            </a>
            , a product designer who ships in code.
          </p>
          <nav aria-label="Source and author" className="flex flex-wrap gap-2">
            <Button render={<Anchor href={REPO} />} size="sm" variant="outline">
              <CodeXmlIcon aria-hidden="true" />
              Code on GitHub
            </Button>
            <Button render={<Anchor href={PR} />} size="sm" variant="outline">
              <GitPullRequestIcon aria-hidden="true" />
              My coss ui fix
              <Badge variant="success">Merged</Badge>
            </Button>
            <Button render={<Anchor href={SITE} />} size="sm" variant="ghost">
              More of my work
              <ArrowUpRightIcon aria-hidden="true" />
            </Button>
          </nav>
        </div>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {SURFACES.map(({ href, icon: Icon, title, line }) => (
          <li key={href}>
            <Card className="h-full transition-[border-color,box-shadow] duration-150 hover:border-ring/40 hover:shadow-md/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" render={<Anchor href={href} />}>
              <CardHeader className="gap-3">
                <EmptyMedia variant="icon">
                  <Icon aria-hidden="true" />
                </EmptyMedia>
                <CardTitle className="flex items-center gap-1.5 font-medium text-base">
                  {title}
                  <ArrowRightIcon aria-hidden="true" className="size-4 opacity-60 transition-transform duration-150 in-[[data-slot=card]:hover]:translate-x-0.5" />
                </CardTitle>
                <CardDescription>{line}</CardDescription>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-xs">
        Everything runs in your browser with invented customers. No real money moves; payments show what Razorpay would do in production.
      </p>
    </main>
  );
}
