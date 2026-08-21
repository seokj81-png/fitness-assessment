// 브라우저 환경 감지 유틸
// 카톡·네이버·인스타 등 앱 내 브라우저는 window.print()가 조용히 무시됨
// (트레이너 피드백: "PDF 저장 기능 미활성화" — 링크를 카톡으로 받아 열면 인앱브라우저)

export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /KAKAOTALK|Instagram|FBAN|FBAV|FB_IAB|NAVER\(inapp|Line\/|DaumApps|everytimeApp|band\//i.test(
    navigator.userAgent
  );
}

// 인쇄/PDF 저장 — 인앱 브라우저에서는 외부 브라우저로 여는 방법을 안내
export function printPage() {
  if (isInAppBrowser()) {
    alert(
      '카카오톡 등 앱 안의 브라우저에서는 인쇄·PDF 저장이 지원되지 않습니다.\n\n' +
        '화면 오른쪽 위·아래의 ⋯ (더보기) 메뉴에서\n' +
        '"다른 브라우저로 열기" 또는 "Safari/Chrome으로 열기"를 누른 뒤 다시 시도해 주세요.'
    );
    return;
  }
  window.print();
}
