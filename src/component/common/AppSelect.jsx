import React, { Children, isValidElement, useMemo } from "react";
import { MenuItem, Select } from "@mui/material";

const flattenOptions = (children) =>
  Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    if (child.type === React.Fragment) return flattenOptions(child.props.children);
    return child.type === "option" ? [child] : [];
  });

/**
 * Application-wide replacement for native selects.
 * It accepts the same option children and emits string values to preserve
 * native <select> behaviour for existing change handlers.
 */
export default function AppSelect({
  children,
  className = "",
  value = "",
  defaultValue,
  onChange,
  name,
  disabled,
  required,
  style,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-invalid": ariaInvalid,
  ...rest
}) {
  const options = useMemo(() => flattenOptions(children), [children]);
  const controlledValue = value == null ? "" : String(value);
  const initialValue = defaultValue == null ? undefined : String(defaultValue);

  return (
    <Select
      {...rest}
      id={id}
      name={name}
      value={controlledValue}
      defaultValue={initialValue}
      onChange={onChange}
      disabled={disabled}
      required={required}
      displayEmpty
      className={`app-modern-select ${className}`.trim()}
      style={style}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-invalid={ariaInvalid}
      MenuProps={{
        classes: { paper: "app-modern-select-menu" },
        MenuListProps: { className: "app-modern-select-list" },
        anchorOrigin: { vertical: "bottom", horizontal: "left" },
        transformOrigin: { vertical: "top", horizontal: "left" },
      }}
    >
      {options.map((option, index) => {
        const rawOptionValue = option.props.value ?? option.props.children ?? "";
        const optionValue = String(rawOptionValue);
        return (
          <MenuItem
            key={option.key ?? `${optionValue}-${index}`}
            value={optionValue}
            disabled={option.props.disabled}
            className="app-modern-select-option"
          >
            {option.props.children}
          </MenuItem>
        );
      })}
    </Select>
  );
}
