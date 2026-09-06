# 구현·검증 기록 — 2026-09-06

최종 코드의 Node 테스트 러너 결과는 **30 통과 / 0 실패 / 0 취소 / 0 skip / 0 todo**, 실행 시간 2053.617 ms다. 이 집계에는 Node가 발견한 `test/helpers.mjs` 파일 항목 1개도 포함된다. 수치는 실제 최종 TAP 출력에서 확인했다. 테스트 종료 코드 0만으로 개수를 추정하지 않았다.

실행 환경은 macOS 15.5 (`24F74`), Darwin arm64, Node `v24.19.0`이다. npm은 사용하지 않았다. 모든 코드는 현재 Workspace 레포에 추가했고 기존 `.gitignore` 및 원본 두 문서는 변경하지 않았다. 형제 제품 파일을 수정하거나 형제 테스트/구현/설치 작업을 실행하지 않았다. 새 native 스레드·위임·업무 DAG·daemon을 생성하지 않았다.

## 실제 실행 명령과 원출력

작업 디렉터리: `/Users/sin-yebin/Desktop/project/ruvora-workspace`.

| 실행 명령 | 실제 결과 | 저장한 원출력 |
| --- | --- | --- |
| `/Users/sin-yebin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test` | 최초 실행 exit 1, 러너 26개 중 24 통과·2 실패 | [test-initial.tap](verification/test-initial.tap), 이름은 tap이지만 최초 Node 기본 reporter 원문 |
| 같은 절대 Node 경로의 `--test --test-reporter=tap` | 1차 수정 exit 0, 28/28 | [test-after-fixes.tap](verification/test-after-fixes.tap) |
| 같은 명령, 실제 Graph schema 통합 추가 후 | exit 0, 29/29 | [test-review.tap](verification/test-review.tap) |
| 같은 명령, immutable Graph 및 transfer review 추가 후 | exit 0, 30/30 | [test-final.tap](verification/test-final.tap) |
| 같은 명령, transfer 취소 후 report 보존 수정 후 | exit 0, 30/30 | [test-release.tap](verification/test-release.tap) |
| `/Users/sin-yebin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --test-reporter=tap > docs/verification/test-verified.tap 2>&1` | **최종 exit 0, 30/30**, cleanup/restore 다음 행동 표시 회귀 포함 | [test-verified.tap](verification/test-verified.tap) |
| `/Users/sin-yebin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/demo.mjs > docs/verification/demo-verified.txt 2>&1` | exit 0, fixture operation 1개로 응답 유실 복구, Fold archive/restore 각각 applied, Port valid 및 nativeExecutable=false | [demo-verified.txt](verification/demo-verified.txt); 수정 전 최초 데모는 [demo.txt](verification/demo.txt)에 보존 |
| `/Users/sin-yebin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/verify-sources.mjs` | 두 원본 SHA 일치 및 Hub 47 / Graph 28 / Fold 7 / Port 11개 pin 파일 일치 출력 확인 | [source-integrity.txt](verification/source-integrity.txt) |
| `/tmp/ruvora-plugin-validation/bin/python /Users/sin-yebin/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py /Users/sin-yebin/Desktop/project/ruvora-workspace` | exit 0, Plugin validation passed | [plugin-validation.txt](verification/plugin-validation.txt) |
| `/tmp/ruvora-plugin-validation/bin/python /Users/sin-yebin/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/ruvora-workspace` | exit 0, Skill is valid | [skill-validation.txt](verification/skill-validation.txt) |

테스트 안에서 `spawnSync(process.execPath, [...bin/workspace.mjs, --project, temp, inspect])`와 `bin/launch-mcp`를 실제 실행했다. CLI 한국어 보고서 및 MCP initialize 응답을 확인했다. fixture/module 테스트는 임시 디렉터리를 사용하고 종료 시 정리한다. source pin 검증은 파일 내용 비교이며 실제 native 서비스 handshake 증거가 아니다.

추가 확인: `git diff --exit-code -- docs/source/RUVORA_WORKSPACE_DESIGN.md docs/source/RUVORA_WORKSPACE_ARCHITECTURE.md`와 `git diff --check`를 수행한 shell의 exit는 0이고 명시적 출력 문자열은 비어 있었다. 두 원본의 byte 보존은 별도의 SHA 비교도 뒷받침한다. 신규 코드·설정·문서 대상으로 Python의 trailing-whitespace/final-newline 검사를 수행하여 당시 25개 파일 통과를 관찰했다. 이 검사는 그 뒤 추가한 본 검증 기록까지 포함했다고 주장하지 않는다.

## 발견한 결함과 수정

