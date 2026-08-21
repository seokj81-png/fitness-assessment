// ══════════════════════════════════════════════════════
// 운동목적별 기본/심화 검사 프리셋
// 트레이너 피드백("복잡하다·간소화")과 매니저 피드백("항목 유지")의 절충:
// 항목을 삭제하지 않고 화면에서 접기만 한다. 접힌 검사도 펼치면 그대로 입력 가능.
// 프리셋 조정은 이 파일의 목록만 고치면 된다.
// ══════════════════════════════════════════════════════

export type GoalKey = 'health' | 'weight' | 'strength' | 'performance' | 'rehab';

export const GOAL_LABEL: Record<GoalKey, string> = {
  health: '일반 건강',
  weight: '체중 관리',
  strength: '근력/근비대',
  performance: '경기력',
  rehab: '재활',
};

// 직접 입력한 목적 등 알 수 없는 값은 '일반 건강' 프리셋으로
export function goalKeyOf(goal?: string | null): GoalKey {
  return goal && goal in GOAL_LABEL ? (goal as GoalKey) : 'health';
}

// 탭별 '접을 수 있는' 카드 목록 — 여기 없는 카드는 항상 표시 (핵심 검사)
// 항상 표시: 신체조성 전체 · 5분 달리기 · VO₂max 최종분류 · 악력 ·
//           푸시업/스쿼트/플랭크 · 자세 매트릭스/스케치·사진 · OHSA · 자동 매칭
export const COLLAPSIBLE_CARDS: Record<string, { id: string; title: string }[]> = {
  cardio: [
    { id: 'cardio.rockport', title: 'Rockport 1마일 걷기' },
    { id: 'cardio.run15', title: '2.4km 달리기' },
    { id: 'cardio.cooper', title: '쿠퍼 12분 달리기' },
  ],
  strength: [
    { id: 'str.rm1', title: '1RM 직접 측정' },
    { id: 'str.est', title: '다중반복 1RM 추정' },
  ],
  endurance: [
    { id: 'end.ymca', title: 'YMCA 벤치프레스' },
    { id: 'end.pullup', title: '풀업' },
    { id: 'end.curlup', title: '컬업' },
  ],
  posture: [
    { id: 'post.breath', title: '호흡 평가' },
    { id: 'post.balance', title: '평형성 외발서기' },
  ],
  movement: [
    { id: 'mov.fms', title: 'FMS 7-Test' },
    { id: 'mov.clear', title: 'FMS Clearing' },
    { id: 'mov.sls', title: '싱글레그·푸시·풀' },
  ],
};

// 목적별 '기본으로 펼쳐 둘' 카드 (COLLAPSIBLE_CARDS 중에서)
export const BASIC_BY_GOAL: Record<GoalKey, string[]> = {
  health: [],
  weight: [],
  strength: ['str.rm1', 'str.est', 'end.ymca', 'end.pullup'],
  performance: ['str.rm1', 'cardio.cooper', 'mov.fms', 'mov.clear', 'end.pullup'],
  rehab: ['post.breath', 'post.balance', 'mov.fms', 'mov.clear', 'mov.sls'],
};
