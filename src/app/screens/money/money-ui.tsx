"use client";

/**
 * Small pieces the three money tabs share: how an amount, a method and an
 * approval look, and the link to whatever the money was for.
 */
import { ArrowDownLeftIcon, ArrowUpRightIcon, BanknoteIcon, CircleCheckIcon, ClockIcon, SmartphoneIcon, WalletIcon } from "lucide-react";
import type * as React from "react";
import { Anchor } from "@/app/anchor";
import { AMOUNT_NOTE, KIND_LABEL, signedPaise, subjectHref } from "@/app/screens/money/money-model";
import { Badge } from "@/components/ui/badge";
import type { Payment } from "@/data/types";
import { formatInr } from "@/lib/money";
import { cn } from "@/lib/utils";

/** "−₹800" in tabular figures, with what the sign means said in words underneath. */
export function Amount({ payment, className }: { payment: Pick<Payment, "kind" | "amountPaise">; className?: string }): React.ReactElement {
  const signed = signedPaise(payment);
  const note = AMOUNT_NOTE[payment.kind];
  return (
    <span className={cn("inline-flex flex-col items-end gap-0.5", className)}>
      <span className={cn("font-medium tabular-nums", signed < 0 && "text-muted-foreground")}>
        {signed < 0 ? "−" : ""}
        {formatInr(Math.abs(signed))}
      </span>
      {note && <span className="text-muted-foreground text-xs">{note}</span>}
    </span>
  );
}

const KIND_ICON: Record<Payment["kind"], React.ComponentType<{ "aria-hidden"?: "true" }>> = {
  cash: BanknoteIcon,
  online: SmartphoneIcon,
  refund: ArrowUpRightIcon,
  "credit-issued": WalletIcon,
  "credit-applied": ArrowDownLeftIcon,
};

export function MethodBadge({ kind }: { kind: Payment["kind"] }): React.ReactElement {
  const Icon = KIND_ICON[kind];
  const variant = kind === "refund" ? "warning" : kind === "credit-issued" || kind === "credit-applied" ? "info" : "outline";
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {KIND_LABEL[kind]}
    </Badge>
  );
}

export function ApprovalBadge({ approved }: { approved: boolean }): React.ReactElement {
  return approved ? (
    <Badge variant="success">
      <CircleCheckIcon aria-hidden="true" />
      Approved
    </Badge>
  ) : (
    <Badge variant="warning">
      <ClockIcon aria-hidden="true" />
      Waiting
    </Badge>
  );
}

/** What the money was for, as a link to its page. */
export function SubjectLink({ subject, className }: { subject: Payment["subject"]; className?: string }): React.ReactElement {
  return (
    <Anchor className={cn("truncate font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline", className)} href={subjectHref(subject)}>
      {subject.label}
    </Anchor>
  );
}
