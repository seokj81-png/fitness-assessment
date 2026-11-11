// 평가에 저장된 카메라 측정 각도 표 — 입력 화면과 결과 페이지가 같이 쓴다 (서버·클라이언트 공용).
import { CAM_GROUP_NAME, camGroupsIn, camMetricsOf, formatCam, type CamGroup } from '@/lib/pose-angles';

export default function CamAngleSummary({
  rom,
  groups,
}: {
  rom: Record<string, number> | null | undefined;
  /** 보여 줄 묶음. 없으면 저장된 것 전부 */
  groups?: CamGroup[];
}) {
  const present = camGroupsIn(rom).filter((g) => !groups || groups.includes(g));
  if (!rom || !present.length) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {present.map((g) => (
        <div key={g} className="rounded-xl p-3" style={{ background: '#f6f6f6', border: '1px solid #e2e2e2' }}>
          <div className="text-xs font-semibold mb-1" style={{ color: '#5a5a5a' }}>
            {CAM_GROUP_NAME[g]}
          </div>
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {camMetricsOf(g)
                .filter((m) => typeof rom[m.key] === 'number')
                .map((m) => (
                  <tr key={m.key} style={{ borderTop: '1px solid #e2e2e2' }}>
                    <td className="py-1.5 pr-2">{m.name}</td>
                    <td className="py-1.5 text-right font-bold tabular-nums whitespace-nowrap">{formatCam(m, rom[m.key])}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
