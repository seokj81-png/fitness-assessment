'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeleteClientButton({ id, name }: { id: string; name?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    const who = name ? `'${name}' 회원님` : '이 회원님';
    if (
      !confirm(
        `${who}과 모든 평가·인바디 기록을 함께 삭제합니다.\n이 작업은 되돌릴 수 없습니다. 삭제할까요?`
      )
    )
      return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/');
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
