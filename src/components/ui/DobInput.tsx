'use client';

import { useState } from 'react';

// 생년월일 직접 입력 — 숫자 8자리를 치면 자동으로 YYYY-MM-DD가 됨
// (트레이너 피드백: 달력 선택은 1900년대부터 여러 번 이동해야 해서 불편)
export default function DobInput({
  name = 'dob',
  defaultValue = '',
}: {
  name?: string;
  defaultValue?: string;
}) {
  const [v, setV] = useState(defaultValue);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    let out = digits;
    if (digits.length > 6) out = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
    else if (digits.length > 4) out = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    setV(out);
  }

  const complete = /^\d{4}-\d{2}-\d{2}$/.test(v);
  const yearOk = !complete || (+v.slice(0, 4) >= 1900 && +v.slice(0, 4) <= new Date().getFullYear());
  const dateOk = !complete || !Number.isNaN(new Date(`${v}T00:00:00`).getTime());

  return (
    <>
      <input
        name={name}
        value={v}
        onChange={onChange}
        inputMode="numeric"
        autoComplete="bday"
        placeholder="숫자 8자리 — 예) 19850315"
        // 비어 있거나 완성된 날짜만 제출 허용 (부분 입력으로 잘못된 날짜 저장 방지)
        pattern="\d{4}-\d{2}-\d{2}"
        title="생년월일 숫자 8자리를 입력하세요 (예: 19850315)"
        className="input"
      />
      {v.length > 0 && (!complete || !yearOk || !dateOk) && (
        <p className="text-xs mt-1" style={{ color: '#b42318' }}>
          {!complete
            ? '숫자 8자리를 모두 입력해 주세요 (예: 19850315)'
            : '올바른 날짜인지 확인해 주세요'}
        </p>
      )}
    </>
  );
}
