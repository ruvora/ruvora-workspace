# 수정 후 최종 로컬 수용 검토 — 2026-09-06

## 현재 판단

**이전 네 기준을 한계가 명시된 로컬 범위에서 수용한다.** 이전 검토의 Hub pin drift는 기록된 pin 갱신 및 현재 파일 일치로 해소됐다. Workspace 상태 projection 수정과 갱신된 Fold 의존성을 포함한 전체 회귀는 이후 저장된 33개 통과 원출력으로 확인된다. 이번 대조에서 새 로컬 결함이나 불일치는 발견하지 않았다. 로컬 기준의 미충족 항목은 남기지 않되, native 출시 게이트는 모두 미검증으로 유지한다.

이번 작업은 기존 파일과 저장된 증거를 읽고 수용 검토를 추가하는 작업이다. 구현·테스트·데모·플러그인 설치를 다시 실행하지 않았다. 새 코드 변경도 없다. 기존 [ACCEPTANCE_CONTINUATION_2026-09-06.md](ACCEPTANCE_CONTINUATION_2026-09-06.md)는 당시 판단 그대로 보존한다.

사용자가 지정한 이전 task `task_3f85552a-31d8-43b0-81fd-f996b3af0b29` / run `run_8b0f55e3-810c-4cf5-a539-acdfbb047a6e`의 **rejected 판정은 변경하지 않는다**. 더 앞선 task/run 및 원본·실패·성공 로그도 보존한다. 이 문서는 수정 후 파일의 현재 로컬 수용 판단이지 과거 registry 판정의 소급 성공이나 native 출시 승인 기록이 아니다.

## 증거 재조정과 제품 수용의 구분

다음 두 자료를 읽기 전용으로 참조했다.

- [MULTI_ACTION_REPAIR_2026-09-06.md](../../codex-control-plane/docs/MULTI_ACTION_REPAIR_2026-09-06.md)
- [MULTI_ACTION_RECONCILIATION_2026-09-06.json](../../codex-control-plane/docs/MULTI_ACTION_RECONCILIATION_2026-09-06.json)

저장된 JSON은 Fold와 Workspace 각 31개 실행 항목의 표시 문자열 충돌이 각각 1건에서 0건으로 재조정됐음을 기록한다. Workspace 대상은 Turn `01a07530-60bc-7b00-ab2b-753a7d27dc4f`, item `exec-992897c9-699c-473a-8c04-b7a504790de2`이고 worker receipts는 12개다. 이 결과는 **그 수리 시점의 읽기 전용 재조정 기록**이며 이번에 다시 조회하거나 실행한 결과가 아니다.

수리 문서는 설치본 `0.14.0+5eae32ab7324` 및 증거 비교 수정 내용을 설명한다. 이 문서만으로 Workspace의 native 기능이 출시됐다고 판단하지 않는다. 이번 작업에서는 실행 플러그인, 설치본, dashboard, 실제 스레드나 registry를 호출·수정하지 않았다.

## 이전 기준별 현재 수용

| 이전 기준 | 현재 판단 | 실제 파일·저장된 증거 | 한계 또는 미충족 |
| --- | --- | --- | --- |
| 두 원본 설계를 완독·보존하고 빈틈을 새 구현 부록에서 명시한다. | **수용** | 두 원본 전체는 이 스레드의 최초 구현에서 읽었다. 현재 원본 SHA가 기존 `sourceDesigns`와 일치한다. [구현 부록](IMPLEMENTATION_APPENDIX.md)에 12개 미결정 사항의 구현 결정과 최소 호스트 계약이 있다. | 이번에는 원본을 다시 쓰거나 기획 당시 상태·HEAD를 갱신하지 않았다. 이전 완독과 이번 바이트 비교를 구분한다. 미충족 없음. |
| 원본 주요 흐름을 실행 가능한 로컬 구현으로 제공하고 실제 지원 및 미지원 통합을 구분한다. | **한계를 명시한 로컬 수용** | [Workspace 흐름](../src/workspace.mjs), [components](../src/components.mjs), [typed tools](../src/tools.mjs), [CLI](../bin/workspace.mjs), [MCP](../src/mcp.mjs). 수정 후 저장된 [demo.log](verification/incident-repair/demo.log)는 fixture operation 1개, archive/restore applied, Port valid 및 nativeExecutable=false를 보여준다. | Hub는 fixture double, Fold는 pinned fixture 모듈, Port는 synthetic 정적 검사다. Graph는 정지된 immutable snapshot 조회만 지원한다. 실제 native 작업·정리·이전·탐색은 미지원이다. 로컬 범위 미충족 없음. |
| 적절한 테스트와 자체 검토를 수행하고 발견된 결함 수정 및 원출력 증거를 기록한다. | **수용** | 최초 실패/수정 로그, [이전 검증 기록](VERIFICATION.md), [projection 수정 전](verification/continuation-projection-before.tap)·[수정 후](verification/continuation-projection-after.tap), 이후 수리의 [full-tests.log](verification/incident-repair/full-tests.log)를 대조했다. 현재 `projectTicket`의 `workObservationFailed` 처리가 유지되고 전체 로그에 세 projection 회귀가 포함된다. | 이전 검토 때는 전체 회귀가 미확인이고 30개와 3개가 별개였다. 이후 실제 전체 실행 로그의 33 pass/0 fail을 근거로 그 공백을 해소한다. 이번 실행에서 33개를 돌렸거나 숫자를 합산했다고 주장하지 않는다. 새 로컬 결함 없음. |
| 영문 README와 한국어 사용법 및 남은 검증 게이트를 제공하고 타 프로젝트 작업을 중복 실행하지 않는다. | **수용** | [영문 README](../README.md), [한국어 사용법](USAGE_KO.md), [구현 부록](IMPLEMENTATION_APPENDIX.md), [수리 기록](INCIDENT_REPAIR_2026-09-06.md). 현재 capability 차단과 문서의 fixture/native 구분이 일치한다. | 과거 문서·로그는 당시 기록이다. 이번에는 형제 구현·테스트·수리·설치 작업을 반복하지 않았으며 신규 검토 자료만 추가한다. 미충족 없음. |

