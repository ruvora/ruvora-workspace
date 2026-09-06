# RUVORA Workspace 통합 아키텍처 v0.2

작성일: 2026-09-06. 상태: 기획·미구현. 상위 제품명은 RUVORA Workspace로 확정했다. 플러그인 ID `ruvora-workspace`는 구현 시 검증할 제안이다. 사용자 경험·출시 범위는 [Workspace 제품 기획](RUVORA_WORKSPACE_DESIGN.md)을 따른다.

## 1. 하나의 제품 경험

사용자는 네 플러그인의 이름이나 도구를 외우지 않고 “이 프로젝트의 관련 맥락으로 작업하고, 끝나면 정리안을 보여줘”라고 요청한다. Workspace는 요청을 올바른 제품에 연결하고 진행·승인·결과를 한곳에서 보여준다.

| 의도 | 소유 제품 | 기본 행동 |
| --- | --- | --- |
| 무엇을 알고 있는지, 어떤 스레드가 관련 있는지 | Graph | 현재 revision 분석·조회 |
| 실제 조사·구현·검증 작업 시작 | Hub | 명시적 실행 범위로 dispatch |
| 완료된 작업의 맥락 통합·정리 | Fold | 승인 전 preview-only |
| 내 세션을 다른 환경으로 전달 | Port | 지원 검사·내보내기 preview |

Workspace는 다섯 번째 작업 오케스트레이터가 아니다. Run/Task DAG, lease, 완료 판정은 Hub에만 있다. Workspace의 WorkflowTicket은 제품 간 연결과 사용자 확인 단계만 기록한다.

## 2. 배포 결정 제안

단독 네 플러그인은 유지하고, Workspace는 같은 소스 모듈의 검증된 버전을 조립한 별도 배포 패키지로 만든다. 목표는 네 플러그인의 기능을 한 번의 Workspace 설치로 제공하는 것이다.

단순한 manifest `dependencies` 선언으로 다른 플러그인이 자동 설치·호출될 것이라고 가정하지 않는다. 공식 패키징 문서에서 확인한 기본 구성은 manifest, skills, bundled MCP 등이다. 따라서 릴리스 시 필요한 모듈을 Workspace 안에 포함하는 구조를 제안한다.

```text
ruvora-workspace/
├── .codex-plugin/plugin.json
├── .mcp.json
├── skills/ruvora-workspace/SKILL.md
├── gateway/
├── modules/{hub,graph,fold,port}/
├── assets/
└── workspace-lock.json
```

이는 설계상의 파일 배치이지 이번 작업에서 생성한 플러그인이 아니다. `workspace-lock.json`은 RUVORA 자체 빌드 자료이며 Codex 공식 manifest 필드가 아니다. component version/commit/digest, protocol range, supported host matrix를 기록한다.

Workspace의 단일 로컬 MCP gateway가 제품별 API를 명시적 allowlist로 전달한다. 중첩된 플러그인이 자동 검색될 것이라 가정하지 않으며, 구성 모듈의 시작·연결·버전 확인은 gateway의 명시적 adapter가 담당한다. MCP 도구의 동적 추가·제거에 의존하지 않고 릴리스별 정적 도구 표면을 제공한다.

개별 제품과 Workspace는 실행 코드를 별도 복제 개발하지 않는다. 원본 레포에서 빌드된 동일 모듈을 이용하며 기능 수정은 해당 제품 소스에서 한다.

## 3. 중복 실행·설치 충돌

개별 Hub와 Workspace가 동시에 설치돼도 두 Hub 데몬이 같은 Registry를 쓰면 안 된다.

제안된 Component Resolver는 로컬 사용자 데이터 영역의 component endpoint와 프로세스 잠금, handshake를 검사한다. handshake에는 componentId, instanceId, protocolVersion, binaryDigest, dataSchemaVersion, capabilities가 있다.

- 호환되는 기존 Hub가 있으면 연결한다. 필요하면 한 프로세스만 시작한다.
- 호환되지 않으면 기능을 unavailable로 표시한다. 자동 종료·강제 업그레이드·두 번째 writer 실행은 금지한다.
- 동일 ThreadFold/Graph/Port 데이터에도 제품별 단일 writer 정책을 적용한다.
- 설치돼 있는 개인 플러그인을 자동 비활성화하거나 기존 MCP namespace를 변경하지 않는다.
- 단독 모드 → Workspace 전환은 명시적 migration preview로 진행하고, 활성 작업은 유지한다.

Component Resolver는 endpoint 발견과 호환성 확인만 맡으며 별도 업무 daemon이 아니다. 로컬 RPC는 사용자 전용 권한과 peer/credential 검증을 적용한다. endpoint 파일에 쓰여 있다는 이유만으로 신뢰하지 않는다. 이 handshake·재사용 계약은 아직 기존 제품에 구현됐다고 가정할 수 없다.

## 4. 공통 계약

