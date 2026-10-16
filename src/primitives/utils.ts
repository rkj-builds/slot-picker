"use client";

import * as React from "react";

/**
 * Controlled when `controlled` is not undefined, uncontrolled otherwise, the
 * way Base UI parts behave: `value` + `onValueChange`, or `defaultValue`.
 */
export function useControlled<T>(controlled: T | undefined, defaultValue: T): [T, (next: T) => void] {
  const isControlled = controlled !== undefined;
  const [inner, setInner] = React.useState<T>(defaultValue);
  const value = isControlled ? controlled : inner;
  const set = React.useCallback(
    (next: T) => {
      if (!isControlled) setInner(next);
    },
    [isControlled],
  );
  return [value, set];
}

/** Visually hidden but read by screen readers. Inline, because a headless part ships no stylesheet. */
export const visuallyHidden: React.CSSProperties = {
  border: 0,
  clip: "rect(0 0 0 0)",
  height: 1,
  margin: -1,
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  whiteSpace: "nowrap",
  width: 1,
};

/** `className` as Base UI parts accept it: a string, or a function of the part's state. */
export type ClassNameProp<State> = string | ((state: State) => string | undefined) | undefined;
export type StyleProp<State> = React.CSSProperties | ((state: State) => React.CSSProperties | undefined) | undefined;

/** Resolve `className` and `style` against the part's state, for `useRender`'s `props`. */
export function stateProps<State>(className: ClassNameProp<State>, style: StyleProp<State>, state: State): { className?: string; style?: React.CSSProperties } {
  const out: { className?: string; style?: React.CSSProperties } = {};
  const resolvedClass = typeof className === "function" ? className(state) : className;
  const resolvedStyle = typeof style === "function" ? style(state) : style;
  if (resolvedClass) out.className = resolvedClass;
  if (resolvedStyle) out.style = resolvedStyle;
  return out;
}
