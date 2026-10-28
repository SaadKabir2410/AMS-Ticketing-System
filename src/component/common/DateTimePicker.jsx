import React, { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";

// Accepts "YYYY-MM-DD HH:mm", "YYYY-MM-DDTHH:mm[:ss]" or a Date and returns a
// local Date, so API ISO values and picker values compare the same way.
const toLocalDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const parts = String(value)
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!parts) return null;

  const [, year, month, day, hour = "00", minute = "00"] = parts;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
};

// Date-time input that supports both picking from the calendar and typing.
// The flatpickr instance is created once; typed text is committed on Enter or
// blur, which then reports through onChange(dateStr, date).
export default function DateTimePicker({
  value,
  onChange,
  options,
  className,
  placeholder = "YYYY-MM-DD HH:mm",
  disabled = false,
  ...inputProps
}) {
  const inputRef = useRef(null);
  const pickerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(value);
  const initialOptionsRef = useRef(options);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const instance = flatpickr(inputRef.current, {
      enableTime: true,
      dateFormat: "Y-m-d H:i",
      time_24hr: true,
      allowInput: true,
      ...initialOptionsRef.current,
      defaultDate: toLocalDate(initialValueRef.current) || undefined,
      onChange: ([date], dateStr) => {
        onChangeRef.current?.(dateStr, date || null);
      },
    });

    pickerRef.current = instance;
    return () => {
      instance.destroy();
      pickerRef.current = null;
    };
  }, []);

  // Sync value changes made outside the input (form load/reset). Skip while
  // the user is typing so the half-typed text is not reformatted.
  useEffect(() => {
    const instance = pickerRef.current;
    if (!instance || document.activeElement === instance.input) return;

    const nextDate = toLocalDate(value);
    if (!nextDate) {
      if (instance.selectedDates.length || instance.input.value) {
        instance.clear(false);
      }
      return;
    }

    const currentDate = instance.selectedDates[0];
    if (!currentDate || currentDate.getTime() !== nextDate.getTime()) {
      instance.setDate(nextDate, false);
    }
  }, [value]);

  useEffect(() => {
    pickerRef.current?.set("clickOpens", !disabled);
  }, [disabled]);

  return (
    <input
      {...inputProps}
      ref={inputRef}
      type="text"
      autoComplete="off"
      disabled={disabled}
      className={className}
      placeholder={placeholder}
    />
  );
}
