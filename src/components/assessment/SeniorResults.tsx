// 시니어 평가 결과 표시 — 입력 탭(실시간)과 결과 페이지(서버 렌더)에서 같이 쓴다. 훅 없음.
import type { Sex } from '@/lib/types';
import {
  SFT_ITEMS,
  SFT_GUIDE,
  sftResults,
  sftAgeLabel,
  sarcopenia,
  type SeniorInput,
  type SftResult,
  type SarcoResult,
  type SarcoCheck,
} from '@/lib/senior';
import { pillClass } from './classification';

const f1 = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

// 정상 범위 막대 — 회색 띠 = 같은 성별·연령대 중간 50%, 검은 점 = 회원 값
export function RangeBar({ r, unit }: { r: SftResult; unit: string }) {
  const [lo, hi] = r.range; // upGo는 [빠른, 느린] → 낮을수록 좋음
  const span = Math.max(hi - lo, 1e-6);
  const min = Math.min(lo - span * 0.6, r.value);
  const max = Math.max(hi + span * 0.6, r.value);
  const pos = (v: number) => ((v - min) / (max - min)) * 100;
  const lowerBetter = r.key === 'upGo';
  return (
    <div className="mt-2" aria-label="정상 범위 대비 위치">
      <div className="relative h-3 rounded-full" style={{ background: '#f0f0f0' }}>
        <div
          className="absolute top-0 h-3 rounded-full"
          style={{ left: `${pos(lo)}%`, width: `${pos(hi) - pos(lo)}%`, background: '#cfcfcf' }}
        />
        <div
          className="absolute -top-1 h-5 w-5 rounded-full"
          style={{ left: `calc(${pos(r.value)}% - 10px)`, background: r.risk ? '#b42318' : '#111', border: '2px solid #fff', boxShadow: '0 0 0 1px #111' }}
        />
      </div>
      <div className="flex justify-between text-[11px] mt-1" style={{ color: '#8a8a8a' }}>
        <span>{lowerBetter ? '빠름(좋음) ←' : '← 낮음'}</span>
        <span>
          정상 범위 {f1(lo)}~{f1(hi)}
          {unit}
        </span>
        <span>{lowerBetter ? '→ 느림' : '높음(좋음) →'}</span>
      </div>
    </div>
  );
}

export function SftResultCard({ r, age }: { r: SftResult; age: number }) {
  const item = SFT_ITEMS.find((i) => i.key === r.key)!;
  return (
    <div className="p-3 rounded" style={{ background: '#fafafa', border: r.risk ? '1.5px solid #b42318' : '1px solid #d6d6d6' }}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div>
          <div className="text-xs" style={{ color: '#6e6e6e' }}>
            {item.label} · {item.what}
          </div>
          <div className="text-xl font-bold" style={{ color: '#111' }}>
            {f1(r.value)} {item.unit}
          </div>
        </div>
        <span className={pillClass(r.classification)}>{r.label}</span>
      </div>
      <RangeBar r={r} unit={item.unit} />
      {r.risk && (
        <div className="text-xs mt-1.5" style={{ color: '#b42318' }}>
          ⚠ 주의 구간 — 혼자 생활하는 데 필요한 체력 기준값보다 낮음 (Rikli &amp; Jones 2001)
        </div>
      )}
      <div className="sr-only">{sftAgeLabel(age)}</div>
    </div>
  );
}

