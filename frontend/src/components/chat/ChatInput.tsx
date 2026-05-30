"use client";

import { forwardRef, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SendHorizonal, Loader2 } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  function ChatInput({ value, onChange, onSubmit, disabled }, ref) {
    const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
      }
    };

    return (
      <div className="flex items-end gap-3">
        <Textarea
          ref={ref}
          placeholder="Ask anything about your documents… (Enter to send, Shift+Enter for newline)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          rows={1}
          className="max-h-40 resize-none rounded-[1.35rem] border-2 border-[#14110f] bg-white text-sm font-bold text-[#14110f] placeholder:text-[#14110f]/55 shadow-[4px_4px_0_rgba(20,17,15,0.16)] transition-all duration-200 focus-visible:ring-[#ffcc33]"
          style={{ overflow: "auto" }}
        />
        <Button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          size="icon"
          className="h-11 w-11 shrink-0 cursor-pointer rounded-full border-2 border-[#14110f] bg-[#ffcc33] text-[#14110f] shadow-[4px_4px_0_#14110f] transition hover:-translate-y-0.5 hover:bg-[#ffd95f]"
          aria-label="Send message"
        >
          {disabled ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizonal className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }
);
