"use client";

import { MessagesSquareIcon } from "lucide-react";
import type * as React from "react";
import { sectionById, type ScreenProps } from "@/app/desk/sections";
import { ChatPane } from "@/app/screens/inbox/chat-pane";
import { ConversationList } from "@/app/screens/inbox/conversation-list";
import { tabOf } from "@/app/screens/inbox/inbox-tabs";
import { PageHeader, Screen } from "@/app/screens/screen-kit";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

/**
 * The WhatsApp conversations the bot hands to people. #/desk/inbox lists
 * them (?tab=leads|customers|team); #/desk/inbox/<id> opens one. Two panes
 * on a laptop, list beside chat; one pane on a phone, where the chat has a
 * Back link to the list. Both are URLs, so the phone's own Back works too.
 */
export function InboxScreen({ route, sub, now }: ScreenProps): React.ReactElement {
  const section = sectionById("inbox");
  const tab = tabOf(route.query.get("tab"));
  const openId = sub[0] ?? null;
  const phone = useMediaQuery("max-md");
  const showList = !phone || openId === null;
  const showChat = !phone || openId !== null;

  return (
    <Screen className="gap-4">
      <PageHeader description={section.line} title={section.label} />
      <div
        className={cn(
          "grid min-h-0 overflow-hidden rounded-2xl border bg-card shadow-xs/5",
          // Tall enough to fill the window under the desk's header, so the composer stays in sight.
          "h-[calc(100svh-14rem)] min-h-[28rem] md:min-h-[32rem]",
          !phone && "grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]",
        )}
        data-slot="inbox"
      >
        {showList && <ConversationList now={now} openId={openId} tab={tab} />}
        {showChat &&
          (openId ? (
            <ChatPane id={openId} key={openId} now={now} phone={phone} tab={tab} />
          ) : (
            <section aria-label="Conversation" className="flex min-h-0 items-center justify-center border-s">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MessagesSquareIcon aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>Pick a conversation</EmptyTitle>
                  <EmptyDescription>Leads who have waited longest are at the top. Open one to read it, take it, and reply by hand when the bot can't help.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </section>
          ))}
      </div>
    </Screen>
  );
}
