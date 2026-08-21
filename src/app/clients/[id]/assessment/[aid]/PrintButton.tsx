'use client';

import { printPage } from '@/lib/browser';

export default function PrintButton() {
  return (
    <button onClick={printPage} className="btn-secondary">
      🖨️ 인쇄/PDF
    </button>
  );
}
