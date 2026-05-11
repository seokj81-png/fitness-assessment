'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeleteAssessmentButton({
  clientId,
  assessmentId,
}: {
  clientId: string;
  assessmentId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm('이 평가 기록을 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
    setLoading(true);
    const res = await fetch(`/api/assessments/${assessmentId}`, {
      method: 'DELETE',
    });
    if (res.ok) router.push(`/clients/${clientId}`);
    else {
      alert('삭제 실패');
      setLoading(false);
    }
  }

  return (
    <button onClick={onDelete} disabled={loading} className="btn-danger">
      {loading ? '삭제 중...' : '삭제'}
    </button>
  );
}
