"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type FilterDatePickerProps = {
  ariaLabel: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

function parseDateValue(value: string) {
  if (!value) return undefined;

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

function formatDateValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function FilterDatePicker({ ariaLabel, value, placeholder, onChange }: FilterDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseDateValue(value), [value]);

  function handleSelect(date?: Date) {
    onChange(date ? formatDateValue(date) : "");
    if (date) setOpen(false);
  }

  function clearDate() {
    onChange("");
    setOpen(false);
  }

  function setToday() {
    onChange(formatDateValue(new Date()));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn("finance-date-trigger", !selectedDate && "finance-date-trigger-empty", open && "finance-date-trigger-open")}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="finance-date-icon-wrap">
              <CalendarDays size={15} />
            </span>
            <span className="truncate">{selectedDate ? format(selectedDate, "dd MMM yyyy") : placeholder}</span>
          </span>
          <ChevronDown size={16} className={cn("shrink-0 transition-transform duration-200", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={10} className="finance-date-popover">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={selectedDate ?? new Date()}
          className="finance-calendar"
        />
        <div className="finance-date-actions">
          <button type="button" className="finance-date-action" onClick={clearDate}>
            Clear
          </button>
          <button type="button" className="finance-date-action finance-date-action-primary" onClick={setToday}>
            Today
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