모든 제품 메시지에는 다음 envelope를 제안한다.

```json
{
  "contractVersion": "ruvora.interop/1",
  "requestId": "opaque-id",
  "operationKind": "fold.preview",
  "scope": {"hostId": "local", "canonicalProjectId": "project-id"},
  "expectedRevision": "revision-id",
  "payload": {}
}
```

경로는 프로젝트 ID에서 추측하지 않고 호스트가 선택한 별도 검증 값으로 전달한다. 쓰기 요청은 operationKind별 ApprovalReceipt와 idempotencyKey를 추가한다. API 호환성은 SemVer 추측만으로 결정하지 않고 contract major 및 capabilities를 검증한다.

| 데이터 | 소유자 | 다른 제품의 사용 |
| --- | --- | --- |
| Run·Task·실행권·결과 판정 | Hub | revision 있는 조회·명시적 요청 |
| GraphRevision·추론·인덱스 | Graph | immutable revision 참조 |
| 통합 기록·FoldPlan·정리 저널 | Fold | 명시적 revision/digest 참조 |
| Export/ImportPlan·패키지·이전 계보 | Port | 승인된 package metadata 참조 |
| 사용자 흐름과 연결 상태 | Workspace | product operation ID를 가리키는 projection |

Workspace DB는 authoritative task status의 복사본이 아니다. 화면 캐시는 observedAt과 freshness를 표시한다. 제품과 연결이 끊기면 unknown/disconnected이지 성공이 아니다.

## 5. 라우팅과 승인

- “설명·비교·진단”은 읽기 요청이며 Hub dispatch를 발생시키지 않는다.
- “정리해줘”는 Fold 미리보기를 생성한다. 실제 아카이브에는 정확한 effect set 승인이 필요하다.
- “옮겨줘”는 Port 범위와 호환성 검사다. 패키지 생성, 외부 전송, 가져오기, 실행은 각각 다른 효과다.
- 의도가 여러 개면 WorkflowTicket에 명시된 단계만 기록하고 필요한 승인 지점에서 멈춘다.
- 승인 receipt는 발급 주체가 검증 가능해야 하며 operationKind, planDigest, effect set, actor, expiry에 묶인다. 다른 제품으로 전용할 수 없다.
- 호스트 신뢰 승인 어댑터가 없으면 변경 기능은 preview-only다. 모델이 임의로 승인 토큰을 구성하지 못하게 한다.

자연어 gateway는 임의 도구 이름·URL·명령을 전달하는 범용 프록시를 노출하지 않는다. 각 작업의 스키마와 최대 권한을 코드로 고정한다. lower-level API도 자체 권한 검사를 하므로 Workspace 우회가 권한 상승으로 이어지지 않는다.

## 6. 대표 사용자 여정

### 관련 맥락에서 작업하고 정리안 받기

1. Graph의 현재 revision을 조회한다. 인덱스 갱신이 필요하면 명시적 refresh 요청을 받는다.
2. Hub가 선택한 맥락과 출처를 Context Snapshot으로 고정하고 작업한다.
3. Workspace가 Hub의 대표 작업 링크·진행·실패 상태를 보여준다.
4. 사용자가 처음부터 후속 정리안을 요청했을 때만 완료 후 Fold preview를 만든다. 후속 실행은 Hub 이벤트 또는 호스트의 지원되는 예약 실행 수단으로 연결하고, 없으면 수동 다음 단계로 표시한다.
5. 사용자가 승인하면 Fold/Hub가 재검증하고 정리한다.

완료 이벤트는 중복·역순 도착할 수 있다. WorkflowTicket은 단계별 operation ID와 idempotencyKey로 중복 preview를 막는다. 이벤트가 실행 허가를 만들어내지 않는다.

### 정리된 작업을 다른 사람에게 넘기기

1. Fold 통합 기록은 검토용 설명으로 제시한다.
2. Port는 사용자가 고른 실제 원본 세션의 분기점을 대상으로 한다.
3. summary만으로 전체 세션이 이전됐다고 표시하지 않는다. 참조한 원본이 없으면 차단한다.
4. 독립 이력 G0을 통과한 형식만 내보낸다. 범위 밖 summary·첨부도 포함하지 않는다.
5. 받는 쪽 Workspace는 검사·preview·승인 후 Port import를 호출한다.
6. import 성공 뒤 “Hub로 이어 작업”은 새 실행 요청이다. Graph 인덱싱 역시 자동 수행하지 않는다.

## 7. Workspace 최소 도구 표면 제안

- workspace_get_capabilities: 제품별 available/unsupported/disconnected 및 이유
- workspace_inspect_workspace: 프로젝트 범위의 경량 상태 projection
- workspace_prepare_workflow: 사용자 의도에 대응하는 단계·부수 효과·승인 지점
- workspace_get_workflow: 실제 제품 operation을 참조한 진행 상태
- 제품별 검증된 typed endpoint: hub_dispatch, graph_read, fold_preview/apply, port_preview/export/import 등

