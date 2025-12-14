"use client";

import { useState, useEffect, useRef } from "react";
import type { Message } from "~/types";
import { cn } from "~/lib/utils";
import { MessageCircleIcon, X } from "lucide-react";
import {
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerContent,
  DrawerTrigger,
  DrawerDescription,
  DrawerClose,
} from "~/components/ui/drawer";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { getTimestamp } from "~/lib/utils";
import type { Session } from "next-auth";

export default function ChatWindow({
  addMessage,
  isOpen,
  onOpenChange,
  messages,
  session,
}: {
  addMessage: (message: Message) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
  session: Session;
}) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSendMessage() {
    if (message.trim() === "") return;
    addMessage({
      timestamp: getTimestamp(),
      content: message,
      username: session.user.name ?? "Unknown",
    });
    setMessage("");
    inputRef.current?.focus();
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages]);

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
      <DrawerTrigger asChild>
        <Button className="fixed top-15 right-4 w-[122.14px]">
          <MessageCircleIcon />
          <p>Chat</p>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="mb-3 flex items-center justify-between text-3xl font-semibold">
            <p className="text-center text-2xl font-semibold">Chat</p>
            <DrawerClose className="size-6" title="Close">
              <X className="size-6" />
            </DrawerClose>
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Use this to chat with your opponent.
          </DrawerDescription>
        </DrawerHeader>
        <div className="mx-auto h-[calc(100%-10rem)] w-full px-4 sm:max-w-xl">
          {/* Message Log */}
          <div className="flex h-full flex-col gap-6 overflow-y-auto rounded border bg-black p-2">
            {messages.length === 0 && (
              <p className="text-center text-lg text-white/50">
                No messages yet...
              </p>
            )}
            {messages.map((msg, idx) => {
              return (
                <p
                  key={idx}
                  className={cn(
                    "message-bubble relative max-w-[40ch] rounded bg-(--bg-color) p-4 [--bg-color:#27391c] [&:after]:absolute [&:after]:bottom-0 [&:after]:translate-y-full [&:after]:border-0 [&:after]:border-t-20 [&:after]:border-transparent [&:after]:border-t-(--bg-color) [&:after]:content-['']",
                    msg.username === session.user.name
                      ? "mr-auto [&:after]:left-3 [&:after]:border-r-25"
                      : "ml-auto [--bg-color:#255f38] [&:after]:right-3 [&:after]:border-l-25",
                  )}
                >
                  <span className="opacity-50">{msg.username}: </span>
                  {msg.content}
                </p>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Input
              type="text"
              placeholder="Type your message here..."
              ref={inputRef}
              value={message}
              name="message-input"
              className="px-3 text-lg placeholder:text-lg"
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
            />
            <Button onClick={handleSendMessage} className="text-lg">
              Send
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
