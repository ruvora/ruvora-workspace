# 한국어 사용법

현재 실행 가능한 것은 로컬 CLI와 MCP gateway다. 기본 모드는 production이며 호스트 연동이 확인되지 않은 기능은 차단된다. `scripts/demo.mjs`는 기존 Fold·Port 코드를 재사용하는 **fixture 시연**이고 실제 스레드나 작업을 만들지 않는다.

## 바로 실행

프로젝트 루트에서 다음을 실행한다. npm 설치는 필요 없다.

```sh
RUVORA_NODE=/Users/sin-yebin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
"$RUVORA_NODE" bin/workspace.mjs inspect
"$RUVORA_NODE" scripts/demo.mjs
"$RUVORA_NODE" --test --test-reporter=tap
```

첫 명령은 연결 상태, 주의할 일, 작업, 맥락과 남은 행동을 표시한다. 처음 연 프로젝트에서는 새 폴더·스레드·인덱스를 만들지 않는다. 데모는 임시 디렉터리에서 맥락 선택→가상 작업 요청→응답 유실/재연결→수동 정리안→fixture 승인→archive→별도 restore 승인→Port 패키지 검사를 실행하고, 임시 디렉터리를 정리한다. 출력의 `fixture`는 실제 Hub 실행 성공을 뜻하지 않는다.

macOS 15.5 arm64 / Node 24.19.0에서 검증했다. 다른 환경에서는 `RUVORA_NODE`를 해당 Node 24 이상 실행 파일로 지정한다. 통합 테스트와 데모는 현재 레포 옆의 `codex-threadgraph`, `threadfold`, `threadport`가 lock과 같은 소스여야 한다. 모듈 불일치는 무시하거나 자동 업그레이드하지 않는다.

## 프로젝트 설정

아래 경로와 ID를 실제로 선택한 프로젝트에 맞춘다. 호스트 ID와 canonical project ID는 표시 이름과 다른 값이다.

```sh
"$RUVORA_NODE" bin/workspace.mjs --project /absolute/project init \
  '{"mode":"production","profile":{"hostId":"local","canonicalProjectId":"my-project-id","displayName":"내 프로젝트","branch":"main"}}'
"$RUVORA_NODE" bin/workspace.mjs --project /absolute/project capabilities
```

설정은 해당 프로젝트의 `.ruvora-workspace/config.json`, Workspace 기록은 `state.json`에 저장된다. 동일 설정의 init 재호출은 재사용한다. ID·경로·branch·mode 변경을 migration으로 간주해 자동 덮어쓰지 않는다. fixture 실험은 별도 임시 프로젝트를 사용한다. 현재 native 실행 권한·서버 인증 값을 설정에 넣을 필요가 없다.

영문 README의 optional fields를 init JSON에 추가하면 Graph snapshot과 기존 Fold/Port 소스를 지정할 수 있다. Graph는 **정지된 schema 4 published snapshot**만 지원한다. WAL/SHM/journal 파일이 남은 DB, 16 MiB 초과, scope 불일치는 거절한다. Workspace가 live DB를 checkpoint하거나 복사하지 않는다. 모듈 경로는 사용자 로컬 설정이며 모델 도구 입력으로 임의 모듈을 실행할 수 없다.

## 일상 흐름

1. `workspace_inspect_workspace`로 현재 상태를 읽는다. `workspace_graph_read`는 이미 발행된 revision만 읽는다. 최신 대화 재분석은 별도 기능이며 현재 호스트 refresh는 미지원이다.
2. `workspace_select_context`에 실제 반환된 revision, evidence ID 목록, 선택 이유를 전달한다. 오래됨, 적용 branch, 출처, 충돌을 확인한다. `acceptStale:true`는 오래된 근거를 선택한다는 뜻일 뿐 다른 검사를 생략하지 않는다.
3. `workspace_prepare_workflow`에 `intent:work`, request, stable requestId 및 선택한 contextId를 전달한다. 구현 요청 범위에서 `workspace_hub_dispatch`를 호출한다. 현재 production은 `HUB_DISPATCH_UNSUPPORTED`, fixture는 가상 operation만 반환한다.
4. 같은 workflowId의 `workspace_get_workflow`를 읽는다. timeout이나 재시작 때문에 새 requestId를 만들지 않는다. 결과가 불명확하면 attention 상태를 조사한다.
5. 완료 작업의 `workspace_fold_preview`로 계획·대표 기록·제외 사유·예상 영향을 검토한다. `workspace_review_coverage`는 새 revision을 만들 뿐 승인하지 않는다. CLI/MCP는 승인 receipt를 발급하지 않는다. 실제 archive/restore는 미지원이며 fixture 테스트만 별도 issuer를 사용한다.
6. `workspace_cancel_workflow`의 `target:followup`과 `target:running_work`를 구분한다. 전자는 아직 시작하지 않은 단계 취소, 후자는 실행 중 작업 중단 요청이다. 이미 성공한 결과는 유지된다.
7. `workspace_port_preview`에 프로젝트 상대 경로의 synthetic 패키지를 전달하면 정적으로 검사한다. 준비한 `intent:transfer`의 workflowId를 함께 주면 검토 카드가 남는다. G0/G3 미검증으로 native 내보내기·가져오기·실행은 계속 차단된다.

