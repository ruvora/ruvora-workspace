# Workspace 최종 로컬 수용 검토 — 2026-09-06

## 판단과 범위

**기존 네 기준은 아래 한계를 명시한 로컬 범위에서 수용한다.** 이번 검토에서 발견한 상태 projection 결함 1건은 최소 수정하고 새 회귀 검사로 확인했다. 검토한 로컬 기준 중 남겨 둔 미충족 항목은 없다. Native 출시, 현재 Hub 소스와의 통합 호환, 실제 설치/UI 성공을 뜻하지 않는다.

검토 대상은 현재 Workspace 파일과 저장된 과거 원출력이다. 기존 구현을 다시 만들지 않았고 전체 테스트·데모·공식 Python 검증을 재실행하지 않았다. 제품 코드는 `src/workspace.mjs`의 상태 projection만 수정했다. 실행 증거 판정 플러그인, manifest/MCP 설정/skill, 형제 프로젝트, 실제 스레드·registry는 변경하지 않았다. 설치·게시·커밋·push 및 새 스레드·fork·위임·작업 그래프 생성도 하지 않았다.

과거 실패 판정의 식별자는 다음과 같으며 그대로 유지한다.

- task: `task_90d2f381-a702-4534-a685-308f16d27764`
- run: `run_9e708d87-fcf7-4cde-b7ed-70a3cad70e7e`
- Turn: `01a074ff-b785-7ba3-8910-75d440789d2a`

읽기 전용 참조: `../../codex-control-plane/docs/EVIDENCE_RECONCILIATION_2026-09-06.md` 및 `../../codex-control-plane/docs/INCIDENT_CONTINUATION_2026-09-06.md`. 전자는 Workspace validation 입력 크기 초과와 증거 판정 수정, `0.14.0+172588febcab` 배포를 기록하지만 제품 수용 판정을 하지 않았다고 명시한다. 그 기록의 369/373개 테스트와 설치 성공은 다른 프로젝트의 과거 기록이다. 이번 Workspace 검사나 출시 증거로 전용하지 않았다. 본 문서는 현재 로컬 산출물의 검토 판단이며 과거 Run 판정을 소급 변경하지 않는다.

## 기준별 대조

| 이전 기준 | 판단 | 현재 파일·과거 원출력 근거 | 한계 / 미충족 구분 |
| --- | --- | --- | --- |
| 두 원본 설계를 완독·보존하고 빈틈을 새 구현 부록에서 명시한다. | **수용** | 이 구현 스레드의 이전 작업에서 두 원본 전체를 읽었다. 이번 SHA 검사에서 `docs/source/` 두 문서가 기존 pin과 모두 일치했다. [구현 부록](IMPLEMENTATION_APPENDIX.md)의 12개 구현 결정과 최소 호스트 계약이 identity, resolver, Graph 읽기, 승인, 재시도, 저장, Port gate를 명시한다. | 이번에 원본을 새로 작성하거나 기획 당시 상태/HEAD를 갱신하지 않았다. 현재 바이트 보존은 새 검사, 완독은 이 스레드의 이전 작업 기록과 구분한다. |
| 원본 주요 흐름을 실행 가능한 로컬 구현으로 제공하고 실제 지원 및 미지원 통합을 구분한다. | **한계를 명시한 로컬 수용** | [CLI](../bin/workspace.mjs), [MCP](../src/mcp.mjs), [도구 스키마](../src/tools.mjs), [Workspace](../src/workspace.mjs), [components](../src/components.mjs). 과거 [최종 데모](verification/demo-verified.txt)는 fixture work 1개, 정리/복원 applied, Port synthetic 검사 valid 및 nativeExecutable=false를 출력했다. | Hub는 업무 엔진이 아닌 fixture double, Fold는 pinned fixture 모듈, Port는 static synthetic 검사다. Graph는 immutable 정지 snapshot 읽기만 지원한다. 실제 작업·refresh·native 변경/탐색은 미지원이며 성공으로 세지 않는다. 이번에는 데모를 다시 실행하지 않았다. Hub pin drift는 아래 별도 한계다. |
| 적절한 테스트와 자체 검토를 수행하고 발견된 결함 수정 및 원출력 증거를 기록한다. | **수용** | 과거 [초기 실패](verification/test-initial.tap)는 26개 중 24 pass/2 fail, [최종 TAP](verification/test-verified.tap)은 30 pass/0 fail이다. 기존 [검증 기록](VERIFICATION.md)의 결함 설명을 해당 소스·테스트와 대조했다. 이번에는 정리 상태가 작업 연결 실패를 덮는 결함을 새 테스트로 재현하고 수정했다. [수정 전](verification/continuation-projection-before.tap) 3 fail → [수정 후](verification/continuation-projection-after.tap) 3 pass. | 과거 30개에는 helpers 파일 발견 항목 1개가 포함된다. 이번 3개는 별도 projection 회귀 검사다. **현재 전체 suite가 33개 통과했다고 주장하지 않는다.** 과거 로그 자체는 이번 실행의 종료 코드 증거가 아니며, 기존 exit 기록과 이 스레드의 당시 도구 결과를 과거 근거로만 사용한다. |
| 영문 README와 한국어 사용법 및 남은 검증 게이트를 제공하고 타 프로젝트 작업을 중복 실행하지 않는다. | **수용** | [영문 README](../README.md), [한국어 사용법](USAGE_KO.md), [구현 부록](IMPLEMENTATION_APPENDIX.md), [이전 검증 기록](VERIFICATION.md)에 로컬 실행·범위·복구·배포 한계가 있다. CLI의 인자/환경 변수, 도구 이름, 차단 코드와 문서를 대조했다. 기존 plugin/skill validation 로그도 보존했다. | 문서의 검증 완료 표현은 이전 작업 시점의 로컬 검사다. 이번 실행에서는 공식 validator나 설치를 반복하지 않았다. 기존 README·문서는 덮어쓰지 않고 현재 보충 판단은 이 문서에 둔다. |

