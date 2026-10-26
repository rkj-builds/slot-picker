import { DirectionProvider } from "@base-ui/react/direction-provider";
import * as React from "react";
import type { Direction } from "@/app/components/direction-frame";
import { WaitlistDemo } from "@/app/components/waitlist-demo";
import closedShot from "@/app/components/waitlist-story/closed.png";
import jobsShot from "@/app/components/waitlist-story/jobs.png";
import postingShot from "@/app/components/waitlist-story/posting.png";
import { cn } from "@/lib/utils";

/** One real screen from Cal.com, captured 27 Oct 2026, cropped to the part that matters. */
interface Shot {
  src: string;
  width: number;
  height: number;
  alt: string;
  at: string;
  ring?: { left: string; top: string; width: string; height: string };
}

const SHOTS: { jobs: Shot; posting: Shot; closed: Shot } = {
  jobs: { src: jobsShot, width: 1840, height: 700, alt: "Cal.com’s jobs page: Senior Product Design Engineer, Design, Remote, Full-time, $100k–$150k.", at: "cal.com/jobs" },
  posting: {
    src: postingShot,
    width: 1400,
    height: 520,
    alt: "The posting: Senior Product Design Engineer, with an Apply now button.",
    at: "cal.com/jobs/senior-product-designer",
    // The Apply now button, as a share of the crop; the ring sits a little outside it.
    ring: { left: "3.6%", top: "74%", width: "19.4%", height: "23%" },
  },
  closed: { src: closedShot, width: 1400, height: 420, alt: "Position Closed. Sorry, this position is no longer accepting candidates.", at: "cal-com.breezy.hr" },
};

/**
 * How the component came about, in four screens on one spine: the job, the Apply button, Position
 * Closed, then the card itself, live. Each screen is cropped tighter than the one before, so the eye
 * zooms in and lands on the component. The spine segment of each step draws as it scrolls into view;
 * under reduced motion it is simply there.
 */
export function WaitlistStory({ dir }: { dir: Direction }): React.ReactElement {
  return (
    <section aria-labelledby="story-h" className="flex flex-col gap-10 sm:gap-14">
      {/* The statement gets a band of its own: display size, Cal Sans's Display drawing, room above and below. */}
      <div className="flex flex-col gap-4 border-border border-y py-10 sm:gap-5 sm:py-16">
        <p className="font-mono text-muted-foreground text-xs">Four screens, in order</p>
        <h2 className="max-w-4xl text-balance font-semibold text-4xl leading-[1.05] sm:text-6xl" id="story-h">
          I built this so Cal.com doesn’t miss a good applicant over a closed button.
        </h2>
      </div>
      <ol className="flex flex-col gap-10 sm:gap-14">
        <Step at="24 Oct · cal.com/jobs" figure={<ShotFigure shot={SHOTS.jobs} />} title="There was a job.">
          Senior Product Design Engineer. “From the first sketch to a prototype running in the browser.” That is what I do every day, on booking software, and I am good at it.
        </Step>
        <Step at="the posting" figure={<ShotFigure shot={SHOTS.posting} />} title="I pressed Apply now.">
          The posting was up, the button was there, and I was the right person for it.
        </Step>
        <Step at="one click later" figure={<ShotFigure shot={SHOTS.closed} />} title="It said Position Closed.">
          Every slot taken. I build booking software; I know this screen, and I know it is a bug. A full day is never a no. It gets a waitlist.
        </Step>
        <Step
          at="so"
          figure={
            // The card itself, not a picture of it, and not inside the preview frame: a card in a frame is a card in a card.
            <DirectionProvider direction={dir}>
              <div className="flex justify-center sm:justify-start" dir={dir}>
                <WaitlistDemo />
              </div>
            </DirectionProvider>
          }
          last
          title="A full thing gets a waitlist."
        >
          coss ui didn’t have one, so I built it, the way the library builds its own: Card, Badge, Button, Alert Dialog, Toast, every colour a token, every word a prop. Join it. Then
          try to leave.
        </Step>
      </ol>
    </section>
  );
}

/**
 * One step: the dot and its spine segment, the words, the screen. On a phone the dot runs down the
 * left and the screen sits under the words; from `sm` the words go left, the spine centre, the screen right.
 */
function Step({ at, title, children, figure, last = false }: { at: string; title: string; children: React.ReactNode; figure: React.ReactNode; last?: boolean }): React.ReactElement {
  return (
    <li className="group grid grid-cols-[0.75rem_minmax(0,1fr)] gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1.3fr)] sm:gap-x-6">
      <div aria-hidden="true" className="relative flex justify-center sm:order-2">
        {/* The segment reaches into the gap on both sides so the segments read as one line; the first starts and the last ends at its dot. */}
        <span className={cn("story-spine absolute -top-10 -bottom-10 w-px bg-border sm:-top-14 sm:-bottom-14", "group-first:top-1.5 sm:group-first:top-1.5", last && "bottom-auto h-1.5")} />
        <span className={cn("relative mt-1 size-3 rounded-full border bg-background ring-4 ring-background", last ? "border-foreground bg-foreground" : "border-foreground/40")} />
      </div>
      <div className="flex flex-col gap-1.5 sm:order-1">
        <p className="font-mono text-muted-foreground text-xs">{at}</p>
        <h3 className="text-balance font-semibold text-xl leading-tight">{title}</h3>
        <p className="text-pretty text-muted-foreground text-sm">{children}</p>
      </div>
      <div className="col-start-2 sm:order-3 sm:col-start-auto">{figure}</div>
    </li>
  );
}

function ShotFigure({ shot }: { shot: Shot }): React.ReactElement {
  return (
    <figure className="flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-xl border border-border bg-white dark:opacity-90">
        <img alt={shot.alt} className="block h-auto w-full" height={shot.height} loading="lazy" src={shot.src} width={shot.width} />
        {/* The ring sits on a picture of a light page, so it is dark in both themes; a theme token would vanish in dark. */}
        {shot.ring ? <span aria-hidden="true" className="absolute rounded-lg border-2 border-black/80" style={shot.ring} /> : null}
      </div>
      <figcaption className="font-mono text-muted-foreground text-xs">{shot.at}</figcaption>
    </figure>
  );
}
