'use client';

import { useRouter } from 'next/navigation';
import DobInput from '@/components/ui/DobInput';
import { useEffect, useState } from 'react';
import { BRANCHES } from '@/lib/branches';

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [trainers, setTrainers] = useState<string[]>([]);

  // 기존 회원들의 담당 트레이너 목록 → 자동완성
  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((list: Array<{ trainer?: string | null }>) => {
        const names = Array.from(
          new Set(list.map((c) => c.trainer).filter(Boolean) as string[])
        ).sort();
        setTrainers(names);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
      experience: fd.get('experience') || null,
      goal: fd.get('goal') || null,
      medical: fd.get('medical') || null,
    };
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const c = await res.json();
      router.push(`/clients/${c.id}`);
    } else {
      alert('등록 실패');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-slate-900 mb-1">새 회원님 등록</h2>
      <p className="text-sm text-slate-600 mb-6">Client 정보를 입력하세요. 이후 체력평가를 추가할 수 있습니다.</p>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">이름 Name *</label>
            <input name="name" required className="input" />
          </div>
          <div>
            <label className="label">성별 Sex *</label>
            <select name="sex" required className="input">
              <option value="">선택</option>
              <option value="M">남성 Male</option>
              <option value="F">여성 Female</option>
            </select>
          </div>
          <div>
            <label className="label">생년월일 DOB</label>
            <DobInput />
          </div>
          <div>
            <label className="label">지점 Branch</label>
            <select name="branch" className="input">
              <option value="">미지정</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">담당 트레이너 Trainer</label>
            <input name="trainer" className="input" list="trainer-list" placeholder="트레이너 이름" />
            <datalist id="trainer-list">
              {trainers.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label">직업 Occupation</label>
            <input name="occupation" className="input" placeholder="예: 사무직, 좌식" />
          </div>
          <div>
            <label className="label">신장 Height (cm)</label>
            <input name="height" type="number" step="0.1" className="input" />
          </div>
          <div>
            <label className="label">체중 Weight (kg)</label>
            <input name="weight" type="number" step="0.1" className="input" />
          </div>
          <div>
            <label className="label">운동경력 Experience</label>
            <select name="experience" className="input">
              <option value="none">없음</option>
              <option value="beginner">초급 &lt;6개월</option>
              <option value="intermediate">중급 6개월-2년</option>
              <option value="advanced">고급 2년+</option>
            </select>
          </div>
          <div>
            <label className="label">운동 목적 Goal</label>
            <select name="goal" className="input">
              <option value="health">일반 건강 General Health</option>
              <option value="weight">체중 관리 Weight Management</option>
              <option value="strength">근력/근비대 Strength/Hypertrophy</option>
              <option value="performance">경기력 Performance</option>
              <option value="rehab">재활 Rehabilitation</option>
            </select>
          </div>
          <div>
            <label className="label">흡연 Smoking</label>
            <select name="smoking" className="input">
              <option value="no">비흡연</option>
              <option value="ex">과거 흡연</option>
              <option value="yes">현재 흡연</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">의료 이력 · 복용약물 · 통증/손상 부위</label>
          <textarea name="medical" className="input" rows={3} placeholder="고혈압, 당뇨, 심질환, 근골격계 손상 병력, 수술력, 복용 중인 약물 등" />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            취소
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '저장 중...' : '등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
