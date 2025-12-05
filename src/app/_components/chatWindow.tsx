"use client";

import type { Message } from "~/types";
import { cn } from "~/lib/utils";
import { MessageCircleIcon } from "lucide-react";
import {
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerContent,
  DrawerTrigger,
  DrawerDescription,
} from "~/components/ui/drawer";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useState } from "react";
import { getTimestamp } from "~/lib/utils";
import type { Session } from "next-auth";

export default function ChatWindow({
  addMessage,
  messages,
  session,
}: {
  addMessage: (message: Message) => void;
  messages: Message[];
  session: Session;
}) {
  const [message, setMessage] = useState("");
  function handleSendMessage() {
    addMessage({
      timestamp: getTimestamp(),
      content: message,
      username: session.user.name ?? "Unknown",
    });
    setMessage("");
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className="absolute top-38 left-4">
          <p>Chat</p>
          <MessageCircleIcon />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            <p className="text-center text-2xl font-semibold">Chat</p>
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Use this to chat with your opponent.
          </DrawerDescription>
        </DrawerHeader>
        <div className="mx-auto w-full rounded p-4 sm:max-w-xl">
          <div className="mb-2 flex gap-2">
            <Input
              type="text"
              placeholder="Type your message here..."
              value={message}
              name="message-input"
              className="px-4 py-5 text-lg placeholder:text-lg"
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button onClick={handleSendMessage} className="text-lg">
              Send
            </Button>
          </div>

          {/* Message Log */}
          <div className="bg-background flex h-40 flex-col gap-2 overflow-y-auto rounded border p-2">
            {messages.map((msg, idx) => (
              <p
                key={idx}
                className={cn(
                  "max-w-[40ch] rounded bg-gray-800/50 p-4",
                  msg.username === session.user.name
                    ? "mr-auto bg-blue-800/50"
                    : "ml-auto bg-gray-800/50",
                )}
              >
                <span className="font-semibold opacity-50">
                  {msg.username}:{" "}
                </span>
                {msg.content}
              </p>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