export function SftResultList({ senior, age, sex }: { senior?: SeniorInput | null; age: number; sex: Sex }) {
  const rs = sftResults(senior, age, sex);
  if (rs.length === 0) return null;
  const weak = rs.filter((r) => r.classification === 'below' || r.classification === 'poor');
  const guides = Array.from(new Set(weak.map((r) => SFT_GUIDE[r.key])));
  return (
    <div>
      <div className="text-xs mb-2" style={{ color: '#6e6e6e' }}>
        비교 기준: 같은 성별 {sftAgeLabel(age)} 미국 노인 7,000여 명의 중간 50% (Rikli &amp; Jones)
        {age < 60 ? ' — 60세 미만이라 60–64세 기준으로 참고' : ''}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {rs.map((r) => (
          <SftResultCard key={r.key} r={r} age={age} />
        ))}
      </div>
      {guides.length > 0 && (
        <div className="guide-box mt-3">
          <div className="guide-title">💡 결과 기반 운동 방향 — 평균 이하 항목 {weak.length}개</div>
          <ul>
            {guides.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CheckRows({ title, rows }: { title: string; rows: SarcoCheck[] }) {
  const shown = rows.filter((r) => r.low !== null);
  return (
    <div>
      <div className="text-xs font-bold mb-1" style={{ color: '#111' }}>
        {title}
      </div>
      {shown.length === 0 ? (
        <div className="text-xs" style={{ color: '#9a9a9a' }}>
          미측정
        </div>
      ) : (
        <ul className="space-y-1">
          {shown.map((r) => (
            <li key={r.label} className="flex justify-between gap-2 text-xs">
              <span style={{ color: '#444' }}>
                {r.label} <span style={{ color: '#9a9a9a' }}>(기준 {r.cut})</span>
              </span>
              <span className="whitespace-nowrap font-semibold tabular-nums" style={{ color: r.low ? '#b42318' : '#111' }}>
                {r.value} {r.low ? '· 기준 밖' : '✓'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TONE: Record<SarcoResult['tone'], { border: string; chip: string; chipText: string }> = {
  none: { border: '1px dashed #c4c4c4', chip: '#f2f2f2', chipText: '#555' },
  ok: { border: '1px solid #d6d6d6', chip: '#f2f2f2', chipText: '#111' },
  watch: { border: '1.5px solid #8a8a8a', chip: '#e9e9e9', chipText: '#111' },
  warn: { border: '2px solid #111', chip: '#111', chipText: '#fff' },
  alert: { border: '2px solid #b42318', chip: '#b42318', chipText: '#fff' },
};

export function SarcoBox({ res }: { res: SarcoResult }) {
  const t = TONE[res.tone];
  return (
    <div className="rounded-lg p-4" style={{ border: t.border, background: '#fff' }}>
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: t.chip, color: t.chipText }}>
          근육 건강
        </span>
        <span className="text-lg font-bold" style={{ color: res.tone === 'alert' ? '#b42318' : '#111' }}>
          {res.title}
        </span>
      </div>
      <p className="text-sm mb-3" style={{ color: '#333' }}>
        {res.action}
      </p>
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-3 mb-3">
        <CheckRows title="① 선별 (종아리 둘레·설문)" rows={res.screen} />
        <CheckRows title="② 근력" rows={res.strength} />
        <CheckRows title="③ 신체 수행" rows={res.performance} />
        <CheckRows title="④ 근육량 (체성분 분석기)" rows={res.mass} />
      </div>
      {res.sppb.total == null && (res.sppb.balance != null || res.sppb.gait != null || res.sppb.chair != null) && (
        <div className="text-xs mb-2" style={{ color: '#6e6e6e' }}>
          SPPB 부분 점수: 균형 {res.sppb.balance ?? '-'} · 보행 {res.sppb.gait ?? '-'} · 의자 {res.sppb.chair ?? '-'} (세 가지 모두 입력하면 총점)
        </div>
      )}
      {res.awgs2025 && (
        <div className="text-xs px-3 py-2 rounded mb-2" style={{ background: '#f7f7f7', border: '1px dashed #c4c4c4', color: '#444' }}>
          참고 · {res.awgs2025}
          <span style={{ color: '#9a9a9a' }}> — 2025-11 개정된 아시아 기준값, 한국 지침에는 아직 반영 전</span>
        </div>
      )}
      <div className="text-[11px] leading-relaxed" style={{ color: '#8a8a8a' }}>
        기준값: {res.basis}. 이 결과는 측정값을 공개된 학회 기준값과 비교한 <b>체력 확인용이며 의학적 진단이 아닙니다</b>.
        기준값보다 낮은 항목이 있으면 의료기관 상담을 권합니다. 악력은 유압식·스프링식 값이 서로 달라 같은 기기로 다시 잽니다.
      </div>
    </div>
  );
}

// 결과 페이지용 묶음 — 시니어 체력 + 근감소증
export default function SeniorResults({
  senior,
  age,
  sex,
  heightCm,
  weightKg,
  gripR,
  gripL,
}: {
  senior?: SeniorInput | null;
  age: number;
  sex: Sex;
  heightCm?: number | null;
  weightKg?: number | null;
  gripR?: number | null;
  gripL?: number | null;
}) {
  const res = sarcopenia(senior, { sex, age, heightCm, weightKg, gripR, gripL });
  const hasSft = sftResults(senior, age, sex).length > 0;
  return (
    <div className="space-y-4">
      {hasSft && (
        <div>
          <div className="text-sm font-bold mb-2" style={{ color: '#111' }}>
            시니어 체력 (Senior Fitness Test)
          </div>
          <SftResultList senior={senior} age={age} sex={sex} />
        </div>
      )}
      {res.level !== 'none' && <SarcoBox res={res} />}
    </div>
  );
}
