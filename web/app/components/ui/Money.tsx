'use client';

import React from 'react';
import { Typography, type TypographyProps } from '@mui/material';
import { formatMoney, formatSignedMoney } from '../../../lib/format';

type MoneyProps = Omit<TypographyProps, 'children'> & {
  /**
   * Display-signed value: positive = money in, negative = money out.
   * If you have a stored transaction amount (expenses +), pass `stored` instead.
   */
  value?: number;
  /** Stored amount using the app convention (expenses positive, income negative). */
  stored?: number;
  /** Colour income green and expenses red. */
  colored?: boolean;
  /** Always show a leading + / −. */
  signed?: boolean;
  cents?: boolean;
};

/** Tabular-number money text with consistent sign & colour handling. */
export default function Money(props: MoneyProps) {
  const { value, stored, colored, signed, cents = true, sx, ...rest } = props;
  const display = value ?? (stored != null ? -stored : 0);
  const text = signed ? formatSignedMoney(display, { cents }) : display < 0 ? `−${formatMoney(Math.abs(display), { cents })}` : formatMoney(display, { cents });
  const color = colored ? (display > 0 ? 'success.main' : display < 0 ? 'text.primary' : 'text.secondary') : undefined;
  return (
    <Typography
      component="span"
      variant="body2"
      className="tabular-nums"
      sx={{ fontWeight: 600, color, whiteSpace: 'nowrap', ...sx }}
      {...rest}
    >
      {text}
    </Typography>
  );
}
