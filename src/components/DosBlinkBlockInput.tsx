import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

export interface DosBlinkBlockInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  inputClassName?: string;
  containerClassName?: string;
}

/**
 * DosBlinkBlockInput
 * In DOS mode: suppresses the native 1px Windows caret and renders a genuine,
 * authentic DOS block cursor (█) that tracks typing position in real-time and blinks.
 * In Light/Dark mode: renders the normal native input.
 */
export const DosBlinkBlockInput = React.forwardRef<HTMLInputElement, DosBlinkBlockInputProps>(
  (
    {
      value,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      onKeyUp,
      onClick,
      placeholder,
      className = '',
      inputClassName = '',
      containerClassName = '',
      dir = 'rtl',
      ...restProps
    },
    forwardedRef
  ) => {
    const { isDos } = useTheme();
    const internalInputRef = useRef<HTMLInputElement | null>(null);
    const measureSpanRef = useRef<HTMLSpanElement | null>(null);

    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [caretIndex, setCaretIndex] = useState<number>(value.length);
    const [caretOffsetPx, setCaretOffsetPx] = useState<number>(0);
    const [cursorVisible, setCursorVisible] = useState<boolean>(true);

    // Sync ref
    const setRef = useCallback(
      (element: HTMLInputElement | null) => {
        internalInputRef.current = element;
        if (typeof forwardedRef === 'function') {
          forwardedRef(element);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = element;
        }
      },
      [forwardedRef]
    );

    // Update caret index from DOM input
    const syncCaret = useCallback(() => {
      if (!internalInputRef.current) return;
      const pos = internalInputRef.current.selectionStart ?? value.length;
      setCaretIndex(pos);
    }, [value.length]);

    // Calculate exact pixel offset of the cursor
    useEffect(() => {
      if (!isDos) return;

      const input = internalInputRef.current;
      const measure = measureSpanRef.current;
      if (!input || !measure) return;

      // Text before the caret
      const safeIndex = Math.min(Math.max(0, caretIndex), value.length);
      const textBefore = value.slice(0, safeIndex);
      measure.textContent = textBefore;

      // Measure text width using browser layout engine
      const textWidth = measure.offsetWidth;

      // Compute input padding
      const style = window.getComputedStyle(input);
      const paddingRight = parseFloat(style.paddingRight) || 12;

      setCaretOffsetPx(paddingRight + textWidth);
    }, [value, caretIndex, isDos]);

    // Blink timer (530ms standard BIOS frequency)
    useEffect(() => {
      if (!isDos || !isFocused) {
        setCursorVisible(false);
        return;
      }

      setCursorVisible(true);
      const interval = setInterval(() => {
        setCursorVisible((prev) => !prev);
      }, 530);

      return () => clearInterval(interval);
    }, [isDos, isFocused]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      syncCaret();
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      if (onBlur) onBlur(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      requestAnimationFrame(syncCaret);
      if (onKeyDown) onKeyDown(e);
    };

    const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
      syncCaret();
      if (onKeyUp) onKeyUp(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      syncCaret();
      if (onClick) onClick(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e);
      requestAnimationFrame(syncCaret);
    };

    // If NOT DOS mode: render standard native input directly
    if (!isDos) {
      return (
        <input
          ref={setRef}
          value={value}
          onChange={handleChange}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onClick={onClick}
          placeholder={placeholder}
          dir={dir}
          className={className || inputClassName}
          {...restProps}
        />
      );
    }

    // In DOS Mode: render styled input with true block cursor
    const charUnderCaret = value[caretIndex] || '';
    const isAtEnd = caretIndex >= value.length;

    return (
      <div className={`relative flex-1 min-w-0 ${containerClassName}`} dir="rtl">
        {/* Hidden measuring span matching exact font/weight of input */}
        <span
          ref={measureSpanRef}
          aria-hidden="true"
          className="invisible absolute whitespace-pre font-mono text-base font-bold pointer-events-none select-none"
          style={{
            visibility: 'hidden',
            position: 'absolute',
            top: -9999,
            left: -9999,
          }}
        />

        {/* The Input with native caret suppressed (transparent) */}
        <input
          ref={setRef}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onClick={handleClick}
          placeholder={placeholder}
          dir="rtl"
          className={`w-full font-mono text-base font-bold p-2 sm:p-2.5 rounded-none bg-[#000044] text-[#55ff55] placeholder:text-[#55ffff]/50 border-2 border-[#55ffff] focus:border-[#ffff55] focus:bg-[#000022] focus:outline-none transition-none text-right ${inputClassName} ${className}`}
          style={{
            caretColor: 'transparent', // Completely hides the Windows 1px line
          }}
          {...restProps}
        />

        {/* Real Authentic DOS Block Cursor (█) */}
        {isFocused && (
          <div
            aria-hidden="true"
            className="absolute pointer-events-none select-none transition-none flex items-center justify-center font-mono text-base font-bold z-10"
            style={{
              right: `${caretOffsetPx}px`,
              top: '50%',
              transform: 'translateY(-50%)',
              width: charUnderCaret ? 'auto' : '9px',
              minWidth: '9px',
              height: '1.25em',
              backgroundColor: cursorVisible ? '#55ff55' : 'transparent',
              color: '#000000',
              opacity: cursorVisible ? 1 : 0,
            }}
          >
            {charUnderCaret || ''}
          </div>
        )}
      </div>
    );
  }
);

DosBlinkBlockInput.displayName = 'DosBlinkBlockInput';
