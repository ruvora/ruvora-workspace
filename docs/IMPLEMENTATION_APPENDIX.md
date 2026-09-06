# RUVORA Workspace 구현 부록 — 2026-09-06

이 문서는 원본 v0.2의 빈틈과 이번 구현 결정을 추가한다. 원본 두 문서는 완독했으며 한 바이트도 변경하지 않았다. 문서 내부의 기획 당시 ‘미구현’ 표현과 당시 HEAD, Fold/Port 계약 링크도 그대로 보존한다. 현재 상태를 판단할 때 이 부록을 함께 읽는다.

## 보존된 근거

| 근거 | SHA-256 / 위치 |
| --- | --- |
| Workspace 제품 기획 전체 | `ce1d07114d1a58254126d890748fbeb5d5fc353244a007c157adf6f180585c2e` |
| Workspace 통합 아키텍처 전체 | `65ab1b7386af6c3fef7f91e96c2a6955eabc8d6382ee70c449c4f081530d2bb6` |
| 과거 실패 기록 | `../codex-control-plane/docs/INCIDENT_CONTINUATION_2026-09-06.md`, `caad1216b2420a8d14c62f91b19e4b83b2820bf843cf1293d651afd4d094cb9f` |

실패 기록에서 계획 전용 역할 재사용, 도구 출력 관찰과 종료 코드 혼동, 외부 호스트 표시와 native 기록 불일치, 미검증 gate 처리 문제를 확인했다. 과거 실패 Run의 판정은 변경하지 않았다. 기록 안의 369개 테스트 및 설치 버전은 다른 프로젝트의 과거 증거이며 이번 Workspace 검증 수치로 사용하지 않는다.

형제 소스와 계약은 읽기 전용으로 확인했다. `workspace-lock.json`에 HEAD, package version 및 실제 작업 트리 파일별 hash를 보존한다. 원본 기획 당시 HEAD를 최신 값으로 덮어쓰지 않았다. ThreadHub는 현재 `codex-control-plane` 구현을 기준으로 확인했으며, 다른 형제 구현·테스트·배포 작업을 다시 실행하지 않았다.

## 실제 범위와 미지원 구분

| 구성요소 / 흐름 | 이번에 실행 가능한 범위 | 아직 제공하지 않는 범위 |
| --- | --- | --- |
| 프로젝트 선택 / 현황 | canonical path와 host/project ID 명시적 결합, 한국어 보고서, 연결 실패 영역 분리 | 호스트가 서명한 프로젝트 identity, 다중 레포 자동 통합 |
| Resolver / capability | 명시적 모듈 경로, source hash 고정, schema 검사, 실패 차단 | endpoint 자동 발견, peer 인증, 기존 daemon handshake 및 재사용 |
| Graph | schema 4의 정지된 published snapshot 조회, revision·근거 시점·stale 표시 | live WAL DB 연결, semantic refresh, 전체 대화 스캔 |
| ContextSelection | 선택 이유, evidence/observation/thread 참조, digest, branch, revision 고정; stale 명시 수용 | branch 적용 근거 없는 항목 선택, 충돌 자동 해소, arbitrary transcript 합치기 |
| Hub / WorkCard | durable 계약 double로 요청·중복 키·응답 유실·상태 관찰·중단을 로컬 시험 | 실제 Run/Task/스레드/위임 생성, 모델 실행, 실제 대표 링크 열기 |
| WorkflowTicket | 단계 연결, 요청 ID 충돌 거절, 제품 operation projection, 수동 후속 단계, 취소 구분 | DAG/lease/스케줄러/완료 판정 소유, 호스트 이벤트 구독 |
| Fold / ReviewCard | 기존 pinned ThreadFold를 import하여 fixture preview·coverage·승인 검증·archive·restore·partial 재사용 | native inventory, host 원자적 archive, production 승인 발급 |
| Port | 기존 pinned ThreadPort의 synthetic 패키지 정적 검사, transfer 검토 카드 저장 | native export/import, 원본 없는 재개, 업로드, 도구/설정 실행 |
| 패키지 | 로컬 CLI와 stdio MCP, manifest/skill, 버전 lock, 구조 검증 | 모듈 배포 번들, marketplace 설치, native UI loading 검증 |

Hub/Graph/Fold/Port 로직을 별도로 복제 개발하지 않았다. `src/fixture.mjs`는 Workspace 계약 시험용 상태 double이다. 실제 업무 실행 코드는 없고 fixture ID는 호스트 thread ID로 사용되지 않는다. Fold의 의미 추출·보호 판단·승인·복구 및 Port의 ZIP/이력 검사 알고리즘은 형제 모듈 소유 그대로다. Workspace가 내는 성공은 항상 `fixture` 또는 `static_inspection` 근거와 함께 표시한다.

