import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { parseAssessment } from '@/lib/parse-assessment';
import { pillClass } from '@/components/assessment/classification';
import {
  bmi as calcBmi,
  classifyBMI_AsiaPacific,
  whr as calcWhr,
  classifyWHR,
  waistRisk,
  classifyBodyFat,
  classifyBP,
  classifyRHR,
  classifyVO2max,
  classifyStepHR,
  classifyBPRatio,
  classifySQRatio,
  classifyDLRatio,
  classifyOHPRatio,
  classifyPCRatio,
  classifyLPRatio,
  classifyGrip,
  classifyPushup,
  classifyYMCABP,
  classifyCurlup,
  classifySquatEndurance,
  classifyPullup,
  analyzePlank,
  parqResult,
  matchPostureSyndromes,
  calcFMS,
  buildRecommendations,
  rockportVO2max,
  run15MileVO2max,
  cooperVO2max,
  riegel2400FromRun5min,
  vo2maxFrom2400,
  allVo2Estimates,
  cardioComparison,
  trainingZones,
  vVO2max,
  fmtMinSec,
  estimate1RM_avg,
  worstClassification,
  strengthGuide,
  enduranceGuide,
  bodyCompGuide,
  breathScreen,
} from '@/lib/calculations';
import PrintSectionPicker from '@/components/ui/PrintSectionPicker';
import { MOVEMENT_COMPENSATIONS } from '@/lib/norms';
import StrengthChart, { type LiftBar } from '@/components/assessment/StrengthChart';
import FitnessScoreCard from '@/components/assessment/FitnessScoreCard';
import type { Sex } from '@/lib/types';
import DeleteAssessmentButton from './DeleteAssessmentButton';
import PrintButton from './PrintButton';
import ShareButton from './ShareButton';

export const dynamic = 'force-dynamic';

