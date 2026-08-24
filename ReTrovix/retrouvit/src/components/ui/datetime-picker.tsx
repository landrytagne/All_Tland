"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value: string; // ISO string or datetime-local format
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAYS_FR = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

export function DateTimePicker({ value, onChange, placeholder, className }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const now = new Date();
  const currentValue = value ? new Date(value) : null;

  const [viewMonth, setViewMonth] = React.useState(currentValue?.getMonth() ?? now.getMonth());
  const [viewYear, setViewYear] = React.useState(currentValue?.getFullYear() ?? now.getFullYear());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(currentValue);
  const [timeHour, setTimeHour] = React.useState(currentValue ? String(currentValue.getHours()).padStart(2, "0") : String(now.getHours()).padStart(2, "0"));
  const [timeMinute, setTimeMinute] = React.useState(currentValue ? String(currentValue.getMinutes()).padStart(2, "0") : "00");

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const applyDateTime = (date: Date, hour: string, minute: string) => {
    const d = new Date(date);
    d.setHours(parseInt(hour), parseInt(minute), 0, 0);
    const iso = d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
    onChange(iso);
  };

  const handleDateClick = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    setSelectedDate(date);
    applyDateTime(date, timeHour, timeMinute);
  };

  const handleTimeChange = (type: "hour" | "minute", val: string) => {
    const h = type === "hour" ? val : timeHour;
    const m = type === "minute" ? val : timeMinute;
    if (type === "hour") setTimeHour(val);
    if (type === "minute") setTimeMinute(val);
    if (selectedDate) {
      applyDateTime(selectedDate, h, m);
    }
  };

  const setPreset = (daysOffset: number, hour: number, minute: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + daysOffset);
    date.setHours(hour, minute, 0, 0);
    setSelectedDate(date);
    setViewMonth(date.getMonth());
    setViewYear(date.getFullYear());
    setTimeHour(String(hour).padStart(2, "0"));
    setTimeMinute(String(minute).padStart(2, "0"));
    applyDateTime(date, String(hour).padStart(2, "0"), String(minute).padStart(2, "0"));
  };

  const formatDisplay = () => {
    if (!selectedDate) return placeholder || "Choisir une date et heure";
    return selectedDate.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  return (
    <div className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm",
          "hover:bg-accent/50 transition-colors text-left",
          !selectedDate && "text-muted-foreground"
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 truncate">{formatDisplay()}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-[340px] rounded-xl border bg-card shadow-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
          {/* Quick presets */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Choix rapide</p>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-[11px] rounded-lg"
                onClick={() => setPreset(0, now.getHours() + 1, 0)}>
                Aujourd&apos;hui
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11px] rounded-lg"
                onClick={() => setPreset(1, 10, 0)}>
                Demain 10h
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11px] rounded-lg"
                onClick={() => setPreset(1, 14, 0)}>
                Demain 14h
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11px] rounded-lg"
                onClick={() => setPreset(7, 10, 0)}>
                Dans 1 semaine
              </Button>
            </div>
          </div>

          {/* Calendar */}
          <div>
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => {
                  if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
                  else setViewMonth(viewMonth - 1);
                }}
                className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-medium">
                {MONTHS_FR[viewMonth]} {viewYear}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
                  else setViewMonth(viewMonth + 1);
                }}
                className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0 mb-1">
              {DAYS_FR.map((d) => (
                <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-0">
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const date = new Date(viewYear, viewMonth, day);
                const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const isSelected = selectedDate &&
                  selectedDate.getDate() === day &&
                  selectedDate.getMonth() === viewMonth &&
                  selectedDate.getFullYear() === viewYear;
                const isToday = now.getDate() === day && now.getMonth() === viewMonth && now.getFullYear() === viewYear;

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isPast}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      "h-8 w-8 text-xs rounded-lg flex items-center justify-center transition-colors",
                      isPast && "text-muted-foreground/40 cursor-not-allowed",
                      !isPast && !isSelected && "hover:bg-primary/10 text-foreground",
                      isSelected && "bg-primary text-primary-foreground font-semibold",
                      isToday && !isSelected && "ring-1 ring-primary font-medium"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time picker */}
          <div className="flex items-center gap-3 pt-2 border-t">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs font-medium text-muted-foreground">Heure</p>
            <select
              value={timeHour}
              onChange={(e) => handleTimeChange("hour", e.target.value)}
              className="h-8 rounded-lg border bg-background px-2 text-xs"
            >
              {hours.map((h) => (
                <option key={h} value={h}>{h}h</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">:</span>
            <select
              value={timeMinute}
              onChange={(e) => handleTimeChange("minute", e.target.value)}
              className="h-8 rounded-lg border bg-background px-2 text-xs"
            >
              {minutes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Close button */}
          <Button size="sm" className="w-full" onClick={() => setIsOpen(false)}>
            Confirmer
          </Button>
        </div>
      )}
    </div>
  );
}