## 최종 테스트 이후 lock 변경과 현재 pin

가장 먼저 절대 Node 실행 파일로 `workspace-lock.json`을 JSON.parse하고 원본 및 모든 pin 파일의 SHA-256을 비교했다. 결과는 새 파일 [continuation-lock-audit.json](verification/continuation-lock-audit.json)에 저장했다. 이 파일에는 검토 시작 시 기존 Workspace 파일별 hash도 포함된다.

이 스레드의 과거 편집 기록상 최종 테스트 뒤 lock 변경은 `supportedHostMatrix[0].cli`를 검증 환경 설명으로 바꾼 것이다. 이는 실행 코드 변경이나 source pin 재계산이 아니다. 다만 테스트 직전 lock의 독립 파일 snapshot은 없으므로 현재 파일만으로 당시 lock 전체의 byte diff를 다시 증명했다고 하지는 않는다. 이번 새 검사에서 JSON 유효성 및 현재 pin 비교를 별도로 확인했다. **이번에는 lock을 수정하지 않았다.**

| 대상 | 새 검사 결과 | 처리 |
| --- | --- | --- |
| 원본 Architecture | SHA `65ab1b7386af6c3fef7f91e96c2a6955eabc8d6382ee70c449c4f081530d2bb6`, 일치 | 보존 |
| 원본 Design | SHA `ce1d07114d1a58254126d890748fbeb5d5fc353244a007c157adf6f180585c2e`, 일치 | 보존 |
| Graph | 28/28 pin 일치 | source drift 없음 |
| Fold | 7/7 pin 일치 | source drift 없음 |
| Port | 11/11 pin 일치 | source drift 없음 |
| Hub | 43/47 pin 일치, 4개 불일치 | 현재 Hub 통합 호환은 수용하지 않음. 자동 repin·업그레이드 없이 과거 lock 보존 |

Hub 불일치 파일은 `src/command-evidence.js`, `src/failure-classifier.js`, `src/native-evidence.js`, `src/result-validator.js`다. 정확한 예상/현재 hash는 audit JSON에 있다. 읽기 전용 reconciliation 문서의 증거 처리 변경 영역과 부합하지만, hash 비교만으로 모든 변경의 작성자나 원인을 증명하지는 않는다.

새 불확실성인 drift 차단을 확인하기 위해 `verifyComponent('hub', '/Users/sin-yebin/Desktop/project/codex-control-plane')`만 호출했다. 실제 `COMPONENT_MISMATCH` 거절을 [continuation-hub-gate.json](verification/continuation-hub-gate.json)에 저장했고 검사 명령은 exit 0이었다. Hub 소스 import·daemon 연결·registry 호출은 하지 않았다.

기존 [source-integrity.txt](verification/source-integrity.txt)의 Hub 47/47은 **당시 기록**이며 지금의 결과가 아니다. `scripts/verify-sources.mjs`는 현재 Hub부터 차단될 것으로 코드상 예상되지만 이번에 그 전체 script를 재실행하지는 않았다. 현재 Workspace는 native Hub adapter를 갖고 있지 않고 fixture Hub를 사용하므로, Hub drift를 그 fixture의 새 코드 실패로 혼동하지 않는다. Graph/Fold/Port pin 일치도 기존 전체 테스트의 재실행을 의미하지 않는다.

## 새로 발견한 로컬 결함과 최소 수정