## Pin drift: 이전 상태와 현재 상태

비교 자료는 [pin-update.json](verification/incident-repair/pin-update.json), [workspace-lock-before.json](verification/incident-repair/workspace-lock-before.json), [현재 lock](../workspace-lock.json), [저장된 source-pins.log](verification/incident-repair/source-pins.log)다.

이번 읽기 전용 파일 비교를 [post-repair-audit.json](verification/post-repair-audit.json)에 기록했다. 이는 제품 동작 테스트나 `scripts/verify-sources.mjs` 재실행이 아니다. 절대 Node 실행 파일의 inline 코드로 JSON 파싱, 이전/현재 lock 구조 비교, 선택된 파일의 SHA-256 계산만 수행했다.

확인 결과:

- 현재 lock과 이전 lock은 유효한 JSON이다. 이전 lock의 hash는 앞선 continuation audit의 lock hash와 일치한다.
- 이전 lock에 `pin-update.json`의 다섯 변경만 적용한 구조가 현재 lock과 정확히 일치한다. `sourceDesigns`, 기반 commit, supportedHostMatrix 등 나머지 값은 이 변경에서 유지됐다.
- 갱신 대상은 Hub의 `src/command-evidence.js`, `src/failure-classifier.js`, `src/native-evidence.js`, `src/result-validator.js`와 Fold의 `src/model.js`다. 각 before/after hash가 저장된 두 lock과 대응한다.
- 현재 실제 파일은 Hub **47/47**, Graph **28/28**, Fold **7/7**, Port **11/11** pin과 일치한다. 따라서 이전 검토의 Hub 4개 drift는 현재 불일치로 남아 있지 않다.
- 비교 가능한 이전 Workspace 소스·기존 테스트·scripts·bin·skill·패키지 설정은 앞선 continuation 결과와 일치한다. `src/workspace.mjs`는 당시 수정 후 hash `b0a1973af34c28f1c31ff590841151121ca5ac22bc76128b97526fb3680bbaca`를 유지한다. 새 회귀 파일은 현재 내용과 후속 전체 로그의 해당 항목을 대조했다.

원본 설계 hash도 현재 일치한다.

| 원본 | SHA-256 |
| --- | --- |
| `RUVORA_WORKSPACE_ARCHITECTURE.md` | `65ab1b7386af6c3fef7f91e96c2a6955eabc8d6382ee70c449c4f081530d2bb6` |
| `RUVORA_WORKSPACE_DESIGN.md` | `ce1d07114d1a58254126d890748fbeb5d5fc353244a007c157adf6f180585c2e` |

Lock의 commit은 기반 커밋이다. uncommitted 소스의 정확한 내용은 파일별 hash가 고정한다. **Pin 일치는 native handshake·API 호환·권한·원자성 검증이 아니다.** 이번에는 lock을 갱신하거나 제품 모듈을 import해 실행하지 않았다.

## 전체 회귀와 데모: 과거 실행을 이번에 관찰

| 저장 증거 | 이번에 읽은 원출력 | 현재 판단에 사용하는 범위 |
| --- | --- | --- |
| `incident-repair/full-tests.log` | tests 33, pass 33, fail/cancelled/skipped/todo 0, 1755.367417 ms. helpers 파일 항목 1개와 projection 세 회귀가 실제 목록에 있다. | projection 수정과 갱신된 모듈 이후 전체 회귀가 수행됐다는 근거. 이전 30+3을 계산해 만든 수치가 아니다. |
| `incident-repair/demo.log` | 확인 시각 `2026-09-06T05:54:10.627Z`, fixture operationCount 1, archive/restore applied, nativeThreadsCreated/nativeArchives 0, Port valid=true 및 nativeExecutable=false, G0/G3 unverified | 해당 수리 시점의 로컬 fixture 전체 흐름. native 성공 증거로 사용하지 않는다. |
| `incident-repair/source-pins.log` | 두 원본 hash 및 Hub 47/Graph 28/Fold 7/Port 11개 일치 | 당시 pin 검사. 현재 파일 비교 결과는 별도의 post-repair-audit에 둔다. |