| 발견 경로 | 결함 | 수정과 확인 |
| --- | --- | --- |
| 최초 테스트 실패 | pin 경로의 일부 파일이 없으면 일반 ENOENT여서 버전 불일치와 구분하지 못함 | 존재하는 모듈 루트 안의 누락 pin을 COMPONENT_MISMATCH로 분류. module mismatch 회귀 통과 |
| 최초 테스트 실패 | Workspace Port 테스트가 synthetic fixture의 `turnId`를 사용했으나 실제 계약은 `turns[].id` | 실제 소스 fixture를 재확인해 정확한 boundary ID 사용. Port의 BOUNDARY_INVALID 검사를 완화하지 않음 |
| 자체 코드 검토 | 디렉터리 생성 뒤 symlink 검사하면 외부 경로에 먼저 하위 폴더가 생길 수 있음 | 경로 segment마다 기존 symlink를 거절한 뒤 하위 폴더 생성. 외부 디렉터리 변화 0 회귀 통과 |
| 자체 코드 검토 | 저장된 review 읽기에서 삭제된 fixture inventory가 재생성될 수 있음 | 읽기와 최초 생성 구분, 기존 제품 파일 없으면 PRODUCT_DATA_UNAVAILABLE. 재시작 읽기에서 재생성 없음 확인 |
| 실제 SQLite 진단 | readOnly 연결도 정지된 WAL-mode DB 옆에 WAL/SHM을 생성함 | [관찰 원문](verification/sqlite-observation.txt) 보존. immutable URI 및 sidecar 차단, 전후 원본 digest 검사. 실제 GraphRegistry schema의 임시 DB에서 파일 목록과 digest 불변 검증 |
| 자체 복구 검토 | Fold apply 결과가 Workspace에 연결되기 전 종료되면 retry 키 연결이 불명확함 | applyIntent를 먼저 저장하고 같은 키만 허용. 소유 Fold가 동일 operation을 복구하도록 유지 |
| 자체 복구 검토 | Fold restore preview의 결과 유실 후 blind 재시도로 계획이 중복될 수 있음 | restorePending intent 저장, unknown preview 재실행 차단. 자동 복구에 필요한 upstream 최소 계약은 부록에 명시 |
| 사용자 흐름 검토 | transfer 검토 후 취소해도 attention 표시가 취소 상태를 덮음 | cancelled projection 유지, 저장된 inspection은 계속 읽힘을 검증 |
| 데모 원출력 검토 | 정리·복원이 완료돼도 다음 행동 문구가 ‘정리안 요청’으로 남음 | Fold/restore operation 결과를 projection에 반영. 최종 데모와 테스트에서 Restore completed 및 원기록 보존 확인 |

수정 전 실패 로그를 삭제하거나 성공 로그로 덮어쓰지 않았다. 중간 출력도 함께 남겼다. 한 번의 patch 도구 호출은 동일 파일을 중복 대상으로 지정하여 적용 전에 거절됐고, 한 파일 변경으로 합쳐 다시 적용했다. 그 거절은 테스트 실행이나 파일 변경 성공으로 집계하지 않았다.

## 검증이 의미하는 범위

- fresh open은 기록을 생성하지 않으며 capability 미지원과 아직 분석하지 않음을 구분한다.
- context는 현재 프로젝트·branch·revision·evidence digest를 검사한다. unknown branch와 충돌, 변경된 근거를 차단한다. semantic 품질 benchmark는 수행하지 않았다.
- 동일 요청·재시작·응답 유실에서 fixture operation은 하나다. 원격 Hub의 idempotency, 실제 Context Snapshot 소비 및 single writer는 아직 검증하지 않았다.
- 실제 Fold 소스의 fixture engine으로 대표 기록 보호, 승인 digest/kind 검사, 승인 후 activeTurn 변경 차단, 부분 성공, 별도 restore를 확인했다. native atomic cleanup을 증명하지 않는다.
- 실제 Port 모듈의 synthetic package 검사·경로 제한을 통과했다. G0/G3는 여전히 미검증이고 nativeExecutable=false다. 원문 세션 이전, 계정/PC 간 재개, 비밀 탐지 성공을 주장하지 않는다.
- plugin/skill 검사와 stdio smoke는 구조·로컬 protocol 검사다. 실제 앱 설치, 플러그인 간 연결, 내장 패널, 클릭, native 탐색은 수행하지 않았다.
- 재오픈 후 fixture work 유지와 제거 hook 부재를 확인했다. 실제 활성 Hub 작업을 둔 native uninstall E2E는 남아 있다.

## 산출물과 외부 의존성

실행 진입점은 `bin/workspace.mjs`, `bin/launch-mcp`; 제품 연결은 `src/components.mjs`; 사용자 흐름은 `src/workspace.mjs`; closed tool surface는 `src/tools.mjs`; 저장·계약·MCP·보고서는 `src/store.mjs`, `src/contracts.mjs`, `src/contracts.d.ts`, `src/mcp.mjs`, `src/report.mjs`다. `src/fixture.mjs`는 계약 double이며 업무 엔진이 아니다. `scripts/`와 `test/`가 로컬 실행·검증 경로를 제공한다.

남은 외부 의존성은 (1) 검증된 Hub peer/reuse·dispatch/context adapter, (2) native 승인 issuer와 원자적 Fold cleanup 계약, (3) Port G0/G3, (4) native UI·설치·공존·제거 E2E, (5) 실제 배포용 동일 모듈 번들과 업그레이드 정책이다. 세부 입출력은 [구현 부록](IMPLEMENTATION_APPENDIX.md)에 고정했다. 이 관문을 fixture로 대체 통과 처리하지 않는다.