`Workspace.projectTicket`은 Hub 관찰 실패를 `attention`으로 표시한 뒤, 아래 review 분기에서 이를 `waiting_user` 또는 `completed`로 덮고 있었다. 과거의 disconnect 테스트는 정리 review가 없는 경우였으므로 이 조합을 검증하지 않았다. 원본 설계의 ‘연결 끊김은 성공이 아님’과 README의 unknown 상태 설명에 어긋나는 실제 로컬 결함이다.

새 [continuation-projection.test.mjs](../test/continuation-projection.test.mjs)는 preview/archive/restore 세 상태에서 Hub 관찰 실패를 주입한다. 수정 전 실제 결과는 각각 waiting_user/completed/completed여서 세 검사 모두 실패했다. 테스트용 메모리 observation만 사용하며 디렉터리·제품 operation·스레드·승인·native archive를 만들지 않는다.

최소 수정은 `src/workspace.mjs`의 `projectTicket`에 관찰 실패 여부를 보존하고, review 표시 이후 전체 상태를 attention으로 유지하는 것이다. 확인된 cleanup/restore 결과는 화면에 남기고 다음 행동은 재연결·재조회로 바꾼다. 재연결 후 오류가 없어지고 정상 completed/waiting_user로 돌아오는 것, inspect의 주의 목록에 포함되는 것, 원기록 무변경도 같은 세 검사에서 확인했다. 수정 전 소스 바이트는 [continuation-workspace-before.txt](verification/continuation-workspace-before.txt)에 별도로 보존했다.

이번에 실제 실행한 테스트 명령은 두 번이며 출력 대상만 다르다.

```sh
/Users/sin-yebin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --test-reporter=tap test/continuation-projection.test.mjs > docs/verification/continuation-projection-before.tap 2>&1
/Users/sin-yebin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --test-reporter=tap test/continuation-projection.test.mjs > docs/verification/continuation-projection-after.tap 2>&1
```

수정 전 exit 1, 3 tests/0 pass/3 fail/0 skip. 수정 후 exit 0, 3 tests/3 pass/0 fail/0 skip, 54.590666 ms. 발견한 결함의 범위와 정상 복구를 직접 검증했으므로 전체 suite나 과거 성공 데모는 반복하지 않았다. 이 수정으로 native 연결 검증 범위를 넓히지는 않았다.

## 남은 외부 계약과 출시 게이트

다음은 로컬 수용의 미충족 항목으로 전환하지 않지만 **모두 출시 관문으로 남는다**.

1. **Hub 연결:** 인증된 peer/instance handshake, host/project identity, 현재 버전 검토, durable dispatch idempotency 및 context snapshot 소비. 현재 4개 pin drift를 별도 통합 작업에서 검토한 뒤에만 lock 갱신 여부를 결정할 수 있다.
2. **정리·승인·복원:** trusted issuer와 exact plan/effects/expiry 검증, native Turn 시작과 같은 경계의 원자적 cleanup, fencing 및 authoritative per-item reconciliation. fixture 성공으로 실제 호스트 원자성·승인·복원을 수용하지 않는다.
3. **Port:** G0 독립 이력·범위 밖 데이터 제거, G3 다른 PC/계정/app의 실제 발견·재시작·재개. native export/import, 계정 간 이전과 코드 실행은 미검증이다.
4. **설치와 UI:** 실제 host loading, plugin 공존, native 패널·탐색·클릭, 활성 작업이 있는 설치/제거 E2E. 과거 구조 검사는 이 관문의 증거가 아니다.
5. **이미 명시된 로컬 한계:** Graph는 정지된 snapshot만 읽고 branch 근거가 없으면 선택을 차단한다. Fold preview 응답 유실의 자동 복구는 upstream idempotency 계약이 없어 차단 상태를 유지한다. followup은 수동이며 별도 scheduler를 만들지 않는다.

최소 입출력 계약은 기존 [src/contracts.d.ts](../src/contracts.d.ts) 및 구현 부록의 ‘호스트가 제공해야 할 최소 계약’에 있다. 이번 검토는 이를 새로 구현하거나 형제 프로젝트에 변경을 요청하는 작업을 시작하지 않았다.

## 보존 및 변경 범위 확인

검토 시작의 audit baseline과 비교하는 마감 검사를 [continuation-preservation.json](verification/continuation-preservation.json)에 별도로 남긴다. 기존 파일에서 허용한 변경은 `src/workspace.mjs` 하나뿐이며, 그 수정 전 snapshot은 baseline hash와 비교한다. 원본 설계, 기존 README·문서·성공/실패 로그, lock, plugin 설정·skill, 기존 테스트는 그대로 보존한다. 새 산출물은 이 검토 문서, 회귀 테스트, continuation 접두어의 검증 자료뿐이다.
