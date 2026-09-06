# 실행 증거 및 의존 파일 수정 검증 — 2026-09-06

앞선 수용 작업의 실행 증거 충돌은 실제 명령·출력 충돌이 아니라 여러 명령의 앱 표시 escaping 비교 누락이었다. 실행 플러그인 수정 및 설치본 원본 재독에서 충돌 0을 확인했다. 제품 구현을 중복 실행하지 않았다.

이전에 완료한 작업 연결 실패 표시 수정은 그대로 유지한다. 새 Fold COV-01 수정 및 이미 검증한 Hub 증거 처리 수정에 맞춰 workspace-lock.json의 기존 해시 5개만 갱신했다. 변경 전 lock과 해시 대응은 verification/incident-repair/workspace-lock-before.json 및 pin-update.json에 보존했다. 원본 sourceDesigns와 기반 commit 값은 바꾸지 않았다. commit은 기반이며 정확한 uncommitted 내용은 files 해시로 고정된다.

이번 전체 테스트는 exit 0, 33/33, 실패/취소/skip/todo 0, 1755.367417 ms. 새 Fold 버전 및 기존 Workspace 수정의 회귀를 포함한다. verification/incident-repair/full-tests.log에 원출력이 있다. source-pins.log는 원본 2개 및 Hub 47/Graph 28/Fold 7/Port 11개 일치를 기록한다. demo.log의 fixture 정리/복원은 applied이고 nativeThreadsCreated/nativeArchives는 0이다.

이전 30개 및 후속 3개 실행과 이번 전체 33개를 합산하지 않는다. 과거 보고서·로그·실패 판정은 보존한다. 실제 native Hub·Port G0/G3·호스트 설치/UI는 여전히 미검증이다. 로컬 수정 및 성공 검사는 과거 registry rejected 판정을 소급 변경하지 않는다.
