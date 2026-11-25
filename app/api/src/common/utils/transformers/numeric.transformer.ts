import { ValueTransformer } from 'typeorm';

// Postgres hands `numeric` back as text, to keep every digit; amounts here are small enough that a number is exact for what is shown
export const numeric: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? null : Number(value)),
};
