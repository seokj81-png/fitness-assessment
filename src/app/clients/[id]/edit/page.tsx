'use client';

import { useRouter, useParams } from 'next/navigation';
import DobInput from '@/components/ui/DobInput';
import GoalInput from '@/components/ui/GoalInput';
import { useEffect, useState } from 'react';
import { BRANCHES } from '@/lib/branches';

type ClientData = {
  name: string;
  sex: string;
  dob?: string | null;
  height?: number | null;
  weight?: number | null;
  occupation?: string | null;
  smoking?: string | null;
  drinking?: string | null;
  drinkingAmt?: string | null;
  experience?: string | null;
  goal?: string | null;
  medical?: string | null;
  branch?: string | null;
  trainer?: string | null;
};

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(false);

  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    setLoadError(false);
    fetch(`/api/clients/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((c) => {
        setData({
          ...c,
          dob: c.dob ? new Date(c.dob).toISOString().slice(0, 10) : '',
        });
      })
      .catch(() => setLoadError(true));
  }, [params.id]);

  if (loadError)
    return (
      <div className="card text-center py-10">
        <p className="text-sm text-slate-500 mb-4">회원 정보를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.</p>
        <button onClick={() => location.reload()} className="btn-secondary">다시 시도</button>
      </div>
    );
  if (!data) return <div className="text-slate-500">로딩 중...</div>;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name'),
      sex: fd.get('sex'),
      dob: fd.get('dob') || null,
      height: fd.get('height') ? Number(fd.get('height')) : null,
      weight: fd.get('weight') ? Number(fd.get('weight')) : null,
      occupation: fd.get('occupation') || null,
      branch: fd.get('branch') || null,
      trainer: fd.get('trainer') || null,
      smoking: fd.get('smoking') || null,
      drinking: fd.get('drinking') || null,
      drinkingAmt: fd.get('drinkingAmt') || null,
      experience: fd.get('experience') || null,
      goal: fd.get('goal') || null,
      medical: fd.get('medical') || null,
    };
    const res = await fetch(`/api/clients/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) router.push(`/clients/${params.id}`);
    else {
      alert('수정 실패');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-5">회원님 정보 수정</h2>
      <form onSubmit={save} className="card space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">이름 *</label>
            <input name="name" required defaultValue={data.name} className="input" />
          </div>
          <div>
            <label className="label">성별 *</label>
            <select name="sex" required defaultValue={data.sex} className="input">
              <option value="M">남성</option>
              <option value="F">여성</option>
            </select>
          </div>
          <div>
            <label className="label">생년월일</label>
            <DobInput defaultValue={data.dob || ''} />
          </div>
          <div>
            <label className="label">직업</label>
            <input name="occupation" defaultValue={data.occupation || ''} className="input" />
          </div>
          <div>
            <label className="label">지점</label>
            <select name="branch" defaultValue={data.branch || ''} className="input">
              <option value="">미지정</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
              {data.branch && !BRANCHES.includes(data.branch as (typeof BRANCHES)[number]) && (
                <option value={data.branch}>{data.branch}</option>
              )}
            </select>
          </div>
          <div>
            <label className="label">담당 트레이너</label>
            <input name="trainer" defaultValue={data.trainer || ''} className="input" placeholder="트레이너 이름" />
          </div>
          <div>
            <label className="label">신장 (cm)</label>
            <input name="height" type="number" step="0.1" defaultValue={data.height ?? ''} className="input" />
          </div>
          <div>
            <label className="label">체중 (kg)</label>
            <input name="weight" type="number" step="0.1" defaultValue={data.weight ?? ''} className="input" />
          </div>
          <div>
            <label className="label">운동경력</label>
            <select name="experience" defaultValue={data.experience || 'none'} className="input">
              <option value="none">없음</option>
              <option value="beginner">초급</option>
              <option value="intermediate">중급</option>
              <option value="advanced">고급</option>
            </select>
          </div>
          <div>
            <label className="label">운동 목적</label>
            <GoalInput defaultValue={data.goal || 'health'} />
          </div>
          <div>
            <label className="label">흡연</label>
            <select name="smoking" defaultValue={data.smoking || 'no'} className="input">
              <option value="no">비흡연</option>
              <option value="ex">과거</option>
              <option value="yes">현재</option>
            </select>
          </div>
          <div>
            <label className="label">음주</label>
            <select name="drinking" defaultValue={data.drinking || 'none'} className="input">
              <option value="none">안 함</option>
              <option value="monthly">월 1~2회</option>
              <option value="weekly">주 1~2회</option>
              <option value="often">주 3회 이상</option>
            </select>
          </div>
          <div>
            <label className="label">1회 음주량</label>
            <input name="drinkingAmt" defaultValue={data.drinkingAmt || ''} className="input" placeholder="예) 소주 1병" />
          </div>
        </div>
        <div>
          <label className="label">의료 이력</label>
          <textarea name="medical" defaultValue={data.medical || ''} className="input" rows={3} />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            취소
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
