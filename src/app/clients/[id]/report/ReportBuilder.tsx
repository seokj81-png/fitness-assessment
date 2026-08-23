'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toPng } from 'html-to-image';
import { allVo2Estimates, calcFMS, classifyVO2max, breathScreen } from '@/lib/calculations';
import { buildFittProgram } from '@/lib/fitt';
import { printPage } from '@/lib/browser';
import type { Sex } from '@/lib/types';

// ══════════════════════════════════════════════════════
// 체력 평가 리포트 빌더 (P0-3) — 회원 전달용 1페이지
// 시트는 앱 모노크롬 리매핑의 영향을 받지 않도록 전부 인라인 스타일.
// 톤: 앱과 동일한 블랙&화이트 (회원 전달용 — 깔끔하게)
// ══════════════════════════════════════════════════════

export interface ReportAssessment {
  id: string;
  date: string;
  assessor: string | null;
  rhr: number | null;
  sbp: number | null;
  dbp: number | null;
  breathFrc: number | null;
  breathTlc: number | null;
  breathHiLo: string | null;
  breathQ: string | null;
  postureFlags: string | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  biaBf: number | null;
  biaSmm: number | null;
  rockportTime: number | null;
  rockportHr: number | null;
  run15Time: number | null;
  run5minDist: number | null;
  cooperDist: number | null;
  vo2max: number | null;
  gripR: number | null;
  gripL: number | null;
  bp1rm: number | null;
  sq1rm: number | null;
  dl1rm: number | null;
  ohp1rm: number | null;
  pc1rm: number | null;
  lp1rm: number | null;
  pushupReps: number | null;
  pullupReps: number | null;
  curlupReps: number | null;
  squatReps: number | null;
  plankFront: number | null;
  plankR: number | null;
  plankL: number | null;
  sorensen: number | null;
  ohsaFlags: string | null;
  balanceR: number | null;
  balanceL: number | null;
  fms: string | null;
  clearSh: string | null;
  clearExt: string | null;
  clearFlex: string | null;
}

interface ClientInfo {
  id: string;
  name: string;
  sex: 'M' | 'F';
  age: number | null;
  goal?: string | null;
  experience?: string | null;
  trainer: string | null;
  branch: string | null;
  weight: number | null;
}

// 팔레트 — 앱 전체와 동일한 블랙&화이트 모노크롬 (개선/악화 기능색만 예외)
const NAVY = '#111111'; // 헤더 밴드·표 헤더·강조 (변수명은 호환 유지)
const NAVY_SOFT = '#4a4a4a';
const PAPER = '#ffffff';
const WARM = '#f5f5f5'; // 섹션 배경 (라이트 그레이)
const INK = '#2b2b2b';
const MUTED = '#7a7a7a';
const LINE = '#e3e3e3';
const GREEN = '#1E7B45';
const RED = '#C03A2B';

const SHEET_W = 794; // A4 @96dpi

type Dir = 'up' | 'down' | 'neutral';

interface MetricDef {
  key: string;
  label: string;
  unit: string;
  dir: Dir;
  pp?: boolean; // 변화를 %p로 표기 (체지방률)
  get: (a: ReportAssessment) => number | null;
}

function round1(v: number | null): number | null {
  return v == null ? null : Math.round(v * 10) / 10;
}

