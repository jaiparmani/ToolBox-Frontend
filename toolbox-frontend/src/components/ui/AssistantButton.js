import React from 'react';
import { ButtonBase } from '@mui/material';
import { accents, motion as motionTokens, radius } from '../../theme/tokens';
import usePressSpring from './usePressSpring';

/**
 * The assistant's one button.
 *
 * Every control inside the assistant used to be a `<Box role="button">`: no tab
 * stop, no Enter/Space, no focus ring — invisible to a keyboard and to a screen
 * reader's controls list. This is a real button (ButtonBase renders `<button>`),
 * so it is focusable, operable by keyboard, and announces its own role.
 *
 * It also answers on pointer-DOWN rather than on release (Apple Design §1) via
 * `usePressSpring`, which writes the scale straight to the node — no re-render,
 * compositor-only, and cancel-by-drag-away for free.
 *
 * `tone` is an accent role; `variant` picks how loudly it speaks:
 *   solid   — the one primary commit in a card
 *   outline — a real but secondary choice (destructive lives here)
 *   quiet   — navigation and dismissals
 */
export default function AssistantButton({
  children,
  tone = accents.violet,
  variant = 'quiet',
  disabled = false,
  startIcon = null,
  round = false,
  sx,
  ...rest
}) {
  const press = usePressSpring({ pressScale: round ? 0.9 : 0.965, disabled });

  const skin = {
    solid: {
      color: '#fff',
      backgroundColor: tone,
      boxShadow: `0 6px 18px -8px ${tone}cc`,
      '&:hover': { backgroundColor: tone, filter: 'brightness(1.08)' },
    },
    outline: {
      color: tone,
      border: '1px solid',
      borderColor: `${tone}55`,
      backgroundColor: 'transparent',
      '&:hover': { backgroundColor: `${tone}16`, borderColor: tone },
    },
    quiet: {
      color: tone,
      backgroundColor: 'transparent',
      '&:hover': { backgroundColor: `${tone}14` },
    },
  }[variant];

  return (
    <ButtonBase
      ref={press.ref}
      {...press.bindEvents}
      disabled={disabled}
      focusRipple={false}
      disableRipple
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        // Comfortable pointer target on a phone without looking chunky on desktop.
        minHeight: round ? 34 : 34,
        px: round ? 0 : 1.5,
        py: round ? 0 : 0.6,
        borderRadius: round ? '50%' : `${radius.md}px`,
        fontWeight: 650,
        fontSize: '0.82rem',
        lineHeight: 1.2,
        letterSpacing: '0.005em',
        transition: `background-color ${motionTokens.fast}ms ${motionTokens.ease}, border-color ${motionTokens.fast}ms ${motionTokens.ease}, color ${motionTokens.fast}ms ${motionTokens.ease}`,
        '&.Mui-disabled': { opacity: 0.45, color: 'text.disabled' },
        // A focus ring you can actually see, in both themes.
        '&:focus-visible': {
          outline: `2px solid ${accents.violet}`,
          outlineOffset: 2,
        },
        ...skin,
        ...sx,
      }}
      {...rest}
    >
      {startIcon}
      {children}
    </ButtonBase>
  );
}
