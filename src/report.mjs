const labels = { available: '연결됨', unsupported: '미지원', disconnected: '연결 실패', permission_denied: '권한 없음', not_analyzed: '아직 분석 안 함' };
const plain = value => String(value ?? '').replace(/[\x00-\x1f\x7f-\x9f]/g, ' ').replace(/[\[\]<>`]/g, '').slice(0, 4000);
export function report(view) {
  const lines = [`RUVORA Workspace · ${plain(view.profile.displayName)}`, `범위: ${plain(view.profile.hostId)} / ${plain(view.profile.canonicalProjectId)} · ${plain(view.profile.branch)}`, `모드: ${view.capabilities.mode} · 확인: ${view.observedAt}`, '', '연결 상태'];
  for (const [name, component] of Object.entries(view.capabilities.components)) lines.push(`- ${name}: ${labels[component.status] ?? component.status} (${component.mode}; ${component.reason ?? component.freshness ?? ''})`);
  lines.push('', `주의가 필요한 일: ${view.attention.length}`, `이어갈 작업: ${view.work.length}`);
  for (const work of view.work) lines.push(`- ${plain(work.request)}: ${work.status} [${work.id}]`, `  다음: ${plain(work.nextAction)}${work.lastError ? ` · ${work.lastError}` : ''}`);
  lines.push('', `현재 맥락: ${labels[view.context.status] ?? view.context.status}${view.context.freshness ? ` / ${view.context.freshness}` : ''}`, `근거 시점: ${view.context.evidenceObservedAt ?? '정보 없음'}`, `선택된 맥락: ${view.context.selections.length}`, `저장된 정리 검토: ${view.reviews.length}`, '이전: 로컬 synthetic 패키지 검사만 가능; native export/import 미지원.', '작업 열기: 호스트 탐색 미지원. 확인되지 않은 링크는 제공하지 않습니다.', '', plain(view.nextAction));
  return lines.join('\n') + '\n';
}