function fmtN(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function fmsResultOf(a: ReportAssessment) {
  if (!a.fms) return null;
  try {
    const scores = JSON.parse(a.fms) as Record<string, number>;
    if (Object.keys(scores).length === 0) return null;
    return calcFMS(scores, {
      sh: (a.clearSh as 'neg' | 'pos') || 'neg',
      ext: (a.clearExt as 'neg' | 'pos') || 'neg',
      flex: (a.clearFlex as 'neg' | 'pos') || 'neg',
    });
  } catch {
    return null;
  }
}

function fmsTotal(a: ReportAssessment): number | null {
  const r = fmsResultOf(a);
  return r && r.tested > 0 ? r.total : null;
}

export default function ReportBuilder({
  client,
  assessments,
}: {
  client: ClientInfo;
  assessments: ReportAssessment[]; // date asc
}) {
  const n = assessments.length;
  const [baseId, setBaseId] = useState(assessments[0].id);
  const [targetId, setTargetId] = useState(assessments[n - 1].id);
  const [comment, setComment] = useState('');
  const [goals, setGoals] = useState('');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [includeProgram, setIncludeProgram] = useState(true);
  const [busy, setBusy] = useState(false);

  let base = assessments.find((a) => a.id === baseId) ?? assessments[0];
  let target = assessments.find((a) => a.id === targetId) ?? assessments[n - 1];
  // 회차를 반대로 골라도 항상 과거 → 최근 방향으로 비교 (변화 방향·색 반전 방지)
  if (new Date(base.date) > new Date(target.date)) {
    const t = base;
    base = target;
    target = t;
  }
  const single = n < 2 || base.id === target.id;

  // 다음 재평가 예정일 — 기본: 최근 평가 + 4주
  const defaultNext = useMemo(() => {
    const d = new Date(target.date);
    d.setDate(d.getDate() + 28);
    return d.toISOString().slice(0, 10);
  }, [target.date]);
  const [nextDate, setNextDate] = useState(defaultNext);
  useEffect(() => setNextDate(defaultNext), [defaultNext]);

  // VO2max — 결과 페이지와 동일하게 모든 추정치 중 최고값, 없으면 저장값
  const vo2Of = (a: ReportAssessment): number | null => {
    const best = allVo2Estimates({
      rockportTime: a.rockportTime,
      rockportHr: a.rockportHr,
      run15Time: a.run15Time,
      run5minDist: a.run5minDist,
      cooperDist: a.cooperDist,
      weightKg: a.weight ?? client.weight,
      age: client.age,
      sex: client.sex as Sex,
    }).reduce<number | null>((b, e) => (b == null || e.vo2 > b ? e.vo2 : b), null);
    return round1(best ?? a.vo2max);
  };

  const METRICS: MetricDef[] = useMemo(
    () => [
      { key: 'weight', label: '체중', unit: 'kg', dir: 'neutral', get: (a) => a.weight },
      { key: 'biaBf', label: '체지방률', unit: '%', dir: 'down', pp: true, get: (a) => a.biaBf },
      { key: 'biaSmm', label: '골격근량', unit: 'kg', dir: 'up', get: (a) => a.biaSmm },
      { key: 'vo2', label: '심폐지구력 VO₂max', unit: '', dir: 'up', get: vo2Of },
      {
        key: 'grip', label: '악력 (좌+우)', unit: 'kg', dir: 'up',
        get: (a) => (a.gripR != null && a.gripL != null ? a.gripR + a.gripL : null),
      },
      { key: 'bp1rm', label: '벤치프레스 1RM', unit: 'kg', dir: 'up', get: (a) => a.bp1rm },
      { key: 'sq1rm', label: '스쿼트 1RM', unit: 'kg', dir: 'up', get: (a) => a.sq1rm },
      { key: 'dl1rm', label: '데드리프트 1RM', unit: 'kg', dir: 'up', get: (a) => a.dl1rm },
      { key: 'ohp1rm', label: '오버헤드프레스 1RM', unit: 'kg', dir: 'up', get: (a) => a.ohp1rm },
      { key: 'pc1rm', label: '파워클린 1RM', unit: 'kg', dir: 'up', get: (a) => a.pc1rm },
      { key: 'lp1rm', label: '레그프레스 1RM', unit: 'kg', dir: 'up', get: (a) => a.lp1rm },
      { key: 'pushup', label: '푸시업', unit: '회', dir: 'up', get: (a) => a.pushupReps },
      { key: 'pullup', label: '풀업', unit: '회', dir: 'up', get: (a) => a.pullupReps },
      { key: 'squatReps', label: '스쿼트 지구력', unit: '회', dir: 'up', get: (a) => a.squatReps },
      { key: 'curlup', label: '컬업', unit: '회', dir: 'up', get: (a) => a.curlupReps },
      { key: 'plank', label: '전방 플랭크', unit: '초', dir: 'up', get: (a) => a.plankFront },
      { key: 'sorensen', label: 'Sorensen (요부 지구력)', unit: '초', dir: 'up', get: (a) => a.sorensen },
      {
        key: 'balance', label: '외발서기 (좌/우 낮은 쪽)', unit: '초', dir: 'up',
        get: (a) =>
          a.balanceR != null && a.balanceL != null
            ? Math.min(a.balanceR, a.balanceL)
            : a.balanceR ?? a.balanceL,
      },
      { key: 'fms', label: 'FMS 움직임 점수 (21점)', unit: '점', dir: 'up', get: fmsTotal },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client.age, client.sex, client.weight]
  );

  // 최근 회차에 값이 있는 행만 — 이전 회차에 없던 신규 측정은 "신규"로 표기
  const rows = useMemo(
    () =>
      METRICS.map((m) => ({ m, prev: round1(m.get(base)), cur: round1(m.get(target)) })).filter(
        (r) => r.cur != null
      ),
    [METRICS, base, target]
  );
  const visibleRows = rows.filter((r) => !excluded.has(r.m.key));

  // 변화 하이라이트 자동 문구 — 개선 항목 중 변화율 큰 순 2~3개 (체지방률 개선은 항상 우선)
  const highlights = useMemo(() => {
    if (single) return [];
    const cands = visibleRows
      .filter((r) => r.m.dir !== 'neutral' && r.prev != null && r.cur != null)
      .map((r) => {
        const d = (r.cur as number) - (r.prev as number);
        const pct = r.prev !== 0 ? (d / Math.abs(r.prev as number)) * 100 : null;
        const improved = r.m.dir === 'up' ? d > 0 : d < 0;
        return { r, d, pct, improved };
      })
      .filter((c) => c.improved && Math.abs(c.d) > 0.049);
    cands.sort((a, b) => Math.abs(b.pct ?? 0) - Math.abs(a.pct ?? 0));
    const bf = cands.find((c) => c.r.m.key === 'biaBf');
    const ordered = bf ? [bf, ...cands.filter((c) => c !== bf)] : cands;
    return ordered.slice(0, 3).map((c) => {
      const abs = Math.abs(c.d);
      if (c.r.m.pp)
        return { value: `${c.d > 0 ? '+' : '−'}${abs.toFixed(1)}%p`, text: `체지방률 ${abs.toFixed(1)}%p ${c.d < 0 ? '감소' : '증가'}` };
      if (c.r.m.key === 'vo2')
        return { value: `+${fmtN(abs)}`, text: `심폐지구력 VO₂max ${fmtN(abs)} 상승` };
      return {
        value: `${c.d > 0 ? '+' : '−'}${fmtN(abs)}${c.r.m.unit}`,
        text: `${c.r.m.label} ${fmtN(abs)}${c.r.m.unit} ${c.d > 0 ? '증가' : '감소'}`,
      };
    });
  }, [visibleRows, single]);

  const goalLines = goals.split('\n').map((s) => s.trim()).filter(Boolean);

  // ── FITT-VP 운동 프로그램 — 최근 회차 평가 결과 기반 자동 생성 ──
  const program = useMemo(() => {
    const fmsRes = fmsResultOf(target);
    let breathRed = false;
    try {
      const q = target.breathQ ? (JSON.parse(target.breathQ) as number[]) : undefined;
      const br = breathScreen({
        frc: target.breathFrc ?? undefined,
        tlc: target.breathTlc ?? undefined,
        q,
        hiLo: (target.breathHiLo ?? undefined) as Parameters<typeof breathScreen>[0]['hiLo'],
      });
      breathRed = br?.overall === 'red';
    } catch {
      /* 손상된 JSON — 호흡 판정 생략 */
    }
    let postureFlagKeys: string[] = [];
    try {
      postureFlagKeys = target.postureFlags
        ? (JSON.parse(target.postureFlags) as string[]).filter((k) => !k.includes(':'))
        : [];
    } catch {
      /* ignore */
    }
    let ohsaFlags: string[] = [];
    try {
      ohsaFlags = target.ohsaFlags ? (JSON.parse(target.ohsaFlags) as string[]) : [];
    } catch {
      /* ignore */
    }
    const vo2 = vo2Of(target);
    const vo2Level =
      vo2 != null && client.age != null
        ? classifyVO2max(vo2, client.age, client.sex as Sex)?.classification ?? null
        : null;
    const oneRm = (
      [
        ['bp', '벤치프레스', target.bp1rm],
        ['sq', '스쿼트', target.sq1rm],
        ['dl', '데드리프트', target.dl1rm],
        ['ohp', '오버헤드프레스', target.ohp1rm],
        ['lp', '레그프레스', target.lp1rm],
      ] as ['bp' | 'sq' | 'dl' | 'ohp' | 'lp', string, number | null][]
    )
      .filter((x): x is ['bp' | 'sq' | 'dl' | 'ohp' | 'lp', string, number] => x[2] != null)
      .map(([key, name, kg]) => ({ key, name, kg }));
    const balanceLowSec =
      target.balanceR != null && target.balanceL != null
        ? Math.min(target.balanceR, target.balanceL)
        : target.balanceR ?? target.balanceL;
    return buildFittProgram({
      age: client.age,
      sex: client.sex,
      goal: client.goal,
      experience: client.experience,
      rhr: target.rhr,
      sbp: target.sbp,
      dbp: target.dbp,
      vo2,
      vo2Level,
      oneRm,
      weightKg: target.weight ?? client.weight,
      gripSumKg: target.gripR != null && target.gripL != null ? target.gripR + target.gripL : null,
      pushupReps: target.pushupReps,
      curlupReps: target.curlupReps,
      squatEndReps: target.squatReps,
      pullupReps: target.pullupReps,
      plankFront: target.plankFront,
      plankR: target.plankR,
      plankL: target.plankL,
      sorensen: target.sorensen,
      fmsPerTest: fmsRes?.perTest ?? null,
      postureFlagKeys,
      ohsaFlags,
      fmsTested: (fmsRes?.tested ?? 0) > 0,
      // 14점 컷오프는 7개 검사 완료 시에만 유효 — 부분 합계로 허위 경고 방지
      fmsTotal: fmsRes && fmsRes.tested === 7 ? fmsRes.total : null,
      fmsZeros: fmsRes?.zeros,
      postureCount: postureFlagKeys.length,
      balanceLowSec,
      breathRed,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, client.age, client.sex, client.goal, client.experience, client.weight]);

  // ── 모바일 미리보기 축소 (시트는 794px 고정, 래퍼에 zoom) ──
  const outerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setScale(Math.min(1, el.clientWidth / SHEET_W))
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── 이미지 저장 (카톡 전송이 핵심 경로) ──
  async function saveImage() {
    const node = sheetRef.current;
    if (!node || busy) return;
    setBusy(true);
    try {
      // iOS Safari 캔버스 면적 한계(16.7MP) — 시트가 길어지면 배율을 자동 하향 (무음 빈 이미지 방지)
      const area = node.offsetWidth * node.offsetHeight;
      const pixelRatio = Math.min(3, Math.sqrt(16_000_000 / area));
      const opts = { pixelRatio, backgroundColor: '#ffffff', cacheBust: true };
      // iOS Safari에서 첫 렌더에 이미지가 빠지는 알려진 문제 — 한 번 워밍업 후 재렌더
      await toPng(node, opts);
      const dataUrl = await toPng(node, opts);
      // 빈/투명 이미지 무음 실패 검증 — 실패 시 안내 경로로
      const ok = await new Promise<boolean>((resolve) => {
        const im = new Image();
        im.onload = () => resolve(im.naturalWidth > 100 && im.naturalHeight > 100);
        im.onerror = () => resolve(false);
        im.src = dataUrl;
      });
      if (!ok) throw new Error('empty image');
      const ymd = new Date(target.date).toISOString().slice(0, 10);
      const fileName = `PAFGYM_체력평가리포트_${client.name}_${ymd}.png`;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: 'image/png' });
      // 모바일: OS 공유 시트(카톡 바로 전송/사진 저장) → 미지원 시 파일 다운로드
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `${client.name}님 체력 평가 리포트` });
          return;
        } catch (e) {
          if ((e as DOMException)?.name === 'AbortError') return; // 사용자가 시트 닫음
        }
      }
      const aEl = document.createElement('a');
      aEl.href = dataUrl;
      aEl.download = fileName;
      aEl.click();
    } catch {
      alert('이미지 생성에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const fmtShort = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getFullYear()).slice(2)}.${d.getMonth() + 1}.${d.getDate()}`;
  };
  const roundNo = (id: string) => assessments.findIndex((a) => a.id === id) + 1;

  // 푸터 — 프로그램 포함 시엔 프로그램 섹션 안에 넣어 인쇄에서 함께 배치 (빈 3쪽 방지)
  const sheetFooter = (
    <div
      style={{
        marginTop: 13,
        paddingTop: 10,
        borderTop: `1px solid ${LINE}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, color: NAVY }}>
        📅 다음 재평가 예정:{' '}
        {nextDate
          ? new Date(`${nextDate}T00:00:00`).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : '트레이너와 상담 후 결정'}
      </div>
      <div style={{ fontSize: 10.5, color: MUTED, textAlign: 'right' }}>
        PAFGYM 체력 평가 시스템 · 발행일 {fmtDate(target.date)}
        <br />
        본 리포트는 운동 프로그램 참고용이며 의학적 진단이 아닙니다.
      </div>
    </div>
  );

  return (
    <div>
      {/* 리포트 페이지 전용 인쇄 규칙 — 시트만 A4 1장으로 (">"가 SSR에서 이스케이프되므로 innerHTML로) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          body > header { display: none !important; }
          main { padding: 0 !important; max-width: none !important; }
          .report-controls, .report-topbar { display: none !important; }
          .report-zoomwrap { zoom: 1 !important; }
          .report-sheet {
            width: 100% !important;
            box-shadow: none !important;
            /* 인쇄 대화상자 '배경 그래픽' 꺼짐이 기본 — 검정 헤더·표 헤더가 흰 글자만 남지 않게 강제 */
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            /* overflow:hidden 박스는 페이지 분할이 안 됨 — 인쇄에서만 해제 */
            overflow: visible !important;
            border-radius: 0 !important;
          }
          .fitt-section { break-before: page; page-break-before: always; padding-top: 4mm; }
          /* 프로그램 페이지가 꽉 차 푸터가 3쪽으로 밀리지 않게 인쇄에서만 표 압축 */
          .fitt-section table { font-size: 9.5px !important; }
          .fitt-section td, .fitt-section th { padding: 3px 6px !important; }
        }
      `,
        }}
      />

      {/* 상단 바 */}
      <div className="report-topbar flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <Link href={`/clients/${client.id}`} className="text-xs text-slate-600 hover:underline">
            ← {client.name} 상세
          </Link>
          <h2 className="text-2xl font-bold text-slate-100 mt-1">체력 평가 리포트 만들기</h2>
          <p className="text-sm text-slate-500 mt-1">
            회원님께 전달하는 1페이지 리포트 — 이미지 저장 후 카톡으로 보내거나 A4로 인쇄하세요.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={saveImage} disabled={busy} className="btn-primary">
            {busy ? '이미지 생성 중…' : '🖼️ 이미지 저장 (카톡 전송)'}
          </button>
          <button onClick={printPage} className="btn-secondary">
            🖨️ 인쇄/PDF
          </button>
        </div>
      </div>

      {/* 설정 */}
      <div className="card report-controls">
        <h3 className="font-bold text-slate-100 mb-3">리포트 설정</h3>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="label">이전 회차 (기준)</label>
            <select className="input" value={baseId} onChange={(e) => setBaseId(e.target.value)} disabled={n < 2}>
              {assessments.map((a, i) => (
                <option key={a.id} value={a.id}>
                  {i + 1}회차 — {fmtShort(a.date)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">최근 회차 (비교)</label>
            <select className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              {assessments.map((a, i) => (
                <option key={a.id} value={a.id}>
                  {i + 1}회차 — {fmtShort(a.date)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">다음 재평가 예정일</label>
            <input type="date" className="input" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">트레이너 코멘트</label>
            <textarea
              className="input"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="예) 4주 동안 하체 근력이 눈에 띄게 좋아졌습니다. 특히 스쿼트 자세가 안정되면서…"
            />
          </div>
          <div>
            <label className="label">다음 4주 목표 (줄바꿈 = 항목)</label>
            <textarea
              className="input"
              rows={4}
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder={'예)\n체지방률 1%p 감소 (주 2회 유산소)\n스쿼트 1RM 5kg 향상\n주 2회 수업 + 주 1회 자율 운동'}
            />
          </div>
        </div>

        <label className="flex items-center gap-1.5 text-sm text-slate-300 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={includeProgram}
            onChange={(e) => setIncludeProgram(e.target.checked)}
          />
          권장 운동 프로그램(FITT-VP) 포함 — 평가 결과 기반 자동 생성, 인쇄 시 2쪽
        </label>
        {rows.length > 0 && (
          <div>
            <label className="label">표시 항목 (체크 해제 시 리포트에서 제외)</label>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
              {rows.map((r) => (
                <label key={r.m.key} className="flex items-center gap-1.5 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!excluded.has(r.m.key)}
                    onChange={(e) => {
                      const next = new Set(excluded);
                      if (e.target.checked) next.delete(r.m.key);
                      else next.add(r.m.key);
                      setExcluded(next);
                    }}
                  />
                  {r.m.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══════════ 리포트 시트 (캡처·인쇄 대상) ══════════ */}
      <div ref={outerRef}>
        <div className="report-zoomwrap" style={{ zoom: scale }}>
          <div
            ref={sheetRef}
            className="report-sheet"
            style={{
              width: SHEET_W,
              margin: '0 auto',
              background: PAPER,
              color: INK,
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", Roboto, sans-serif',
              boxShadow: '0 2px 14px rgba(0,0,0,0.12)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            {/* 헤더 밴드 */}
            <div style={{ background: NAVY, color: '#fff', padding: '16px 30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/pafgym-logo.png"
                    alt="PAFGYM"
                    style={{ width: 42, height: 42, borderRadius: 8, background: '#fff', padding: 3 }}
                  />
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
                      체력 평가 리포트
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.75, letterSpacing: '0.06em' }}>
                      PAFGYM PHYSICAL ASSESSMENT REPORT
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{client.name} 님</div>
                  <div style={{ fontSize: 11.5, opacity: 0.8, marginTop: 2 }}>
                    {client.branch ? `${client.branch} · ` : ''}
                    담당 트레이너 {client.trainer || target.assessor || '-'}
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: 11,
                  paddingTop: 10,
                  borderTop: '1px solid rgba(255,255,255,0.25)',
                  fontSize: 12.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  {single
                    ? `평가일 ${fmtDate(target.date)} (${roundNo(target.id)}회차)`
                    : `기간 ${fmtDate(base.date)} (${roundNo(base.id)}회차) → ${fmtDate(target.date)} (${roundNo(target.id)}회차)`}
                </span>
                <span style={{ opacity: 0.8 }}>ACSM · NSCA · NASM · FMS 기준</span>
              </div>
            </div>

            <div style={{ padding: '16px 30px 18px' }}>
              {/* 변화 하이라이트 */}
              {highlights.length > 0 && (
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  {highlights.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        background: WARM,
                        border: `1px solid ${LINE}`,
                        borderRadius: 10,
                        padding: '10px 12px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 21, fontWeight: 800, color: NAVY }}>{h.value}</div>
                      <div style={{ fontSize: 11.5, color: MUTED, marginTop: 3 }}>{h.text}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Before → After 표 */}
              <div style={{ fontSize: 13.5, fontWeight: 800, color: NAVY, marginBottom: 8 }}>
                {single ? '이번 평가 결과' : 'Before → After 핵심 지표'}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: NAVY, color: '#fff' }}>
                    <th style={{ textAlign: 'left', padding: '5px 10px', fontWeight: 700, borderRadius: '6px 0 0 0' }}>
                      항목
                    </th>
                    {!single && (
                      <th style={{ textAlign: 'right', padding: '5px 10px', fontWeight: 700 }}>
                        이전 ({fmtShort(base.date)})
                      </th>
                    )}
                    <th style={{ textAlign: 'right', padding: '5px 10px', fontWeight: 700 }}>
                      {single ? `측정값 (${fmtShort(target.date)})` : `최근 (${fmtShort(target.date)})`}
                    </th>
                    {!single && (
                      <th style={{ textAlign: 'right', padding: '5px 10px', fontWeight: 700, borderRadius: '0 6px 0 0' }}>
                        변화
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r, i) => {
                    const d = !single && r.prev != null && r.cur != null ? r.cur - r.prev : null;
                    const pct =
                      d != null && r.prev ? (d / Math.abs(r.prev)) * 100 : null;
                    const improved = d != null && d !== 0 && (r.m.dir === 'up' ? d > 0 : r.m.dir === 'down' ? d < 0 : null);
                    const color =
                      d == null || d === 0 || r.m.dir === 'neutral'
                        ? MUTED
                        : improved
                          ? GREEN
                          : RED;
                    return (
                      <tr key={r.m.key} style={{ background: i % 2 ? WARM : '#fff' }}>
                        <td style={{ padding: '4px 10px', borderBottom: `1px solid ${LINE}`, fontWeight: 600 }}>
                          {r.m.label}
                        </td>
                        {!single && (
                          <td style={{ padding: '4px 10px', borderBottom: `1px solid ${LINE}`, textAlign: 'right', color: MUTED }}>
                            {r.prev == null ? '—' : `${fmtN(r.prev)}${r.m.unit && ` ${r.m.unit}`}`}
                          </td>
                        )}
                        <td style={{ padding: '4px 10px', borderBottom: `1px solid ${LINE}`, textAlign: 'right', fontWeight: 700 }}>
                          {fmtN(r.cur as number)}{r.m.unit && ` ${r.m.unit}`}
                        </td>
                        {!single && (
                          <td style={{ padding: '4px 10px', borderBottom: `1px solid ${LINE}`, textAlign: 'right', fontWeight: 700, color }}>
                            {r.prev == null
                              ? '신규'
                              : d == null || d === 0
                                ? '—'
                                : `${d > 0 ? '▲' : '▼'} ${fmtN(Math.abs(d))}${r.m.pp ? '%p' : r.m.unit}` +
                                  (pct != null && !r.m.pp ? ` (${d > 0 ? '+' : '−'}${Math.abs(pct).toFixed(0)}%)` : '')}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visibleRows.length === 0 && (
                <div style={{ padding: '18px 12px', textAlign: 'center', fontSize: 12.5, color: MUTED }}>
                  선택한 회차에 측정값이 없습니다. 다른 회차를 선택하거나 표시 항목을 확인해 주세요.
                </div>
              )}
              {!single && (
                <div style={{ fontSize: 10.5, color: MUTED, marginTop: 5 }}>
                  ▲/▼는 수치 방향, <span style={{ color: GREEN, fontWeight: 700 }}>초록 = 개선</span> ·{' '}
                  <span style={{ color: RED, fontWeight: 700 }}>빨강 = 관리 필요</span> (항목 성격 기준 · 체중은 목표에 따라 해석)
                </div>
              )}

              {/* 트레이너 코멘트 */}
              {comment.trim() && (
                <div
                  style={{
                    marginTop: 13,
                    background: WARM,
                    borderLeft: `4px solid ${NAVY}`,
                    borderRadius: '0 10px 10px 0',
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: NAVY, marginBottom: 5 }}>
                    💬 트레이너 코멘트
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                    {comment.trim()}
                  </div>
                </div>
              )}

              {/* 다음 4주 목표 */}
              {goalLines.length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    background: WARM,
                    borderLeft: `4px solid ${NAVY_SOFT}`,
                    borderRadius: '0 10px 10px 0',
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: NAVY, marginBottom: 5 }}>
                    🎯 다음 4주 목표
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
                    {goalLines.map((g, i) => (
                      <li key={i} style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 권장 운동 프로그램 — FITT-VP (평가 결과 기반 자동 생성) */}
              {includeProgram && (
                <div className="fitt-section" style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: NAVY, marginBottom: 2 }}>
                    권장 운동 프로그램 — FITT-VP
                  </div>
                  <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 6 }}>{program.basis}</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5, tableLayout: 'fixed' }}>
                    <thead>
                      <tr style={{ background: NAVY, color: '#fff' }}>
                        <th style={{ width: 44, padding: '5px 6px', textAlign: 'left', fontWeight: 700 }}>구분</th>
                        {program.domains.map((d) => (
                          <th key={d.domain} style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 700 }}>
                            {d.domain}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          ['빈도 F', 'F'],
                          ['강도 I', 'I'],
                          ['시간 T', 'T'],
                          ['형태 T', 'type'],
                          ['양 V', 'V'],
                          ['진행 P', 'P'],
                        ] as [string, keyof (typeof program.domains)[number]][]
                      ).map(([label, k], ri) => (
                        <tr key={k} style={{ background: ri % 2 ? WARM : '#fff', verticalAlign: 'top' }}>
                          <th
                            scope="row"
                            style={{
                              padding: '5px 6px',
                              borderBottom: `1px solid ${LINE}`,
                              fontSize: 10,
                              textAlign: 'left',
                              color: MUTED,
                              fontWeight: 700,
                            }}
                          >
                            {label}
                          </th>
                          {program.domains.map((d) => (
                            <td
                              key={d.domain}
                              style={{
                                padding: '5px 8px',
                                borderBottom: `1px solid ${LINE}`,
                                lineHeight: 1.5,
                                whiteSpace: 'pre-line', // 개별화 항목의 줄바꿈 표시
                              }}
                            >
                              {d[k]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {program.loads.length > 0 && (
                    <div
                      style={{
                        marginTop: 8,
                        background: WARM,
                        border: `1px solid ${LINE}`,
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 11,
                        lineHeight: 1.7,
                      }}
                    >
                      <b>이번 1RM 기준 권장 훈련 중량</b> — {program.loads.join(' · ')}
                    </div>
                  )}
                  {program.cautions.length > 0 && (
                    <div
                      style={{
                        marginTop: 8,
                        borderLeft: `4px solid ${RED}`,
                        background: '#faf4f4',
                        borderRadius: '0 8px 8px 0',
                        padding: '8px 12px',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 800, color: RED, marginBottom: 3 }}>⚠ 안전 유의</div>
                      <ul style={{ margin: 0, paddingLeft: 16, listStyle: 'disc' }}>
                        {program.cautions.map((c, idx) => (
                          <li key={idx} style={{ fontSize: 10.5, lineHeight: 1.6 }}>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {sheetFooter}
                </div>
              )}

              {/* 푸터 — 프로그램 미포함 시 여기(1쪽 끝), 포함 시 프로그램 섹션 안 */}
              {!includeProgram && sheetFooter}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