새 MCP 도구가 기존 제품의 동일 기능을 두 번 자동 호출하지 않도록 Workspace skill만 통합 진입점으로 둔다. 개별 제품 skill은 단독 설치용으로 유지한다. host의 독립 플러그인 간 직접 호출에 의존하지 않는다.

## 8. 사용자 화면

대시보드는 현재 프로젝트, 대표 작업, 최신 맥락, 정리 후보, 이전 패키지 상태를 보여준다. 상세 원문·진단은 요청 시 펼친다. 기본 화면에서 개인 대화 원문을 광범위하게 수집하지 않는다.

각 작업은 ‘다음 동작’, ‘필요 승인’, ‘근거 시점’, ‘복구 가능 여부’를 표시한다. 생성할 스레드나 변경할 파일 수를 preview에 포함한다. Port는 실험 기능임을 숨기지 않고 unsupported 이유를 설명한다.

## 9. 호환·업데이트·실패 정책

통합 릴리스는 고정된 component 버전 조합으로 시험한다. 한 제품이 최신이라는 이유로 자동 교체하지 않는다. 데이터 schema migration은 backup·호환 검사·명시적 적용 경로를 갖고, 이전 binary로 rollback 가능한지 별도 판정한다.

- Hub unavailable: Graph 조회와 standalone Port 정적 검사 가능; Fold apply·Hub dispatch 차단.
- Graph unavailable/stale: Hub는 자체 검증된 맥락 경로 사용 가능, Fold는 Graph 추론 없이 근거 부족 항목 제외.
- Fold unavailable: Hub·Graph는 동작, 정리는 unavailable.
- Port G0 미통과: 검사·호환성 보고만 제공, 실행 가능한 이전 기능을 광고하지 않음.
- component version mismatch: 해당 기능만 차단, 다른 서비스 데이터 변환 금지.

Workspace 제거는 제품 데이터를 삭제하거나 활성 Hub 작업을 중단하지 않는다. 데이터 정리는 별도 명시적 작업이다. 전체 workflow에 걸친 원자적 rollback은 약속하지 않고 각 제품 operation별 보상·복구를 보여준다.

## 10. 구현 계획과 출시 기준

1. 공통 contract package: ID·revision·승인·idempotency·오류·capability handshake와 fixture 확정.
2. Hub Cleanup API: Fold를 위한 동기화·영향 집합·재조정 계약 구현 및 경합 시험.
3. Fold MVP: 동일 Run preview → 승인 → archive/restore → Hub 맥락 소비.
4. Port G0: 독립 이력·비공유 데이터 제거 검증. 실패 시 별도 연구로 남겨 Workspace 초기 출시를 막지 않음.
5. Workspace thin gateway: 우선 capabilities/상태/읽기와 의도 라우팅, 이후 검증된 쓰기 도구 연결.
6. 통합 패키지: 고정 버전 조립, 깨끗한 환경 설치, 단독 설치와의 공존·전환 검증.
7. Port 실제 사용자 E2E 후 전체 기능 활성화.

관문: 중복 Hub writer 0, 승인 재사용 거절, Graph 무단 refresh 0, Fold 보호 대상 오처리 0, Port 공유 범위 외 유출 0, 부분 실패의 정직한 표시, uninstall 시 사용자 데이터 보존.

마켓플레이스에서는 단독 제품과 Workspace를 함께 제공할 수 있지만 ‘둘 다 설치해야 한다’고 안내하지 않는다. 개인 설치와 Workspace 전환은 검증된 migration 절차로 안내한다. 설치 API나 manifest 의존성 기능이 확인되지 않은 상태에서 원클릭 설치 성공을 주장하지 않는다.

## 11. 근거·미결정 사항

2026-09-06 확인: 로컬 Hub HEAD `4b6b381`, Graph HEAD `aecd6ca`. Hub 작업 트리에 진행 중 수정이 있어 코드 변경 없이 읽기만 수행했다. 기존 archive/unarchive 및 fork API는 존재하지만 이 문서의 batch cleanup, approval, shared resolver 계약은 신규 제안이다.

[공식 패키징 안내](https://developers.openai.com/plugins/build/plugins)는 manifest·skills·bundled MCP와 repo/local marketplace를 설명한다. 자동 제품 의존성 설치를 전제로 하지 않는 것이 본 설계의 선택이다. 실제 패키징 시 plugin-creator 검증과 설치 E2E를 수행한다.

미결정: 레포, host 승인 adapter의 신뢰 경계, component 재사용 구현, 지원 OS/버전, 네이티브 원자적 cleanup 가능성, Port G0 방법, 서명·암호화 정책. 각 항목은 출시 capability gate로 관리하며 미결정을 성공으로 표현하지 않는다.

이 문서는 기획 산출물이며 설치·실행·공유·아카이브를 수행하지 않았다.
