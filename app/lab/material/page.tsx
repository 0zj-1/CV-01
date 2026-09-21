import type { Metadata } from 'next';
import MaterialLabRoute from '../../../prototypes/material-interaction/MaterialLabRoute';

export const metadata: Metadata = {
  title: 'Material Interaction Prototype',
  description: 'Isolated bench for material press response. Not part of the portfolio.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <MaterialLabRoute />;
}