당시 `node --test`와 demo의 exit 0은 [INCIDENT_REPAIR](INCIDENT_REPAIR_2026-09-06.md) 및 실행 플러그인 수리 문서의 **과거 실행 기록**에서 인용한다. 이번에는 저장된 원출력을 읽었으며 과거 명령의 종료 코드를 새로 관찰했다고 하지 않는다. 전체 테스트 종료 코드만으로 테스트 개수를 추정하지 않았다.

이번에는 테스트·데모·공식 Python 검증을 전혀 실행하지 않았다. 변경된 source pin과 현재 코드/저장 증거 사이에서 새 불일치가 발견되지 않았으므로 성공한 명령을 반복할 이유가 없다.

## Fold COV-01: 의존 제품의 수리 참고

Workspace의 독립 Fold 구현을 만들지 않고, 다음 형제 자료를 읽기 전용으로 대조했다.

- [COV01_REPAIR_2026-09-06.md](../../threadfold/docs/COV01_REPAIR_2026-09-06.md)
- `../../threadfold/src/model.js`의 `consolidate`, 87–89행
- `../../threadfold/test/core.test.js`의 `provenance, fixed sections, conflict and branch applicability survive consolidation`
- [coverage-fix-tests.log](../../threadfold/docs/verification/2026-09-06-continuation/coverage-fix-tests.log)

현재 코드는 발견된 `conflicts[].claimIds`를 집합으로 만들고 해당 coverage의 status를 `conflict`로 바꾼 뒤 새 결과를 seal한다. 대응 테스트는 충돌 상태와 비충돌 preserved 상태, 원문/evidenceRefs 및 원본 claims 보존을 확인한다. 저장 로그의 집계는 76 tests/76 pass/0 fail/cancelled/skipped/todo, 10798.561458 ms다. 이는 Fold 수리 때 실행된 결과이며 이번 Workspace 테스트 수치가 아니다.

따라서 **Workspace가 참조하는 Fold 버전에서는 COV-01 코드 보완과 그 과거 회귀 증거가 확인된다**. 해당 model hash가 현재 Workspace pin과 일치한다. 이 판단은 기존 발행된 consolidation의 coverage/digest를 소급 수정했다는 뜻이 아니며, Fold 제품 전체의 별도 수용 판정이나 native 통합 출시 판정을 대신하지 않는다. Fold의 코드·테스트·발행 기록은 이번에 변경·실행하지 않았다.

## 남은 한계와 다음 외부 계약

로컬 수용과 별도로 다음은 계속 **미검증**이다.

1. **실제 Hub 연결:** authenticated peer/instance reuse, host/project identity, durable dispatch idempotency와 Context Snapshot 소비. Source pin 일치는 이 계약의 대체물이 아니다.
2. **Native 정리·승인·복원:** trusted issuer, exact planDigest/effects/expiry, native Turn 시작과 공유하는 원자적 동기화·fencing, 실제 per-item reconciliation. Fixture 정리·복원 성공만 확인돼 있다.
3. **Port G0/G3:** 독립 이력, 공유 범위 밖 데이터 제거, 다른 PC/계정/app 발견·재시작·재개. Native export/import와 계정 간 이전 성공을 주장하지 않는다.
4. **호스트 설치/UI:** 실제 Workspace plugin loading·공존·제거, 내장 화면·탐색·클릭 및 활성 작업 유지 E2E. 실행 증거 플러그인의 수리 설치는 Workspace의 설치/UI 검증이 아니다.
5. **기존 로컬 한계:** Graph 정지 snapshot 및 branch 적용 근거 요구, Fold preview 응답 유실의 upstream idempotency/조회 계약 부재, 수동 후속 단계. 이를 지원하기 위한 새 scheduler나 별도 업무 그래프를 만들지 않는다.

구체적 계약은 [기존 구현 부록](IMPLEMENTATION_APPENDIX.md)의 최소 계약 표와 [contracts.d.ts](../src/contracts.d.ts)에 유지한다. 이번 작업으로 새 외부 구현을 시작하거나 이 gate들을 통과로 변경하지 않는다.

## 이번 변경과 보존

이번 추가물은 이 문서와 현재 파일 비교/보존 결과인 `docs/verification/post-repair-audit.json`, `docs/verification/post-repair-preservation.json`뿐이다. 제품 코드, lock, 기존 검토·원출력·발행 기록, `docs/source`는 수정하지 않는다. [보존 검사](verification/post-repair-preservation.json)는 이번 관찰 시 저장한 기존 파일 55개의 hash를 다시 비교한다. 이 검사는 성공 테스트 반복이 아니라 검토 작업의 파일 보존 확인이다.
