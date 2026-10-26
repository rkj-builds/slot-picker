import{a as e,c as t,r as n,t as r}from"./utils-0MzkHkZl.js";import{Fi as i,Ii as a,Ni as o,R as s,Sa as c,wa as l}from"./radio-group-EZA7t4bo.js";import{i as u,n as d,r as f}from"./time-zone-Bs4FiUPV.js";import{t as p}from"./clock-3-D3OZVNav.js";import{B as m,F as h,Gt as g,H as _,I as ee,Kt as v,N as y,P as b,U as x,V as S,Vt as te,Wt as C,nr as w,q as T,qt as E,sr as D,zn as O}from"./index-9aoBQUyt.js";import{a as k,c as ne,i as re,n as ie,o as ae,r as oe,s as se,t as ce}from"./alert-dialog-DU3q3X-I.js";import{c as A,i as j,l as M,o as N,r as le,s as P,t as ue}from"./kbd-CLm9i5uD.js";import{a as de,c as F,d as fe,f as pe,i as I,l as me,n as L,o as he,r as R,s as ge,t as z,u as _e}from"./pagination-Dr-bxL-N.js";var B=t(e(),1),V=n(),ve=function(e){let{direction:t=`ltr`}=e,n=B.useMemo(()=>({direction:t}),[t]);return(0,V.jsx)(s.Provider,{value:n,children:e.children})},ye=`https://app.cal.com/embed/embed.js`;function H(e,t){(e.q??=[]).push(t)}function be(){let e=Object.assign((...t)=>{if(t[0]===`init`&&typeof t[1]==`string`){let n=t[1],r=e.ns??={},i=Object.assign((...e)=>H(i,e),{q:[]});r[n]??=i,H(r[n],t),H(e,[`initNamespace`,n])}else H(e,t)},{q:[],ns:{},loaded:!0});return e}var U=null;function xe({timeoutMs:e=6e3}={}){return U||(window.Cal??=be(),U=new Promise((t,n)=>{let r=document.createElement(`script`),i=e=>{window.clearTimeout(a),U=null,r.remove(),n(Error(e))},a=window.setTimeout(()=>i(`timeout`),e);r.src=ye,r.async=!0,r.dataset.calEmbed=``,r.onload=()=>{window.clearTimeout(a),t()},r.onerror=()=>i(`blocked`),document.head.appendChild(r)}),U)}function Se(e,t){let n=window.Cal;if(!n)return;n.ns?.[e]||n(`init`,e,{origin:`https://cal.com`});let r=n.ns?.[e];return r?.(`ui`,t),r}var W=`waitlist`;function Ce({calLink:e,children:t}){let n=`https://cal.com/${e}`,[r,i]=B.useState(!1),a=B.useCallback(()=>{xe().then(()=>{Se(W,{layout:`month_view`,hideEventTypeDetails:!1}),i(!0)},()=>i(!1))},[]);return(0,V.jsxs)(o,{"data-cal-ready":r||void 0,render:(0,V.jsx)(l,{href:n,onClick:t=>{let n=window.Cal?.ns?.[W];r&&n&&(t.preventDefault(),n(`modal`,{calLink:e,config:{layout:`month_view`,theme:document.documentElement.classList.contains(`dark`)?`dark`:`light`}}))},onFocus:a,onPointerEnter:a,rel:`noreferrer`,target:`_blank`}),children:[t,(0,V.jsx)(D,{"aria-hidden":`true`,className:`rtl:-scale-x-100`})]})}function G({dir:e,className:t,children:n,...i}){return(0,V.jsx)(ve,{direction:e,children:(0,V.jsx)(`div`,{className:r(`rounded-xl border border-border bg-background p-6`,t),"data-slot":`direction-frame`,dir:e,...i,children:n})})}function K(e){return e.defaultValue??(e.optional?`–`:`required`)}function we({doc:e}){return(0,V.jsxs)(V.Fragment,{children:[(0,V.jsx)(`dl`,{className:`flex flex-col divide-y divide-border rounded-xl border border-border sm:hidden`,children:e.props.map(e=>(0,V.jsxs)(`div`,{className:`flex flex-col gap-1.5 p-4`,children:[(0,V.jsxs)(`dt`,{className:`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1`,children:[(0,V.jsxs)(`code`,{className:`font-medium text-sm`,children:[e.name,e.optional?`?`:``]}),(0,V.jsx)(`code`,{className:`text-muted-foreground text-xs`,children:K(e)})]}),(0,V.jsxs)(`dd`,{className:`flex flex-col gap-1.5`,children:[(0,V.jsx)(`code`,{className:`whitespace-pre-wrap break-words text-muted-foreground text-xs`,children:e.type}),(0,V.jsx)(`span`,{className:`text-sm leading-normal`,children:e.doc})]})]},e.name))}),(0,V.jsx)(`div`,{className:`max-sm:hidden`,children:(0,V.jsxs)(le,{children:[(0,V.jsx)(A,{children:(0,V.jsxs)(M,{children:[(0,V.jsx)(P,{children:`Prop`}),(0,V.jsx)(P,{children:`Type`}),(0,V.jsx)(P,{children:`Default`}),(0,V.jsx)(P,{children:`Description`})]})}),(0,V.jsx)(j,{children:e.props.map(e=>(0,V.jsxs)(M,{children:[(0,V.jsx)(N,{className:`whitespace-nowrap align-top`,children:(0,V.jsxs)(`code`,{className:`text-sm`,children:[e.name,e.optional?`?`:``]})}),(0,V.jsx)(N,{className:`align-top`,children:(0,V.jsx)(`code`,{className:`whitespace-pre-wrap text-muted-foreground text-xs`,children:e.type})}),(0,V.jsx)(N,{className:`align-top`,children:(0,V.jsx)(`code`,{className:`text-muted-foreground text-xs`,children:K(e)})}),(0,V.jsx)(N,{className:`whitespace-normal align-top leading-normal`,children:e.doc})]},e.name))})]})})]})}function Te(e,{closed:t=!1}={}){return t?{ok:!1,reason:`closed`}:e===`joined`?{ok:!1,reason:`already-joined`}:e===`joining`?{ok:!1,reason:`joining`}:{ok:!0,next:`joining`}}function q(e){let t=e.ahead.length;return`${e.position} · ${t===0?`nobody`:t===1?`1 person`:`${t} people`} ahead of you`}var J=B.createContext(null);function Y(e){let t=B.useContext(J);if(!t)throw Error(`<${e}> must be inside <Waitlist>`);return t}function Ee({item:e,status:t=`Full`,slots:n=[],onJoin:i,onCancel:a,state:o,onStateChange:s,defaultState:c=`idle`,place:l,joiningLabel:u=`Checking for cancellations…`,errorLabel:d=`The list did not answer. Nothing was lost.`,meta:f,className:p,children:m}){let[h,g]=B.useState(c),_=o??h,[ee,v]=B.useState(void 0),y=ee??l,[b,x]=B.useState(null),S=B.useRef(null),C=B.useRef(!0);B.useEffect(()=>(C.current=!0,()=>{C.current=!1}),[]);let w=B.useCallback(e=>{g(e),s?.(e)},[s]),T=B.useRef(_);B.useEffect(()=>{T.current===`joining`&&_===`joined`&&S.current?.focus(),T.current=_},[_]);let E=B.useCallback(()=>{Te(_).ok&&(x(null),w(`joining`),i().then(e=>{C.current&&(v(e),w(`joined`))},e=>{C.current&&(x(e instanceof Error&&e.message?e.message:d),w(`error`))}))},[_,i,w,d]),D=B.useCallback(async()=>{let e=!a||await a();C.current&&e&&(v(void 0),w(`idle`))},[a,w]),O=B.useMemo(()=>({item:e,status:t,slots:n,meta:f,state:_,place:y,error:b,joiningLabel:u,errorLabel:d,join:E,leave:D,positionRef:S}),[e,t,n,f,_,y,b,u,d,E,D]),k=_===`joined`&&y?`You're on the list. Position ${y.position}, ${q(y).split(` · `)[1]}.`:_===`joining`?u:``;return(0,V.jsx)(J.Provider,{value:O,children:(0,V.jsxs)(te,{"aria-busy":_===`joining`||void 0,className:r(`w-full max-w-xs`,p),"data-slot":`waitlist`,"data-state":_,children:[(0,V.jsx)(`p`,{"aria-live":`polite`,className:`sr-only`,role:`status`,children:k}),m??(0,V.jsxs)(V.Fragment,{children:[(0,V.jsxs)(X,{children:[(0,V.jsx)(Q,{}),(0,V.jsx)(Z,{})]}),(0,V.jsxs)(De,{children:[(0,V.jsx)(Oe,{}),(0,V.jsx)(ke,{}),(0,V.jsx)($,{})]}),(0,V.jsx)(Ne,{})]})]})})}function X({className:e,...t}){return(0,V.jsx)(g,{className:r(`flex flex-col items-start gap-2.5 p-6 pb-4`,e),"data-slot":`waitlist-header`,...t})}function Z({children:e,className:t,...n}){let{item:i}=Y(`WaitlistTitle`);return(0,V.jsx)(E,{className:r(`text-balance leading-tight`,t),"data-slot":`waitlist-title`,...n,children:e??i})}function Q({className:e,children:t,...n}){let{state:r,status:i}=Y(`WaitlistStatus`),o=r===`joined`;return(0,V.jsx)(a,{className:e,"data-slot":`waitlist-status`,variant:o?`success`:`secondary`,...n,children:t??(o?`On the list`:i)})}function De({className:e,...t}){return(0,V.jsx)(v,{className:r(`flex flex-col gap-3 px-6 pt-0 pb-6`,e),"data-slot":`waitlist-body`,...t})}function Oe({className:e,...t}){let{state:n,slots:i,status:a}=Y(`WaitlistSlots`);return n===`joined`||i.length===0?null:(0,V.jsx)(`ul`,{"aria-label":`${a}: every slot taken`,className:r(`grid grid-cols-3 gap-1.5`,e),"data-slot":`waitlist-slots`,...t,children:i.map(e=>(0,V.jsxs)(`li`,{className:`rounded-md border border-border border-dashed py-1.5 text-center text-muted-foreground text-xs tabular-nums`,children:[(0,V.jsx)(`s`,{className:`decoration-muted-foreground/60`,children:e}),(0,V.jsx)(`span`,{className:`sr-only`,children:` taken`})]},e))})}function ke({className:e,...t}){let{state:n,place:i,positionRef:a}=Y(`WaitlistPosition`);if(n!==`joined`||!i)return null;let[o,s]=q(i).split(` · `);return(0,V.jsxs)(`div`,{"aria-label":`Position ${o}, ${s}`,className:r(`flex items-center gap-3.5 rounded-lg bg-muted px-4 py-3 outline-none motion-safe:animate-waitlist-enter focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`,e),"data-slot":`waitlist-position`,ref:a,role:`group`,tabIndex:-1,...t,children:[(0,V.jsx)(`span`,{className:`font-semibold text-3xl tabular-nums leading-none`,children:o}),(0,V.jsxs)(`span`,{className:`flex flex-col text-sm leading-snug`,children:[(0,V.jsx)(`span`,{children:`in line`}),(0,V.jsx)(`span`,{className:`text-muted-foreground`,children:s})]})]})}function Ae({className:e,children:t,...n}){let{state:a,joiningLabel:s,join:c}=Y(`WaitlistJoin`);if(a===`joined`)return null;let l=[[`idle`,t??`Join the waitlist`],[`joining`,(0,V.jsxs)(V.Fragment,{children:[(0,V.jsx)(i,{"aria-hidden":`true`,className:`size-4`}),s]})],[`error`,`Try again`]];return(0,V.jsx)(o,{"aria-disabled":a===`joining`||void 0,className:r(`grid w-full place-items-center`,e),"data-slot":`waitlist-join`,"data-state":a,onClick:c,...n,children:l.map(([e,t])=>{let n=e===a;return(0,V.jsx)(`span`,{"aria-hidden":!n||void 0,className:r(`inline-flex items-center gap-2 [grid-area:1/1]`,!n&&`invisible`),children:t},e)})})}function je({children:e,title:t=`Are you sure?`,description:n=`There is nobody behind you either. Leaving only makes the list shorter.`,keepLabel:r=`Keep my place`,leaveLabel:i=`Leave`,defaultOpen:a=!1}){let{state:s,leave:c}=Y(`WaitlistCancel`),[l,u]=B.useState(a);return s===`joined`?(0,V.jsxs)(ce,{onOpenChange:u,open:l,children:[(0,V.jsx)(ne,{"data-slot":`waitlist-cancel`,render:(0,V.jsx)(o,{className:`w-full`,variant:`outline`}),children:e??`Leave the list`}),(0,V.jsxs)(ae,{children:[(0,V.jsxs)(k,{children:[(0,V.jsx)(se,{children:t}),(0,V.jsx)(oe,{children:n})]}),(0,V.jsxs)(re,{children:[(0,V.jsx)(ie,{render:(0,V.jsx)(o,{}),children:r}),(0,V.jsx)(o,{onClick:()=>{u(!1),c()},variant:`ghost`,children:i})]})]})]}):null}function $({cancelOpen:e=!1}){return(0,V.jsxs)(V.Fragment,{children:[(0,V.jsx)(Ae,{}),(0,V.jsx)(je,{defaultOpen:e})]})}function Me({className:e,...t}){return(0,V.jsx)(`p`,{className:r(`text-muted-foreground text-xs`,e),"data-slot":`waitlist-meta`,...t})}function Ne({className:e,children:t,...n}){let{meta:i,state:a,error:o,errorLabel:s}=Y(`WaitlistFooter`),c=a===`error`,l=t??i;return(0,V.jsxs)(C,{className:r(`grid border-t px-6 py-3`,e),"data-slot":`waitlist-footer`,...n,children:[(0,V.jsxs)(`div`,{"aria-hidden":c||void 0,className:r(`flex items-start gap-1.5 text-muted-foreground text-xs [grid-area:1/1]`,c&&`invisible`),children:[l?(0,V.jsx)(p,{"aria-hidden":`true`,className:`size-3 h-lh shrink-0`}):null,typeof l==`string`?(0,V.jsx)(Me,{children:l}):l]}),(0,V.jsx)(`p`,{className:r(`flex items-start gap-1.5 text-destructive-foreground text-xs [grid-area:1/1]`,!c&&`invisible`),role:`alert`,children:c?(0,V.jsxs)(V.Fragment,{children:[(0,V.jsx)(w,{"aria-hidden":`true`,className:`size-3 h-lh shrink-0`}),o??s]}):null})]})}var Pe={position:1,ahead:[]};function Fe(e){let t=new Date(e),n=new Intl.DateTimeFormat(void 0,{hour:`numeric`,minute:`2-digit`}),r=e<Date.UTC(2026,10,1,6)?4:5;return[9,11,13,15,17,19].map(e=>n.format(new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate(),e+r))))}function Ie({state:e,onStateChange:t,fail:n=!1,cancelOpen:r=!1}){let{now:i}=O(),a=i(),o=B.useMemo(()=>d(Intl.DateTimeFormat().resolvedOptions().timeZone,a),[a]),s=B.useMemo(()=>Fe(a),[a]),c=B.useCallback(()=>new Promise((e,t)=>{window.setTimeout(()=>n?t(Error(`The list did not answer. Nothing was lost.`)):e(Pe),1100)}),[n]),l=B.useCallback(()=>(ee.add({title:`Cancelled.`,description:`Just kidding, you're still on it.`,type:`info`}),!1),[]);return(0,V.jsxs)(Ee,{item:`Senior Product Design Engineer at Cal.com`,meta:`Your time: ${o.offsetLabel.replace(`-`,`−`)} · ${o.city}`,onCancel:l,onJoin:c,onStateChange:t,place:Pe,slots:s,state:e,status:`Full`,children:[(0,V.jsxs)(X,{children:[(0,V.jsx)(Q,{}),(0,V.jsx)(Z,{})]}),(0,V.jsxs)(De,{children:[(0,V.jsx)(Oe,{}),(0,V.jsx)(ke,{}),(0,V.jsx)($,{cancelOpen:r})]}),(0,V.jsx)(Ne,{})]})}var Le=`import * as React from "react";
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
`,Re=`"use client";

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
    <CardTitle className={cn("text-balance leading-tight", className)} data-slot="waitlist-title" {...props}>
      {children ?? item}
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
        <span>in line</span>
        <span className="text-muted-foreground">{rest}</span>
      </span>
    </div>
  );
}

/** Join, full width. Three labels share one cell, so the button never changes size while it works. */
export function WaitlistJoin({ className, children, ...props }: React.ComponentProps<typeof Button>): React.ReactElement | null {
  const { state, joiningLabel, join } = useWaitlist("WaitlistJoin");
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
        {typeof line === "string" ? <WaitlistMeta>{line}</WaitlistMeta> : line}
      </div>
      <p className={cn("flex items-start gap-1.5 text-destructive-foreground text-xs [grid-area:1/1]", !failed && "invisible")} role="alert">
        {failed ? (
          <>
            <CircleAlertIcon aria-hidden="true" className="size-3 h-lh shrink-0" />
            {error ?? errorLabel}
          </>
        ) : null}
      </p>
    </CardFooter>
  );
}
`;function ze(e,t){let n=RegExp(`\\/\\*\\*((?:(?!\\*\\/)[\\s\\S])*)\\*\\/\\s*export function ${t}\\(`).exec(e)?.[1]??``,r=RegExp(`export (?:type ${t}Props\\s*=\\s*|interface ${t}Props\\s*)\\{([\\s\\S]*?)\\n\\};?`).exec(e)?.[1]??``,i=new Map,a=RegExp(`export function ${t}\\(\\{([\\s\\S]*?)\\}\\s*:`).exec(e)?.[1]??``;for(let e of a.matchAll(/(\w+)\s*=\s*([^,]+)/g))i.set(e[1]??``,(e[2]??``).trim());let o=[],s=r.replace(/\{[^{}]*\}/g,e=>`__obj${o.push(e)-1}__`),c=e=>e.replace(/__obj(\d+)__/g,(e,t)=>o[Number(t)]??``),l=[];for(let e of s.matchAll(/(?:\/\*\*([\s\S]*?)\*\/\s*)?(\w+)(\?)?:\s*([^;]+);/g)){let t=e[2]??``;l.push({name:t,type:c((e[4]??``).trim()),optional:e[3]===`?`,defaultValue:i.get(t)??null,doc:Be(e[1]??``)})}return{name:t,summary:Be(n),props:l}}function Be(e){return e.split(`
`).map(e=>e.replace(/^\s*\*\s?/,``).trim()).join(` `).replace(/\s+/g,` `).trim()}var Ve=`rahul-kumar-jha-ll9vhj/30min`,He=`https://rkj-builds.github.io/for/cal/`,Ue=`https://github.com/cosscom/ui/pull/913`,We=[{value:`live`,label:`Live`},{value:`idle`,label:`Idle`},{value:`joining`,label:`Joining`},{value:`joined`,label:`Joined`},{value:`error`,label:`Error`},{value:`cancel-confirm`,label:`Leave?`}],Ge=[{state:`idle`,title:`Idle`,line:`Full, and you can see it: every slot struck through.`},{state:`joining`,title:`Joining`,line:`Busy. The button keeps its width; the card is aria-busy.`},{state:`joined`,title:`Joined`,line:`The place in line, in the space the slots held, and the way out.`},{state:`error`,title:`Error`,line:`The reason takes the footer line’s place, so the card keeps its height. The same button retries.`}],Ke=ze(Re,`Waitlist`);function qe(e){let t=e.query.get(`state`);return We.some(e=>e.value===t)?t:`live`}function Je({route:e}){let t=qe(e),n=e.query.get(`dir`)===`rtl`?`rtl`:`ltr`,r=t=>c(e.path,{state:e.query.get(`state`),dir:e.query.get(`dir`),theme:e.query.get(`theme`),...t},{replace:!0}),i=t===`live`?void 0:t===`cancel-confirm`?`joined`:t;return(0,V.jsxs)(`main`,{className:`mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8`,children:[(0,V.jsxs)(`header`,{className:`flex flex-col gap-4`,children:[(0,V.jsx)(ge,{children:(0,V.jsxs)(_e,{children:[(0,V.jsx)(F,{children:(0,V.jsx)(me,{href:`#/components`,children:`Components`})}),(0,V.jsx)(pe,{}),(0,V.jsx)(F,{children:(0,V.jsx)(fe,{children:`Waitlist`})})]})}),(0,V.jsxs)(`div`,{className:`flex flex-col gap-2`,children:[(0,V.jsxs)(`div`,{className:`flex flex-wrap items-center gap-3`,children:[(0,V.jsx)(`h1`,{className:`font-semibold text-3xl`,tabIndex:-1,children:`Waitlist`}),(0,V.jsx)(a,{variant:`secondary`,children:`proposal`})]}),(0,V.jsx)(`p`,{className:`max-w-2xl text-muted-foreground`,children:Ke.summary}),(0,V.jsx)(`p`,{className:`max-w-2xl text-muted-foreground text-sm`,children:`coss ui has no Waitlist. This is one, built from coss parts the way the library builds its own: Card, Badge, Button, Alert Dialog, Toast. Every colour is a token; every word on it can be changed from a prop.`})]})]}),(0,V.jsxs)(`section`,{"aria-labelledby":`preview-h`,className:`flex flex-col gap-4`,children:[(0,V.jsxs)(`div`,{className:`flex flex-wrap items-center justify-between gap-3`,children:[(0,V.jsx)(`h2`,{className:`font-semibold text-xl`,id:`preview-h`,children:`Preview`}),(0,V.jsxs)(`div`,{className:`flex flex-wrap items-center gap-2`,children:[(0,V.jsx)(b,{"aria-label":`State shown`,onValueChange:e=>r({state:e===`live`?null:e}),size:`sm`,value:t,children:We.map(e=>(0,V.jsx)(h,{value:e.value,children:e.label},e.value))}),(0,V.jsxs)(b,{"aria-label":`Direction`,onValueChange:e=>r({dir:e===`rtl`?`rtl`:null}),size:`sm`,value:n,children:[(0,V.jsx)(h,{value:`ltr`,children:`LTR`}),(0,V.jsx)(h,{value:`rtl`,children:`RTL`})]}),(0,V.jsx)(y,{})]})]}),(0,V.jsxs)(m,{defaultValue:`preview`,children:[(0,V.jsxs)(S,{"aria-label":`Preview or code`,children:[(0,V.jsx)(x,{value:`preview`,children:`Preview`}),(0,V.jsx)(x,{value:`code`,children:`Code`})]}),(0,V.jsx)(_,{value:`preview`,children:(0,V.jsxs)(G,{className:`flex flex-col gap-8`,dir:n,children:[(0,V.jsx)(`div`,{className:`flex justify-center`,children:(0,V.jsx)(Ie,{cancelOpen:t===`cancel-confirm`,state:i},t)}),(0,V.jsx)(T,{}),(0,V.jsxs)(`div`,{className:`grid gap-6 sm:grid-cols-2`,children:[(0,V.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,V.jsx)(`p`,{className:`text-muted-foreground text-sm`,dir:`auto`,children:`coss ui today: the chevrons stay put in right-to-left.`}),(0,V.jsx)(z,{"aria-label":`Example pagination, coss ui today`,children:(0,V.jsxs)(L,{children:[(0,V.jsx)(R,{children:(0,V.jsx)(he,{render:(0,V.jsx)(o,{size:`sm`,variant:`outline`})})}),(0,V.jsx)(R,{children:(0,V.jsx)(de,{render:(0,V.jsx)(o,{size:`sm`,variant:`outline`})})})]})})]}),(0,V.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,V.jsxs)(`p`,{className:`text-muted-foreground text-sm`,dir:`auto`,children:[`With`,` `,(0,V.jsx)(`a`,{className:`text-foreground underline underline-offset-4`,href:Ue,rel:`noreferrer`,target:`_blank`,children:`#913`}),`: they point the way you move.`]}),(0,V.jsx)(z,{"aria-label":`Example pagination, with #913`,children:(0,V.jsxs)(L,{children:[(0,V.jsx)(R,{children:(0,V.jsxs)(I,{"aria-label":`Go to previous page`,render:(0,V.jsx)(o,{size:`sm`,variant:`outline`}),children:[(0,V.jsx)(u,{"aria-hidden":`true`,className:`rtl:rotate-180`}),`Previous`]})}),(0,V.jsx)(R,{children:(0,V.jsxs)(I,{"aria-label":`Go to next page`,render:(0,V.jsx)(o,{size:`sm`,variant:`outline`}),children:[`Next`,(0,V.jsx)(f,{"aria-hidden":`true`,className:`rtl:rotate-180`})]})})]})})]})]})]})}),(0,V.jsx)(_,{value:`code`,children:(0,V.jsx)(`pre`,{className:`max-h-[32rem] overflow-auto rounded-xl border border-border bg-muted/40 p-4 text-xs leading-relaxed`,children:(0,V.jsx)(`code`,{children:Le})})})]})]}),(0,V.jsxs)(`section`,{"aria-labelledby":`api-h`,className:`flex flex-col gap-3`,children:[(0,V.jsx)(`h2`,{className:`font-semibold text-xl`,id:`api-h`,children:`API reference`}),(0,V.jsxs)(`p`,{className:`max-w-2xl text-muted-foreground text-sm`,children:[`Read from `,(0,V.jsx)(`code`,{className:`text-xs`,children:`WaitlistProps`}),` in the source when the page builds: the names, the types, the defaults from the function's own signature and the comment above each prop. Change the type and this table changes; it cannot drift.`]}),(0,V.jsx)(we,{doc:Ke})]}),(0,V.jsxs)(`section`,{"aria-labelledby":`states-h`,className:`flex flex-col gap-4`,children:[(0,V.jsx)(`h2`,{className:`font-semibold text-xl`,id:`states-h`,children:`States`}),(0,V.jsx)(`div`,{className:`grid gap-4 sm:grid-cols-2`,children:Ge.map(e=>(0,V.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,V.jsxs)(`p`,{className:`text-sm`,children:[(0,V.jsx)(`span`,{className:`font-medium`,children:e.title}),` `,(0,V.jsxs)(`span`,{className:`text-muted-foreground`,children:[`· `,e.line]})]}),(0,V.jsx)(G,{className:`flex justify-center`,dir:n,children:(0,V.jsx)(Ie,{state:e.state})})]},e.state))})]}),(0,V.jsxs)(`section`,{"aria-labelledby":`a11y-h`,className:`flex flex-col gap-4`,children:[(0,V.jsx)(`h2`,{className:`font-semibold text-xl`,id:`a11y-h`,children:`Accessibility`}),(0,V.jsxs)(`ul`,{className:`flex max-w-2xl list-disc flex-col gap-2 ps-5 text-muted-foreground text-sm`,children:[(0,V.jsxs)(`li`,{children:[`One live region (`,(0,V.jsx)(`code`,{className:`text-xs`,children:`role="status"`}),`) from the moment the card mounts, so each change is read out and nothing new has to be discovered.`]}),(0,V.jsxs)(`li`,{children:[`A join that lands moves focus to the place in line (a `,(0,V.jsx)(`code`,{className:`text-xs`,children:`group`}),` with an accessible name), so it is read out and the eye lands on it. A card that mounts already joined never steals focus.`]}),(0,V.jsxs)(`li`,{children:[`While joining, the card is `,(0,V.jsx)(`code`,{className:`text-xs`,children:`aria-busy`}),` and the button is `,(0,V.jsx)(`code`,{className:`text-xs`,children:`aria-disabled`}),`, not disabled: focus stays where it was.`]}),(0,V.jsxs)(`li`,{children:[`A failed join is announced (`,(0,V.jsx)(`code`,{className:`text-xs`,children:`role="alert"`}),`) in the footer, in the same cell as the time-zone line it replaces, so the card never changes height.`]}),(0,V.jsx)(`li`,{children:`The taken slots are a list named for what it shows; each is struck through and read as “taken”, so the strike-through isn’t the only signal.`}),(0,V.jsx)(`li`,{children:`Leaving goes through an alert dialog. Escape closes it; focus returns to the button that opened it. Base UI does both.`})]}),(0,V.jsxs)(le,{className:`max-w-2xl`,children:[(0,V.jsx)(A,{children:(0,V.jsxs)(M,{children:[(0,V.jsx)(P,{children:`Key`}),(0,V.jsx)(P,{children:`Does`})]})}),(0,V.jsx)(j,{children:[[`Tab`,`Reaches Join, or Leave the list once joined. The place in line takes focus only when a join lands.`],[`Enter / Space`,`Joins, or opens the question.`],[`Escape`,`Closes the question and keeps the place.`]].map(([e,t])=>(0,V.jsxs)(M,{children:[(0,V.jsx)(N,{className:`whitespace-nowrap`,children:e.split(` / `).map((e,t)=>(0,V.jsxs)(B.Fragment,{children:[t>0?` / `:null,(0,V.jsx)(ue,{children:e})]},e))}),(0,V.jsx)(N,{className:`whitespace-normal leading-normal`,children:t})]},e))})]})]}),(0,V.jsxs)(`section`,{"aria-labelledby":`motion-h`,className:`flex flex-col gap-3`,children:[(0,V.jsx)(`h2`,{className:`font-semibold text-xl`,id:`motion-h`,children:`Motion`}),(0,V.jsxs)(`dl`,{className:`grid max-w-2xl gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]`,children:[(0,V.jsx)(`dt`,{className:`font-medium`,children:`What moves`}),(0,V.jsx)(`dd`,{className:`text-muted-foreground`,children:`The place in line, once, as it appears: opacity and a 4px rise, 180 ms, ease-out.`}),(0,V.jsx)(`dt`,{className:`font-medium`,children:`What doesn't`}),(0,V.jsx)(`dd`,{className:`text-muted-foreground`,children:`The button, the card and its height. The button changes its label in place, at the same size; an error swaps the footer line in place.`}),(0,V.jsx)(`dt`,{className:`font-medium`,children:`Why`}),(0,V.jsx)(`dd`,{className:`text-muted-foreground`,children:`One thing on the card is new. The eye should land on it and nothing else should compete.`}),(0,V.jsx)(`dt`,{className:`font-medium`,children:`Reduced motion`}),(0,V.jsx)(`dd`,{className:`text-muted-foreground`,children:`It simply appears. Nothing on the card is animation-only.`})]})]}),(0,V.jsxs)(`section`,{"aria-labelledby":`rtl-h`,className:`flex flex-col gap-3`,children:[(0,V.jsx)(`h2`,{className:`font-semibold text-xl`,id:`rtl-h`,children:`Right-to-left`}),(0,V.jsxs)(`p`,{className:`max-w-2xl text-muted-foreground text-sm`,children:[`Logical properties throughout, and the one directional icon carries `,(0,V.jsx)(`code`,{className:`text-xs`,children:`rtl:rotate-180`}),`, the class coss's Calendar already uses. The pagination pair above is why that matters: the stock chevrons point the wrong way in RTL, and`,` `,(0,V.jsx)(o,{className:`h-auto px-0 py-0 align-baseline text-sm underline sm:h-auto sm:text-sm`,render:(0,V.jsx)(l,{href:Ue,rel:`noreferrer`,target:`_blank`}),variant:`link`,children:`#913`}),` `,`fixes it across menu, context menu, drawer, pagination and breadcrumb.`]})]}),(0,V.jsxs)(`section`,{"aria-labelledby":`from-h`,className:`flex flex-col gap-3`,children:[(0,V.jsx)(`h2`,{className:`font-semibold text-xl`,id:`from-h`,children:`Where it came from`}),(0,V.jsx)(`p`,{className:`max-w-2xl text-muted-foreground text-sm`,children:`Cal.com's Senior Product Design Engineer posting was still up when I found it; its Apply button said Position Closed. For someone who builds booking software that reads as a fully booked day, and a fully booked day needs a waitlist. The posting asked to send the work, and to land components in the library rather than the app. So: a component.`})]}),(0,V.jsxs)(`section`,{className:`flex flex-col gap-4 rounded-2xl border border-border bg-muted/30 p-6`,children:[(0,V.jsx)(`p`,{className:`font-medium`,children:`If a slot opens, this is where I'd like to spend it.`}),(0,V.jsxs)(`div`,{className:`flex flex-wrap gap-2`,children:[(0,V.jsx)(Ce,{calLink:Ve,children:`Book a time to argue about the API`}),(0,V.jsx)(o,{render:(0,V.jsx)(l,{href:He}),variant:`outline`,children:`The work`})]}),(0,V.jsx)(`p`,{className:`text-muted-foreground text-xs`,children:`Not a Cal.com or coss ui page. A proposal, by Rahul Jha.`})]})]})}export{Je as WaitlistDocsPage};