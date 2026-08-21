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
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push(`/clients/${clientId}`);
        return;
      }
      alert('삭제 실패: 잠시 후 다시 시도해 주세요.');
    } catch {
      alert('삭제 실패: 네트워크 연결을 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onDelete}
      disabled={loading}
      className="btn-danger"
      style={{ color: '#b42318', borderColor: '#f0b4ae' }}
    >
      {loading ? '삭제 중...' : '삭제'}
    </button>
  );
}