## 원본의 빈틈과 구현 결정

1. **호스트 패널이 미확정:** 별도 사이트를 만들지 않고 한국어 CLI 보고서 및 MCP text 응답을 제공한다. 목록은 현황→주의→작업→맥락→정리·이전 순서다. `available`, `not_analyzed`, `disconnected`, `permission_denied`, `unsupported`를 분리한다. 확인되지 않은 탐색 링크는 만들지 않는다.
2. **프로젝트 정체성 발급 API가 없음:** CLI init의 명시적 로컬 binding을 사용한다. 경로는 realpath로 검증하고 ID·path·branch·mode가 기존 저장 프로필과 달라지면 `PROJECT_RECONNECT_REQUIRED`로 차단한다. 자동 이동·재연결·migration은 없다. branch 변경도 별도 새 binding 또는 향후 검토된 migration이 필요하다.
3. **공통 endpoint·RPC 신뢰 계약이 없음:** 임의 endpoint descriptor를 받아 실행하지 않는다. 로컬 설정의 모듈만 hash 검증 후 import한다. 네트워크 프록시·프로세스 시작·registry lease 획득 API를 노출하지 않는다. `workspace-lock.json`은 개발 소스 pin이며 네 제품 번들의 출시 성공 증거가 아니다.
4. **Graph constructor가 원본에 쓸 수 있음:** GraphRegistry를 live 연결에 직접 만들지 않는다. schema 4 published 데이터만 읽는 adapter를 구현했다. `readOnly:true`만으로 WAL/SHM이 생기는 결함을 실제 재현하여 immutable URI로 수정했다. sidecar가 존재하면 `GRAPH_SNAPSHOT_REQUIRED`, 조회 중 파일이 바뀌면 `GRAPH_CHANGED_DURING_READ`다. 이 경로는 정지된 snapshot에 한정되며 실행 중 DB의 일관성을 보증하지 않는다.
5. **Graph의 branch 적용 계약이 부족:** evidence에 현재 branch 적용 정보가 없으면 `BRANCH_APPLICABILITY_UNVERIFIED`다. 현재 시각과 근거 시각을 구분하고 5분 이후 또는 미래 근거를 stale로 표시한다. `acceptStale`는 오래된 근거의 명시적 선택만 뜻하며 branch·digest·충돌 검사를 우회하지 못한다.
6. **Hub context/재시도 어댑터가 미확정:** prepare와 dispatch를 분리한다. 실행 intent의 범위에서 dispatch할 수 있으나 현재 production adapter는 없다. fixture 요청은 revision 및 근거 hash를 재확인한 후 ContextSelection을 snapshot payload에 고정한다. 실제 Hub가 이를 소비했다고 주장하지 않는다.
7. **다중 설치 중복 writer:** Workspace는 제품 daemon을 시작하지 않으므로 두 번째 writer를 만들지 않는다. 자체 메타데이터는 exclusive lock과 fsync/rename으로 직렬화한다. 호스트의 standalone 설치 공존 E2E는 별도 gate다.
8. **재시작·응답 유실:** product call 이전에 stable key와 intent를 저장한다. 저장된 operation을 조회하고 unknown이면 attention이다. Fold apply는 같은 키로 소유 제품의 복구를 호출한다. Fold preview는 아직 idempotency/조회 계약이 없으므로 불확실한 미리보기를 자동 재생성하지 않는다. 원본에 없는 재시도 보장을 만들지 않았다.
9. **승인 수단 미확정:** 모델 입력 `approved:true`나 임의 문자열로 승인하지 않는다. native 변경은 항상 닫혀 있다. fixture는 기존 Fold의 HMAC issuer·만료·effect set·kind 검증을 사용하며 issuer는 CLI/MCP에 노출되지 않는다. 프로세스 재시작 후 새 fixture 승인 발급이 필요한 경우가 있다. coverage 확인은 새 plan revision이며 실행 승인이 아니다.
10. **후속 이벤트·취소 의미 미확정:** read/get은 실행을 시작하지 않는다. 작업 완료 뒤 후속 정리는 수동 다음 행동이다. 후속 취소는 기존 성공을 보존하고 running_work 중단은 별도 호출이다. 완료 상태는 제품 관찰 값이며 창 닫기를 중단 요청으로 바꾸지 않는다.
11. **저장 DB 설계 미확정:** Workspace 소유 정보는 `.ruvora-workspace/state.json`에 저장한다. 제품 작업 상태는 관찰값이고 실제 소유자는 제품이다. 전체 원문 저장소는 복사하지 않는다. fixture 제품 데이터는 별도 하위 디렉터리에 남는다. JSON 손상·schema 불일치는 초기화로 덮어쓰지 않는다.
12. **Port 출시 기준:** summary 전달을 세션 이전으로 표시하지 않는다. synthetic package만 검사하며 `nativeExecutable:false`, G0/G3 미검증을 결과에 유지한다. 패키지 생성은 공개 제품 도구가 아니라 test/demo helper에서만 수행된다. 가져오기·실행·전송 권한을 만들지 않는다.

