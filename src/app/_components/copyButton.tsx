"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Copy, Check } from "lucide-react";
import { cn } from "~/lib/utils";

export default function CopyButton({ content }: { content: string }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Button
      onClick={handleCopy}
      title={isCopied ? "Copied!" : "Copy"}
      size="icon-sm"
      className="relative ml-2 inline-grid size-8 place-items-center"
    >
      <Check
        className={cn(
          "absolute inset-0 m-auto size-4 transition-opacity",
          isCopied ? "opacity-100" : "opacity-0",
        )}
      />
      <Copy
        className={cn(
          "absolute inset-0 m-auto size-4 transition-opacity",
          isCopied ? "opacity-0" : "opacity-100",
        )}
      />
    </Button>
  );
}