CLI에서 도구를 직접 호출하는 형식:

```sh
"$RUVORA_NODE" bin/workspace.mjs call workspace_prepare_workflow \
  '{"intent":"work","request":"선택한 변경 구현","requestId":"my-request-001","followupCleanup":true}'
"$RUVORA_NODE" bin/workspace.mjs call workspace_get_workflow \
  '{"workflowId":"앞_명령에서_반환된_ID"}'
```

후속 정리안을 요청해도 백그라운드에서 자동 계속하지 않는다. 작업 완료 뒤 사용자의 다음 상호작용에서 미리보기를 실행한다. `intent:cleanup`으로 준비한 ticket은 완료 작업 선택을 안내하며 실제 정리 review는 선택한 work ticket에 연결한다.

## MCP 연결과 제거

```sh
CODEX_MCP_NODE_PATH="$RUVORA_NODE" RUVORA_PROJECT_ROOT=/absolute/project ./bin/launch-mcp
```

이 프로세스는 stdin/stdout JSON-RPC다. 브라우저 서버를 열지 않는다. 플러그인 manifest와 skill 검증은 통과했지만 실제 Codex 설치·내장 화면·클릭은 검증하지 않았다. 현재 작업에서 marketplace 등록이나 다른 플러그인 비활성화는 수행하지 않았다.

제거는 gateway 연결 해제로 한정한다. `.ruvora-workspace`와 형제 제품 저장소를 삭제하지 않고 활성 Hub 작업을 종료하지 않는다. 삭제·이동·업그레이드 자동화는 없다.

## 오류와 복구

| 표시 / 코드 | 의미와 다음 행동 |
| --- | --- |
| 아직 분석 안 함 | 연결할 Graph 또는 published revision이 없음. 화면 조회로 인덱스를 자동 만들지 않음 |
| `COMPONENT_MISMATCH` | pin과 다른 파일 또는 누락 파일. 해당 제품 버전과 lock을 별도 검토해야 함 |
| `GRAPH_SNAPSHOT_REQUIRED` | live SQLite sidecar 감지. 소유 제품이 제공한 일관된 정지 snapshot 필요 |
| `STALE_CONTEXT` / `STALE_REVISION` | 오래되거나 바뀐 근거. 최신 출처 확인 후 다시 선택 |
| `BRANCH_APPLICABILITY_UNVERIFIED` / `CONTEXT_CONFLICT` | 적용 근거 부족·충돌. 임의로 통합하거나 자동 선택하지 않음 |
| `WORKSPACE_BUSY` | writer.lock 존재. 기록된 PID가 종료됐는지와 product intent를 먼저 확인. 자동 lock 강탈 없음 |
| `PREVIEW_RECONCILIATION_REQUIRED` | Fold preview가 실행됐는지 확정 불가. 저장된 Fold 계획을 조사하기 전 재요청 금지 |
| `attention` / `partial` | 결과 미확정 또는 일부만 성공. 제품 operation을 확인하고 이미 성공한 부분은 보존 |
| `TRUSTED_APPROVAL_UNAVAILABLE` | native 승인·원자성 미검증. 모델이 receipt를 만들거나 우회 호출하지 않음 |
| `PORT_G0_G3_UNVERIFIED` | native 이전 출시 기준 미통과. 검사 결과를 세션 이전 성공으로 표현하지 않음 |

남은 호스트 계약과 출시 관문은 [구현 부록](IMPLEMENTATION_APPENDIX.md), 실제 실행 원출력과 결함 수정은 [검증 기록](VERIFICATION.md)을 확인한다.