## 호스트가 제공해야 할 최소 계약

타입 초안은 `src/contracts.d.ts`에 있다. 아래 계약이 실제 구현·검증되기 전에는 capability를 열 수 없다. descriptor에 `true`를 채우는 것만으로 연결되지 않는다.

| 대상 | 최소 입력·결과 및 불변 조건 |
| --- | --- |
| Component handshake | `componentId, instanceId, protocolVersion, binaryDigest, dataSchemaVersion, capabilities`; 로컬 peer/credential 검증을 모델 입력 밖에서 수행. 인증 실패·불일치 시 새 writer 실행 금지 |
| Hub dispatch | `ruvora.interop/1` envelope + scope + 검증된 path/branch + 고정 context + stable key. 같은 키/같은 내용은 같은 operation, 다른 내용은 conflict. `findByIdempotencyKey`가 응답 유실 뒤 실제 결과를 반환 |
| Hub 관찰·중단 | scope-bound operationId, 단조 sequence/revision, 제품 status, observation time, 실제 representative ref 및 검증된 context digest. 중단 요청 수락과 종료 관찰은 구분 |
| Graph refresh | 호스트 프로젝트와 Graph scope 검증, `explicit_refresh` 요청, 범위·비용·revision, owner의 single writer 계약. current read나 stale 표시로 refresh 권한을 만들지 않음 |
| Fold preview | 동일 완료 Run inventory + completeness + revision; durable preview idempotency key 및 plan 조회/복구 경로가 있어야 unknown preview의 자동 복구를 제공 가능 |
| Fold mutation | 원본 계약의 `inspect_cleanup_eligibility`, `prepare_cleanup_batch`, `apply_cleanup_batch`, `read_cleanup_operation`, restore 계약. native Turn 시작과 같은 동기화 경계에서 revision·전체 effect set·예약 fence를 재검증 |
| 승인 | 검증 가능한 issuer, actor, operationKind, exact planDigest/effects, expiry, revocation, signature. 사용자 입력을 모델이 대신 서명할 수 없는 host confirmation 경로 |
| Port | G0 독립 이력·공유 범위 보존, source digest 불변, 격리 재시작; G3 다른 PC/계정/app 발견·재개. native source reference와 boundary가 없으면 실패. import 자체가 실행 권한을 만들지 않음 |
| 탐색 / UI | 실제 host 반환 thread ref만 open, 결과 `navigated:true` 확인. native panel 및 실제 click E2E 전에는 텍스트 fallback 유지 |

## 수용 시나리오와 남은 관문

| 원본 시나리오 | 이번 검증 | 남은 gate |
| --- | --- | --- |
| fresh install / empty state | CLI fresh open 무쓰기, MCP launch, plugin 구조 검증 | Codex 실제 설치·loading |
| existing Hub attach / incompatible daemon | production 기능 차단, 로컬 module mismatch·부분 실패 격리 | 인증된 기존 Hub reuse, 활성 작업 공존 |
| missing Graph / stale context | fixture 및 실제 Graph schema 임시 DB로 읽기·불일치·stale·branch 검사 | 실제 선택 프로젝트 snapshot 공급, semantic 품질 평가 |
| duplicate dispatch / restart | durable fixture operation 1개, 응답 유실 및 unknown retry 차단 | native idempotency 및 host snapshot 소비 |
| Fold 승인 후 대상 변경 | 기존 Fold 모듈 fixture에서 activeTurn 경합 차단, representative 보존, partial 및 restore | native 원자성·신뢰 승인·descendant effects |
| unsupported Port | 실제 Port 모듈로 synthetic ZIP 검사, traversal 거절, native gate 유지 | G0/G3 및 실제 session 이전 |
| uninstall 동안 활성 작업 유지 | gateway 재오픈에도 fixture operation 유지, 제거 hook/daemon 중단 호출 없음 | 실제 standalone + Workspace 설치 제거 E2E |

이번 구현으로 M0의 로컬 읽기 기반과 M1의 fixture 사용자 여정을 제공한다. M1 native pilot 및 M2 이전 출시가 완료됐다는 뜻은 아니다. 설치 캐시에 제품 데이터를 기록하지 않으며 번들·서명·업데이트 rollback·OS 확장·외부 성능 지표를 구현했다고 주장하지 않는다.
