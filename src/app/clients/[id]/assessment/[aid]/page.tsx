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
  cardioComparison,
  trainingZones,
  vVO2max,
  fmtMinSec,
  estimate1RM_avg,
} from '@/lib/calculations';
import type { Sex } from '@/lib/types';
import DeleteAssessmentButton from './DeleteAssessmentButton';
import PrintButton from './PrintButton';

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
  let vo2 = a.vo2max;
  if (!vo2) {
    if (a.rockportTime && a.rockportHr && w) {
      vo2 = rockportVO2max(a.rockportTime, a.rockportHr, w, age, sex);
    } else if (a.run15Time) {
      vo2 = run15MileVO2max(a.run15Time);
    } else if (a.run5minDist) {
      const t = riegel2400FromRun5min(a.run5minDist);
      if (t) vo2 = vo2maxFrom2400(t);
    } else if (a.cooperDist) {
      vo2 = cooperVO2max(a.cooperDist);
    }
  }
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
    a.gripR !== undefined && a.gripL !== undefined
      ? classifyGrip(sumGrip, age, sex)
      : null;
  const est1rm =
    a.est1rmW && a.est1rmReps
      ? estimate1RM_avg(a.est1rmW, a.est1rmReps)
      : null;

  // ===== Endurance =====
  const pushupClass =
    a.pushupReps !== undefined ? classifyPushup(a.pushupReps, age, sex) : null;
  const ymcaBpClass =
    a.ymcaBpReps !== undefined ? classifyYMCABP(a.ymcaBpReps, age, sex) : null;
  const curlupClass =
    a.curlupReps !== undefined ? classifyCurlup(a.curlupReps, age, sex) : null;
  const squatEndClass =
    a.squatReps != null ? classifySquatEndurance(a.squatReps, age, sex) : null;
  const plank =
    a.plankFront !== undefined
      ? analyzePlank(a.plankFront, a.plankR, a.plankL, a.sorensen, sex)
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

  return (
    <div>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3 no-print">
        <div>
          <Link
            href={`/clients/${client.id}`}
            className="text-xs text-blue-600 hover:underline"
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
          <DeleteAssessmentButton
            clientId={client.id}
            assessmentId={a.id}
          />
        </div>
      </div>

      {/* Hero summary */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white p-5 rounded-xl mb-5 print:rounded-none">
        <h3 className="font-bold mb-3">회원님 요약</h3>
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
          <HeroItem
            label="BMI"
            value={bmiVal ? bmiVal.toFixed(1) : '-'}
          />
          <HeroItem
            label="체지방률"
            value={bfVal !== undefined ? `${bfVal.toFixed(1)}%` : '-'}
          />
          <HeroItem
            label="VO₂max"
            value={vo2 ? vo2.toFixed(1) : '-'}
          />
          <HeroItem
            label="FMS"
            value={`${fmsResult.total}/21`}
          />
          <HeroItem label="목적" value={goalLabel(client.goal)} />
        </div>
      </div>

      {/* PAR-Q */}
      <div className="card">
        <h3 className="font-bold mb-3">
          PAR-Q+ <span className="guideline-tag tag-acsm">ACSM</span>
        </h3>
        <div
          className={`p-3 rounded ${
            parq.passed
              ? 'bg-green-950/40 border border-green-800/50 text-green-300'
              : 'bg-red-950/40 border border-red-800/50 text-red-300'
          }`}
        >
          <div className="font-semibold">
            {parq.passed ? '✔ 운동 참여 안전' : '⚠ 주의 필요'}
          </div>
          <div className="text-sm">{parq.message}</div>
        </div>
      </div>

      {/* Body composition */}
      <div className="card">
        <h3 className="font-bold mb-3">
          신체조성 <span className="guideline-tag tag-acsm">ACSM</span>
        </h3>
        <div className="grid md:grid-cols-2 gap-3">
          <ResultRow label="BMI (Asia-Pacific)" result={bmiClass} unit="kg/m²" />
          <ResultRow label="WHR" result={whrClass} />
          {a.waist !== undefined && (
            <div className="text-sm text-slate-600 md:col-span-2">
              허리둘레 {a.waist} cm · 복부비만 위험도: {waistNote}
            </div>
          )}
          <ResultRow label="체지방률" result={bfClass} unit="%" />
          {a.biaSmm !== undefined && (
            <Fact label="골격근량 (BIA)" value={`${a.biaSmm} kg`} />
          )}
          {a.biaFm !== undefined && (
            <Fact label="체지방량 (BIA)" value={`${a.biaFm} kg`} />
          )}
          {a.biaFfm !== undefined && (
            <Fact label="제지방량 (BIA)" value={`${a.biaFfm} kg`} />
          )}
          {a.biaBmr !== undefined && (
            <Fact label="기초대사량 (BIA)" value={`${a.biaBmr} kcal`} />
          )}
        </div>
      </div>

      {/* Vitals */}
      {(bpClass || rhrClass) && (
        <div className="card">
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

      {/* Cardio */}
      {(vo2Class || stepClass) && (
        <div className="card">
          <h3 className="font-bold mb-3">
            심폐지구력 <span className="guideline-tag tag-acsm">ACSM</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {vo2Class && (
              <ResultRow label="VO₂max" result={vo2Class} unit="ml/kg/min" />
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
                        className={`border-b border-slate-800 ${g.classification === cardioCmp.userClass ? 'bg-emerald-500/10' : ''}`}
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
                  <span className="text-emerald-400">{(cardioCmp.userSpeedKmh - cardioCmp.avgSpeedKmh).toFixed(1)} km/h 빠름</span>
                ) : (
                  <span className="text-amber-400">{(cardioCmp.avgSpeedKmh - cardioCmp.userSpeedKmh).toFixed(1)} km/h 느림</span>
                )}.
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
                    <div className="text-xs text-emerald-300">⏱ {z.durationLabel}</div>
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
        <div className="card">
          <h3 className="font-bold mb-3">
            근력 <span className="guideline-tag tag-nsca">NSCA</span>
          </h3>
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
        </div>
      )}

      {/* Endurance */}
      {(pushupClass ||
        ymcaBpClass ||
        curlupClass ||
        squatEndClass ||
        plank ||
        a.sorensen !== undefined) && (
        <div className="card">
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
                  <div className="md:col-span-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded space-y-1">
                    {plank.warnings.map((w) => (
                      <div key={w}>• {w}</div>
                    ))}
                  </div>
                )}
              </>
            )}
            {a.sorensen !== undefined && (
              <Fact
                label="Biering-Sørensen (척추 신전근 지구력)"
                value={`${a.sorensen}초${
                  a.sorensen < 120 ? ' · 기준 미달 (<120s)' : ''
                }`}
              />
            )}
          </div>
        </div>
      )}

      {/* Posture */}
      <div className="card">
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
                    className="border-l-4 border-emerald-500 pl-3 py-1"
                  >
                    <div className="font-semibold text-slate-100">
                      의심: {s.name}{' '}
                      <span className="text-xs text-slate-500">
                        (일치 {s.hits}건)
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      <b>과활성:</b> {s.overactive}
                    </div>
                    <div className="text-xs text-slate-600">
                      <b>저활성:</b> {s.underactive}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(a.ohsaFlags || []).length > 0 && (
              <p className="text-sm text-slate-600 mt-3">
                OHSA/동적 보상 패턴: {(a.ohsaFlags || []).length}건 관찰됨
              </p>
            )}
          </>
        )}
      </div>

      {/* Movement / FMS */}
      <div className="card">
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

      {/* Recommendations */}
      <div className="card">
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
              <li key={i} className="border-l-4 border-blue-500 pl-3 py-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <strong>{r.title}</strong>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      r.priority === 'critical'
                        ? 'bg-red-600 text-white'
                        : r.priority === 'high'
                        ? 'bg-orange-500 text-white'
                        : r.priority === 'medium'
                        ? 'bg-yellow-400 text-slate-900'
                        : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {r.priority.toUpperCase()}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold text-white ${
                      r.source === 'ACSM'
                        ? 'bg-blue-600'
                        : r.source === 'NSCA'
                        ? 'bg-orange-600'
                        : r.source === 'NASM'
                        ? 'bg-emerald-600'
                        : 'bg-violet-600'
                    }`}
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
        <div className="card">
          <h3 className="font-bold mb-3">메모</h3>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{a.notes}</p>
        </div>
      )}
    </div>
  );
}

function HeroItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded p-2">
      <div className="text-[11px] uppercase opacity-80">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
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
    <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded">
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
      className={`rounded p-3 ${
        warn ? 'bg-red-950/40 border border-red-800/50' : 'bg-slate-800 border border-slate-700'
      }`}
    >
      <div className="text-xs text-slate-400">{label}</div>
      <div
        className={`text-xl font-bold ${warn ? 'text-red-400' : 'text-slate-100'}`}
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
