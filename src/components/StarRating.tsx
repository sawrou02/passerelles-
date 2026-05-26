import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value, onChange, size = 18, readOnly = false,
}: { value: number; onChange?: (v: number) => void; size?: number; readOnly?: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          className={cn("transition-transform", !readOnly && "hover:scale-110 cursor-pointer", readOnly && "cursor-default")}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <Star
            size={size}
            className={cn(n <= value ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30")}
          />
        </button>
      ))}
    </div>
  );
}
