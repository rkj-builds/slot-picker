import{a as e,c as t,r as n,t as r}from"./utils-0MzkHkZl.js";import{Fi as i,Ii as a,Ni as o,R as s,Sa as c,wa as l}from"./radio-group-EZA7t4bo.js";import{t as u}from"./arrow-right-DEXmbaWU.js";import{i as d,n as f,r as p}from"./time-zone-Bs4FiUPV.js";import{B as m,F as h,Gt as g,H as _,I as v,Kt as y,N as b,P as x,U as S,Ut as C,V as w,Vt as ee,q as T,qt as E,sr as D,zn as O}from"./index-NsGqvx6l.js";import{a as te,c as ne,i as re,n as ie,o as ae,r as oe,s as se,t as ce}from"./alert-dialog-DU3q3X-I.js";import{c as k,i as A,l as j,o as M,r as le,s as N,t as ue}from"./kbd-CLm9i5uD.js";import{a as de,c as P,d as fe,f as pe,i as F,l as me,n as I,o as he,r as L,s as ge,t as R,u as _e}from"./pagination-Dr-bxL-N.js";var z=t(e(),1),B=n(),ve=function(e){let{direction:t=`ltr`}=e,n=z.useMemo(()=>({direction:t}),[t]);return(0,B.jsx)(s.Provider,{value:n,children:e.children})},ye=`https://app.cal.com/embed/embed.js`;function V(e,t){(e.q??=[]).push(t)}function be(){let e=Object.assign((...t)=>{if(t[0]===`init`&&typeof t[1]==`string`){let n=t[1],r=e.ns??={},i=Object.assign((...e)=>V(i,e),{q:[]});r[n]??=i,V(r[n],t),V(e,[`initNamespace`,n])}else V(e,t)},{q:[],ns:{},loaded:!0});return e}var H=null;function xe({timeoutMs:e=6e3}={}){return H||(window.Cal??=be(),H=new Promise((t,n)=>{let r=document.createElement(`script`),i=e=>{window.clearTimeout(a),H=null,r.remove(),n(Error(e))},a=window.setTimeout(()=>i(`timeout`),e);r.src=ye,r.async=!0,r.dataset.calEmbed=``,r.onload=()=>{window.clearTimeout(a),t()},r.onerror=()=>i(`blocked`),document.head.appendChild(r)}),H)}function Se(e,t){let n=window.Cal;if(!n)return;n.ns?.[e]||n(`init`,e,{origin:`https://cal.com`});let r=n.ns?.[e];return r?.(`ui`,t),r}var U=`waitlist`;function Ce({calLink:e,children:t}){let n=`https://cal.com/${e}`,[r,i]=z.useState(!1),a=z.useCallback(()=>{xe().then(()=>{Se(U,{layout:`month_view`,hideEventTypeDetails:!1}),i(!0)},()=>i(!1))},[]);return(0,B.jsxs)(o,{"data-cal-ready":r||void 0,render:(0,B.jsx)(l,{href:n,onClick:t=>{let n=window.Cal?.ns?.[U];r&&n&&(t.preventDefault(),n(`modal`,{calLink:e,config:{layout:`month_view`,theme:document.documentElement.classList.contains(`dark`)?`dark`:`light`}}))},onFocus:a,onPointerEnter:a,rel:`noreferrer`,target:`_blank`}),children:[t,(0,B.jsx)(D,{"aria-hidden":`true`,className:`rtl:-scale-x-100`})]})}function W({dir:e,className:t,children:n,...i}){return(0,B.jsx)(ve,{direction:e,children:(0,B.jsx)(`div`,{className:r(`rounded-xl border border-border bg-background p-6`,t),"data-slot":`direction-frame`,dir:e,...i,children:n})})}function G(e){return e.defaultValue??(e.optional?`–`:`required`)}function we({doc:e}){return(0,B.jsxs)(B.Fragment,{children:[(0,B.jsx)(`dl`,{className:`flex flex-col divide-y divide-border rounded-xl border border-border sm:hidden`,children:e.props.map(e=>(0,B.jsxs)(`div`,{className:`flex flex-col gap-1.5 p-4`,children:[(0,B.jsxs)(`dt`,{className:`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1`,children:[(0,B.jsxs)(`code`,{className:`font-medium text-sm`,children:[e.name,e.optional?`?`:``]}),(0,B.jsx)(`code`,{className:`text-muted-foreground text-xs`,children:G(e)})]}),(0,B.jsxs)(`dd`,{className:`flex flex-col gap-1.5`,children:[(0,B.jsx)(`code`,{className:`whitespace-pre-wrap break-words text-muted-foreground text-xs`,children:e.type}),(0,B.jsx)(`span`,{className:`text-sm leading-normal`,children:e.doc})]})]},e.name))}),(0,B.jsx)(`div`,{className:`max-sm:hidden`,children:(0,B.jsxs)(le,{children:[(0,B.jsx)(k,{children:(0,B.jsxs)(j,{children:[(0,B.jsx)(N,{children:`Prop`}),(0,B.jsx)(N,{children:`Type`}),(0,B.jsx)(N,{children:`Default`}),(0,B.jsx)(N,{children:`Description`})]})}),(0,B.jsx)(A,{children:e.props.map(e=>(0,B.jsxs)(j,{children:[(0,B.jsx)(M,{className:`whitespace-nowrap align-top`,children:(0,B.jsxs)(`code`,{className:`text-sm`,children:[e.name,e.optional?`?`:``]})}),(0,B.jsx)(M,{className:`align-top`,children:(0,B.jsx)(`code`,{className:`whitespace-pre-wrap text-muted-foreground text-xs`,children:e.type})}),(0,B.jsx)(M,{className:`align-top`,children:(0,B.jsx)(`code`,{className:`text-muted-foreground text-xs`,children:G(e)})}),(0,B.jsx)(M,{className:`whitespace-normal align-top leading-normal`,children:e.doc})]},e.name))})]})})]})}function Te(e,{closed:t=!1}={}){return t?{ok:!1,reason:`closed`}:e===`joined`?{ok:!1,reason:`already-joined`}:e===`joining`?{ok:!1,reason:`joining`}:{ok:!0,next:`joining`}}function K(e){let t=e.ahead.length;return`${e.position} · ${t===0?`nobody`:t===1?`1 person`:`${t} people`} ahead of you`}var q=z.createContext(null);function J(e){let t=z.useContext(q);if(!t)throw Error(`<${e}> must be inside <Waitlist>`);return t}function Ee({item:e,status:t,onJoin:n,onCancel:i,state:a,onStateChange:o,defaultState:s=`idle`,place:c,joiningLabel:l=`Checking for cancellations…`,errorLabel:u=`The list did not answer. Nothing was lost.`,className:d,children:f}){let[p,m]=z.useState(s),h=a??p,[g,_]=z.useState(void 0),v=g??c,[y,b]=z.useState(null),x=z.useRef(null),S=z.useRef(!0);z.useEffect(()=>(S.current=!0,()=>{S.current=!1}),[]);let C=z.useCallback(e=>{m(e),o?.(e)},[o]),w=z.useRef(h);z.useEffect(()=>{w.current===`joining`&&h===`joined`&&x.current?.focus(),w.current=h},[h]);let T=z.useCallback(()=>{Te(h).ok&&(b(null),C(`joining`),n().then(e=>{S.current&&(_(e),C(`joined`))},e=>{S.current&&(b(e instanceof Error&&e.message?e.message:u),C(`error`))}))},[h,n,C,u]),E=z.useCallback(async()=>{let e=!i||await i();S.current&&e&&(_(void 0),C(`idle`))},[i,C]),D=z.useMemo(()=>({item:e,state:h,place:v,error:y,joiningLabel:l,errorLabel:u,join:T,leave:E,positionRef:x}),[e,h,v,y,l,u,T,E]),O=h===`joined`&&v?`You're on the list. Position ${v.position}, ${K(v).split(` · `)[1]}.`:h===`joining`?l:``;return(0,B.jsx)(q.Provider,{value:D,children:(0,B.jsxs)(ee,{"aria-busy":h===`joining`||void 0,className:r(`w-full max-w-sm`,d),"data-slot":`waitlist`,"data-state":h,children:[(0,B.jsx)(`p`,{"aria-live":`polite`,className:`sr-only`,role:`status`,children:O}),f??(0,B.jsxs)(B.Fragment,{children:[(0,B.jsxs)(Y,{children:[(0,B.jsx)(X,{}),t?(0,B.jsx)(Z,{children:t}):null]}),(0,B.jsxs)($,{children:[(0,B.jsx)(Q,{}),(0,B.jsx)(ke,{})]})]})]})})}function Y(e){return(0,B.jsx)(g,{"data-slot":`waitlist-header`,...e})}function X({children:e,className:t,...n}){let{item:i}=J(`WaitlistTitle`);return(0,B.jsx)(E,{className:r(`text-balance leading-tight`,t),"data-slot":`waitlist-title`,...n,children:e??i})}function Z(e){return(0,B.jsx)(C,{"data-slot":`waitlist-status`,...e})}function Q({className:e,...t}){let{state:n,place:i,positionRef:a}=J(`WaitlistPosition`);if(n!==`joined`||!i)return null;let[o,s]=K(i).split(` · `);return(0,B.jsxs)(`div`,{"aria-label":`Position ${o}, ${s}`,className:r(`flex items-baseline gap-3 rounded-lg outline-none motion-safe:animate-waitlist-enter focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`,e),"data-slot":`waitlist-position`,ref:a,role:`group`,tabIndex:-1,...t,children:[(0,B.jsx)(`span`,{className:`font-semibold text-4xl tabular-nums leading-none`,children:o}),(0,B.jsxs)(`span`,{className:`flex items-center gap-1.5 text-muted-foreground text-sm`,children:[(0,B.jsx)(u,{"aria-hidden":`true`,className:`size-4 rtl:rotate-180`}),s]})]})}function De({className:e,children:t,...n}){let{state:a,error:s,joiningLabel:c,errorLabel:l,join:u}=J(`WaitlistJoin`);if(a===`joined`)return null;let d=[[`idle`,t??`Join the waitlist`],[`joining`,(0,B.jsxs)(B.Fragment,{children:[(0,B.jsx)(i,{"aria-hidden":`true`,className:`size-4`}),c]})],[`error`,`Try again`]];return(0,B.jsxs)(`div`,{className:`flex flex-col gap-2`,"data-slot":`waitlist-join`,children:[(0,B.jsx)(o,{"aria-disabled":a===`joining`||void 0,className:r(`grid place-items-center`,e),"data-state":a,onClick:u,...n,children:d.map(([e,t])=>{let n=e===a;return(0,B.jsx)(`span`,{"aria-hidden":!n||void 0,className:r(`inline-flex items-center gap-2 [grid-area:1/1]`,!n&&`invisible`),children:t},e)})}),(0,B.jsx)(`p`,{className:`min-h-5 text-destructive-foreground text-sm leading-5`,role:`alert`,children:a===`error`?s??l:null})]})}function Oe({children:e,title:t=`Are you sure?`,description:n=`There is nobody behind you either. Leaving only makes the list shorter.`,keepLabel:r=`Keep my place`,leaveLabel:i=`Leave`,defaultOpen:a=!1}){let{state:s,leave:c}=J(`WaitlistCancel`),[l,u]=z.useState(a);return s===`joined`?(0,B.jsxs)(ce,{onOpenChange:u,open:l,children:[(0,B.jsx)(ne,{"data-slot":`waitlist-cancel`,render:(0,B.jsx)(o,{variant:`outline`}),children:e??`Leave the list`}),(0,B.jsxs)(ae,{children:[(0,B.jsxs)(te,{children:[(0,B.jsx)(se,{children:t}),(0,B.jsx)(oe,{children:n})]}),(0,B.jsxs)(re,{children:[(0,B.jsx)(ie,{render:(0,B.jsx)(o,{}),children:r}),(0,B.jsx)(o,{onClick:()=>{u(!1),c()},variant:`ghost`,children:i})]})]})]}):null}function $({className:e,...t}){return(0,B.jsx)(y,{className:r(`flex flex-col gap-4 pt-0`,e),"data-slot":`waitlist-body`,...t})}function ke({cancelOpen:e=!1,className:t,...n}){return(0,B.jsxs)(`div`,{className:r(`flex flex-wrap items-start gap-2`,t),"data-slot":`waitlist-actions`,...n,children:[(0,B.jsx)(De,{}),(0,B.jsx)(Oe,{defaultOpen:e})]})}function Ae({className:e,...t}){return(0,B.jsx)(`p`,{className:r(`text-muted-foreground text-xs`,e),"data-slot":`waitlist-meta`,...t})}var je={position:1,ahead:[]};function Me({state:e,onStateChange:t,fail:n=!1,cancelOpen:r=!1}){let{now:i}=O(),a=z.useMemo(()=>f(Intl.DateTimeFormat().resolvedOptions().timeZone,i()),[i]),o=z.useCallback(()=>new Promise((e,t)=>{window.setTimeout(()=>n?t(Error(`The list did not answer. Nothing was lost.`)):e(je),1100)}),[n]),s=z.useCallback(()=>(v.add({title:`Cancelled.`,description:`Just kidding, you're still on it.`,type:`info`}),!1),[]);return(0,B.jsxs)(Ee,{item:`Senior Product Design Engineer at Cal.com`,onCancel:s,onJoin:o,onStateChange:t,place:je,state:e,status:`Every slot taken`,children:[(0,B.jsxs)(Y,{children:[(0,B.jsx)(X,{}),(0,B.jsx)(Z,{children:`Every slot taken`})]}),(0,B.jsxs)($,{children:[(0,B.jsxs)(Ae,{children:[`Your time: `,a.offsetLabel.replace(`-`,`−`),` · `,a.city]}),(0,B.jsx)(Q,{}),(0,B.jsx)(ke,{cancelOpen:r})]})]})}var Ne=`import * as React from "react";
import { useClock } from "@/app/clock";
import { Waitlist, WaitlistActions, WaitlistBody, WaitlistHeader, WaitlistMeta, WaitlistPosition, WaitlistStatus, WaitlistTitle, type WaitlistPlace, type WaitlistState } from "@/components/compositions/waitlist";
import { toastManager } from "@/components/ui/toast";
import { describeZone } from "@/primitives/time-zone";

/** The front of the list. There is nobody else on it. */
const FRONT: WaitlistPlace = { position: 1, ahead: [] };

/**
 * The instance this page was built for: a role that is fully booked. Joining checks for
 * cancellations (there never are any), leaving asks first and then changes its mind.
 */
export function WaitlistDemo({ state, onStateChange, fail = false, cancelOpen = false }: { state?: WaitlistState; onStateChange?: (s: WaitlistState) => void; fail?: boolean; cancelOpen?: boolean }): React.ReactElement {
  const { now } = useClock();
  const zone = React.useMemo(() => describeZone(Intl.DateTimeFormat().resolvedOptions().timeZone, now()), [now]);

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
    <Waitlist item="Senior Product Design Engineer at Cal.com" onCancel={onCancel} onJoin={onJoin} onStateChange={onStateChange} place={FRONT} state={state} status="Every slot taken">
      <WaitlistHeader>
        <WaitlistTitle />
        <WaitlistStatus>Every slot taken</WaitlistStatus>
      </WaitlistHeader>
      <WaitlistBody>
        {/* A true minus in the offset (GMT−4), as Cal Sans's guide asks: the hyphen only joins words. */}
        <WaitlistMeta>
          Your time: {zone.offsetLabel.replace("-", "−")} · {zone.city}
        </WaitlistMeta>
        <WaitlistPosition />
        <WaitlistActions cancelOpen={cancelOpen} />
      </WaitlistBody>
    </Waitlist>
  );
}
`,Pe=`"use client";

import { ArrowRightIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { attemptJoin, placeLabel, type WaitlistPlace, type WaitlistState } from "@/lib/waitlist";

export type { WaitlistPlace, WaitlistState } from "@/lib/waitlist";

export interface WaitlistProps {
  /** What is full: a course, a court, a role. */
  item: string;
  /** Why it is full, in a line under the item. */
  status?: string;
  /** Called on Join. Resolve with the place in line; reject to show the error state, with the same button as the retry. */
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
  /** What the error line says when \`onJoin\` rejects without a message of its own. */
  errorLabel?: string;
  /** Merged onto the card, as on every coss part. */
  className?: string;
  /** Your own arrangement of the parts (WaitlistHeader, WaitlistPosition, WaitlistActions…). Left out, the default layout renders. */
  children?: React.ReactNode;
}

interface WaitlistContextValue {
  item: string;
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
  status,
  onJoin,
  onCancel,
  state: stateProp,
  onStateChange,
  defaultState = "idle",
  place: placeProp,
  joiningLabel = "Checking for cancellations…",
  errorLabel = "The list did not answer. Nothing was lost.",
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

  const value = React.useMemo<WaitlistContextValue>(() => ({ item, state, place, error, joiningLabel, errorLabel, join, leave, positionRef }), [item, state, place, error, joiningLabel, errorLabel, join, leave]);

  const live = state === "joined" && place ? \`You're on the list. Position \${place.position}, \${placeLabel(place).split(" · ")[1]}.\` : state === "joining" ? joiningLabel : "";

  return (
    <WaitlistContext.Provider value={value}>
      <Card aria-busy={state === "joining" || undefined} className={cn("w-full max-w-sm", className)} data-slot="waitlist" data-state={state}>
        {/* One live region from mount, so a screen reader hears each change and the DOM never gains a region mid-flow. */}
        <p aria-live="polite" className="sr-only" role="status">
          {live}
        </p>
        {children ?? (
          <>
            <WaitlistHeader>
              <WaitlistTitle />
              {status ? <WaitlistStatus>{status}</WaitlistStatus> : null}
            </WaitlistHeader>
            <WaitlistBody>
              <WaitlistPosition />
              <WaitlistActions />
            </WaitlistBody>
          </>
        )}
      </Card>
    </WaitlistContext.Provider>
  );
}

export function WaitlistHeader(props: React.ComponentProps<typeof CardHeader>): React.ReactElement {
  return <CardHeader data-slot="waitlist-header" {...props} />;
}

export function WaitlistTitle({ children, className, ...props }: React.ComponentProps<typeof CardTitle>): React.ReactElement {
  const { item } = useWaitlist("WaitlistTitle");
  return (
    // coss's CardTitle is leading-none, set for one line; an item name can wrap, so it gets the guide's 125% and balanced lines.
    <CardTitle className={cn("text-balance leading-tight", className)} data-slot="waitlist-title" {...props}>
      {children ?? item}
    </CardTitle>
  );
}

export function WaitlistStatus(props: React.ComponentProps<typeof CardDescription>): React.ReactElement {
  return <CardDescription data-slot="waitlist-status" {...props} />;
}

/**
 * The place in line. Rendered only once joined, and the one thing on the card that moves:
 * it rises 4px as it appears, so the eye lands on what is new. Under reduced motion it simply appears.
 */
export function WaitlistPosition({ className, ...props }: React.ComponentProps<"div">): React.ReactElement | null {
  const { state, place, positionRef } = useWaitlist("WaitlistPosition");
  if (state !== "joined" || !place) return null;
  const [number, rest] = placeLabel(place).split(" · ");
  return (
    <div
        aria-label={\`Position \${number}, \${rest}\`}
        className={cn("flex items-baseline gap-3 rounded-lg outline-none motion-safe:animate-waitlist-enter focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", className)}
        data-slot="waitlist-position"
        ref={positionRef}
        role="group"
        tabIndex={-1}
        {...props}
      >
        <span className="font-semibold text-4xl tabular-nums leading-none">{number}</span>
        <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <ArrowRightIcon aria-hidden="true" className="size-4 rtl:rotate-180" />
          {rest}
        </span>
      </div>
  );
}

/** Join, with the error line under it. Three labels share one cell, so the button never changes width. */
export function WaitlistJoin({ className, children, ...props }: React.ComponentProps<typeof Button>): React.ReactElement | null {
  const { state, error, joiningLabel, errorLabel, join } = useWaitlist("WaitlistJoin");
  if (state === "joined") return null;
  const labels: [WaitlistState, React.ReactNode][] = [
    ["idle", children ?? "Join the waitlist"],
    [
      "joining",
      <>
        <Spinner aria-hidden="true" className="size-4" />
        {joiningLabel}
      </>,
    ],
    ["error", "Try again"],
  ];
  return (
    <div className="flex flex-col gap-2" data-slot="waitlist-join">
      <Button aria-disabled={state === "joining" || undefined} className={cn("grid place-items-center", className)} data-state={state} onClick={join} {...props}>
        {labels.map(([forState, label]) => {
          const active = forState === state;
          return (
            <span aria-hidden={!active || undefined} className={cn("inline-flex items-center gap-2 [grid-area:1/1]", !active && "invisible")} key={forState}>
              {label}
            </span>
          );
        })}
      </Button>
      {/* The line is always there at its full height, so an error never pushes the card down. */}
      <p className="min-h-5 text-destructive-foreground text-sm leading-5" role="alert">
        {state === "error" ? (error ?? errorLabel) : null}
      </p>
    </div>
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
      <AlertDialogTrigger data-slot="waitlist-cancel" render={<Button variant="outline" />}>
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

/** Everything under the header in one panel with one gap, so the card's rhythm doesn't depend on which parts are showing. */
export function WaitlistBody({ className, ...props }: React.ComponentProps<typeof CardPanel>): React.ReactElement {
  // pt-0 by hand: coss zeroes it with a :has(> header) selector that the live region, first in the card, keeps from matching.
  return <CardPanel className={cn("flex flex-col gap-4 pt-0", className)} data-slot="waitlist-body" {...props} />;
}

/** Join and Leave; whichever applies renders. */
export function WaitlistActions({ cancelOpen = false, className, ...props }: React.ComponentProps<"div"> & { cancelOpen?: boolean }): React.ReactElement {
  return (
    <div className={cn("flex flex-wrap items-start gap-2", className)} data-slot="waitlist-actions" {...props}>
      <WaitlistJoin />
      <WaitlistCancel defaultOpen={cancelOpen} />
    </div>
  );
}

/** One line of context: the viewer's time zone, a date. Above the actions, so the reserved error line ends the card. */
export function WaitlistMeta({ className, ...props }: React.ComponentProps<"p">): React.ReactElement {
  return <p className={cn("text-muted-foreground text-xs", className)} data-slot="waitlist-meta" {...props} />;
}
`;function Fe(e,t){let n=RegExp(`\\/\\*\\*((?:(?!\\*\\/)[\\s\\S])*)\\*\\/\\s*export function ${t}\\(`).exec(e)?.[1]??``,r=RegExp(`export (?:type ${t}Props\\s*=\\s*|interface ${t}Props\\s*)\\{([\\s\\S]*?)\\n\\};?`).exec(e)?.[1]??``,i=new Map,a=RegExp(`export function ${t}\\(\\{([\\s\\S]*?)\\}\\s*:`).exec(e)?.[1]??``;for(let e of a.matchAll(/(\w+)\s*=\s*([^,]+)/g))i.set(e[1]??``,(e[2]??``).trim());let o=[],s=r.replace(/\{[^{}]*\}/g,e=>`__obj${o.push(e)-1}__`),c=e=>e.replace(/__obj(\d+)__/g,(e,t)=>o[Number(t)]??``),l=[];for(let e of s.matchAll(/(?:\/\*\*([\s\S]*?)\*\/\s*)?(\w+)(\?)?:\s*([^;]+);/g)){let t=e[2]??``;l.push({name:t,type:c((e[4]??``).trim()),optional:e[3]===`?`,defaultValue:i.get(t)??null,doc:Ie(e[1]??``)})}return{name:t,summary:Ie(n),props:l}}function Ie(e){return e.split(`
`).map(e=>e.replace(/^\s*\*\s?/,``).trim()).join(` `).replace(/\s+/g,` `).trim()}var Le=`rahul-kumar-jha-ll9vhj/30min`,Re=`https://rkj-builds.github.io/for/cal/`,ze=`https://github.com/cosscom/ui/pull/913`,Be=[{value:`live`,label:`Live`},{value:`idle`,label:`Idle`},{value:`joining`,label:`Joining`},{value:`joined`,label:`Joined`},{value:`error`,label:`Error`},{value:`cancel-confirm`,label:`Leave?`}],Ve=[{state:`idle`,title:`Idle`,line:`Full, with one thing to do.`},{state:`joining`,title:`Joining`,line:`Busy. The button keeps its width; the card is aria-busy.`},{state:`joined`,title:`Joined`,line:`The place in line, and the way out.`},{state:`error`,title:`Error`,line:`The reason, on a line that was always there. The same button retries.`}],He=Fe(Pe,`Waitlist`);function Ue(e){let t=e.query.get(`state`);return Be.some(e=>e.value===t)?t:`live`}function We({route:e}){let t=Ue(e),n=e.query.get(`dir`)===`rtl`?`rtl`:`ltr`,r=t=>c(e.path,{state:e.query.get(`state`),dir:e.query.get(`dir`),theme:e.query.get(`theme`),...t},{replace:!0}),i=t===`live`?void 0:t===`cancel-confirm`?`joined`:t;return(0,B.jsxs)(`main`,{className:`mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8`,children:[(0,B.jsxs)(`header`,{className:`flex flex-col gap-4`,children:[(0,B.jsx)(ge,{children:(0,B.jsxs)(_e,{children:[(0,B.jsx)(P,{children:(0,B.jsx)(me,{href:`#/components`,children:`Components`})}),(0,B.jsx)(pe,{}),(0,B.jsx)(P,{children:(0,B.jsx)(fe,{children:`Waitlist`})})]})}),(0,B.jsxs)(`div`,{className:`flex flex-col gap-2`,children:[(0,B.jsxs)(`div`,{className:`flex flex-wrap items-center gap-3`,children:[(0,B.jsx)(`h1`,{className:`font-semibold text-3xl`,tabIndex:-1,children:`Waitlist`}),(0,B.jsx)(a,{variant:`secondary`,children:`proposal`})]}),(0,B.jsx)(`p`,{className:`max-w-2xl text-muted-foreground`,children:He.summary}),(0,B.jsx)(`p`,{className:`max-w-2xl text-muted-foreground text-sm`,children:`coss ui has no Waitlist. This is one, built from coss parts the way the library builds its own: Card, Button, Alert Dialog, Toast. Every colour is a token; every word on it can be changed from a prop.`})]})]}),(0,B.jsxs)(`section`,{"aria-labelledby":`preview-h`,className:`flex flex-col gap-4`,children:[(0,B.jsxs)(`div`,{className:`flex flex-wrap items-center justify-between gap-3`,children:[(0,B.jsx)(`h2`,{className:`font-semibold text-xl`,id:`preview-h`,children:`Preview`}),(0,B.jsxs)(`div`,{className:`flex flex-wrap items-center gap-2`,children:[(0,B.jsx)(x,{"aria-label":`State shown`,onValueChange:e=>r({state:e===`live`?null:e}),size:`sm`,value:t,children:Be.map(e=>(0,B.jsx)(h,{value:e.value,children:e.label},e.value))}),(0,B.jsxs)(x,{"aria-label":`Direction`,onValueChange:e=>r({dir:e===`rtl`?`rtl`:null}),size:`sm`,value:n,children:[(0,B.jsx)(h,{value:`ltr`,children:`LTR`}),(0,B.jsx)(h,{value:`rtl`,children:`RTL`})]}),(0,B.jsx)(b,{})]})]}),(0,B.jsxs)(m,{defaultValue:`preview`,children:[(0,B.jsxs)(w,{"aria-label":`Preview or code`,children:[(0,B.jsx)(S,{value:`preview`,children:`Preview`}),(0,B.jsx)(S,{value:`code`,children:`Code`})]}),(0,B.jsx)(_,{value:`preview`,children:(0,B.jsxs)(W,{className:`flex flex-col gap-8`,dir:n,children:[(0,B.jsx)(`div`,{className:`flex justify-center`,children:(0,B.jsx)(Me,{cancelOpen:t===`cancel-confirm`,state:i},t)}),(0,B.jsx)(T,{}),(0,B.jsxs)(`div`,{className:`grid gap-6 sm:grid-cols-2`,children:[(0,B.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,B.jsx)(`p`,{className:`text-muted-foreground text-sm`,dir:`auto`,children:`coss ui today: the chevrons stay put in right-to-left.`}),(0,B.jsx)(R,{"aria-label":`Example pagination, coss ui today`,children:(0,B.jsxs)(I,{children:[(0,B.jsx)(L,{children:(0,B.jsx)(he,{render:(0,B.jsx)(o,{size:`sm`,variant:`outline`})})}),(0,B.jsx)(L,{children:(0,B.jsx)(de,{render:(0,B.jsx)(o,{size:`sm`,variant:`outline`})})})]})})]}),(0,B.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,B.jsxs)(`p`,{className:`text-muted-foreground text-sm`,dir:`auto`,children:[`With`,` `,(0,B.jsx)(`a`,{className:`text-foreground underline underline-offset-4`,href:ze,rel:`noreferrer`,target:`_blank`,children:`#913`}),`: they point the way you move.`]}),(0,B.jsx)(R,{"aria-label":`Example pagination, with #913`,children:(0,B.jsxs)(I,{children:[(0,B.jsx)(L,{children:(0,B.jsxs)(F,{"aria-label":`Go to previous page`,render:(0,B.jsx)(o,{size:`sm`,variant:`outline`}),children:[(0,B.jsx)(d,{"aria-hidden":`true`,className:`rtl:rotate-180`}),`Previous`]})}),(0,B.jsx)(L,{children:(0,B.jsxs)(F,{"aria-label":`Go to next page`,render:(0,B.jsx)(o,{size:`sm`,variant:`outline`}),children:[`Next`,(0,B.jsx)(p,{"aria-hidden":`true`,className:`rtl:rotate-180`})]})})]})})]})]})]})}),(0,B.jsx)(_,{value:`code`,children:(0,B.jsx)(`pre`,{className:`max-h-[32rem] overflow-auto rounded-xl border border-border bg-muted/40 p-4 text-xs leading-relaxed`,children:(0,B.jsx)(`code`,{children:Ne})})})]})]}),(0,B.jsxs)(`section`,{"aria-labelledby":`api-h`,className:`flex flex-col gap-3`,children:[(0,B.jsx)(`h2`,{className:`font-semibold text-xl`,id:`api-h`,children:`API reference`}),(0,B.jsxs)(`p`,{className:`max-w-2xl text-muted-foreground text-sm`,children:[`Read from `,(0,B.jsx)(`code`,{className:`text-xs`,children:`WaitlistProps`}),` in the source when the page builds: the names, the types, the defaults from the function's own signature and the comment above each prop. Change the type and this table changes; it cannot drift.`]}),(0,B.jsx)(we,{doc:He})]}),(0,B.jsxs)(`section`,{"aria-labelledby":`states-h`,className:`flex flex-col gap-4`,children:[(0,B.jsx)(`h2`,{className:`font-semibold text-xl`,id:`states-h`,children:`States`}),(0,B.jsx)(`div`,{className:`grid gap-4 sm:grid-cols-2`,children:Ve.map(e=>(0,B.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,B.jsxs)(`p`,{className:`text-sm`,children:[(0,B.jsx)(`span`,{className:`font-medium`,children:e.title}),` `,(0,B.jsxs)(`span`,{className:`text-muted-foreground`,children:[`· `,e.line]})]}),(0,B.jsx)(W,{className:`flex justify-center`,dir:n,children:(0,B.jsx)(Me,{state:e.state})})]},e.state))})]}),(0,B.jsxs)(`section`,{"aria-labelledby":`a11y-h`,className:`flex flex-col gap-4`,children:[(0,B.jsx)(`h2`,{className:`font-semibold text-xl`,id:`a11y-h`,children:`Accessibility`}),(0,B.jsxs)(`ul`,{className:`flex max-w-2xl list-disc flex-col gap-2 ps-5 text-muted-foreground text-sm`,children:[(0,B.jsxs)(`li`,{children:[`One live region (`,(0,B.jsx)(`code`,{className:`text-xs`,children:`role="status"`}),`) from the moment the card mounts, so each change is read out and nothing new has to be discovered.`]}),(0,B.jsxs)(`li`,{children:[`A join that lands moves focus to the place in line (a `,(0,B.jsx)(`code`,{className:`text-xs`,children:`group`}),` with an accessible name), so it is read out and the eye lands on it. A card that mounts already joined never steals focus.`]}),(0,B.jsxs)(`li`,{children:[`While joining, the card is `,(0,B.jsx)(`code`,{className:`text-xs`,children:`aria-busy`}),` and the button is `,(0,B.jsx)(`code`,{className:`text-xs`,children:`aria-disabled`}),`, not disabled: focus stays where it was.`]}),(0,B.jsxs)(`li`,{children:[`The error line has `,(0,B.jsx)(`code`,{className:`text-xs`,children:`role="alert"`}),` and is always rendered at its full height, so an error never pushes the actions down.`]}),(0,B.jsx)(`li`,{children:`Leaving goes through an alert dialog. Escape closes it; focus returns to the button that opened it. Base UI does both.`})]}),(0,B.jsxs)(le,{className:`max-w-2xl`,children:[(0,B.jsx)(k,{children:(0,B.jsxs)(j,{children:[(0,B.jsx)(N,{children:`Key`}),(0,B.jsx)(N,{children:`Does`})]})}),(0,B.jsx)(A,{children:[[`Tab`,`Reaches Join, or Leave the list once joined. The place in line takes focus only when a join lands.`],[`Enter / Space`,`Joins, or opens the question.`],[`Escape`,`Closes the question and keeps the place.`]].map(([e,t])=>(0,B.jsxs)(j,{children:[(0,B.jsx)(M,{className:`whitespace-nowrap`,children:e.split(` / `).map((e,t)=>(0,B.jsxs)(z.Fragment,{children:[t>0?` / `:null,(0,B.jsx)(ue,{children:e})]},e))}),(0,B.jsx)(M,{className:`whitespace-normal leading-normal`,children:t})]},e))})]})]}),(0,B.jsxs)(`section`,{"aria-labelledby":`motion-h`,className:`flex flex-col gap-3`,children:[(0,B.jsx)(`h2`,{className:`font-semibold text-xl`,id:`motion-h`,children:`Motion`}),(0,B.jsxs)(`dl`,{className:`grid max-w-2xl gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]`,children:[(0,B.jsx)(`dt`,{className:`font-medium`,children:`What moves`}),(0,B.jsx)(`dd`,{className:`text-muted-foreground`,children:`The place in line, once, as it appears: opacity and a 4px rise, 180 ms, ease-out.`}),(0,B.jsx)(`dt`,{className:`font-medium`,children:`What doesn't`}),(0,B.jsx)(`dd`,{className:`text-muted-foreground`,children:`The button, the card and the number. The button changes its label in place, at the same width.`}),(0,B.jsx)(`dt`,{className:`font-medium`,children:`Why`}),(0,B.jsx)(`dd`,{className:`text-muted-foreground`,children:`One thing on the card is new. The eye should land on it and nothing else should compete.`}),(0,B.jsx)(`dt`,{className:`font-medium`,children:`Reduced motion`}),(0,B.jsx)(`dd`,{className:`text-muted-foreground`,children:`It simply appears. Nothing on the card is animation-only.`})]})]}),(0,B.jsxs)(`section`,{"aria-labelledby":`rtl-h`,className:`flex flex-col gap-3`,children:[(0,B.jsx)(`h2`,{className:`font-semibold text-xl`,id:`rtl-h`,children:`Right-to-left`}),(0,B.jsxs)(`p`,{className:`max-w-2xl text-muted-foreground text-sm`,children:[`Logical properties throughout, and the one directional icon carries `,(0,B.jsx)(`code`,{className:`text-xs`,children:`rtl:rotate-180`}),`, the class coss's Calendar already uses. The pagination pair above is why that matters: the stock chevrons point the wrong way in RTL, and`,` `,(0,B.jsx)(o,{className:`h-auto px-0 py-0 align-baseline text-sm underline sm:h-auto sm:text-sm`,render:(0,B.jsx)(l,{href:ze,rel:`noreferrer`,target:`_blank`}),variant:`link`,children:`#913`}),` `,`fixes it across menu, context menu, drawer, pagination and breadcrumb.`]})]}),(0,B.jsxs)(`section`,{"aria-labelledby":`from-h`,className:`flex flex-col gap-3`,children:[(0,B.jsx)(`h2`,{className:`font-semibold text-xl`,id:`from-h`,children:`Where it came from`}),(0,B.jsx)(`p`,{className:`max-w-2xl text-muted-foreground text-sm`,children:`Cal.com's Senior Product Design Engineer posting was still up when I found it; its Apply button said Position Closed. For someone who builds booking software that reads as a fully booked day, and a fully booked day needs a waitlist. The posting asked to send the work, and to land components in the library rather than the app. So: a component.`})]}),(0,B.jsxs)(`section`,{className:`flex flex-col gap-4 rounded-2xl border border-border bg-muted/30 p-6`,children:[(0,B.jsx)(`p`,{className:`font-medium`,children:`If a slot opens, this is where I'd like to spend it.`}),(0,B.jsxs)(`div`,{className:`flex flex-wrap gap-2`,children:[(0,B.jsx)(Ce,{calLink:Le,children:`Book a time to argue about the API`}),(0,B.jsx)(o,{render:(0,B.jsx)(l,{href:Re}),variant:`outline`,children:`The work`})]}),(0,B.jsx)(`p`,{className:`text-muted-foreground text-xs`,children:`Not a Cal.com or coss ui page. A proposal, by Rahul Jha.`})]})]})}export{We as WaitlistDocsPage};