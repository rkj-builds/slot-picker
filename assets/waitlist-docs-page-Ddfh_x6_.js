import{a as e,c as t,r as n,t as r}from"./utils-0MzkHkZl.js";import{Ca as i,Ii as a,Li as o,Pi as s,Ta as c}from"./radio-group-DtapWGqH.js";import{n as l,t as u}from"./chevron-right-BAC50k-t.js";import{t as d}from"./clock-3-D3OZVNav.js";import{a as f,i as p,n as m,r as h,t as ee}from"./props-BB85Fw9y.js";import{B as g,Bn as _,F as v,Gt as y,H as b,I as x,Kt as S,N as C,P as w,U as T,V as E,Vt as te,Wt as D,or as ne,q as re,qt as ie}from"./index-DWkDAiWW.js";import{a as ae,c as oe,i as se,n as ce,o as le,r as ue,s as de,t as fe}from"./alert-dialog-Cm4Y_jOd.js";import{n as pe}from"./time-zone-a2OW2gZn.js";import{c as me,i as he,l as O,o as k,r as ge,s as A,t as _e}from"./kbd-jQMzYBQZ.js";import{a as ve,i as ye,n as j,o as be,r as xe,t as Se}from"./breadcrumb-DmA_jIIr.js";import{a as Ce,i as M,n as N,o as we,r as P,t as F}from"./pagination-bQqnfgXq.js";var I=t(e(),1);function Te(e,{closed:t=!1}={}){return t?{ok:!1,reason:`closed`}:e===`joined`?{ok:!1,reason:`already-joined`}:e===`joining`?{ok:!1,reason:`joining`}:{ok:!0,next:`joining`}}function L(e){let t=e.ahead.length;return`${e.position} · ${t===0?`nobody`:t===1?`1 person`:`${t} people`} ahead of you`}var R=n(),z=I.createContext(null);function B(e){let t=I.useContext(z);if(!t)throw Error(`<${e}> must be inside <Waitlist>`);return t}function Ee({item:e,status:t=`Full`,slots:n=[],onJoin:i,onCancel:a,state:o,onStateChange:s,defaultState:c=`idle`,place:l,joiningLabel:u=`Checking for cancellations…`,errorLabel:d=`The list did not answer. Nothing was lost.`,meta:f,className:p,children:m}){let[h,ee]=I.useState(c),g=o??h,[_,v]=I.useState(void 0),y=_??l,[b,x]=I.useState(null),S=I.useRef(null),C=I.useRef(!0);I.useEffect(()=>(C.current=!0,()=>{C.current=!1}),[]);let w=I.useCallback(e=>{ee(e),s?.(e)},[s]),T=I.useRef(g);I.useEffect(()=>{T.current===`joining`&&g===`joined`&&S.current?.focus(),T.current=g},[g]);let E=I.useCallback(()=>{Te(g).ok&&(x(null),w(`joining`),i().then(e=>{C.current&&(v(e),w(`joined`))},e=>{C.current&&(x(e instanceof Error&&e.message?e.message:d),w(`error`))}))},[g,i,w,d]),D=I.useCallback(async()=>{let e=!a||await a();C.current&&e&&(v(void 0),w(`idle`))},[a,w]),ne=I.useMemo(()=>({item:e,status:t,slots:n,meta:f,state:g,place:y,error:b,joiningLabel:u,errorLabel:d,join:E,leave:D,positionRef:S}),[e,t,n,f,g,y,b,u,d,E,D]),re=g===`joined`&&y?`You're on the list. Position ${y.position}, ${L(y).split(` · `)[1]}.`:g===`joining`?u:``;return(0,R.jsx)(z.Provider,{value:ne,children:(0,R.jsxs)(te,{"aria-busy":g===`joining`||void 0,className:r(`w-full max-w-xs`,p),"data-slot":`waitlist`,"data-state":g,children:[(0,R.jsx)(`p`,{"aria-live":`polite`,className:`sr-only`,role:`status`,children:re}),m??(0,R.jsxs)(R.Fragment,{children:[(0,R.jsxs)(V,{children:[(0,R.jsx)(U,{}),(0,R.jsx)(H,{})]}),(0,R.jsxs)(W,{children:[(0,R.jsx)(G,{}),(0,R.jsx)(K,{}),(0,R.jsx)(q,{})]}),(0,R.jsx)(Ae,{})]})]})})}function V({className:e,...t}){return(0,R.jsx)(y,{className:r(`flex flex-col items-start gap-2.5 p-6 pb-4`,e),"data-slot":`waitlist-header`,...t})}function H({children:e,className:t,...n}){let{item:i}=B(`WaitlistTitle`);return(0,R.jsx)(ie,{className:r(`text-balance leading-tight`,t),"data-slot":`waitlist-title`,...n,children:e??(0,R.jsx)(`bdi`,{children:i})})}function U({className:e,children:t,...n}){let{state:r,status:i}=B(`WaitlistStatus`),a=r===`joined`;return(0,R.jsx)(o,{className:e,"data-slot":`waitlist-status`,variant:a?`success`:`secondary`,...n,children:t??(a?`On the list`:i)})}function W({className:e,...t}){return(0,R.jsx)(S,{className:r(`flex flex-col gap-3 px-6 pt-0 pb-6`,e),"data-slot":`waitlist-body`,...t})}function G({className:e,...t}){let{state:n,slots:i,status:a}=B(`WaitlistSlots`);return n===`joined`||i.length===0?null:(0,R.jsx)(`ul`,{"aria-label":`${a}: every slot taken`,className:r(`grid grid-cols-3 gap-1.5`,e),"data-slot":`waitlist-slots`,...t,children:i.map(e=>(0,R.jsxs)(`li`,{className:`rounded-md border border-border border-dashed py-1.5 text-center text-muted-foreground text-xs tabular-nums`,children:[(0,R.jsx)(`s`,{className:`decoration-muted-foreground/60`,children:e}),(0,R.jsx)(`span`,{className:`sr-only`,children:` taken`})]},e))})}function K({className:e,...t}){let{state:n,place:i,positionRef:a}=B(`WaitlistPosition`);if(n!==`joined`||!i)return null;let[o,s]=L(i).split(` · `);return(0,R.jsxs)(`div`,{"aria-label":`Position ${o}, ${s}`,className:r(`flex items-center gap-3.5 rounded-lg bg-muted px-4 py-3 outline-none motion-safe:animate-waitlist-enter focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`,e),"data-slot":`waitlist-position`,ref:a,role:`group`,tabIndex:-1,...t,children:[(0,R.jsx)(`span`,{className:`font-semibold text-3xl tabular-nums leading-none`,children:o}),(0,R.jsxs)(`span`,{className:`flex flex-col text-sm leading-snug`,children:[(0,R.jsx)(`span`,{children:(0,R.jsx)(`bdi`,{children:`in line`})}),(0,R.jsx)(`span`,{className:`text-muted-foreground`,children:(0,R.jsx)(`bdi`,{children:s})})]})]})}function De({className:e,children:t,...n}){let{state:i,joiningLabel:o,join:c}=B(`WaitlistJoin`);if(i===`joined`)return null;let l=[[`idle`,(0,R.jsx)(`bdi`,{children:t??`Join the waitlist`},`idle`)],[`joining`,(0,R.jsxs)(R.Fragment,{children:[(0,R.jsx)(a,{"aria-hidden":`true`,className:`size-4`}),(0,R.jsx)(`bdi`,{children:o})]})],[`error`,(0,R.jsx)(`bdi`,{children:`Try again`},`error`)]];return(0,R.jsx)(s,{"aria-disabled":i===`joining`||void 0,className:r(`grid w-full place-items-center`,e),"data-slot":`waitlist-join`,"data-state":i,onClick:c,...n,children:l.map(([e,t])=>{let n=e===i;return(0,R.jsx)(`span`,{"aria-hidden":!n||void 0,className:r(`inline-flex items-center gap-2 [grid-area:1/1]`,!n&&`invisible`),children:t},e)})})}function Oe({children:e,title:t=`Are you sure?`,description:n=`There is nobody behind you either. Leaving only makes the list shorter.`,keepLabel:r=`Keep my place`,leaveLabel:i=`Leave`,defaultOpen:a=!1}){let{state:o,leave:c}=B(`WaitlistCancel`),[l,u]=I.useState(a);return o===`joined`?(0,R.jsxs)(fe,{onOpenChange:u,open:l,children:[(0,R.jsx)(oe,{"data-slot":`waitlist-cancel`,render:(0,R.jsx)(s,{className:`w-full`,variant:`outline`}),children:e??`Leave the list`}),(0,R.jsxs)(le,{children:[(0,R.jsxs)(ae,{children:[(0,R.jsx)(de,{children:t}),(0,R.jsx)(ue,{children:n})]}),(0,R.jsxs)(se,{children:[(0,R.jsx)(ce,{render:(0,R.jsx)(s,{}),children:r}),(0,R.jsx)(s,{onClick:()=>{u(!1),c()},variant:`ghost`,children:i})]})]})]}):null}function q({cancelOpen:e=!1}){return(0,R.jsxs)(R.Fragment,{children:[(0,R.jsx)(De,{}),(0,R.jsx)(Oe,{defaultOpen:e})]})}function ke({className:e,...t}){return(0,R.jsx)(`p`,{className:r(`text-muted-foreground text-xs`,e),"data-slot":`waitlist-meta`,...t})}function Ae({className:e,children:t,...n}){let{meta:i,state:a,error:o,errorLabel:s}=B(`WaitlistFooter`),c=a===`error`,l=t??i;return(0,R.jsxs)(D,{className:r(`grid border-t px-6 py-3`,e),"data-slot":`waitlist-footer`,...n,children:[(0,R.jsxs)(`div`,{"aria-hidden":c||void 0,className:r(`flex items-start gap-1.5 text-muted-foreground text-xs [grid-area:1/1]`,c&&`invisible`),children:[l?(0,R.jsx)(d,{"aria-hidden":`true`,className:`size-3 h-lh shrink-0`}):null,typeof l==`string`?(0,R.jsx)(ke,{children:(0,R.jsx)(`bdi`,{children:l})}):l]}),(0,R.jsx)(`p`,{className:r(`flex items-start gap-1.5 text-destructive-foreground text-xs [grid-area:1/1]`,!c&&`invisible`),role:`alert`,children:c?(0,R.jsxs)(R.Fragment,{children:[(0,R.jsx)(ne,{"aria-hidden":`true`,className:`size-3 h-lh shrink-0`}),(0,R.jsx)(`bdi`,{children:o??s})]}):null})]})}var je={position:1,ahead:[]};function Me(e){let t=new Date(e),n=new Intl.DateTimeFormat(void 0,{hour:`numeric`,minute:`2-digit`}),r=e<Date.UTC(2026,10,1,6)?4:5;return[9,11,13,15,17,19].map(e=>n.format(new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate(),e+r))))}function J({state:e,onStateChange:t,fail:n=!1,cancelOpen:r=!1}){let{now:i}=_(),a=i(),o=I.useMemo(()=>pe(Intl.DateTimeFormat().resolvedOptions().timeZone,a),[a]),s=I.useMemo(()=>Me(a),[a]),c=I.useCallback(()=>new Promise((e,t)=>{window.setTimeout(()=>n?t(Error(`The list did not answer. Nothing was lost.`)):e(je),1100)}),[n]),l=I.useCallback(()=>(x.add({title:`Cancelled.`,description:`Just kidding, you're still on it.`,type:`info`}),!1),[]);return(0,R.jsxs)(Ee,{item:`Senior Product Design Engineer at Cal.com`,meta:`Your time: ${o.offsetLabel.replace(`-`,`−`)} · ${o.city}`,onCancel:l,onJoin:c,onStateChange:t,place:je,slots:s,state:e,status:`Full`,children:[(0,R.jsxs)(V,{children:[(0,R.jsx)(U,{}),(0,R.jsx)(H,{})]}),(0,R.jsxs)(W,{children:[(0,R.jsx)(G,{}),(0,R.jsx)(K,{}),(0,R.jsx)(q,{cancelOpen:r})]}),(0,R.jsx)(Ae,{})]})}var Y={jobs:{src:`/slot-picker/assets/jobs-CQwJp44O.png`,width:1840,height:700,alt:`Cal.com’s jobs page: Senior Product Design Engineer, Design, Remote, Full-time, $100k–$150k.`,at:`cal.com/jobs`},posting:{src:`/slot-picker/assets/posting-kVHT7k7M.png`,width:1400,height:520,alt:`The posting: Senior Product Design Engineer, with an Apply now button.`,at:`cal.com/jobs/senior-product-designer`,ring:{left:`3.6%`,top:`74%`,width:`19.4%`,height:`23%`}},closed:{src:`/slot-picker/assets/closed-BoRDuk1H.png`,width:1400,height:420,alt:`Position Closed. Sorry, this position is no longer accepting candidates.`,at:`cal-com.breezy.hr`}};function Ne({dir:e}){return(0,R.jsxs)(`section`,{"aria-labelledby":`story-h`,className:`flex flex-col gap-10 sm:gap-14`,children:[(0,R.jsxs)(`div`,{className:`flex flex-col gap-4 border-border border-y py-10 sm:gap-5 sm:py-16`,children:[(0,R.jsx)(`p`,{className:`font-mono text-muted-foreground text-xs`,children:`Four screens, in order`}),(0,R.jsx)(`h2`,{className:`max-w-4xl text-balance font-semibold text-4xl leading-[1.05] sm:text-6xl`,id:`story-h`,children:`I built this so Cal.com doesn’t miss a good applicant over a closed button.`})]}),(0,R.jsxs)(`ol`,{className:`flex flex-col gap-10 sm:gap-14`,children:[(0,R.jsx)(X,{at:`24 Oct · cal.com/jobs`,figure:(0,R.jsx)(Z,{shot:Y.jobs}),title:`There was a job.`,children:`Senior Product Design Engineer. “From the first sketch to a prototype running in the browser.” That is what I do every day, on booking software, and I am good at it.`}),(0,R.jsx)(X,{at:`the posting`,figure:(0,R.jsx)(Z,{shot:Y.posting}),title:`I pressed Apply now.`,children:`The posting was up, the button was there, and I was the right person for it.`}),(0,R.jsx)(X,{at:`one click later`,figure:(0,R.jsx)(Z,{shot:Y.closed}),title:`It said Position Closed.`,children:`Every slot taken. I build booking software; I know this screen, and I know it is a bug. A full day is never a no. It gets a waitlist.`}),(0,R.jsx)(X,{at:`so`,figure:(0,R.jsx)(f,{direction:e,children:(0,R.jsx)(`div`,{className:`flex justify-center sm:justify-start`,dir:e,children:(0,R.jsx)(J,{})})}),last:!0,title:`A full thing gets a waitlist.`,children:`coss ui didn’t have one, so I built it, the way the library builds its own: Card, Badge, Button, Alert Dialog, Toast, every colour a token, every word a prop. Join it. Then try to leave.`})]})]})}function X({at:e,title:t,children:n,figure:i,last:a=!1}){return(0,R.jsxs)(`li`,{className:`group grid grid-cols-[0.75rem_minmax(0,1fr)] gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1.3fr)] sm:gap-x-6`,children:[(0,R.jsxs)(`div`,{"aria-hidden":`true`,className:`relative flex justify-center sm:order-2`,children:[(0,R.jsx)(`span`,{className:r(`story-spine absolute -top-10 -bottom-10 w-px bg-border sm:-top-14 sm:-bottom-14`,`group-first:top-1.5 sm:group-first:top-1.5`,a&&`bottom-auto h-1.5`)}),(0,R.jsx)(`span`,{className:r(`relative mt-1 size-3 rounded-full border bg-background ring-4 ring-background`,a?`border-foreground bg-foreground`:`border-foreground/40`)})]}),(0,R.jsxs)(`div`,{className:`flex flex-col gap-1.5 sm:order-1`,children:[(0,R.jsx)(`p`,{className:`font-mono text-muted-foreground text-xs`,children:e}),(0,R.jsx)(`h3`,{className:`text-balance font-semibold text-xl leading-tight`,children:t}),(0,R.jsx)(`p`,{className:`text-pretty text-muted-foreground text-sm`,children:n})]}),(0,R.jsx)(`div`,{className:`col-start-2 sm:order-3 sm:col-start-auto`,children:i})]})}function Z({shot:e}){return(0,R.jsxs)(`figure`,{className:`flex flex-col gap-2`,children:[(0,R.jsxs)(`div`,{className:`relative overflow-hidden rounded-xl border border-border bg-white dark:opacity-90`,children:[(0,R.jsx)(`img`,{alt:e.alt,className:`block h-auto w-full`,height:e.height,loading:`lazy`,src:e.src,width:e.width}),e.ring?(0,R.jsx)(`span`,{"aria-hidden":`true`,className:`absolute rounded-lg border-2 border-black/80`,style:e.ring}):null]}),(0,R.jsx)(`figcaption`,{className:`font-mono text-muted-foreground text-xs`,children:e.at})]})}var Pe=`import * as React from "react";
import { useClock } from "@/app/clock";
import {
  Waitlist,
  WaitlistActions,
  WaitlistBody,
  WaitlistFooter,
  WaitlistHeader,
  type WaitlistPlace,
  WaitlistPosition,
  WaitlistSlots,
  type WaitlistState,
  WaitlistStatus,
  WaitlistTitle,
} from "@/components/compositions/waitlist";
import { toastManager } from "@/components/ui/toast";
import { describeZone } from "@/primitives/time-zone";

/** The front of the list. There is nobody else on it. */
const FRONT: WaitlistPlace = { position: 1, ahead: [] };

/** Six interview slots on a New York day, 9 am to 7 pm, shown in the viewer's own time. */
function takenSlots(now: number): string[] {
  const day = new Date(now);
  const fmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  // New York is UTC−4 until 1 November 2026, then UTC−5.
  const offset = now < Date.UTC(2026, 10, 1, 6) ? 4 : 5;
  return [9, 11, 13, 15, 17, 19].map((h) => fmt.format(new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h + offset))));
}

/**
 * The instance this page was built for: a role that is fully booked. Joining checks for
 * cancellations (there never are any), leaving asks first and then changes its mind.
 */
export function WaitlistDemo({ state, onStateChange, fail = false, cancelOpen = false }: { state?: WaitlistState; onStateChange?: (s: WaitlistState) => void; fail?: boolean; cancelOpen?: boolean }): React.ReactElement {
  const { now } = useClock();
  const at = now();
  const zone = React.useMemo(() => describeZone(Intl.DateTimeFormat().resolvedOptions().timeZone, at), [at]);
  const slots = React.useMemo(() => takenSlots(at), [at]);

  const onJoin = React.useCallback(
    () =>
      new Promise<WaitlistPlace>((resolve, reject) => {
        window.setTimeout(() => (fail ? reject(new Error("The list did not answer. Nothing was lost.")) : resolve(FRONT)), 1100);
      }),
    [fail],
  );
  const onCancel = React.useCallback((): boolean => {
    toastManager.add({ title: "Cancelled.", description: "Just kidding, you're still on it.", type: "info" });
    return false;
  }, []);

  return (
    <Waitlist
      item="Senior Product Design Engineer at Cal.com"
      // A true minus in the offset (GMT−4), as Cal Sans's guide asks: the hyphen only joins words.
      meta={\`Your time: \${zone.offsetLabel.replace("-", "−")} · \${zone.city}\`}
      onCancel={onCancel}
      onJoin={onJoin}
      onStateChange={onStateChange}
      place={FRONT}
      slots={slots}
      state={state}
      status="Full"
    >
      {/* The default layout, spelled out, so the docs page can open the leave question on load. */}
      <WaitlistHeader>
        <WaitlistStatus />
        <WaitlistTitle />
      </WaitlistHeader>
      <WaitlistBody>
        <WaitlistSlots />
        <WaitlistPosition />
        <WaitlistActions cancelOpen={cancelOpen} />
      </WaitlistBody>
      <WaitlistFooter />
    </Waitlist>
  );
}
`,Fe=`"use client";

import { CircleAlertIcon, Clock3Icon } from "lucide-react";
import * as React from "react";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { attemptJoin, placeLabel, type WaitlistPlace, type WaitlistState } from "@/lib/waitlist";

export type { WaitlistPlace, WaitlistState } from "@/lib/waitlist";

export interface WaitlistProps {
  /** What is full: a course, a court, a role. */
  item: string;
  /** The badge above the item while it is full. One or two words. */
  status?: string;
  /** The slots that are taken, already formatted for the viewer. Shown struck through, so "full" is something you see. */
  slots?: readonly string[];
  /** Called on Join. Resolve with the place in line; reject to show the reason in the footer, with the same button as the retry. */
  onJoin: () => Promise<WaitlistPlace>;
  /** Called when the person confirms they want to leave. Return false to keep them on the list. */
  onCancel?: () => boolean | Promise<boolean>;
  /** The state, when the parent owns it (the docs page does; a product usually won't). */
  state?: WaitlistState;
  /** Called on every change of state, controlled or not: to log a join, or to keep a parent in step. */
  onStateChange?: (state: WaitlistState) => void;
  /** Where an uncontrolled Waitlist starts. */
  defaultState?: WaitlistState;
  /** The place to show when \`state\` is "joined" and \`onJoin\` has not run, as on a docs page. */
  place?: WaitlistPlace;
  /** What the button says while \`onJoin\` is pending. */
  joiningLabel?: string;
  /** What the footer says when \`onJoin\` rejects without a message of its own. */
  errorLabel?: string;
  /** One line in the footer: the viewer's time zone, a date. A failed join shows its reason in its place. */
  meta?: React.ReactNode;
  /** Merged onto the card, as on every coss part. */
  className?: string;
  /** Your own arrangement of the parts (WaitlistHeader, WaitlistBody, WaitlistFooter…). Left out, the default layout renders. */
  children?: React.ReactNode;
}

interface WaitlistContextValue {
  item: string;
  status: string;
  slots: readonly string[];
  meta: React.ReactNode;
  state: WaitlistState;
  place: WaitlistPlace | undefined;
  error: string | null;
  joiningLabel: string;
  errorLabel: string;
  join: () => void;
  leave: () => Promise<void>;
  positionRef: React.RefObject<HTMLDivElement | null>;
}

const WaitlistContext = React.createContext<WaitlistContextValue | null>(null);

function useWaitlist(part: string): WaitlistContextValue {
  const ctx = React.useContext(WaitlistContext);
  if (!ctx) throw new Error(\`<\${part}> must be inside <Waitlist>\`);
  return ctx;
}

/** A place in line for something that is full. It asks once, keeps the person's place, and never takes it away by accident. */
export function Waitlist({
  item,
  status = "Full",
  slots = [],
  onJoin,
  onCancel,
  state: stateProp,
  onStateChange,
  defaultState = "idle",
  place: placeProp,
  joiningLabel = "Checking for cancellations…",
  errorLabel = "The list did not answer. Nothing was lost.",
  meta,
  className,
  children,
}: WaitlistProps): React.ReactElement {
  const [ownState, setOwnState] = React.useState<WaitlistState>(defaultState);
  const state = stateProp ?? ownState;
  const [ownPlace, setOwnPlace] = React.useState<WaitlistPlace | undefined>(undefined);
  const place = ownPlace ?? placeProp;
  const [error, setError] = React.useState<string | null>(null);
  const positionRef = React.useRef<HTMLDivElement | null>(null);
  const alive = React.useRef(true);
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const setState = React.useCallback(
    (next: WaitlistState): void => {
      setOwnState(next);
      onStateChange?.(next);
    },
    [onStateChange],
  );

  // A join that lands moves focus to the place in line, so the result is read out and the eye lands on it.
  // Only a transition does this: a Waitlist that mounts already joined (a docs page) must not steal focus.
  const previous = React.useRef(state);
  React.useEffect(() => {
    if (previous.current === "joining" && state === "joined") positionRef.current?.focus();
    previous.current = state;
  }, [state]);

  const join = React.useCallback((): void => {
    if (!attemptJoin(state).ok) return;
    setError(null);
    setState("joining");
    onJoin().then(
      (result) => {
        if (!alive.current) return;
        setOwnPlace(result);
        setState("joined");
      },
      (reason: unknown) => {
        if (!alive.current) return;
        setError(reason instanceof Error && reason.message ? reason.message : errorLabel);
        setState("error");
      },
    );
  }, [state, onJoin, setState, errorLabel]);

  const leave = React.useCallback(async (): Promise<void> => {
    const confirmed = onCancel ? await onCancel() : true;
    if (!alive.current || !confirmed) return;
    setOwnPlace(undefined);
    setState("idle");
  }, [onCancel, setState]);

  const value = React.useMemo<WaitlistContextValue>(
    () => ({ item, status, slots, meta, state, place, error, joiningLabel, errorLabel, join, leave, positionRef }),
    [item, status, slots, meta, state, place, error, joiningLabel, errorLabel, join, leave],
  );

  const live = state === "joined" && place ? \`You're on the list. Position \${place.position}, \${placeLabel(place).split(" · ")[1]}.\` : state === "joining" ? joiningLabel : "";

  return (
    <WaitlistContext.Provider value={value}>
      <Card aria-busy={state === "joining" || undefined} className={cn("w-full max-w-xs", className)} data-slot="waitlist" data-state={state}>
        {/* One live region from mount, so a screen reader hears each change and the DOM never gains a region mid-flow. */}
        <p aria-live="polite" className="sr-only" role="status">
          {live}
        </p>
        {children ?? (
          <>
            <WaitlistHeader>
              <WaitlistStatus />
              <WaitlistTitle />
            </WaitlistHeader>
            <WaitlistBody>
              <WaitlistSlots />
              <WaitlistPosition />
              <WaitlistActions />
            </WaitlistBody>
            <WaitlistFooter />
          </>
        )}
      </Card>
    </WaitlistContext.Provider>
  );
}

/** The status badge, then the item. Padding set here, not inferred from which siblings exist. */
export function WaitlistHeader({ className, ...props }: React.ComponentProps<typeof CardHeader>): React.ReactElement {
  return <CardHeader className={cn("flex flex-col items-start gap-2.5 p-6 pb-4", className)} data-slot="waitlist-header" {...props} />;
}

export function WaitlistTitle({ children, className, ...props }: React.ComponentProps<typeof CardTitle>): React.ReactElement {
  const { item } = useWaitlist("WaitlistTitle");
  return (
    // coss's CardTitle is leading-none, set for one line; an item name can wrap, so it gets the guide's 125% and balanced lines.
    // Every string a prop supplies sits in <bdi>: it keeps its own punctuation order (English inside a right-to-left page),
    // while the block around it keeps the card's direction, so it still aligns to the card's start.
    <CardTitle className={cn("text-balance leading-tight", className)} data-slot="waitlist-title" {...props}>
      {children ?? <bdi>{item}</bdi>}
    </CardTitle>
  );
}

/** "Full" while it is; "On the list" once joined. A badge, so it reads before the title does. */
export function WaitlistStatus({ className, children, ...props }: React.ComponentProps<typeof Badge>): React.ReactElement {
  const { state, status } = useWaitlist("WaitlistStatus");
  const joined = state === "joined";
  return (
    <Badge className={className} data-slot="waitlist-status" variant={joined ? "success" : "secondary"} {...props}>
      {children ?? (joined ? "On the list" : status)}
    </Badge>
  );
}

/** Everything between the header and the footer, one gap apart. */
export function WaitlistBody({ className, ...props }: React.ComponentProps<typeof CardPanel>): React.ReactElement {
  return <CardPanel className={cn("flex flex-col gap-3 px-6 pt-0 pb-6", className)} data-slot="waitlist-body" {...props} />;
}

/** The taken slots, struck through, until the person joins. Each one is read as "taken". */
export function WaitlistSlots({ className, ...props }: React.ComponentProps<"ul">): React.ReactElement | null {
  const { state, slots, status } = useWaitlist("WaitlistSlots");
  if (state === "joined" || slots.length === 0) return null;
  return (
    <ul aria-label={\`\${status}: every slot taken\`} className={cn("grid grid-cols-3 gap-1.5", className)} data-slot="waitlist-slots" {...props}>
      {slots.map((slot) => (
        <li className="rounded-md border border-border border-dashed py-1.5 text-center text-muted-foreground text-xs tabular-nums" key={slot}>
          <s className="decoration-muted-foreground/60">{slot}</s>
          <span className="sr-only"> taken</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The place in line, once joined, in the space the slots held. The one thing on the card that moves:
 * it rises 4px as it appears, so the eye lands on what is new. Under reduced motion it simply appears.
 */
export function WaitlistPosition({ className, ...props }: React.ComponentProps<"div">): React.ReactElement | null {
  const { state, place, positionRef } = useWaitlist("WaitlistPosition");
  if (state !== "joined" || !place) return null;
  const [number, rest] = placeLabel(place).split(" · ");
  return (
    <div
      aria-label={\`Position \${number}, \${rest}\`}
      className={cn(
        "flex items-center gap-3.5 rounded-lg bg-muted px-4 py-3 outline-none motion-safe:animate-waitlist-enter focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      data-slot="waitlist-position"
      ref={positionRef}
      role="group"
      tabIndex={-1}
      {...props}
    >
      <span className="font-semibold text-3xl tabular-nums leading-none">{number}</span>
      <span className="flex flex-col text-sm leading-snug">
        <span>
          <bdi>in line</bdi>
        </span>
        <span className="text-muted-foreground">
          <bdi>{rest}</bdi>
        </span>
      </span>
    </div>
  );
}

/** Join, full width. Three labels share one cell, so the button never changes size while it works. */
export function WaitlistJoin({ className, children, ...props }: React.ComponentProps<typeof Button>): React.ReactElement | null {
  const { state, joiningLabel, join } = useWaitlist("WaitlistJoin");
  if (state === "joined") return null;
  const labels: [WaitlistState, React.ReactNode][] = [
    ["idle", <bdi key="idle">{children ?? "Join the waitlist"}</bdi>],
    [
      "joining",
      <>
        <Spinner aria-hidden="true" className="size-4" />
        <bdi>{joiningLabel}</bdi>
      </>,
    ],
    ["error", <bdi key="error">Try again</bdi>],
  ];
  return (
    <Button aria-disabled={state === "joining" || undefined} className={cn("grid w-full place-items-center", className)} data-slot="waitlist-join" data-state={state} onClick={join} {...props}>
      {labels.map(([forState, label]) => {
        const active = forState === state;
        return (
          <span aria-hidden={!active || undefined} className={cn("inline-flex items-center gap-2 [grid-area:1/1]", !active && "invisible")} key={forState}>
            {label}
          </span>
        );
      })}
    </Button>
  );
}

/** Leave, behind a question. Closing the dialog returns focus to this button; Base UI does that. */
export function WaitlistCancel({
  children,
  title = "Are you sure?",
  description = "There is nobody behind you either. Leaving only makes the list shorter.",
  keepLabel = "Keep my place",
  leaveLabel = "Leave",
  defaultOpen = false,
}: {
  children?: React.ReactNode;
  /** Mount with the question already open (a docs page showing that state). */
  defaultOpen?: boolean;
  title?: string;
  description?: string;
  keepLabel?: string;
  leaveLabel?: string;
}): React.ReactElement | null {
  const { state, leave } = useWaitlist("WaitlistCancel");
  const [open, setOpen] = React.useState(defaultOpen);
  if (state !== "joined") return null;
  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger data-slot="waitlist-cancel" render={<Button className="w-full" variant="outline" />}>
        {children ?? "Leave the list"}
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button />}>{keepLabel}</AlertDialogClose>
          <Button
            onClick={() => {
              setOpen(false);
              void leave();
            }}
            variant="ghost"
          >
            {leaveLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

/** Join or Leave; whichever applies renders, at full width. */
export function WaitlistActions({ cancelOpen = false }: { cancelOpen?: boolean }): React.ReactElement {
  return (
    <>
      <WaitlistJoin />
      <WaitlistCancel defaultOpen={cancelOpen} />
    </>
  );
}

/** One line of context, as the meta prop or as children. */
export function WaitlistMeta({ className, ...props }: React.ComponentProps<"p">): React.ReactElement {
  return <p className={cn("text-muted-foreground text-xs", className)} data-slot="waitlist-meta" {...props} />;
}

/**
 * The footer line: the meta (a time zone, a date), or, when a join fails, the reason in its place.
 * Both sit in one grid cell, so an error changes the words and never the card's height.
 */
export function WaitlistFooter({ className, children, ...props }: React.ComponentProps<typeof CardFooter>): React.ReactElement {
  const { meta, state, error, errorLabel } = useWaitlist("WaitlistFooter");
  const failed = state === "error";
  const line = children ?? meta;
  return (
    <CardFooter className={cn("grid border-t px-6 py-3", className)} data-slot="waitlist-footer" {...props}>
      <div aria-hidden={failed || undefined} className={cn("flex items-start gap-1.5 text-muted-foreground text-xs [grid-area:1/1]", failed && "invisible")}>
        {line ? <Clock3Icon aria-hidden="true" className="size-3 h-lh shrink-0" /> : null}
        {typeof line === "string" ? (
          <WaitlistMeta>
            <bdi>{line}</bdi>
          </WaitlistMeta>
        ) : (
          line
        )}
      </div>
      <p className={cn("flex items-start gap-1.5 text-destructive-foreground text-xs [grid-area:1/1]", !failed && "invisible")} role="alert">
        {failed ? (
          <>
            <CircleAlertIcon aria-hidden="true" className="size-3 h-lh shrink-0" />
            <bdi>{error ?? errorLabel}</bdi>
          </>
        ) : null}
      </p>
    </CardFooter>
  );
}
`,Ie=`rahul-kumar-jha-ll9vhj/30min`,Le=`https://rkj-builds.github.io/for/cal/`,Re=`https://github.com/cosscom/ui/pull/913`,Q=[{value:`live`,label:`Live`},{value:`idle`,label:`Idle`},{value:`joining`,label:`Joining`},{value:`joined`,label:`Joined`},{value:`error`,label:`Error`},{value:`cancel-confirm`,label:`Leave?`}],ze=[{state:`idle`,title:`Idle`,line:`Full, and you can see it: every slot struck through.`},{state:`joining`,title:`Joining`,line:`Busy. The button keeps its width; the card is aria-busy.`},{state:`joined`,title:`Joined`,line:`The place in line, in the space the slots held, and the way out.`},{state:`error`,title:`Error`,line:`The reason takes the footer line’s place, so the card keeps its height. The same button retries.`}],$=ee(Fe,`Waitlist`);function Be(e){let t=e.query.get(`state`);return Q.some(e=>e.value===t)?t:`live`}function Ve({route:e}){let t=Be(e),n=e.query.get(`dir`)===`rtl`?`rtl`:`ltr`,r=t=>i(e.path,{state:e.query.get(`state`),dir:e.query.get(`dir`),theme:e.query.get(`theme`),...t},{replace:!0}),a=t===`live`?void 0:t===`cancel-confirm`?`joined`:t;return(0,R.jsxs)(`main`,{className:`mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8`,children:[(0,R.jsxs)(`header`,{className:`flex flex-col gap-4`,children:[(0,R.jsx)(Se,{children:(0,R.jsxs)(ye,{children:[(0,R.jsx)(j,{children:(0,R.jsx)(xe,{href:`#/components`,children:`Components`})}),(0,R.jsx)(be,{}),(0,R.jsx)(j,{children:(0,R.jsx)(ve,{children:`Waitlist`})})]})}),(0,R.jsxs)(`div`,{className:`flex flex-col gap-2`,children:[(0,R.jsxs)(`div`,{className:`flex flex-wrap items-center gap-3`,children:[(0,R.jsx)(`h1`,{className:`font-semibold text-3xl`,tabIndex:-1,children:`Waitlist`}),(0,R.jsx)(o,{variant:`secondary`,children:`proposal`})]}),(0,R.jsx)(`p`,{className:`max-w-2xl text-muted-foreground`,children:$.summary}),(0,R.jsx)(`p`,{className:`max-w-2xl text-muted-foreground text-sm`,children:`A coss ui component Cal.com doesn’t have yet.`})]})]}),(0,R.jsx)(Ne,{dir:n}),(0,R.jsxs)(`section`,{"aria-labelledby":`preview-h`,className:`flex flex-col gap-4`,children:[(0,R.jsxs)(`div`,{className:`flex flex-wrap items-center justify-between gap-3`,children:[(0,R.jsx)(`h2`,{className:`font-semibold text-xl`,id:`preview-h`,children:`Preview`}),(0,R.jsxs)(`div`,{className:`flex flex-wrap items-center gap-2`,children:[(0,R.jsx)(w,{"aria-label":`State shown`,onValueChange:e=>r({state:e===`live`?null:e}),size:`sm`,value:t,children:Q.map(e=>(0,R.jsx)(v,{value:e.value,children:e.label},e.value))}),(0,R.jsxs)(w,{"aria-label":`Direction`,onValueChange:e=>r({dir:e===`rtl`?`rtl`:null}),size:`sm`,value:n,children:[(0,R.jsx)(v,{value:`ltr`,children:`LTR`}),(0,R.jsx)(v,{value:`rtl`,children:`RTL`})]}),(0,R.jsx)(C,{})]})]}),(0,R.jsxs)(g,{defaultValue:`preview`,children:[(0,R.jsxs)(E,{"aria-label":`Preview or code`,children:[(0,R.jsx)(T,{value:`preview`,children:`Preview`}),(0,R.jsx)(T,{value:`code`,children:`Code`})]}),(0,R.jsx)(b,{value:`preview`,children:(0,R.jsxs)(h,{className:`flex flex-col gap-8`,dir:n,children:[(0,R.jsx)(`div`,{className:`flex justify-center`,children:(0,R.jsx)(J,{cancelOpen:t===`cancel-confirm`,state:a},t)}),(0,R.jsx)(re,{}),(0,R.jsxs)(`div`,{className:`grid gap-6 sm:grid-cols-2`,children:[(0,R.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,R.jsx)(`p`,{className:`text-muted-foreground text-sm`,dir:`auto`,children:`coss ui today: the chevrons stay put in right-to-left.`}),(0,R.jsx)(F,{"aria-label":`Example pagination, coss ui today`,children:(0,R.jsxs)(N,{children:[(0,R.jsx)(P,{children:(0,R.jsx)(we,{render:(0,R.jsx)(s,{size:`sm`,variant:`outline`})})}),(0,R.jsx)(P,{children:(0,R.jsx)(Ce,{render:(0,R.jsx)(s,{size:`sm`,variant:`outline`})})})]})})]}),(0,R.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,R.jsxs)(`p`,{className:`text-muted-foreground text-sm`,dir:`auto`,children:[`With`,` `,(0,R.jsx)(`a`,{className:`text-foreground underline underline-offset-4`,href:Re,rel:`noreferrer`,target:`_blank`,children:`#913`}),`: they point the way you move.`]}),(0,R.jsx)(F,{"aria-label":`Example pagination, with #913`,children:(0,R.jsxs)(N,{children:[(0,R.jsx)(P,{children:(0,R.jsxs)(M,{"aria-label":`Go to previous page`,render:(0,R.jsx)(s,{size:`sm`,variant:`outline`}),children:[(0,R.jsx)(l,{"aria-hidden":`true`,className:`rtl:rotate-180`}),`Previous`]})}),(0,R.jsx)(P,{children:(0,R.jsxs)(M,{"aria-label":`Go to next page`,render:(0,R.jsx)(s,{size:`sm`,variant:`outline`}),children:[`Next`,(0,R.jsx)(u,{"aria-hidden":`true`,className:`rtl:rotate-180`})]})})]})})]})]})]})}),(0,R.jsx)(b,{value:`code`,children:(0,R.jsx)(`pre`,{className:`max-h-[32rem] overflow-auto rounded-xl border border-border bg-muted/40 p-4 text-xs leading-relaxed`,children:(0,R.jsx)(`code`,{children:Pe})})})]})]}),(0,R.jsxs)(`section`,{"aria-labelledby":`api-h`,className:`flex flex-col gap-3`,children:[(0,R.jsx)(`h2`,{className:`font-semibold text-xl`,id:`api-h`,children:`API reference`}),(0,R.jsxs)(`p`,{className:`max-w-2xl text-muted-foreground text-sm`,children:[`Read from `,(0,R.jsx)(`code`,{className:`text-xs`,children:`WaitlistProps`}),` in the source when the page builds: the names, the types, the defaults from the function's own signature and the comment above each prop. Change the type and this table changes; it cannot drift.`]}),(0,R.jsx)(m,{doc:$})]}),(0,R.jsxs)(`section`,{"aria-labelledby":`states-h`,className:`flex flex-col gap-4`,children:[(0,R.jsx)(`h2`,{className:`font-semibold text-xl`,id:`states-h`,children:`States`}),(0,R.jsx)(`div`,{className:`grid gap-4 sm:grid-cols-2`,children:ze.map(e=>(0,R.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,R.jsxs)(`p`,{className:`text-sm`,children:[(0,R.jsx)(`span`,{className:`font-medium`,children:e.title}),` `,(0,R.jsxs)(`span`,{className:`text-muted-foreground`,children:[`· `,e.line]})]}),(0,R.jsx)(h,{className:`flex justify-center`,dir:n,children:(0,R.jsx)(J,{state:e.state})})]},e.state))})]}),(0,R.jsxs)(`section`,{"aria-labelledby":`a11y-h`,className:`flex flex-col gap-4`,children:[(0,R.jsx)(`h2`,{className:`font-semibold text-xl`,id:`a11y-h`,children:`Accessibility`}),(0,R.jsxs)(`ul`,{className:`flex max-w-2xl list-disc flex-col gap-2 ps-5 text-muted-foreground text-sm`,children:[(0,R.jsxs)(`li`,{children:[`One live region (`,(0,R.jsx)(`code`,{className:`text-xs`,children:`role="status"`}),`) from the moment the card mounts, so each change is read out and nothing new has to be discovered.`]}),(0,R.jsxs)(`li`,{children:[`A join that lands moves focus to the place in line (a `,(0,R.jsx)(`code`,{className:`text-xs`,children:`group`}),` with an accessible name), so it is read out and the eye lands on it. A card that mounts already joined never steals focus.`]}),(0,R.jsxs)(`li`,{children:[`While joining, the card is `,(0,R.jsx)(`code`,{className:`text-xs`,children:`aria-busy`}),` and the button is `,(0,R.jsx)(`code`,{className:`text-xs`,children:`aria-disabled`}),`, not disabled: focus stays where it was.`]}),(0,R.jsxs)(`li`,{children:[`A failed join is announced (`,(0,R.jsx)(`code`,{className:`text-xs`,children:`role="alert"`}),`) in the footer, in the same cell as the time-zone line it replaces, so the card never changes height.`]}),(0,R.jsx)(`li`,{children:`The taken slots are a list named for what it shows; each is struck through and read as “taken”, so the strike-through isn’t the only signal.`}),(0,R.jsx)(`li`,{children:`Leaving goes through an alert dialog. Escape closes it; focus returns to the button that opened it. Base UI does both.`})]}),(0,R.jsxs)(ge,{className:`max-w-2xl`,children:[(0,R.jsx)(me,{children:(0,R.jsxs)(O,{children:[(0,R.jsx)(A,{children:`Key`}),(0,R.jsx)(A,{children:`Does`})]})}),(0,R.jsx)(he,{children:[[`Tab`,`Reaches Join, or Leave the list once joined. The place in line takes focus only when a join lands.`],[`Enter / Space`,`Joins, or opens the question.`],[`Escape`,`Closes the question and keeps the place.`]].map(([e,t])=>(0,R.jsxs)(O,{children:[(0,R.jsx)(k,{className:`whitespace-nowrap`,children:e.split(` / `).map((e,t)=>(0,R.jsxs)(I.Fragment,{children:[t>0?` / `:null,(0,R.jsx)(_e,{children:e})]},e))}),(0,R.jsx)(k,{className:`whitespace-normal leading-normal`,children:t})]},e))})]})]}),(0,R.jsxs)(`section`,{"aria-labelledby":`motion-h`,className:`flex flex-col gap-3`,children:[(0,R.jsx)(`h2`,{className:`font-semibold text-xl`,id:`motion-h`,children:`Motion`}),(0,R.jsxs)(`dl`,{className:`grid max-w-2xl gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]`,children:[(0,R.jsx)(`dt`,{className:`font-medium`,children:`What moves`}),(0,R.jsx)(`dd`,{className:`text-muted-foreground`,children:`The place in line, once, as it appears: opacity and a 4px rise, 180 ms, ease-out.`}),(0,R.jsx)(`dt`,{className:`font-medium`,children:`What doesn't`}),(0,R.jsx)(`dd`,{className:`text-muted-foreground`,children:`The button, the card and its height. The button changes its label in place, at the same size; an error swaps the footer line in place.`}),(0,R.jsx)(`dt`,{className:`font-medium`,children:`Why`}),(0,R.jsx)(`dd`,{className:`text-muted-foreground`,children:`One thing on the card is new. The eye should land on it and nothing else should compete.`}),(0,R.jsx)(`dt`,{className:`font-medium`,children:`Reduced motion`}),(0,R.jsx)(`dd`,{className:`text-muted-foreground`,children:`It simply appears. Nothing on the card is animation-only.`})]})]}),(0,R.jsxs)(`section`,{"aria-labelledby":`rtl-h`,className:`flex flex-col gap-3`,children:[(0,R.jsx)(`h2`,{className:`font-semibold text-xl`,id:`rtl-h`,children:`Right-to-left`}),(0,R.jsxs)(`p`,{className:`max-w-2xl text-muted-foreground text-sm`,children:[`Logical properties throughout, and the one directional icon carries `,(0,R.jsx)(`code`,{className:`text-xs`,children:`rtl:rotate-180`}),`, the class coss's Calendar already uses. The pagination pair above is why that matters: the stock chevrons point the wrong way in RTL, and`,` `,(0,R.jsx)(s,{className:`h-auto px-0 py-0 align-baseline text-sm underline sm:h-auto sm:text-sm`,render:(0,R.jsx)(c,{href:Re,rel:`noreferrer`,target:`_blank`}),variant:`link`,children:`#913`}),` `,`fixes it across menu, context menu, drawer, pagination and breadcrumb.`]})]}),(0,R.jsxs)(`section`,{className:`flex flex-col gap-4 rounded-2xl border border-border bg-muted/30 p-6`,children:[(0,R.jsx)(`p`,{className:`font-medium`,children:`A slot should open. This is where I’d spend it.`}),(0,R.jsxs)(`div`,{className:`flex flex-wrap gap-2`,children:[(0,R.jsx)(p,{calLink:Ie,children:`Book a time to argue about the API`}),(0,R.jsx)(s,{render:(0,R.jsx)(c,{href:Le}),variant:`outline`,children:`The work`})]}),(0,R.jsx)(`p`,{className:`text-muted-foreground text-xs`,children:`Not a Cal.com or coss ui page. A proposal, by Rahul Jha.`})]})]})}export{Ve as WaitlistDocsPage};