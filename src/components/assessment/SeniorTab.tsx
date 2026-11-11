'use client';

// ⑧ 시니어 평가 탭 — 시니어 체력(SFT 7종) + 근육 건강 선별(근감소증 진료지침 기준값 비교)
import type { Sex } from '@/lib/types';
import {
  SFT_ITEMS,
  SARCF_QUESTIONS,
  sarcopenia,
  sftResults,
  sftAgeLabel,
  type SeniorInput,
} from '@/lib/senior';
import { SftResultCard, SarcoBox } from './SeniorResults';

function NumIn({
  label,
  value,
  onChange,
  step,
  placeholder,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        step={step || '1'}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="input"
      />
    </div>
  );
}

function Step({ no, title, children }: { no: string; title: string; children: React.ReactNode }) {
  return (
    <div className="pt-4 mt-4" style={{ borderTop: '1px solid #ececec' }}>
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-flex items-center justify-center rounded-full text-xs font-bold"
          style={{ background: '#2c2c2c', color: '#fff', width: 22, height: 22 }}
        >
          {no}
        </span>
        <span className="font-bold text-sm" style={{ color: '#2c2c2c' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

export default function SeniorTab({
  senior,
  onChange,
  age,
  sex,
  heightCm,
  weightKg,
  gripR,
  gripL,
  onGrip,
}: {
  senior: SeniorInput;
  onChange: (patch: Partial<SeniorInput>) => void;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  gripR?: number;
  gripL?: number;
  onGrip: (key: 'gripR' | 'gripL', v: number | undefined) => void;
}) {
  const s = senior;
  const sft = sftResults(s, age, sex);
  const res = sarcopenia(s, { sex, age, heightCm, weightKg, gripR, gripL });
  const male = sex === 'M';

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">시니어 평가</h2>
      <p className="text-sm text-slate-500 mb-4">
        60세 이상 회원의 일상 기능 체력과 근육 건강을 봅니다. 필요한 것만 측정하고 나머지는 비워 두세요.
      </p>

      {age > 0 && age < 60 && (
        <div className="mb-4 text-sm px-4 py-3 rounded-xl" style={{ background: '#f7f7f7', border: '1.5px solid #8a8a8a', color: '#333' }}>
          ℹ️ 이 회원은 <b>{age}세</b>입니다. 시니어 체력 기준은 60세 이상, 근감소증 기준은 50세 이상(한국 지침은 65세 이상)
          대상이라 판정은 참고용으로만 보세요.
        </div>
      )}

      <div className="mb-4 text-sm px-4 py-3 rounded-xl" style={{ background: '#fff', border: '1.5px solid #b42318', color: '#333' }}>
        <b style={{ color: '#b42318' }}>안전 먼저</b> — ① 기본 탭 PAR-Q+에서 &lsquo;예&rsquo;가 있거나 안정시 혈압이 160/100 mmHg를
        넘으면 의사 확인 전에는 하지 않습니다. 측정 중 가슴 통증·어지럼·심한 숨참이 있으면 바로 멈추고, 걷기·일어서기 검사는
        옆에 붙어 서서 봅니다.
      </div>

      {/* ── A. 시니어 체력 ── */}
      <div className="card">
        <h3 className="font-bold mb-1">
          A. 시니어 체력 검사 <span className="guideline-tag tag-acsm">Senior Fitness Test</span>
        </h3>
        <p className="text-xs text-slate-500 mb-1">
          Rikli &amp; Jones · 7종 · 준비물: 등받이 의자(좌석 높이 약 43cm, 벽에 붙임)·덤벨(여 2.3kg·남 3.6kg)·줄자·스톱워치·콘.
          순서: 의자 일어서기 → 팔 굽히기 → (2분 제자리 걷기) → 의자 앞으로 굽히기 → 등 뒤 손 닿기 → 2.44m 일어나 걷기 → 6분 걷기.
        </p>
        <p className="text-xs mb-3" style={{ color: '#6e6e6e' }}>
          비교 기준: 같은 성별 <b>{sftAgeLabel(age)}</b>의 중간 50%(정상 범위)
          {age > 0 && age < 60 ? ' — 60세 미만이라 60–64세 기준' : ''}
        </p>
        <div className="space-y-4">
          {SFT_ITEMS.map((it) => {
            const r = sft.find((x) => x.key === it.key);
            return (
              <div key={it.key} className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-3 items-start">
                <div>
                  <NumIn
                    label={`${it.label} (${it.unit}) — ${it.what}`}
                    value={s[it.key] as number | undefined}
                    onChange={(v) => onChange({ [it.key]: v } as Partial<SeniorInput>)}
                    step={it.step}
                  />
                  <p className="text-[11px] mt-1 leading-snug" style={{ color: '#8a8a8a' }}>
                    {it.how}
                  </p>
                </div>
                <div>{r ? <SftResultCard r={r} age={age} /> : <div className="text-xs mt-7" style={{ color: '#bdbdbd' }}>입력하면 정상 범위와 비교합니다</div>}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── B. 근감소증 선별 ── */}
      <div className="card">
        <h3 className="font-bold mb-1">
          B. 근육 건강 선별 <span className="guideline-tag tag-nsca">근감소증 진료지침 기준값</span>
        </h3>
        <p className="text-xs text-slate-500">
          근감소증 진료지침(대한근감소증학회 등 2023)의 순서대로: 선별 → 근력 → 신체 수행 → 근육량. 결과는 맨 아래에 자동으로
          나옵니다. <b>질병 판정이 아니라 학회 기준값과의 비교입니다.</b> 회원에게는 &lsquo;근감소증&rsquo;이라는 병명 대신
          &lsquo;기준값보다 낮게 측정됨, 의료기관 상담 권유&rsquo;로 안내합니다(복지부 비의료 건강관리서비스 가이드라인).
        </p>

        <Step no="1" title="선별 — 종아리 둘레 · SARC-F 설문">
          <div className="grid md:grid-cols-[200px_1fr] gap-4">
            <div>
              <NumIn label="종아리 둘레 (cm)" value={s.calf} onChange={(v) => onChange({ calf: v })} step="0.1" />
              <p className="text-[11px] mt-1 leading-snug" style={{ color: '#8a8a8a' }}>
                서서 발을 어깨너비로, 늘어나지 않는 줄자로 가장 굵은 곳을 살을 누르지 않게. 양쪽 재서 큰 값. 기준 {male ? '남 34' : '여 33'}cm 미만
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold" style={{ color: '#5a5a5a' }}>
                SARC-F — 회원에게 그대로 읽어 주세요 (4점 이상이면 기준값 밖)
              </div>
              {SARCF_QUESTIONS.map((q, i) => (
                <div key={i} className="rounded p-2.5" style={{ border: '1px solid #e3e3e3' }}>
                  <div className="text-sm mb-1.5">
                    {i + 1}. {q.q}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {q.opts.map((o, v) => {
                      const on = s.sarcF?.[i] === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            const arr = [...(s.sarcF ?? [null, null, null, null, null])];
                            arr[i] = on ? null : v;
                            onChange({ sarcF: arr });
                          }}
                          className="px-2.5 py-1.5 text-xs rounded border"
                          style={on ? { background: '#2c2c2c', color: '#fff', borderColor: '#2c2c2c' } : { background: '#fff', color: '#333', borderColor: '#cfcfcf' }}
                        >
                          {v}점 · {o}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Step>

        <Step no="2" title="근력 — 악력">
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <NumIn label="우측 (kg)" value={gripR} onChange={(v) => onGrip('gripR', v)} step="0.1" />
            <NumIn label="좌측 (kg)" value={gripL} onChange={(v) => onGrip('gripL', v)} step="0.1" />
          </div>
          <p className="text-[11px] mt-1 leading-snug" style={{ color: '#8a8a8a' }}>
            ⑥ 근력 탭의 악력과 같은 칸입니다(한쪽에 적으면 양쪽에 보임). 손마다 2회 이상, 3~5초 힘껏 쥐고 <b>가장 높은 값</b>.
            유압식은 앉아서 팔꿈치 90°, 스프링식은 서서 팔을 편 자세. 판정은 좌우 중 큰 값 — 기준 {male ? '남 28' : '여 18'}kg 미만.
          </p>
        </Step>

        <Step no="3" title="신체 수행 — 보행 속도 · 5회 의자 일어서기 · 균형(SPPB) · TUG">
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <label className="label">보행 거리</label>
              <div className="flex gap-1">
                {[4, 6].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onChange({ gaitDist: d })}
                    className="flex-1 py-2 text-sm rounded border"
                    style={(s.gaitDist || 4) === d ? { background: '#2c2c2c', color: '#fff', borderColor: '#2c2c2c' } : { background: '#fff', color: '#333', borderColor: '#cfcfcf' }}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>
            <NumIn label="보행 시간 (초)" value={s.gaitTime} onChange={(v) => onChange({ gaitTime: v })} step="0.01" />
            <div>
              <NumIn label="5회 의자 일어서기 (초)" value={s.chair5} onChange={(v) => onChange({ chair5: v, chair5Fail: v != null ? false : s.chair5Fail })} step="0.01" />
              <label className="flex items-center gap-1.5 text-xs mt-1" style={{ color: '#5a5a5a' }}>
                <input type="checkbox" checked={!!s.chair5Fail} onChange={(e) => onChange({ chair5Fail: e.target.checked, chair5: e.target.checked ? undefined : s.chair5 })} />
                팔 없이 못 일어남
              </label>
            </div>
            <NumIn label="TUG 3m (초, 선택)" value={s.tug} onChange={(v) => onChange({ tug: v })} step="0.01" />
          </div>
          <p className="text-[11px] mt-1 leading-snug" style={{ color: '#8a8a8a' }}>
            보행: 앞뒤 1m씩 가속·감속 구간을 두고 그 사이 4m(또는 6m)를 <b>평소 걸음</b>으로, 2회 중 빠른 값 — 기준 1.0 m/s 미만.
            5회 의자: 팔을 가슴에 X자, 다섯 번째 일어선 순간 정지, 기준 12초 이상. TUG: 3m 표시를 돌아와 앉기까지, 기준 12초 이상(한국 지침).
          </p>
          <div className="mt-3">
            <div className="text-xs font-semibold mb-1" style={{ color: '#5a5a5a' }}>
              SPPB 균형 — 각 자세를 버틴 시간(초, 최대 10). 앞 자세를 10초 못 버티면 거기서 멈추고 뒤는 비워 둡니다
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-xl">
              <NumIn label="① 두 발 나란히" value={s.balSide} onChange={(v) => onChange({ balSide: v })} step="0.1" />
              <NumIn label="② 반일렬" value={s.balSemi} onChange={(v) => onChange({ balSemi: v })} step="0.1" />
              <NumIn label="③ 일렬" value={s.balTandem} onChange={(v) => onChange({ balTandem: v })} step="0.1" />
            </div>
            <p className="text-[11px] mt-1 leading-snug" style={{ color: '#8a8a8a' }}>
              SPPB 총점(0~12) = 균형 + 보행(4m 환산) + 5회 의자 점수. 9점 이하면 신체 수행 낮음.
              {res.sppb.total != null && (
                <b style={{ color: '#2c2c2c' }}>
                  {' '}
                  현재 {res.sppb.total}점 (균형 {res.sppb.balance} · 보행 {res.sppb.gait} · 의자 {res.sppb.chair})
                </b>
              )}
            </p>
          </div>
        </Step>

        <Step no="4" title="근육량 — 체성분 분석기 (선택)">
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <NumIn label="사지 근육량 ASM (kg)" value={s.asm} onChange={(v) => onChange({ asm: v })} step="0.1" />
            <NumIn label="SMI (kg/m²)" value={s.smi} onChange={(v) => onChange({ smi: v })} step="0.01" />
          </div>
          <p className="text-[11px] mt-1 leading-snug" style={{ color: '#8a8a8a' }}>
            결과지에 SMI(골격근지수)가 있으면 SMI 칸에, 없으면 부위별 근육량의 팔 2개 + 다리 2개를 더해 ASM 칸에 적습니다(신장으로
            SMI 자동 계산). 기준 {male ? '남 7.0' : '여 5.7'} kg/m² 미만. 다주파수 기기 권장, 고령일수록 실제보다 낮게 나올 수 있음.
          </p>
        </Step>

        <div className="mt-5">
          <SarcoBox res={res} />
        </div>
      </div>
    </div>
  );
}
