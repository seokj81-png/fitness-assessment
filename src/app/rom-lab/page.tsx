// 카메라 관절 각도 — 시제품(1단계). 저장 없음, 메뉴에 연결하지 않음.
import RomCamera from '@/components/rom/RomCamera';

export const metadata = { title: '카메라 관절 각도 (시제품) | 파프짐 체력 평가' };

export default function RomLabPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <RomCamera />
    </main>
  );
}