export default async function AssessmentViewPage({
  params,
}: {
  params: { id: string; aid: string };
}) {
  const [client, assessmentRaw] = await Promise.all([
    prisma.client.findUnique({ where: { id: params.id } }),
    prisma.assessment.findUnique({ where: { id: params.aid } }),
  ]);
  if (!client || !assessmentRaw || assessmentRaw.clientId !== client.id)
    notFound();

  // 직전 평가 (변화 비교용)
  const prevRaw = await prisma.assessment.findFirst({
    where: {
      clientId: client.id,
      id: { not: assessmentRaw.id },
      date: { lt: assessmentRaw.date },
    },
    orderBy: { date: 'desc' },
  });
  const p = prevRaw ? parseAssessment(prevRaw) : null;

  const a = parseAssessment(assessmentRaw);
  const sex: Sex = client.sex === 'F' ? 'F' : 'M';
  const age = client.dob
    ? new Date(a.date || Date.now()).getFullYear() -
      new Date(client.dob).getFullYear()
    : 30;

  // 측정 시점 신장·체중 우선(없으면 회원 프로필)
  const w = a.weight ?? client.weight ?? undefined;
  const h = a.height ?? client.height ?? undefined;

  // ===== Body composition =====
  const bmiVal =
    a.bmi ??
    (h && w ? calcBmi(h, w) : undefined);
  const bmiClass = bmiVal ? classifyBMI_AsiaPacific(bmiVal) : null;
  const whrVal = a.waist && a.hip ? calcWhr(a.waist, a.hip) : undefined;
  const whrClass = whrVal ? classifyWHR(whrVal, age, sex) : null;
  const waistNote = a.waist ? waistRisk(a.waist, sex) : null;
  const bfVal = a.biaBf ?? undefined;
  const bfClass = bfVal !== undefined ? classifyBodyFat(bfVal, sex) : null;

  // ===== Vitals =====
  const bpClass =
    a.sbp != null && a.dbp != null ? classifyBP(a.sbp, a.dbp) : null;
  const rhrClass = a.rhr != null ? classifyRHR(a.rhr) : null;

  // ===== Cardio =====
  // 입력된 모든 심폐 검사에서 VO2max를 추정 — 최고 기록이 최종 분류.
  // 원자료가 있으면 저장값보다 우선(과거 우선순위-체인으로 저장된 값 자동 교정).
  const vo2Estimates = allVo2Estimates({
    rockportTime: a.rockportTime,
    rockportHr: a.rockportHr,
    run15Time: a.run15Time,
    run5minDist: a.run5minDist,
    cooperDist: a.cooperDist,
    weightKg: w,
    age,
    sex,
  });
  const bestVo2 = vo2Estimates.length
    ? vo2Estimates.reduce((b, e) => (e.vo2 > b.vo2 ? e : b))
    : null;
  const vo2 = bestVo2?.vo2 ?? a.vo2max ?? undefined;
  const vo2Class = vo2 ? classifyVO2max(vo2, age, sex) : null;
  const cardioCmp = vo2 ? cardioComparison(vo2, age, sex) : null;
  const zones = vo2 ? trainingZones(vVO2max(vo2)) : null;
  const stepClass = a.stepHr ? classifyStepHR(a.stepHr, sex) : null;

  // ===== Strength =====
  const bpRatioClass =
    a.bp1rm != null && w
      ? classifyBPRatio(a.bp1rm, w, age, sex)
      : null;
  const sqRatioClass =
    a.sq1rm != null && w
      ? classifySQRatio(a.sq1rm, w, age, sex)
      : null;
  const dlRatioClass =
    a.dl1rm != null && w
      ? classifyDLRatio(a.dl1rm, w, age, sex)
      : null;
  const ohpRatioClass =
    a.ohp1rm != null && w
      ? classifyOHPRatio(a.ohp1rm, w, age, sex)
      : null;
  const pcRatioClass =
    a.pc1rm != null && w
      ? classifyPCRatio(a.pc1rm, w, age, sex)
      : null;
  const lpRatioClass =
    a.lp1rm != null && w
      ? classifyLPRatio(a.lp1rm, w, age, sex)
      : null;
  const sumGrip = (a.gripR || 0) + (a.gripL || 0);
  const gripClass =
    a.gripR != null && a.gripL != null
      ? classifyGrip(sumGrip, age, sex)
      : null;
  const est1rm =
    a.est1rmW && a.est1rmReps
      ? estimate1RM_avg(a.est1rmW, a.est1rmReps)
      : null;

  // ===== Endurance =====
  const pushupClass =
    a.pushupReps != null ? classifyPushup(a.pushupReps, age, sex) : null;
  const ymcaBpClass =
    a.ymcaBpReps != null ? classifyYMCABP(a.ymcaBpReps, age, sex) : null;
  const curlupClass =
    a.curlupReps != null ? classifyCurlup(a.curlupReps, age, sex) : null;
  const squatEndClass =
    a.squatReps != null ? classifySquatEndurance(a.squatReps, age, sex) : null;
  const pullupClass =
    a.pullupReps != null ? classifyPullup(a.pullupReps, age, sex) : null;
  const plank =
    a.plankFront != null
      ? analyzePlank(a.plankFront, a.plankR ?? undefined, a.plankL ?? undefined, a.sorensen ?? undefined, sex)
      : null;

  // ===== PAR-Q =====
  const parq = parqResult(a.parq || []);

  // ===== Movement / Posture =====
  const fmsResult = calcFMS(a.fms || {}, {
    sh: a.clearSh || 'neg',
    ext: a.clearExt || 'neg',
    flex: a.clearFlex || 'neg',
  });
  const syndromes = matchPostureSyndromes(a.postureFlags || []);

  // ===== Recommendations =====
  const recs = buildRecommendations({
    fmsTotal: fmsResult.total,
    fmsZeros: fmsResult.zeros,
    fmsAsym: fmsResult.asymmetries,
    postureFlags: a.postureFlags || [],
    vo2max: vo2Class?.value,
    bpRatio: bpRatioClass?.value,
    plankFront: plank?.frontClass.value,
    bmi: bmiVal,
    sex,
    goal: client.goal || undefined,
  });

  // ===== 결과 기반 영역별 운동 가이드 (약한 고리 기준) =====
  const bcWorst = worstClassification([
    bmiClass?.classification, bfClass?.classification, whrClass?.classification,
  ]);
  const bcGuide = bcWorst ? bodyCompGuide(bcWorst) : null;
  const stWorst = worstClassification([
    bpRatioClass?.classification, sqRatioClass?.classification, dlRatioClass?.classification,
    ohpRatioClass?.classification, pcRatioClass?.classification, lpRatioClass?.classification,
    gripClass?.classification,
  ]);
  const stGuide = stWorst ? strengthGuide(stWorst) : null;
  const enWorst = worstClassification([
    pushupClass?.classification, ymcaBpClass?.classification, curlupClass?.classification,
    squatEndClass?.classification, pullupClass?.classification, plank?.frontClass.classification,
  ]);
  const enGuide = enWorst ? enduranceGuide(enWorst) : null;

  // ===== 호흡 평가 (FMS Breathing Screen) =====
  const breath = breathScreen({
    frc: a.breathFrc,
    tlc: a.breathTlc,
    q: a.breathQ,
    hiLo: a.breathHiLo,
  });

  // ===== 안전 주의 (위험 요소 상단 배너) =====
  const fmsEntered = Object.keys(a.fms || {}).length > 0;
  const risks: Array<{ title: string; guide: string }> = [];
  if (breath?.overall === 'red') {
    risks.push({
      title: '호흡 스크린 Red — 호흡 기능부전 의심',
      guide: '고부하 저항운동 보류 · 호흡 재훈련 우선 후 재검 (FMS Breathing Screen)',
    });
  }
  if (!parq.passed) {
    risks.push({
      title: `PAR-Q+ '예' ${parq.yesCount}개`,
      guide: '운동 시작 전 의료인 평가·감독 필요 (ACSM 사전 선별 기준)',
    });
  }
  if (a.sbp != null && a.dbp != null && (a.sbp >= 130 || a.dbp >= 80)) {
    const crisis = a.sbp >= 180 || a.dbp >= 120;
    const stage2 = a.sbp >= 140 || a.dbp >= 90;
    risks.push({
      title: `혈압 ${a.sbp}/${a.dbp} mmHg — ${crisis ? '고혈압 위기' : stage2 ? '고혈압 2기' : '고혈압 1기/상승'}`,
      guide: crisis
        ? '운동 금지 — 즉시 의료 조치 필요'
        : '발살바(숨 참기) 동반 고중량 저항운동 금지 · 점진적 워밍업 · 측정 전 안정 확인' +
          (stage2 ? ' · 운동 전 의사 상담 권장' : ''),
    });
  }
  if (a.rhr != null && a.rhr > 100) {
    risks.push({
      title: `안정시 심박 ${a.rhr} bpm — 빈맥`,
      guide: '고강도 운동 보류 · 카페인/수면/스트레스 확인 후 재측정, 지속 시 의료 상담',
    });
  }
  if (fmsEntered && fmsResult.zeros > 0) {
    risks.push({
      title: `FMS 통증 동작 ${fmsResult.zeros}개 (0점)`,
      guide: '해당 움직임 패턴은 프로그램에서 즉시 제외 · 통증 평가 후 의료/운동처방 전문가 의뢰',
    });
  } else if (fmsEntered && fmsResult.total <= 14) {
    risks.push({
      title: `FMS 총점 ${fmsResult.total}/21 — 부상 위험 증가`,
      guide: '고강도·고중량 진입 전 저점 항목(0-1점) 교정운동 우선 (Kiesel et al. 2007)',
    });
  }

  // ===== 이전 평가 대비 변화 =====
  type Dir = 'up' | 'down' | 'neutral'; // up = 클수록 개선
  const deltas: Array<{ label: string; prev: number; cur: number; unit: string; dir: Dir }> = [];
  const addDelta = (
    label: string,
    prevV: number | null | undefined,
    curV: number | null | undefined,
    unit: string,
    dir: Dir
  ) => {
    if (prevV == null || curV == null) return;
    deltas.push({ label, prev: prevV, cur: curV, unit, dir });
  };
  if (p) {
    const pw = p.weight ?? client.weight ?? undefined;
    const prevVo2 =
      allVo2Estimates({
        rockportTime: p.rockportTime, rockportHr: p.rockportHr, run15Time: p.run15Time,
        run5minDist: p.run5minDist, cooperDist: p.cooperDist, weightKg: pw, age, sex,
      }).reduce<number | null>((b, e) => (b == null || e.vo2 > b ? e.vo2 : b), null) ?? p.vo2max ?? null;
    const prevFms = Object.keys(p.fms || {}).length > 0
      ? calcFMS(p.fms || {}, { sh: p.clearSh || 'neg', ext: p.clearExt || 'neg', flex: p.clearFlex || 'neg' }).total
      : null;
    const round1 = (v: number | null | undefined) => (v == null ? null : Math.round(v * 10) / 10);

    addDelta('체중', pw ?? null, w ?? null, 'kg', 'neutral');
    addDelta('체지방률', p.biaBf ?? null, a.biaBf ?? null, '%', 'down');
    addDelta('VO₂max', round1(prevVo2), round1(vo2 ?? null), '', 'up');
    addDelta(
      '악력 합산',
      p.gripR != null && p.gripL != null ? p.gripR + p.gripL : null,
      a.gripR != null && a.gripL != null ? a.gripR + a.gripL : null,
      'kg', 'up'
    );
    addDelta('벤치프레스 1RM', p.bp1rm ?? null, a.bp1rm ?? null, 'kg', 'up');
    addDelta('스쿼트 1RM', p.sq1rm ?? null, a.sq1rm ?? null, 'kg', 'up');
    addDelta('데드리프트 1RM', p.dl1rm ?? null, a.dl1rm ?? null, 'kg', 'up');
    addDelta('오버헤드프레스 1RM', p.ohp1rm ?? null, a.ohp1rm ?? null, 'kg', 'up');
    addDelta('파워클린 1RM', p.pc1rm ?? null, a.pc1rm ?? null, 'kg', 'up');
    addDelta('레그프레스 1RM', p.lp1rm ?? null, a.lp1rm ?? null, 'kg', 'up');
    addDelta('푸시업', p.pushupReps ?? null, a.pushupReps ?? null, '회', 'up');
    addDelta('풀업', p.pullupReps ?? null, a.pullupReps ?? null, '회', 'up');
    addDelta('컬업', p.curlupReps ?? null, a.curlupReps ?? null, '회', 'up');
    addDelta('스쿼트 지구력', p.squatReps ?? null, a.squatReps ?? null, '회', 'up');
    addDelta('전방 플랭크', p.plankFront ?? null, a.plankFront ?? null, '초', 'up');
    addDelta('Sorensen', p.sorensen ?? null, a.sorensen ?? null, '초', 'up');
    addDelta('FMS 총점', prevFms, fmsEntered ? fmsResult.total : null, '점', 'up');
  }

  // ===== 1RM 체중비 바 차트 데이터 =====
  const liftBars: LiftBar[] = w
    ? ([
        { name: '벤치 (상체)', v: a.bp1rm, cls: bpRatioClass?.classification },
        { name: 'OHP (상체)', v: a.ohp1rm, cls: ohpRatioClass?.classification },
        { name: '스쿼트 (하체)', v: a.sq1rm, cls: sqRatioClass?.classification },
        { name: '데드 (하체)', v: a.dl1rm, cls: dlRatioClass?.classification },
        { name: '레그프레스 (하체)', v: a.lp1rm, cls: lpRatioClass?.classification },
        { name: '파워클린 (전신)', v: a.pc1rm, cls: pcRatioClass?.classification },
      ] as Array<{ name: string; v: number | null | undefined; cls?: string }>)
        .filter((l) => l.v != null)
        .map((l) => ({ name: l.name, ratio: Math.round(((l.v as number) / w) * 100) / 100, cls: l.cls }))
    : [];

  // 요약 타일용 짧은 등급 라벨
  const KO_LEVEL: Record<string, string> = {
    excellent: '매우우수', good: '우수', average: '평균', below: '낮음', poor: '매우낮음',
  };
  const postureCount = (a.postureFlags || []).length;

  return (
    <div>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3 no-print">
        <div>
          <Link
            href={`/clients/${client.id}`}
            className="text-xs text-slate-600 hover:underline"
          >
            ← {client.name} 상세
          </Link>
          <h2 className="text-2xl font-bold text-slate-100 mt-1">
            체력평가 보고서 · {client.name}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            평가일:{' '}
            {new Date(a.date).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
            {assessmentRaw.assessor && ` · 측정자: ${assessmentRaw.assessor}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/clients/${client.id}/assessment/${a.id}/edit`}
            className="btn-secondary"
          >
            수정
          </Link>
          <PrintButton />
          <ShareButton title={`체력평가 보고서 · ${client.name}`} />
          <DeleteAssessmentButton
            clientId={client.id}
            assessmentId={a.id}
          />
        </div>
      </div>

      <PrintSectionPicker />

      {/* ⚠ 안전 주의 배너 — 위험 요소 최상단 우선 배치 */}
      {risks.length > 0 && (
        <div
          className="card"
          data-print-section="안전 주의"
          style={{ border: '2px solid #d92d20', background: '#fef3f2' }}
        >
          <h3 className="font-bold mb-2" style={{ color: '#b42318' }}>
            ⚠ 안전 주의 — 프로그램 설계 전 반드시 확인
          </h3>
          <ul className="space-y-2">
            {risks.map((r) => (
              <li key={r.title} className="text-sm" style={{ color: '#7a271a' }}>
                <b style={{ color: '#b42318' }}>{r.title}</b>
                <div className="text-xs mt-0.5" style={{ color: '#7a271a' }}>→ {r.guide}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hero summary */}
      <div className="text-white p-5 rounded-xl mb-5 print:rounded-none" style={{ background: '#111' }} data-print-section="회원 요약">
        <h3 className="font-bold mb-3">회원님 요약</h3>
        {/* 측정 흐름 순서: 기본정보 → ①생체지표 → ②신체조성 → ③자세 → ④움직임 → ⑤심폐 → ⑥근력 → ⑦근지구력 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <HeroItem label="이름" value={client.name} />
          <HeroItem
            label="성별/나이"
            value={`${sex === 'M' ? '남' : '여'} · ${age}세`}
          />
          <HeroItem
            label="측정일"
            value={new Date(a.date).toLocaleDateString('ko-KR')}
          />
          <HeroItem label="목적" value={goalLabel(client.goal)} />
          <HeroItem
            label="안정시 심박"
            value={a.rhr != null ? `${a.rhr} bpm` : '-'}
            href="#sec-vitals"
          />
          <HeroItem
            label="BMI"
            value={bmiVal ? bmiVal.toFixed(1) : '-'}
            href="#sec-body"
          />
          <HeroItem
            label="체지방률"
            value={bfVal !== undefined ? `${bfVal.toFixed(1)}%` : '-'}
            href="#sec-body"
          />
          <HeroItem
            label="자세"
            value={postureCount > 0 ? `이상 ${postureCount}건` : '양호'}
            href="#sec-posture"
          />
          <HeroItem
            label="FMS (움직임)"
            value={`${fmsResult.total}/21`}
            href="#sec-fms"
          />
          <HeroItem
            label="VO₂max (심폐)"
            value={vo2 ? vo2.toFixed(1) : '-'}
            href="#sec-cardio"
          />
          <HeroItem
            label="근력"
            value={stWorst ? KO_LEVEL[stWorst] : '-'}
            href="#sec-strength"
          />
          <HeroItem
            label="근지구력"
            value={enWorst ? KO_LEVEL[enWorst] : '-'}
            href="#sec-endurance"
          />
        </div>
      </div>

      {/* 미성년 회원 — 성인 규준 참고용 안내 (회원 전달용 보고서에도 포함) */}
      {age < 20 && (
        <div
          className="card"
          data-print-section="연령 기준 안내"
          style={{ border: '1.5px solid #8a8a8a', background: '#f7f7f7' }}
        >
          <div className="text-sm" style={{ color: '#333' }}>
            ℹ️ <b>{age <= 12 ? '어린이' : '청소년'} 회원 ({age}세)</b> — 본 보고서의 등급
            분류(매우우수~매우낮음)는 <b>성인(만 20세 이상) 규준</b> 기준입니다. 소아·청소년 전용
            기준이 아니므로 등급은 참고용이며, 이전 측정 대비 변화 추이를 중심으로 해석하세요.
          </div>
        </div>
      )}

      {/* 📈 이전 평가 대비 변화 */}
      {p && deltas.length > 0 && (
        <div className="card" data-print-section="변화 비교">
          <h3 className="font-bold mb-1">
            📈 이전 평가 대비 변화{' '}
            <span className="text-xs font-normal" style={{ color: '#8a8a8a' }}>
              {new Date(p.date).toLocaleDateString('ko-KR')} → {new Date(a.date).toLocaleDateString('ko-KR')}
            </span>
          </h3>
          <div className="grid md:grid-cols-2 gap-2 mt-2">
            {deltas.map((d) => (
              <DeltaRow key={d.label} d={d} />
            ))}
          </div>
        </div>
      )}

      {/* 체력요인 종합 (폼 ⑧종합 탭과 동일한 요약) */}
      <div className="mb-5" data-print-section="체력요인 종합">
        <FitnessScoreCard
          computed={{
            bmiClass,
            bodyFat: bfClass,
            whrClass,
            vo2max: vo2Class,
            rhrClass,
            bpClass,
            bpRatio: bpRatioClass,
            sqRatio: sqRatioClass,
            dlRatio: dlRatioClass,
            grip: gripClass,
            pushup: pushupClass,
            pullup: pullupClass,
            curlup: curlupClass,
            squatEnd: squatEndClass,
            plank,
            fmsResult,
          }}
          state={{
            biaBf: a.biaBf,
            sbp: a.sbp,
            dbp: a.dbp,
            weight: w,
            biaFm: a.biaFm,
            biaFfm: a.biaFfm,
            postureFlags: a.postureFlags,
            ohsaFlags: a.ohsaFlags,
            breathFrc: a.breathFrc,
            breathTlc: a.breathTlc,
            breathHiLo: a.breathHiLo,
            breathQ: a.breathQ,
          }}
        />
      </div>

      {/* PAR-Q */}
      <div className="card" data-print-section="PAR-Q+">
        <h3 className="font-bold mb-3">
          PAR-Q+ <span className="guideline-tag tag-acsm">ACSM</span>
        </h3>
        <div
          className="p-3 rounded"
          style={
            parq.passed
              ? { background: '#111', color: '#fff' }
              : { background: '#fff', border: '1.5px solid #111', color: '#111' }
          }
        >
          <div className="font-semibold">
            {parq.passed ? '✔ 운동 참여 안전' : '⚠ 주의 필요'}
          </div>
          <div className="text-sm">{parq.message}</div>
        </div>
      </div>

      {/* Vitals */}
      {(bpClass || rhrClass) && (
        <div className="card" data-print-section="생체지표" id="sec-vitals">
          <h3 className="font-bold mb-3">
            안정시 활력징후 <span className="guideline-tag tag-acsm">ACSM</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {bpClass && (
              <ResultRow
                label="혈압"
                result={bpClass}
                displayValue={`${a.sbp}/${a.dbp} mmHg`}
              />
            )}
            {rhrClass && (
              <ResultRow label="안정시 심박수" result={rhrClass} unit="bpm" />
            )}
          </div>
        </div>
      )}

      {/* Body composition */}
      <div className="card" data-print-section="신체조성" id="sec-body">
        <h3 className="font-bold mb-3">
          신체조성 <span className="guideline-tag tag-acsm">ACSM</span>
        </h3>
        <div className="grid md:grid-cols-2 gap-3">
          <ResultRow label="BMI (Asia-Pacific)" result={bmiClass} unit="kg/m²" />
          {a.waist != null && (
            <div className="text-sm text-slate-600 md:col-span-2">
              허리둘레 {a.waist} cm · 복부비만 위험도: {waistNote}
            </div>
          )}
          <ResultRow label="체지방률" result={bfClass} unit="%" />
          {a.biaFm != null && (
            <Fact label="체지방량 (BIA)" value={`${a.biaFm} kg`} />
          )}
          {a.biaFfm != null && (
            <Fact label="제지방량 (BIA)" value={`${a.biaFfm} kg`} />
          )}
          {a.biaBmr != null && (
            <Fact label="기초대사량 (BIA)" value={`${a.biaBmr} kcal`} />
          )}
        </div>
        {bcGuide && (
          <div className="guide-box">
            <div className="guide-title">
              💡 결과 기반 가이드 — {bcGuide.headline}{' '}
              <span style={{ color: '#8a8a8a', fontWeight: 500 }}>(기준 등급: {bcGuide.levelLabel})</span>
            </div>
            <ul>{bcGuide.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </div>
        )}
      </div>

      {/* Posture */}
      <div className="card" data-print-section="자세 평가" id="sec-posture">
        <h3 className="font-bold mb-3">
          자세 <span className="guideline-tag tag-nasm">NASM</span>
        </h3>
        {(a.postureFlags || []).length === 0 ? (
          <p className="text-sm text-slate-500">관찰된 자세 이상 소견 없음.</p>
        ) : (
          <>
            <p className="text-sm text-slate-600 mb-2">
              관찰된 체크포인트 이상: {(a.postureFlags || []).length}건
            </p>
            {syndromes.length > 0 && (
              <div className="space-y-3">
                {syndromes.map((s) => (
                  <div
                    key={s.name}
                    className="border-l-4 pl-3 py-1"
                    style={{ borderLeftColor: '#111' }}
                  >
                    <div className="font-semibold text-slate-100">
                      의심: {s.name}{' '}
                      <span className="text-xs text-slate-500">
                        (일치 {s.hits}건)
                      </span>
                    </div>
                    <div className="text-xs mt-1.5">
                      <b style={{ color: '#b42318' }}>과활성 (이완·스트레칭 대상):</b>{' '}
                      <MuscleChips text={s.overactive} tone="over" />
                    </div>
                    <div className="text-xs mt-1.5">
                      <b style={{ color: '#175cd3' }}>저활성 (활성화·강화 대상):</b>{' '}
                      <MuscleChips text={s.underactive} tone="under" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(a.ohsaFlags || []).length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold mb-2" style={{ color: '#111' }}>
                  동적 움직임 보상 — 교정 대상 근육 (NASM CES)
                </div>
                <div className="space-y-3">
                  {MOVEMENT_COMPENSATIONS.filter((c) =>
                    (a.ohsaFlags || []).includes(c.key)
                  ).map((c) => (
                    <div key={c.key} className="border-l-4 pl-3 py-1" style={{ borderLeftColor: '#111' }}>
                      <div className="font-semibold text-sm text-slate-100">{c.label}</div>
                      <div className="text-xs mt-1" style={{ color: '#b42318' }}>
                        <b>과활성(이완):</b> {c.overactive}
                      </div>
                      <div className="text-xs" style={{ color: '#175cd3' }}>
                        <b>저활성(강화):</b> {c.underactive}
                      </div>
                    </div>
                  ))}
                </div>
                {(a.ohsaFlags || []).some(
                  (k) => !MOVEMENT_COMPENSATIONS.find((c) => c.key === k)
                ) && (
                  <p className="text-xs text-slate-500 mt-2">
                    기타 보상 패턴 {(a.ohsaFlags || []).filter((k) => !MOVEMENT_COMPENSATIONS.find((c) => c.key === k)).length}건 관찰
                    (푸시/풀 등)
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* 질적 평가 — 체형 스케치 & 메모 */}
        {a.postureDrawing && (
          <div className="mt-4">
            <div className="text-sm font-semibold mb-2" style={{ color: '#111' }}>체형 스케치 (질적 평가)</div>
            <div
              className="rounded-xl overflow-hidden"
              style={{ position: 'relative', aspectRatio: '1900 / 1076', border: '1px solid #e3e3e3', background: '#f5f5f5' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/body-posture.png" alt="신체 자세 그림" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.postureDrawing} alt="트레이너 스케치" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>
        )}
        {a.postureMemo && (
          <div className="mt-3 text-sm p-3 rounded" style={{ background: '#f2f2f2', border: '1px solid #e3e3e3', color: '#333', whiteSpace: 'pre-wrap' }}>
            <b style={{ color: '#111' }}>질적 평가 메모</b>
            <br />
            {a.postureMemo}
          </div>
        )}
      </div>

      {/* 호흡 평가 — FMS Breathing Screen */}
      {breath && (
        <div className="card" data-print-section="호흡 평가">
          <h3 className="font-bold mb-3">
            호흡 평가 <span className="guideline-tag tag-fms">FMS Breathing Screen</span>
          </h3>
          {breath.overall && (
            <div
              className="p-3 rounded-lg mb-3"
              style={
                breath.overall === 'green'
                  ? { background: '#edf7ee', border: '1.5px solid #a6d7ae' }
                  : breath.overall === 'yellow'
                  ? { background: '#fef7e6', border: '1.5px solid #f0d48a' }
                  : { background: '#fef3f2', border: '1.5px solid #f0b4ae' }
              }
            >
              <div
                className="font-bold text-sm"
                style={{ color: breath.overall === 'green' ? '#067647' : breath.overall === 'yellow' ? '#b54708' : '#b42318' }}
              >
                {breath.overall === 'green' ? '🟢' : breath.overall === 'yellow' ? '🟡' : '🔴'} {breath.label}
              </div>
              <div className="text-xs mt-1" style={{ color: '#555' }}>{breath.message}</div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {a.breathFrc != null && (
              <Fact label="FRC 숨참기 — 생화학 Biochemical" value={`${a.breathFrc}초 · ${(breath.frc || '').toUpperCase()}`} />
            )}
            {a.breathTlc != null && (
              <Fact label="TLC 숨참기 — 생화학 Biochemical" value={`${a.breathTlc}초 · ${(breath.tlc || '').toUpperCase()}`} />
            )}
            {a.breathQ && a.breathQ.length > 0 && (
              <Fact label="호흡 설문 — 심리생리 Psychophysiological" value={`최고 ${Math.max(...a.breathQ)}점 · ${(breath.q || '').toUpperCase()}`} />
            )}
            {a.breathHiLo && (
              <Fact
                label="Hi-Lo 관찰 — 생역학 Biomechanical"
                value={
                  a.breathHiLo === 'diaph' ? '복식(횡격막) 우세 — 정상'
                  : a.breathHiLo === 'thoracic' ? '흉식 우세 — 기능부전 의심'
                  : '역설 호흡 — 기능부전'
                }
              />
            )}
          </div>
        </div>
      )}

      {/* Movement / FMS */}
      <div className="card" data-print-section="움직임 (FMS)" id="sec-fms">
        <h3 className="font-bold mb-3">
          움직임 (FMS 2.0) <span className="guideline-tag tag-fms">FMS</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center mb-3">
          <MetricBig label="총점" value={`${fmsResult.total}/21`} />
          <MetricBig
            label="최저점 0개"
            value={String(fmsResult.zeros)}
            warn={fmsResult.zeros > 0}
          />
          <MetricBig
            label="비대칭"
            value={String(fmsResult.asymmetries)}
            warn={fmsResult.asymmetries > 0}
          />
          <MetricBig
            label="위험 판정"
            value={fmsResult.total < 14 || fmsResult.zeros > 0 ? '부상 위험 ↑' : '통과'}
            warn={fmsResult.total < 14 || fmsResult.zeros > 0}
          />
        </div>
        <p className="text-xs text-slate-500">
          FMS 14점 미만 또는 0점이 있으면 통증 평가 후 교정 우선. Cook (2014).
        </p>
      </div>

      {/* Cardio */}
      {(vo2Class || stepClass) && (
        <div className="card" data-print-section="심폐지구력" id="sec-cardio">
          <h3 className="font-bold mb-3">
            심폐지구력 <span className="guideline-tag tag-acsm">ACSM</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {vo2Class && (
              <ResultRow label="VO₂max" result={vo2Class} unit="ml/kg/min" />
            )}
            {vo2Estimates.length > 1 && (
              <div className="md:col-span-2 text-sm space-y-1">
                <div className="text-xs text-slate-500">검사별 추정치 — 최고 기록이 최종 분류에 사용됨</div>
                {vo2Estimates.map((e) => (
                  <div
                    key={e.key}
                    className="flex justify-between items-center px-3 py-1.5 rounded"
                    style={
                      e.key === bestVo2?.key
                        ? { background: '#111', color: '#fff', fontWeight: 600 }
                        : { background: '#f2f2f2', color: '#555' }
                    }
                  >
                    <span>{e.key === bestVo2?.key ? '★ ' : ''}{e.label}</span>
                    <span className="tabular-nums">{e.vo2.toFixed(1)} ml/kg/min</span>
                  </div>
                ))}
              </div>
            )}
            {stepClass && (
              <ResultRow
                label="YMCA 스텝테스트 (회복 HR)"
                result={stepClass}
                unit="bpm"
              />
            )}
          </div>

          {cardioCmp && (
            <div className="mt-4">
              <h4 className="font-semibold text-sm mb-2">
                2.4km 등급별 속도·완주시간 비교 <span className="text-xs text-slate-400 font-normal">(동일 성별·나이 규준)</span>
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-700">
                      <th className="py-1.5 pr-3">등급</th>
                      <th className="py-1.5 pr-3">VO₂max</th>
                      <th className="py-1.5 pr-3">2.4km 완주시간</th>
                      <th className="py-1.5">평균속도</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardioCmp.grades.map((g) => (
                      <tr
                        key={g.classification}
                        className={`border-b border-slate-800 ${g.classification === cardioCmp.userClass ? 'bg-slate-200' : ''}`}
                      >
                        <td className="py-1.5 pr-3">
                          <span className={`pill ${pillClass(g.classification)}`}>{g.label}</span>
                        </td>
                        <td className="py-1.5 pr-3 tabular-nums">{g.vo2.toFixed(1)}</td>
                        <td className="py-1.5 pr-3 tabular-nums">{fmtMinSec(g.timeMin)}</td>
                        <td className="py-1.5 tabular-nums">{g.speedKmh.toFixed(1)} km/h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-1">각 등급 행은 해당 등급 <b>진입 기준</b>의 환산값입니다. 아래 ‘평균’은 동일 성별·나이의 중간 수준(≈50백분위)입니다.</p>
              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                <div className="bg-slate-800 border border-slate-700 rounded p-3 text-sm">
                  <div className="text-slate-400 text-xs mb-1">내 기록 (예측 2.4km)</div>
                  <div className="font-bold tabular-nums">{fmtMinSec(cardioCmp.userTimeMin)} · {cardioCmp.userSpeedKmh.toFixed(1)} km/h</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded p-3 text-sm">
                  <div className="text-slate-400 text-xs mb-1">동일 성별·나이 평균 (Average)</div>
                  <div className="font-bold tabular-nums">{fmtMinSec(cardioCmp.avgTimeMin)} · {cardioCmp.avgSpeedKmh.toFixed(1)} km/h</div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                내 평균속도 {cardioCmp.userSpeedKmh.toFixed(1)} km/h는 평균 {cardioCmp.avgSpeedKmh.toFixed(1)} km/h 대비{' '}
                {cardioCmp.userSpeedKmh >= cardioCmp.avgSpeedKmh ? (
                  <span className="text-slate-900 font-semibold">{(cardioCmp.userSpeedKmh - cardioCmp.avgSpeedKmh).toFixed(1)} km/h 빠름</span>
                ) : (
                  <span className="text-slate-900 font-semibold">{(cardioCmp.avgSpeedKmh - cardioCmp.userSpeedKmh).toFixed(1)} km/h 느림</span>
                )}
                {' · '}VO₂max는 동일 성별·나이 평균 대비{' '}
                <span
                  className="font-semibold"
                  style={{ color: cardioCmp.userVo2 >= cardioCmp.avgVo2 ? '#067647' : '#b42318' }}
                >
                  {cardioCmp.userVo2 >= cardioCmp.avgVo2 ? '+' : ''}
                  {(((cardioCmp.userVo2 - cardioCmp.avgVo2) / cardioCmp.avgVo2) * 100).toFixed(0)}%
                </span>
                .
              </p>
            </div>
          )}

          {zones && (
            <div className="mt-5">
              <h4 className="font-semibold text-sm mb-1">
                훈련강도 프로그램 추천 <span className="text-xs text-slate-400 font-normal">(vVO₂max {vVO2max(vo2!).toFixed(1)} km/h 기준)</span>
              </h4>
              <p className="text-xs text-slate-500 mb-2">최대유산소속도(vVO₂max)의 % 구간으로 목표 속도·운동시간을 제시합니다.</p>
              <div className="grid sm:grid-cols-3 gap-3">
                {zones.map((z) => (
                  <div key={z.key} className="bg-slate-800 border border-slate-700 rounded p-3">
                    <div className="font-bold text-sm">{z.name}</div>
                    <div className="text-xs text-slate-400 mb-2">{z.pctLabel}</div>
                    <div className="text-sm tabular-nums">
                      {z.speedHighKmh != null
                        ? `${z.speedLowKmh.toFixed(1)}–${z.speedHighKmh.toFixed(1)} km/h`
                        : `${z.speedLowKmh.toFixed(1)} km/h 이상`}
                    </div>
                    <div className="text-xs text-slate-400 tabular-nums mb-2">페이스 {z.paceHigh ? `${z.paceLow}–${z.paceHigh}` : z.paceLow}</div>
                    <div className="text-xs text-slate-700 font-medium">⏱ {z.durationLabel}</div>
                    <div className="text-xs text-slate-500 mt-1">{z.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Strength */}
      {(gripClass ||
        a.bp1rm != null ||
        a.sq1rm != null ||
        a.dl1rm != null ||
        a.ohp1rm != null ||
        a.pc1rm != null ||
        a.lp1rm != null ||
        est1rm != null) && (
        <div className="card" data-print-section="근력" id="sec-strength">
          <h3 className="font-bold mb-3">
            근력 <span className="guideline-tag tag-nsca">NSCA</span>
          </h3>
          <StrengthChart lifts={liftBars} />
          <div className="grid md:grid-cols-2 gap-3">
            {a.bp1rm != null && (
              bpRatioClass
                ? <ResultRow label="벤치프레스 1RM" result={bpRatioClass} displayValue={`${a.bp1rm} kg`} subLabel={w ? `× 체중비 ${(a.bp1rm / w).toFixed(2)}` : undefined} />
                : <Fact label="벤치프레스 1RM" value={`${a.bp1rm} kg`} />
            )}
            {a.sq1rm != null && (
              sqRatioClass
                ? <ResultRow label="스쿼트 1RM" result={sqRatioClass} displayValue={`${a.sq1rm} kg`} subLabel={w ? `× 체중비 ${(a.sq1rm / w).toFixed(2)}` : undefined} />
                : <Fact label="스쿼트 1RM" value={`${a.sq1rm} kg`} />
            )}
            {a.dl1rm != null && (
              dlRatioClass
                ? <ResultRow label="데드리프트 1RM" result={dlRatioClass} displayValue={`${a.dl1rm} kg`} subLabel={w ? `× 체중비 ${(a.dl1rm / w).toFixed(2)}` : undefined} />
                : <Fact label="데드리프트 1RM" value={`${a.dl1rm} kg`} />
            )}
            {a.ohp1rm != null && (
              ohpRatioClass
                ? <ResultRow label="오버헤드프레스 1RM" result={ohpRatioClass} displayValue={`${a.ohp1rm} kg`} subLabel={w ? `× 체중비 ${(a.ohp1rm / w).toFixed(2)}` : undefined} />
                : <Fact label="오버헤드프레스 1RM" value={`${a.ohp1rm} kg`} />
            )}
            {a.pc1rm != null && (
              pcRatioClass
                ? <ResultRow label="파워클린 1RM" result={pcRatioClass} displayValue={`${a.pc1rm} kg`} subLabel={w ? `× 체중비 ${(a.pc1rm / w).toFixed(2)}` : undefined} />
                : <Fact label="파워클린 1RM" value={`${a.pc1rm} kg`} />
            )}
            {a.lp1rm != null && (
              lpRatioClass
                ? <ResultRow label="레그프레스 1RM" result={lpRatioClass} displayValue={`${a.lp1rm} kg`} subLabel={w ? `× 체중비 ${(a.lp1rm / w).toFixed(2)}` : undefined} />
                : <Fact label="레그프레스 1RM" value={`${a.lp1rm} kg`} />
            )}
            {est1rm !== null && (
              <Fact
                label={`추정 1RM (${a.est1rmW}kg × ${a.est1rmReps}회)`}
                value={`${est1rm.toFixed(1)} kg (Epley·Brzycki·Lombardi 평균)`}
              />
            )}
            {gripClass && (
              <ResultRow
                label={`악력 합산 (R ${a.gripR ?? '-'} + L ${a.gripL ?? '-'})`}
                result={gripClass}
                unit="kg"
              />
            )}
          </div>
          {stGuide && (
            <div className="guide-box">
              <div className="guide-title">
                💡 결과 기반 가이드 — {stGuide.headline}{' '}
                <span style={{ color: '#8a8a8a', fontWeight: 500 }}>(기준 등급: {stGuide.levelLabel})</span>
              </div>
              <ul>{stGuide.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {/* Endurance */}
      {(pushupClass ||
        ymcaBpClass ||
        curlupClass ||
        squatEndClass ||
        pullupClass ||
        plank ||
        a.sorensen != null) && (
        <div className="card" data-print-section="근지구력" id="sec-endurance">
          <h3 className="font-bold mb-3">
            근지구력 <span className="guideline-tag tag-nsca">NSCA</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {pushupClass && (
              <ResultRow label="푸시업" result={pushupClass} unit="회" />
            )}
            {ymcaBpClass && (
              <ResultRow
                label="YMCA 벤치프레스 (35/20 lb)"
                result={ymcaBpClass}
                unit="회"
              />
            )}
            {pullupClass && (
              <ResultRow label="풀업 (상체 당기기)" result={pullupClass} unit="회" />
            )}
            {curlupClass && (
              <ResultRow label="컬업 (1분)" result={curlupClass} unit="회" />
            )}
            {squatEndClass && (
              <ResultRow label="스쿼트 지구력 (하지)" result={squatEndClass} unit="회" />
            )}
            {plank && (
              <>
                <ResultRow
                  label="전방 플랭크 (McGill)"
                  result={plank.frontClass}
                  unit="초"
                />
                {plank.warnings.length > 0 && (
                  <div className="md:col-span-2 text-sm p-2 rounded space-y-1" style={{ background: '#fff', border: '1.5px solid #111', color: '#111' }}>
                    {plank.warnings.map((w) => (
                      <div key={w}>• {w}</div>
                    ))}
                  </div>
                )}
              </>
            )}
            {a.sorensen != null && (
              <Fact
                label="Biering-Sørensen (척추 신전근 지구력)"
                value={`${a.sorensen}초${
                  a.sorensen < 120 ? ' · 기준 미달 (<120s)' : ''
                }`}
              />
            )}
          </div>
          {enGuide && (
            <div className="guide-box">
              <div className="guide-title">
                💡 결과 기반 가이드 — {enGuide.headline}{' '}
                <span style={{ color: '#8a8a8a', fontWeight: 500 }}>(기준 등급: {enGuide.levelLabel})</span>
              </div>
              <ul>{enGuide.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      <div className="card" data-print-section="권장사항">
        <h3 className="font-bold mb-3">
          우선순위 개선영역 & 운동처방 방향
          <span className="text-xs text-slate-500 ml-2">
            (가이드라인 기반 자동 생성)
          </span>
        </h3>
        {recs.length === 0 ? (
          <p className="text-sm text-slate-500">
            추가 평가 완료 후 권장사항이 생성됩니다.
          </p>
        ) : (
          <ol className="space-y-3">
            {recs.map((r, i) => (
              <li key={i} className="border-l-4 pl-3 py-1" style={{ borderLeftColor: '#111' }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <strong>{r.title}</strong>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded font-bold"
                    style={
                      r.priority === 'critical'
                        ? { background: '#111', color: '#fff' }
                        : r.priority === 'high'
                        ? { background: '#555', color: '#fff' }
                        : r.priority === 'medium'
                        ? { background: '#9a9a9a', color: '#fff' }
                        : { background: '#e2e2e2', color: '#444' }
                    }
                  >
                    {r.priority.toUpperCase()}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded font-bold text-white"
                    style={{
                      background:
                        r.source === 'ACSM'
                          ? '#111'
                          : r.source === 'NSCA'
                          ? '#333'
                          : r.source === 'NASM'
                          ? '#555'
                          : '#6e6e6e',
                    }}
                  >
                    {r.source}
                  </span>
                </div>
                <p className="text-sm text-slate-700 mt-1">{r.detail}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Notes */}
      {a.notes && (
        <div className="card" data-print-section="메모">
          <h3 className="font-bold mb-3">메모</h3>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{a.notes}</p>
        </div>
      )}
    </div>
  );
}

// 이전 평가 대비 변화 행 — "악력 50 → 58kg (+8 · +16%)"
function DeltaRow({
  d,
}: {
  d: { label: string; prev: number; cur: number; unit: string; dir: 'up' | 'down' | 'neutral' };
}) {
  const diff = Math.round((d.cur - d.prev) * 10) / 10;
  const pct = d.prev !== 0 ? Math.round((diff / Math.abs(d.prev)) * 100) : null;
  const improved = d.dir === 'neutral' || diff === 0 ? null : d.dir === 'up' ? diff > 0 : diff < 0;
  const color = improved === null ? '#8a8a8a' : improved ? '#067647' : '#b42318';
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  return (
    <div
      className="flex justify-between items-center gap-2 px-3 py-2 rounded"
      style={{ background: '#fafafa', border: '1px solid #e3e3e3' }}
    >
      <span className="text-sm" style={{ color: '#333' }}>{d.label}</span>
      <span className="text-sm tabular-nums font-semibold whitespace-nowrap" style={{ color: '#111' }}>
        {fmt(d.prev)} → {fmt(d.cur)}{d.unit}{' '}
        <span style={{ color }}>
          ({diff > 0 ? '+' : ''}{fmt(diff)}
          {pct !== null && diff !== 0 ? ` · ${diff > 0 ? '+' : ''}${pct}%` : ''})
        </span>
      </span>
    </div>
  );
}

// NASM 과활성/저활성 근육 칩 — 빨강(이완)/파랑(강화) 시각 대비
function MuscleChips({ text, tone }: { text: string; tone: 'over' | 'under' }) {
  const names = text
    .replace(/\s*\([^)]*\)\s*$/, '') // 뒤쪽 영문 병기 괄호 제거
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const c =
    tone === 'over'
      ? { bg: '#fef3f2', bd: '#f0b4ae', tx: '#b42318' }
      : { bg: '#eff8ff', bd: '#b2ddff', tx: '#175cd3' };
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {names.map((n) => (
        <span
          key={n}
          className="text-[11px] px-1.5 py-0.5 rounded"
          style={{ background: c.bg, border: `1px solid ${c.bd}`, color: c.tx }}
        >
          {n}
        </span>
      ))}
    </span>
  );
}

function HeroItem({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <>
      <div className="text-[11px] uppercase opacity-80">
        {label}
        {href && <span className="ml-1 opacity-70">↓</span>}
      </div>
      <div className="font-semibold">{value}</div>
    </>
  );
  if (href) {
    return (
      <a href={href} className="bg-white/10 rounded p-2 block hover:bg-white/20 transition">
        {inner}
      </a>
    );
  }
  return <div className="bg-white/10 rounded p-2">{inner}</div>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-slate-800 border border-slate-700 rounded">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-base font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function ResultRow({
  label,
  result,
  unit,
  displayValue,
  subLabel,
}: {
  label: string;
  result: { value: number; label: string; classification: 'excellent' | 'good' | 'average' | 'below' | 'poor'; note?: string } | null;
  unit?: string;
  displayValue?: string;
  subLabel?: string;
}) {
  if (!result)
    return (
      <div className="p-3 bg-slate-800 border border-slate-700 rounded text-sm text-slate-400">
        {label}: 미측정
      </div>
    );
  return (
    <div className="p-3 rounded" style={{ background: '#f2f2f2', border: '1px solid #111' }}>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-xl font-bold text-slate-100">
        {displayValue ||
          (typeof result.value === 'number' ? result.value.toFixed(1) : result.value)}{' '}
        {!displayValue && unit}
      </div>
      <div className="flex items-center gap-2 flex-wrap mt-1">
        <span className={pillClass(result.classification)}>{result.label}</span>
        {subLabel && <span className="text-xs text-slate-500">{subLabel}</span>}
      </div>
      {result.note && (
        <div className="text-xs text-slate-400 mt-1">{result.note}</div>
      )}
    </div>
  );
}

function MetricBig({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div
      className="rounded p-3"
      style={
        warn
          ? { background: '#fff', border: '1.5px solid #111' }
          : { background: '#f5f5f5', border: '1px solid #e3e3e3' }
      }
    >
      <div className="text-xs text-slate-400">{label}</div>
      <div
        className={`text-xl font-bold ${warn ? 'text-slate-900' : 'text-slate-100'}`}
      >
        {value}
      </div>
    </div>
  );
}

function goalLabel(v: string | null) {
  return (
    {
      health: '일반 건강',
      weight: '체중 관리',
      strength: '근력/근비대',
      performance: '경기력',
      rehab: '재활',
    }[v || ''] || '-'
  );
}
