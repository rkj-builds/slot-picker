import { DirectionProvider } from "@base-ui/react/direction-provider";
import * as React from "react";
import type { Direction } from "@/app/components/direction-frame";
import { ResourcesDemo } from "@/app/components/resources-demo";
import askedShot from "@/app/components/resources-story/asked.png";
import busyShot from "@/app/components/resources-story/busy.png";
import needsDesignShot from "@/app/components/resources-story/needs-design.png";
import { cn } from "@/lib/utils";

/** One real screen, captured 9 Nov 2026, cropped to the part that matters. */
interface Shot {
  src: string;
  width: number;
  height: number;
  alt: string;
  at: string;
  ring?: { left: string; top: string; width: string; height: string };
}

const SHOTS: { asked: Shot; needsDesign: Shot; busy: Shot } = {
  asked: {
    src: askedShot,
    width: 1400,
    height: 600,
    alt: "GitHub issue 13745 on calcom/cal.com, opened 19 February 2024: resource booking / checking multiple calendars. Rooms, projectors, cars or medical equipment. Closed as not planned; labelled needs design.",
    at: "github.com/calcom · #13745",
  },
  needsDesign: {
    src: needsDesignShot,
    width: 920,
    height: 300,
    alt: "A Cal.com maintainer adds the label needs design and replies: a great request and something we’re likely to do at some stage; not sure it will fall on the very near term roadmap, as there’s likely a decent amount of complexity to it.",
    at: "the same issue, the next day",
  },
  busy: {
    src: busyShot,
    width: 690,
    height: 250,
    alt: "Cal.com’s help centre: Cal.com events and booked slots are making you busy for the same slot across all of your individual events, regardless of the calendar you are adding this event to.",
    at: "cal.com/help · checking for conflicts",
  },
};

/**
 * How the proposal came about, in four screens on one spine: people asked,
 * Cal.com said not yet, I hit the wall with my own courts, so a thing got its
 * own page. The last step is the page itself, live, not a picture of it.
 */
export function ResourcesStory({ dir }: { dir: Direction }): React.ReactElement {
  return (
    <section aria-labelledby="story-h" className="flex flex-col gap-10 sm:gap-14">
      <div className="flex flex-col gap-4 border-border border-y py-10 sm:gap-5 sm:py-16">
        <p className="font-mono text-muted-foreground text-xs">Four screens, in order</p>
        <h2 className="max-w-4xl text-balance font-semibold text-4xl leading-[1.05] sm:text-6xl" id="story-h">
          I built this so Cal.com can book a thing, not only a person.
        </h2>
      </div>
      <ol className="flex flex-col gap-10 sm:gap-14">
        <Step at="Feb 2024 · issue #13745" figure={<ShotFigure shot={SHOTS.asked} />} title="People asked for it.">
          Rooms, projectors, cars, medical equipment. Before that, coworking tables (#9156, May 2023). After it, a physio practice and a racquet-hire shop. Each got a workaround:
          a user per room, Seats, “contact sales”.
        </Step>
        <Step at="the reply" figure={<ShotFigure shot={SHOTS.needsDesign} />} title="Cal.com said: needs design.">
          “Something we’re likely to do at some stage… there’s likely a decent amount of complexity to it.” The workaround, rooms added as team members, was called “a bit hacky”. Closed
          as not planned in August 2024. The label was right: it needs design.
        </Step>
        <Step at="1 Nov 2026 · my own account" figure={<ShotFigure shot={SHOTS.busy} />} title="I hit the wall myself.">
          Project 831’s two courts, set up as two links on my account, with a WhatsApp agent in front of them. It booked Court 1 at 7 pm and Court 2 went busy too: a booked slot
          makes you busy across all of your links. The agent keeps the courts itself now, and books past the conflict.
        </Step>
        <Step
          at="so"
          figure={
            <DirectionProvider direction={dir}>
              <div dir={dir}>
                <ResourcesDemo defaultScreen="list" nav={false} />
              </div>
            </DirectionProvider>
          }
          last
          title="A thing isn’t a person."
        >
          It gets its own page: hours, a capacity, its own bookings. A link books any free one and lands on the one that took it, and the host stays free. Built from coss ui’s
          parts, the way Cal.com builds its own. Open a court.
        </Step>
      </ol>
    </section>
  );
}

function Step({ at, title, children, figure, last = false }: { at: string; title: string; children: React.ReactNode; figure: React.ReactNode; last?: boolean }): React.ReactElement {
  return (
    <li className="group grid grid-cols-[0.75rem_minmax(0,1fr)] gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1.3fr)] sm:gap-x-6">
      <div aria-hidden="true" className="relative flex justify-center sm:order-2">
        <span className={cn("story-spine absolute -top-10 -bottom-10 w-px bg-border sm:-top-14 sm:-bottom-14", "group-first:top-1.5 sm:group-first:top-1.5", last && "bottom-auto h-1.5")} />
        <span className={cn("relative mt-1 size-3 rounded-full border bg-background ring-4 ring-background", last ? "border-foreground bg-foreground" : "border-foreground/40")} />
      </div>
      <div className="flex flex-col gap-1.5 sm:order-1">
        <p className="font-mono text-muted-foreground text-xs">{at}</p>
        <h3 className="text-balance font-semibold text-xl leading-tight">{title}</h3>
        <p className="text-pretty text-muted-foreground text-sm">{children}</p>
      </div>
      <div className="col-start-2 min-w-0 sm:order-3 sm:col-start-auto">{figure}</div>
    </li>
  );
}

function ShotFigure({ shot }: { shot: Shot }): React.ReactElement {
  return (
    <figure className="flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-xl border border-border bg-white dark:opacity-90">
        <img alt={shot.alt} className="block h-auto w-full" height={shot.height} loading="lazy" src={shot.src} width={shot.width} />
        {shot.ring ? <span aria-hidden="true" className="absolute rounded-lg border-2 border-black/80" style={shot.ring} /> : null}
      </div>
      <figcaption className="font-mono text-muted-foreground text-xs">{shot.at}</figcaption>
    </figure>
  );
}
