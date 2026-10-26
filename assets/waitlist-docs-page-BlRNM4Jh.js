import{a as e,c as t,r as n,t as r}from"./utils-0MzkHkZl.js";import{Fi as i,Ii as a,Ni as o,R as s,Sa as c,wa as l}from"./radio-group-EZA7t4bo.js";import{i as u,n as d,r as f}from"./time-zone-Bs4FiUPV.js";import{t as p}from"./clock-3-D3OZVNav.js";import{B as m,F as h,Gt as g,H as _,I as v,Kt as y,N as b,P as x,U as S,V as C,Vt as ee,Wt as w,nr as T,q as E,qt as D,sr as O,zn as k}from"./index-C174AZye.js";import{a as A,c as te,i as ne,n as re,o as ie,r as ae,s as oe,t as se}from"./alert-dialog-DU3q3X-I.js";import{c as ce,i as j,l as M,o as N,r as P,s as F,t as le}from"./kbd-CLm9i5uD.js";import{a as ue,c as I,d as de,f as fe,i as L,l as pe,n as R,o as me,r as z,s as he,t as B,u as ge}from"./pagination-Dr-bxL-N.js";var V=t(e(),1),H=n(),U=function(e){let{direction:t=`ltr`}=e,n=V.useMemo(()=>({direction:t}),[t]);return(0,H.jsx)(s.Provider,{value:n,children:e.children})},_e=`https://app.cal.com/embed/embed.js`;function W(e,t){(e.q??=[]).push(t)}function ve(){let e=Object.assign((...t)=>{if(t[0]===`init`&&typeof t[1]==`string`){let n=t[1],r=e.ns??={},i=Object.assign((...e)=>W(i,e),{q:[]});r[n]??=i,W(r[n],t),W(e,[`initNamespace`,n])}else W(e,t)},{q:[],ns:{},loaded:!0});return e}var G=null;function ye({timeoutMs:e=6e3}={}){return G||(window.Cal??=ve(),G=new Promise((t,n)=>{let r=document.createElement(`script`),i=e=>{window.clearTimeout(a),G=null,r.remove(),n(Error(e))},a=window.setTimeout(()=>i(`timeout`),e);r.src=_e,r.async=!0,r.dataset.calEmbed=``,r.onload=()=>{window.clearTimeout(a),t()},r.onerror=()=>i(`blocked`),document.head.appendChild(r)}),G)}function be(e,t){let n=window.Cal;if(!n)return;n.ns?.[e]||n(`init`,e,{origin:`https://cal.com`});let r=n.ns?.[e];return r?.(`ui`,t),r}var K=`waitlist`;function xe({calLink:e,children:t}){let n=`https://cal.com/${e}`,[r,i]=V.useState(!1),a=V.useCallback(()=>{ye().then(()=>{be(K,{layout:`month_view`,hideEventTypeDetails:!1}),i(!0)},()=>i(!1))},[]);return(0,H.jsxs)(o,{"data-cal-ready":r||void 0,render:(0,H.jsx)(l,{href:n,onClick:t=>{let n=window.Cal?.ns?.[K];r&&n&&(t.preventDefault(),n(`modal`,{calLink:e,config:{layout:`month_view`,theme:document.documentElement.classList.contains(`dark`)?`dark`:`light`}}))},onFocus:a,onPointerEnter:a,rel:`noreferrer`,target:`_blank`}),children:[t,(0,H.jsx)(O,{"aria-hidden":`true`,className:`rtl:-scale-x-100`})]})}function q({dir:e,className:t,children:n,...i}){return(0,H.jsx)(U,{direction:e,children:(0,H.jsx)(`div`,{className:r(`rounded-xl border border-border bg-background p-6`,t),"data-slot":`direction-frame`,dir:e,...i,children:n})})}function Se(e){return e.defaultValue??(e.optional?`–`:`required`)}function Ce({doc:e}){return(0,H.jsxs)(H.Fragment,{children:[(0,H.jsx)(`dl`,{className:`flex flex-col divide-y divide-border rounded-xl border border-border sm:hidden`,children:e.props.map(e=>(0,H.jsxs)(`div`,{className:`flex flex-col gap-1.5 p-4`,children:[(0,H.jsxs)(`dt`,{className:`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1`,children:[(0,H.jsxs)(`code`,{className:`font-medium text-sm`,children:[e.name,e.optional?`?`:``]}),(0,H.jsx)(`code`,{className:`text-muted-foreground text-xs`,children:Se(e)})]}),(0,H.jsxs)(`dd`,{className:`flex flex-col gap-1.5`,children:[(0,H.jsx)(`code`,{className:`whitespace-pre-wrap break-words text-muted-foreground text-xs`,children:e.type}),(0,H.jsx)(`span`,{className:`text-sm leading-normal`,children:e.doc})]})]},e.name))}),(0,H.jsx)(`div`,{className:`max-sm:hidden`,children:(0,H.jsxs)(P,{children:[(0,H.jsx)(ce,{children:(0,H.jsxs)(M,{children:[(0,H.jsx)(F,{children:`Prop`}),(0,H.jsx)(F,{children:`Type`}),(0,H.jsx)(F,{children:`Default`}),(0,H.jsx)(F,{children:`Description`})]})}),(0,H.jsx)(j,{children:e.props.map(e=>(0,H.jsxs)(M,{children:[(0,H.jsx)(N,{className:`whitespace-nowrap align-top`,children:(0,H.jsxs)(`code`,{className:`text-sm`,children:[e.name,e.optional?`?`:``]})}),(0,H.jsx)(N,{className:`align-top`,children:(0,H.jsx)(`code`,{className:`whitespace-pre-wrap text-muted-foreground text-xs`,children:e.type})}),(0,H.jsx)(N,{className:`align-top`,children:(0,H.jsx)(`code`,{className:`text-muted-foreground text-xs`,children:Se(e)})}),(0,H.jsx)(N,{className:`whitespace-normal align-top leading-normal`,children:e.doc})]},e.name))})]})})]})}function we(e,{closed:t=!1}={}){return t?{ok:!1,reason:`closed`}:e===`joined`?{ok:!1,reason:`already-joined`}:e===`joining`?{ok:!1,reason:`joining`}:{ok:!0,next:`joining`}}function Te(e){let t=e.ahead.length;return`${e.position} · ${t===0?`nobody`:t===1?`1 person`:`${t} people`} ahead of you`}var Ee=V.createContext(null);function J(e){let t=V.useContext(Ee);if(!t)throw Error(`<${e}> must be inside <Waitlist>`);return t}function De({item:e,status:t=`Full`,slots:n=[],onJoin:i,onCancel:a,state:o,onStateChange:s,defaultState:c=`idle`,place:l,joiningLabel:u=`Checking for cancellations…`,errorLabel:d=`The list did not answer. Nothing was lost.`,meta:f,className:p,children:m}){let[h,g]=V.useState(c),_=o??h,[v,y]=V.useState(void 0),b=v??l,[x,S]=V.useState(null),C=V.useRef(null),w=V.useRef(!0);V.useEffect(()=>(w.current=!0,()=>{w.current=!1}),[]);let T=V.useCallback(e=>{g(e),s?.(e)},[s]),E=V.useRef(_);V.useEffect(()=>{E.current===`joining`&&_===`joined`&&C.current?.focus(),E.current=_},[_]);let D=V.useCallback(()=>{we(_).ok&&(S(null),T(`joining`),i().then(e=>{w.current&&(y(e),T(`joined`))},e=>{w.current&&(S(e instanceof Error&&e.message?e.message:d),T(`error`))}))},[_,i,T,d]),O=V.useCallback(async()=>{let e=!a||await a();w.current&&e&&(y(void 0),T(`idle`))},[a,T]),k=V.useMemo(()=>({item:e,status:t,slots:n,meta:f,state:_,place:b,error:x,joiningLabel:u,errorLabel:d,join:D,leave:O,positionRef:C}),[e,t,n,f,_,b,x,u,d,D,O]),A=_===`joined`&&b?`You're on the list. Position ${b.position}, ${Te(b).split(` · `)[1]}.`:_===`joining`?u:``;return(0,H.jsx)(Ee.Provider,{value:k,children:(0,H.jsxs)(ee,{"aria-busy":_===`joining`||void 0,className:r(`w-full max-w-xs`,p),"data-slot":`waitlist`,"data-state":_,children:[(0,H.jsx)(`p`,{"aria-live":`polite`,className:`sr-only`,role:`status`,children:A}),m??(0,H.jsxs)(H.Fragment,{children:[(0,H.jsxs)(Oe,{children:[(0,H.jsx)(Ae,{}),(0,H.jsx)(ke,{})]}),(0,H.jsxs)(je,{children:[(0,H.jsx)(Me,{}),(0,H.jsx)(Ne,{}),(0,H.jsx)(Ie,{})]}),(0,H.jsx)(Re,{})]})]})})}function Oe({className:e,...t}){return(0,H.jsx)(g,{className:r(`flex flex-col items-start gap-2.5 p-6 pb-4`,e),"data-slot":`waitlist-header`,...t})}function ke({children:e,className:t,...n}){let{item:i}=J(`WaitlistTitle`);return(0,H.jsx)(D,{className:r(`text-balance leading-tight`,t),"data-slot":`waitlist-title`,...n,children:e??(0,H.jsx)(`bdi`,{children:i})})}function Ae({className:e,children:t,...n}){let{state:r,status:i}=J(`WaitlistStatus`),o=r===`joined`;return(0,H.jsx)(a,{className:e,"data-slot":`waitlist-status`,variant:o?`success`:`secondary`,...n,children:t??(o?`On the list`:i)})}function je({className:e,...t}){return(0,H.jsx)(y,{className:r(`flex flex-col gap-3 px-6 pt-0 pb-6`,e),"data-slot":`waitlist-body`,...t})}function Me({className:e,...t}){let{state:n,slots:i,status:a}=J(`WaitlistSlots`);return n===`joined`||i.length===0?null:(0,H.jsx)(`ul`,{"aria-label":`${a}: every slot taken`,className:r(`grid grid-cols-3 gap-1.5`,e),"data-slot":`waitlist-slots`,...t,children:i.map(e=>(0,H.jsxs)(`li`,{className:`rounded-md border border-border border-dashed py-1.5 text-center text-muted-foreground text-xs tabular-nums`,children:[(0,H.jsx)(`s`,{className:`decoration-muted-foreground/60`,children:e}),(0,H.jsx)(`span`,{className:`sr-only`,children:` taken`})]},e))})}function Ne({className:e,...t}){let{state:n,place:i,positionRef:a}=J(`WaitlistPosition`);if(n!==`joined`||!i)return null;let[o,s]=Te(i).split(` · `);return(0,H.jsxs)(`div`,{"aria-label":`Position ${o}, ${s}`,className:r(`flex items-center gap-3.5 rounded-lg bg-muted px-4 py-3 outline-none motion-safe:animate-waitlist-enter focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`,e),"data-slot":`waitlist-position`,ref:a,role:`group`,tabIndex:-1,...t,children:[(0,H.jsx)(`span`,{className:`font-semibold text-3xl tabular-nums leading-none`,children:o}),(0,H.jsxs)(`span`,{className:`flex flex-col text-sm leading-snug`,children:[(0,H.jsx)(`span`,{children:(0,H.jsx)(`bdi`,{children:`in line`})}),(0,H.jsx)(`span`,{className:`text-muted-foreground`,children:(0,H.jsx)(`bdi`,{children:s})})]})]})}function Pe({className:e,children:t,...n}){let{state:a,joiningLabel:s,join:c}=J(`WaitlistJoin`);if(a===`joined`)return null;let l=[[`idle`,(0,H.jsx)(`bdi`,{children:t??`Join the waitlist`},`idle`)],[`joining`,(0,H.jsxs)(H.Fragment,{children:[(0,H.jsx)(i,{"aria-hidden":`true`,className:`size-4`}),(0,H.jsx)(`bdi`,{children:s})]})],[`error`,(0,H.jsx)(`bdi`,{children:`Try again`},`error`)]];return(0,H.jsx)(o,{"aria-disabled":a===`joining`||void 0,className:r(`grid w-full place-items-center`,e),"data-slot":`waitlist-join`,"data-state":a,onClick:c,...n,children:l.map(([e,t])=>{let n=e===a;return(0,H.jsx)(`span`,{"aria-hidden":!n||void 0,className:r(`inline-flex items-center gap-2 [grid-area:1/1]`,!n&&`invisible`),children:t},e)})})}function Fe({children:e,title:t=`Are you sure?`,description:n=`There is nobody behind you either. Leaving only makes the list shorter.`,keepLabel:r=`Keep my place`,leaveLabel:i=`Leave`,defaultOpen:a=!1}){let{state:s,leave:c}=J(`WaitlistCancel`),[l,u]=V.useState(a);return s===`joined`?(0,H.jsxs)(se,{onOpenChange:u,open:l,children:[(0,H.jsx)(te,{"data-slot":`waitlist-cancel`,render:(0,H.jsx)(o,{className:`w-full`,variant:`outline`}),children:e??`Leave the list`}),(0,H.jsxs)(ie,{children:[(0,H.jsxs)(A,{children:[(0,H.jsx)(oe,{children:t}),(0,H.jsx)(ae,{children:n})]}),(0,H.jsxs)(ne,{children:[(0,H.jsx)(re,{render:(0,H.jsx)(o,{}),children:r}),(0,H.jsx)(o,{onClick:()=>{u(!1),c()},variant:`ghost`,children:i})]})]})]}):null}function Ie({cancelOpen:e=!1}){return(0,H.jsxs)(H.Fragment,{children:[(0,H.jsx)(Pe,{}),(0,H.jsx)(Fe,{defaultOpen:e})]})}function Le({className:e,...t}){return(0,H.jsx)(`p`,{className:r(`text-muted-foreground text-xs`,e),"data-slot":`waitlist-meta`,...t})}function Re({className:e,children:t,...n}){let{meta:i,state:a,error:o,errorLabel:s}=J(`WaitlistFooter`),c=a===`error`,l=t??i;return(0,H.jsxs)(w,{className:r(`grid border-t px-6 py-3`,e),"data-slot":`waitlist-footer`,...n,children:[(0,H.jsxs)(`div`,{"aria-hidden":c||void 0,className:r(`flex items-start gap-1.5 text-muted-foreground text-xs [grid-area:1/1]`,c&&`invisible`),children:[l?(0,H.jsx)(p,{"aria-hidden":`true`,className:`size-3 h-lh shrink-0`}):null,typeof l==`string`?(0,H.jsx)(Le,{children:(0,H.jsx)(`bdi`,{children:l})}):l]}),(0,H.jsx)(`p`,{className:r(`flex items-start gap-1.5 text-destructive-foreground text-xs [grid-area:1/1]`,!c&&`invisible`),role:`alert`,children:c?(0,H.jsxs)(H.Fragment,{children:[(0,H.jsx)(T,{"aria-hidden":`true`,className:`size-3 h-lh shrink-0`}),(0,H.jsx)(`bdi`,{children:o??s})]}):null})]})}var ze={position:1,ahead:[]};function Be(e){let t=new Date(e),n=new Intl.DateTimeFormat(void 0,{hour:`numeric`,minute:`2-digit`}),r=e<Date.UTC(2026,10,1,6)?4:5;return[9,11,13,15,17,19].map(e=>n.format(new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate(),e+r))))}function Y({state:e,onStateChange:t,fail:n=!1,cancelOpen:r=!1}){let{now:i}=k(),a=i(),o=V.useMemo(()=>d(Intl.DateTimeFormat().resolvedOptions().timeZone,a),[a]),s=V.useMemo(()=>Be(a),[a]),c=V.useCallback(()=>new Promise((e,t)=>{window.setTimeout(()=>n?t(Error(`The list did not answer. Nothing was lost.`)):e(ze),1100)}),[n]),l=V.useCallback(()=>(v.add({title:`Cancelled.`,description:`Just kidding, you're still on it.`,type:`info`}),!1),[]);return(0,H.jsxs)(De,{item:`Senior Product Design Engineer at Cal.com`,meta:`Your time: ${o.offsetLabel.replace(`-`,`−`)} · ${o.city}`,onCancel:l,onJoin:c,onStateChange:t,place:ze,slots:s,state:e,status:`Full`,children:[(0,H.jsxs)(Oe,{children:[(0,H.jsx)(Ae,{}),(0,H.jsx)(ke,{})]}),(0,H.jsxs)(je,{children:[(0,H.jsx)(Me,{}),(0,H.jsx)(Ne,{}),(0,H.jsx)(Ie,{cancelOpen:r})]}),(0,H.jsx)(Re,{})]})}var X={jobs:{src:`/slot-picker/assets/jobs-CQwJp44O.png`,width:1840,height:700,alt:`Cal.com’s jobs page: Senior Product Design Engineer, Design, Remote, Full-time, $100k–$150k.`,at:`cal.com/jobs`},posting:{src:`/slot-picker/assets/posting-kVHT7k7M.png`,width:1400,height:520,alt:`The posting: Senior Product Design Engineer, with an Apply now button.`,at:`cal.com/jobs/senior-product-designer`,ring:{left:`3.6%`,top:`74%`,width:`19.4%`,height:`23%`}},closed:{src:`/slot-picker/assets/closed-BoRDuk1H.png`,width:1400,height:420,alt:`Position Closed. Sorry, this position is no longer accepting candidates.`,at:`cal-com.breezy.hr`}};function Ve({dir:e}){return(0,H.jsxs)(`section`,{"aria-labelledby":`story-h`,className:`flex flex-col gap-10 sm:gap-14`,children:[(0,H.jsxs)(`div`,{className:`flex flex-col gap-4 border-border border-y py-10 sm:gap-5 sm:py-16`,children:[(0,H.jsx)(`p`,{className:`font-mono text-muted-foreground text-xs`,children:`Four screens, in order`}),(0,H.jsx)(`h2`,{className:`max-w-4xl text-balance font-semibold text-4xl leading-[1.05] sm:text-6xl`,id:`story-h`,children:`I built this so Cal.com doesn’t miss a good applicant over a closed button.`})]}),(0,H.jsxs)(`ol`,{className:`flex flex-col gap-10 sm:gap-14`,children:[(0,H.jsx)(Z,{at:`24 Oct · cal.com/jobs`,figure:(0,H.jsx)(Q,{shot:X.jobs}),title:`There was a job.`,children:`Senior Product Design Engineer. “From the first sketch to a prototype running in the browser.” That is what I do every day, on booking software, and I am good at it.`}),(0,H.jsx)(Z,{at:`the posting`,figure:(0,H.jsx)(Q,{shot:X.posting}),title:`I pressed Apply now.`,children:`The posting was up, the button was there, and I was the right person for it.`}),(0,H.jsx)(Z,{at:`one click later`,figure:(0,H.jsx)(Q,{shot:X.closed}),title:`It said Position Closed.`,children:`Every slot taken. I build booking software; I know this screen, and I know it is a bug. A full day is never a no. It gets a waitlist.`}),(0,H.jsx)(Z,{at:`so`,figure:(0,H.jsx)(U,{direction:e,children:(0,H.jsx)(`div`,{className:`flex justify-center sm:justify-start`,dir:e,children:(0,H.jsx)(Y,{})})}),last:!0,title:`A full thing gets a waitlist.`,children:`coss ui didn’t have one, so I built it, the way the library builds its own: Card, Badge, Button, Alert Dialog, Toast, every colour a token, every word a prop. Join it. Then try to leave.`})]})]})}function Z({at:e,title:t,children:n,figure:i,last:a=!1}){return(0,H.jsxs)(`li`,{className:`group grid grid-cols-[0.75rem_minmax(0,1fr)] gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1.3fr)] sm:gap-x-6`,children:[(0,H.jsxs)(`div`,{"aria-hidden":`true`,className:`relative flex justify-center sm:order-2`,children:[(0,H.jsx)(`span`,{className:r(`story-spine absolute -top-10 -bottom-10 w-px bg-border sm:-top-14 sm:-bottom-14`,`group-first:top-1.5 sm:group-first:top-1.5`,a&&`bottom-auto h-1.5`)}),(0,H.jsx)(`span`,{className:r(`relative mt-1 size-3 rounded-full border bg-background ring-4 ring-background`,a?`border-foreground bg-foreground`:`border-foreground/40`)})]}),(0,H.jsxs)(`div`,{className:`flex flex-col gap-1.5 sm:order-1`,children:[(0,H.jsx)(`p`,{className:`font-mono text-muted-foreground text-xs`,children:e}),(0,H.jsx)(`h3`,{className:`text-balance font-semibold text-xl leading-tight`,children:t}),(0,H.jsx)(`p`,{className:`text-pretty text-muted-foreground text-sm`,children:n})]}),(0,H.jsx)(`div`,{className:`col-start-2 sm:order-3 sm:col-start-auto`,children:i})]})}function Q({shot:e}){return(0,H.jsxs)(`figure`,{className:`flex flex-col gap-2`,children:[(0,H.jsxs)(`div`,{className:`relative overflow-hidden rounded-xl border border-border bg-white dark:opacity-90`,children:[(0,H.jsx)(`img`,{alt:e.alt,className:`block h-auto w-full`,height:e.height,loading:`lazy`,src:e.src,width:e.width}),e.ring?(0,H.jsx)(`span`,{"aria-hidden":`true`,className:`absolute rounded-lg border-2 border-black/80`,style:e.ring}):null]}),(0,H.jsx)(`figcaption`,{className:`font-mono text-muted-foreground text-xs`,children:e.at})]})}var He=`import * as React from "react";
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
`,Ue=`"use client";

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
`;function We(e,t){let n=RegExp(`\\/\\*\\*((?:(?!\\*\\/)[\\s\\S])*)\\*\\/\\s*export function ${t}\\(`).exec(e)?.[1]??``,r=RegExp(`export (?:type ${t}Props\\s*=\\s*|interface ${t}Props\\s*)\\{([\\s\\S]*?)\\n\\};?`).exec(e)?.[1]??``,i=new Map,a=RegExp(`export function ${t}\\(\\{([\\s\\S]*?)\\}\\s*:`).exec(e)?.[1]??``;for(let e of a.matchAll(/(\w+)\s*=\s*([^,]+)/g))i.set(e[1]??``,(e[2]??``).trim());let o=[],s=r.replace(/\{[^{}]*\}/g,e=>`__obj${o.push(e)-1}__`),c=e=>e.replace(/__obj(\d+)__/g,(e,t)=>o[Number(t)]??``),l=[];for(let e of s.matchAll(/(?:\/\*\*([\s\S]*?)\*\/\s*)?(\w+)(\?)?:\s*([^;]+);/g)){let t=e[2]??``;l.push({name:t,type:c((e[4]??``).trim()),optional:e[3]===`?`,defaultValue:i.get(t)??null,doc:$(e[1]??``)})}return{name:t,summary:$(n),props:l}}function $(e){return e.split(`
`).map(e=>e.replace(/^\s*\*\s?/,``).trim()).join(` `).replace(/\s+/g,` `).trim()}var Ge=`rahul-kumar-jha-ll9vhj/30min`,Ke=`https://rkj-builds.github.io/for/cal/`,qe=`https://github.com/cosscom/ui/pull/913`,Je=[{value:`live`,label:`Live`},{value:`idle`,label:`Idle`},{value:`joining`,label:`Joining`},{value:`joined`,label:`Joined`},{value:`error`,label:`Error`},{value:`cancel-confirm`,label:`Leave?`}],Ye=[{state:`idle`,title:`Idle`,line:`Full, and you can see it: every slot struck through.`},{state:`joining`,title:`Joining`,line:`Busy. The button keeps its width; the card is aria-busy.`},{state:`joined`,title:`Joined`,line:`The place in line, in the space the slots held, and the way out.`},{state:`error`,title:`Error`,line:`The reason takes the footer line’s place, so the card keeps its height. The same button retries.`}],Xe=We(Ue,`Waitlist`);function Ze(e){let t=e.query.get(`state`);return Je.some(e=>e.value===t)?t:`live`}function Qe({route:e}){let t=Ze(e),n=e.query.get(`dir`)===`rtl`?`rtl`:`ltr`,r=t=>c(e.path,{state:e.query.get(`state`),dir:e.query.get(`dir`),theme:e.query.get(`theme`),...t},{replace:!0}),i=t===`live`?void 0:t===`cancel-confirm`?`joined`:t;return(0,H.jsxs)(`main`,{className:`mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8`,children:[(0,H.jsxs)(`header`,{className:`flex flex-col gap-4`,children:[(0,H.jsx)(he,{children:(0,H.jsxs)(ge,{children:[(0,H.jsx)(I,{children:(0,H.jsx)(pe,{href:`#/components`,children:`Components`})}),(0,H.jsx)(fe,{}),(0,H.jsx)(I,{children:(0,H.jsx)(de,{children:`Waitlist`})})]})}),(0,H.jsxs)(`div`,{className:`flex flex-col gap-2`,children:[(0,H.jsxs)(`div`,{className:`flex flex-wrap items-center gap-3`,children:[(0,H.jsx)(`h1`,{className:`font-semibold text-3xl`,tabIndex:-1,children:`Waitlist`}),(0,H.jsx)(a,{variant:`secondary`,children:`proposal`})]}),(0,H.jsx)(`p`,{className:`max-w-2xl text-muted-foreground`,children:Xe.summary}),(0,H.jsx)(`p`,{className:`max-w-2xl text-muted-foreground text-sm`,children:`A coss ui component Cal.com doesn’t have yet.`})]})]}),(0,H.jsx)(Ve,{dir:n}),(0,H.jsxs)(`section`,{"aria-labelledby":`preview-h`,className:`flex flex-col gap-4`,children:[(0,H.jsxs)(`div`,{className:`flex flex-wrap items-center justify-between gap-3`,children:[(0,H.jsx)(`h2`,{className:`font-semibold text-xl`,id:`preview-h`,children:`Preview`}),(0,H.jsxs)(`div`,{className:`flex flex-wrap items-center gap-2`,children:[(0,H.jsx)(x,{"aria-label":`State shown`,onValueChange:e=>r({state:e===`live`?null:e}),size:`sm`,value:t,children:Je.map(e=>(0,H.jsx)(h,{value:e.value,children:e.label},e.value))}),(0,H.jsxs)(x,{"aria-label":`Direction`,onValueChange:e=>r({dir:e===`rtl`?`rtl`:null}),size:`sm`,value:n,children:[(0,H.jsx)(h,{value:`ltr`,children:`LTR`}),(0,H.jsx)(h,{value:`rtl`,children:`RTL`})]}),(0,H.jsx)(b,{})]})]}),(0,H.jsxs)(m,{defaultValue:`preview`,children:[(0,H.jsxs)(C,{"aria-label":`Preview or code`,children:[(0,H.jsx)(S,{value:`preview`,children:`Preview`}),(0,H.jsx)(S,{value:`code`,children:`Code`})]}),(0,H.jsx)(_,{value:`preview`,children:(0,H.jsxs)(q,{className:`flex flex-col gap-8`,dir:n,children:[(0,H.jsx)(`div`,{className:`flex justify-center`,children:(0,H.jsx)(Y,{cancelOpen:t===`cancel-confirm`,state:i},t)}),(0,H.jsx)(E,{}),(0,H.jsxs)(`div`,{className:`grid gap-6 sm:grid-cols-2`,children:[(0,H.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,H.jsx)(`p`,{className:`text-muted-foreground text-sm`,dir:`auto`,children:`coss ui today: the chevrons stay put in right-to-left.`}),(0,H.jsx)(B,{"aria-label":`Example pagination, coss ui today`,children:(0,H.jsxs)(R,{children:[(0,H.jsx)(z,{children:(0,H.jsx)(me,{render:(0,H.jsx)(o,{size:`sm`,variant:`outline`})})}),(0,H.jsx)(z,{children:(0,H.jsx)(ue,{render:(0,H.jsx)(o,{size:`sm`,variant:`outline`})})})]})})]}),(0,H.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,H.jsxs)(`p`,{className:`text-muted-foreground text-sm`,dir:`auto`,children:[`With`,` `,(0,H.jsx)(`a`,{className:`text-foreground underline underline-offset-4`,href:qe,rel:`noreferrer`,target:`_blank`,children:`#913`}),`: they point the way you move.`]}),(0,H.jsx)(B,{"aria-label":`Example pagination, with #913`,children:(0,H.jsxs)(R,{children:[(0,H.jsx)(z,{children:(0,H.jsxs)(L,{"aria-label":`Go to previous page`,render:(0,H.jsx)(o,{size:`sm`,variant:`outline`}),children:[(0,H.jsx)(u,{"aria-hidden":`true`,className:`rtl:rotate-180`}),`Previous`]})}),(0,H.jsx)(z,{children:(0,H.jsxs)(L,{"aria-label":`Go to next page`,render:(0,H.jsx)(o,{size:`sm`,variant:`outline`}),children:[`Next`,(0,H.jsx)(f,{"aria-hidden":`true`,className:`rtl:rotate-180`})]})})]})})]})]})]})}),(0,H.jsx)(_,{value:`code`,children:(0,H.jsx)(`pre`,{className:`max-h-[32rem] overflow-auto rounded-xl border border-border bg-muted/40 p-4 text-xs leading-relaxed`,children:(0,H.jsx)(`code`,{children:He})})})]})]}),(0,H.jsxs)(`section`,{"aria-labelledby":`api-h`,className:`flex flex-col gap-3`,children:[(0,H.jsx)(`h2`,{className:`font-semibold text-xl`,id:`api-h`,children:`API reference`}),(0,H.jsxs)(`p`,{className:`max-w-2xl text-muted-foreground text-sm`,children:[`Read from `,(0,H.jsx)(`code`,{className:`text-xs`,children:`WaitlistProps`}),` in the source when the page builds: the names, the types, the defaults from the function's own signature and the comment above each prop. Change the type and this table changes; it cannot drift.`]}),(0,H.jsx)(Ce,{doc:Xe})]}),(0,H.jsxs)(`section`,{"aria-labelledby":`states-h`,className:`flex flex-col gap-4`,children:[(0,H.jsx)(`h2`,{className:`font-semibold text-xl`,id:`states-h`,children:`States`}),(0,H.jsx)(`div`,{className:`grid gap-4 sm:grid-cols-2`,children:Ye.map(e=>(0,H.jsxs)(`div`,{className:`flex flex-col gap-3`,children:[(0,H.jsxs)(`p`,{className:`text-sm`,children:[(0,H.jsx)(`span`,{className:`font-medium`,children:e.title}),` `,(0,H.jsxs)(`span`,{className:`text-muted-foreground`,children:[`· `,e.line]})]}),(0,H.jsx)(q,{className:`flex justify-center`,dir:n,children:(0,H.jsx)(Y,{state:e.state})})]},e.state))})]}),(0,H.jsxs)(`section`,{"aria-labelledby":`a11y-h`,className:`flex flex-col gap-4`,children:[(0,H.jsx)(`h2`,{className:`font-semibold text-xl`,id:`a11y-h`,children:`Accessibility`}),(0,H.jsxs)(`ul`,{className:`flex max-w-2xl list-disc flex-col gap-2 ps-5 text-muted-foreground text-sm`,children:[(0,H.jsxs)(`li`,{children:[`One live region (`,(0,H.jsx)(`code`,{className:`text-xs`,children:`role="status"`}),`) from the moment the card mounts, so each change is read out and nothing new has to be discovered.`]}),(0,H.jsxs)(`li`,{children:[`A join that lands moves focus to the place in line (a `,(0,H.jsx)(`code`,{className:`text-xs`,children:`group`}),` with an accessible name), so it is read out and the eye lands on it. A card that mounts already joined never steals focus.`]}),(0,H.jsxs)(`li`,{children:[`While joining, the card is `,(0,H.jsx)(`code`,{className:`text-xs`,children:`aria-busy`}),` and the button is `,(0,H.jsx)(`code`,{className:`text-xs`,children:`aria-disabled`}),`, not disabled: focus stays where it was.`]}),(0,H.jsxs)(`li`,{children:[`A failed join is announced (`,(0,H.jsx)(`code`,{className:`text-xs`,children:`role="alert"`}),`) in the footer, in the same cell as the time-zone line it replaces, so the card never changes height.`]}),(0,H.jsx)(`li`,{children:`The taken slots are a list named for what it shows; each is struck through and read as “taken”, so the strike-through isn’t the only signal.`}),(0,H.jsx)(`li`,{children:`Leaving goes through an alert dialog. Escape closes it; focus returns to the button that opened it. Base UI does both.`})]}),(0,H.jsxs)(P,{className:`max-w-2xl`,children:[(0,H.jsx)(ce,{children:(0,H.jsxs)(M,{children:[(0,H.jsx)(F,{children:`Key`}),(0,H.jsx)(F,{children:`Does`})]})}),(0,H.jsx)(j,{children:[[`Tab`,`Reaches Join, or Leave the list once joined. The place in line takes focus only when a join lands.`],[`Enter / Space`,`Joins, or opens the question.`],[`Escape`,`Closes the question and keeps the place.`]].map(([e,t])=>(0,H.jsxs)(M,{children:[(0,H.jsx)(N,{className:`whitespace-nowrap`,children:e.split(` / `).map((e,t)=>(0,H.jsxs)(V.Fragment,{children:[t>0?` / `:null,(0,H.jsx)(le,{children:e})]},e))}),(0,H.jsx)(N,{className:`whitespace-normal leading-normal`,children:t})]},e))})]})]}),(0,H.jsxs)(`section`,{"aria-labelledby":`motion-h`,className:`flex flex-col gap-3`,children:[(0,H.jsx)(`h2`,{className:`font-semibold text-xl`,id:`motion-h`,children:`Motion`}),(0,H.jsxs)(`dl`,{className:`grid max-w-2xl gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]`,children:[(0,H.jsx)(`dt`,{className:`font-medium`,children:`What moves`}),(0,H.jsx)(`dd`,{className:`text-muted-foreground`,children:`The place in line, once, as it appears: opacity and a 4px rise, 180 ms, ease-out.`}),(0,H.jsx)(`dt`,{className:`font-medium`,children:`What doesn't`}),(0,H.jsx)(`dd`,{className:`text-muted-foreground`,children:`The button, the card and its height. The button changes its label in place, at the same size; an error swaps the footer line in place.`}),(0,H.jsx)(`dt`,{className:`font-medium`,children:`Why`}),(0,H.jsx)(`dd`,{className:`text-muted-foreground`,children:`One thing on the card is new. The eye should land on it and nothing else should compete.`}),(0,H.jsx)(`dt`,{className:`font-medium`,children:`Reduced motion`}),(0,H.jsx)(`dd`,{className:`text-muted-foreground`,children:`It simply appears. Nothing on the card is animation-only.`})]})]}),(0,H.jsxs)(`section`,{"aria-labelledby":`rtl-h`,className:`flex flex-col gap-3`,children:[(0,H.jsx)(`h2`,{className:`font-semibold text-xl`,id:`rtl-h`,children:`Right-to-left`}),(0,H.jsxs)(`p`,{className:`max-w-2xl text-muted-foreground text-sm`,children:[`Logical properties throughout, and the one directional icon carries `,(0,H.jsx)(`code`,{className:`text-xs`,children:`rtl:rotate-180`}),`, the class coss's Calendar already uses. The pagination pair above is why that matters: the stock chevrons point the wrong way in RTL, and`,` `,(0,H.jsx)(o,{className:`h-auto px-0 py-0 align-baseline text-sm underline sm:h-auto sm:text-sm`,render:(0,H.jsx)(l,{href:qe,rel:`noreferrer`,target:`_blank`}),variant:`link`,children:`#913`}),` `,`fixes it across menu, context menu, drawer, pagination and breadcrumb.`]})]}),(0,H.jsxs)(`section`,{className:`flex flex-col gap-4 rounded-2xl border border-border bg-muted/30 p-6`,children:[(0,H.jsx)(`p`,{className:`font-medium`,children:`A slot should open. This is where I’d spend it.`}),(0,H.jsxs)(`div`,{className:`flex flex-wrap gap-2`,children:[(0,H.jsx)(xe,{calLink:Ge,children:`Book a time to argue about the API`}),(0,H.jsx)(o,{render:(0,H.jsx)(l,{href:Ke}),variant:`outline`,children:`The work`})]}),(0,H.jsx)(`p`,{className:`text-muted-foreground text-xs`,children:`Not a Cal.com or coss ui page. A proposal, by Rahul Jha.`})]})]})}export{Qe as WaitlistDocsPage};