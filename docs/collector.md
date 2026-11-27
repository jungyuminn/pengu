# 로컬 증바람 통계 수집기

수집기는 Electron과 별도로 실행됩니다. Node.js 24에서 검증했으며 내장 `node:sqlite`를 사용합니다. 기본 DB는 Windows의 `%LOCALAPPDATA%\PenguCollector\matches.sqlite`입니다. 모든 명령에서 `--db <파일>`로 다른 DB를 지정할 수 있습니다. Pengu의 기존 개인 전적과 aramgg 캐시는 별도로 관리됩니다.

## 실행

```powershell
npm run collector -- current
npm run collector -- status
npm run collector -- resume
npm run collector -- stats
npm run collector -- stats 16.22
```

`current`는 사용자가 명시적으로 실행할 때 현재 로그인한 계정의 최근 전체 전적을 최대 5페이지(페이지당 20건) 확인합니다. 그 목록에서 발견한 증바람 경기의 상세를 요청하고, 시작 계정의 참가를 확인한 완전한 KR 경기만 저장합니다. 다른 참가자는 이 모드의 전적 조회 대상에 추가되지 않습니다. 같은 계정으로 나중에 다시 실행하면 새 경기만 추가됩니다.

### 실제 LCU 참가자 연쇄 탐색

`chain`은 로그인 계정의 LCU 전적에서 시작합니다. 경기에서 **조회가 허용된 참가자**를 발견하면 그 참가자의 LCU 전적을 요청합니다. A의 경기에서 B를 발견하고 B의 다른 경기에서 C를 발견하면 C까지 이어집니다. 범위에 등록됐어도 시드에서 연결되지 않은 계정은 조회하지 않습니다.

```powershell
npm run collector -- chain D:\PenguPrivate\scope.json
npm run collector -- status
npm run collector -- resume
```

범위 파일은 사용자가 관리하는 UTF-8 JSON입니다. `puuids`에는 실제로 전적 조회와 통계 이용 권한을 확보한 계정의 LCU PUUID만 넣습니다. 로그인 계정은 자동으로 포함됩니다. 아래 설정으로 먼저 로그인 계정만 시험할 수 있습니다. `minIntervalMs`를 생략하면 요청 간 기본 간격은 1초입니다. 허용된 한도가 더 낮으면 간격을 늘리세요.

```json
{ "puuids": [], "minIntervalMs": 1000 }
```

원본 PUUID는 사용자 소유 범위 파일과 프로세스 메모리에서만 조회에 사용합니다. 이 파일은 저장소 밖에 보관하세요. SQLite에는 대기 작업용 해시, 범위 파일 위치, 범위·요청 간격의 지문을 기록합니다. 실행 중과 재개 시 범위를 다시 확인합니다. 계정을 제거하거나 간격을 변경하면 요청을 멈춥니다. 이때 기존 대기열을 `abandon`하고 변경된 범위로 시작하면 됩니다. 완료된 경기 통계는 보존됩니다.

한 계정에서 최근 전체 전적의 0~99번 범위를 요청합니다. 응답에 페이지 범위가 있으면 실제 반환 인덱스를 따라갑니다. 이미 지나간 페이지를 반환하면 그 계정의 페이지 탐색을 끝냅니다. 상세에 허용 계정이 참여했는지 확인하고 공통 KR 증바람 검증을 통과한 경기만 저장·확장합니다. 404는 해당 목록·상세 누락으로 집계하고, 401·403·429는 실행을 중단합니다. 429의 대기 시간은 같은 DB로 재개할 때도 적용됩니다.

범위 파일은 제품 운영자가 확인한 권한을 집행하는 설정입니다. 파일에 PUUID를 적거나 클라이언트가 200을 반환하는 것만으로 Riot의 수집·보관 승인이 생기지는 않습니다. 허용되는 엔드포인트, 계정 범위, 통계 용도 및 요청량은 실제 제품에 대해 확인해야 합니다. [Riot 제품 등록 정책](https://developer.riotgames.com/policies/general#product-registration) · [LCU 안내](https://developer.riotgames.com/docs/lol#league-client-api)

### 로컬 아카이브

`archive`는 사용 권한이 있는 로컬 자료에서 실제로 계정 → 경기 → 다른 참가자 → 다른 경기 순서로 탐색합니다. 다음 전적 파일이 있는 참가자를 계속 따라가며, 자료가 없는 계정은 누락으로 집계합니다. 이 명령은 Riot에 네트워크 요청을 보내지 않습니다.

```powershell
npm run collector -- archive D:\mayhem-archive <시드-폴더의-64자리-이름>
```

위 명령의 마지막 인자를 아래 구조에서 시작 계정의 실제 폴더 이름으로 바꿉니다. 폴더 이름은 UTF-8 PUUID의 앞뒤 공백을 제거하고 SHA-256을 계산한 소문자 16진 문자열입니다. 로컬 테스트 자료는 가상의 PUUID를 사용할 수 있습니다.

```text
mayhem-archive/
  histories/
    <시드 해시>/0.json
    <두 번째 참가자 해시>/0.json
  matches/
    101.json
    202.json
```

시드의 0페이지 예시는 `{"gameIds":[101],"hasMore":false}`, 두 번째 참가자의 0페이지 예시는 `{"gameIds":[101,202],"hasMore":false}`입니다. 101번 경기 참가자 명단에 두 번째 참가자가 있으면 수집기가 202번 경기까지 발견합니다. 후속 페이지가 있을 때는 `hasMore`를 `true`로 설정하고 같은 폴더에 `1.json`, `2.json` 순서로 둡니다.

`matches/<id>.json`은 한 건의 LCU 경기 상세 객체입니다. `gameId`, `platformId`, `gameVersion`, `queueId`, `gameMode`, `participants`가 필요합니다. 각 참가자에는 고유한 `participantId`, `teamId`, `championId`, 승패와 증강 슬롯이 있어야 합니다. 승패와 슬롯은 `stats` 안 또는 참가자 행에 올 수 있습니다. 다음 계정을 찾을 때는 `participantIdentities[].participantId`와 `player.puuid`를 사용합니다. 이름과 태그는 생략할 수 있습니다. 작업 중에는 입력 파일을 고정하고, 자료를 추가하거나 수정한 뒤에는 새 탐색을 시작하세요. 기존 Pengu 개인 전적 JSON은 플랫폼·경기 버전·원래 슬롯 번호가 빠져 있어 이 형식으로 임의 변환하면 통계가 부정확해집니다.

## 중단과 진행 상황

Ctrl+C는 처리 중인 작업을 마친 뒤 중단합니다. 강제 종료된 경우에도 마지막 커밋부터 `resume`으로 이어집니다. LCU 재개에는 같은 로그인 계정이 필요합니다. LCU의 최근 경기 목록은 시간에 따라 이동할 수 있으므로 중단이 길어졌으면 완료 후 새로 `current`를 실행해 최신 페이지를 확인할 수 있습니다. `abandon`은 사용자가 남은 작업을 폐기할 때 사용하며 이미 저장된 경기는 보존합니다.

다른 터미널에서 `status`로 현재 또는 마지막 작업을 조회합니다. `pending`은 미처리 작업, `added`는 새로 저장한 경기, `repeated_refs`는 이번 탐색에서 반복 발견한 경기 ID, `duplicates`는 이전 실행에서 이미 저장한 경기입니다. `missing`은 없는 목록·상세, `invalid`와 `rejections`는 검증에서 제외된 작업 수와 사유입니다. 갑작스러운 프로세스 종료 시 마지막 기록이 `running`일 수 있습니다. `active`는 재개할 수 있는 작업이 있다는 뜻입니다.

LCU 요청은 같은 수집 DB에서 요청 시작 시각 사이에 최소 1초를 두고 순차 처리합니다. 401·403·429와 통신 오류에서는 현재 실행을 중단하고 자동 우회나 재시도를 하지 않습니다. 401은 로그인 세션을 확인하고, 403은 권한 범위가 확인된 뒤에만 재개하세요. 429는 `Retry-After` 대기 시각을 DB에 저장하여 재시작에도 적용합니다. 유효한 대기 시간이 없으면 60초를 적용합니다. 이 간격은 프로그램의 보수적인 기본값이며 Riot이 보장하는 LCU 할당량은 공개 문서에서 확인되지 않았습니다.

## 저장과 공급원 확장

검증기는 KR, 큐 2400, KIWI, 경기 버전, 고유 참가자 10명, 팀별 5명과 일관된 승패를 확인합니다. 증강 필드가 전부 누락된 참가자는 자료 미확인으로 제외하고, 명시적인 0은 빈 슬롯으로 처리합니다. 통계 DB는 경기·참가자 번호·팀·챔피언·승패·슬롯 위치와 증강 ID를 보관합니다. 원본 JSON, PUUID, 이름, 태그는 경기 테이블에 쓰지 않습니다. 계정 해시는 작업 중 연결 가능한 가명 식별자이며, 완료 또는 폐기 시 작업 큐와 시드에서 삭제됩니다. 입력 아카이브 파일은 운영자가 별도로 보관·삭제합니다.

SQLite의 경기 키는 `(platform, game_id)`입니다. 상세 저장과 후속 참가자 등록, 작업 완료는 한 트랜잭션에서 처리합니다. 원본 버전의 앞 두 숫자(예: `16.22.123 → 16.22`)로 집계합니다. `stats`의 `holders`는 해당 챔피언으로 증강을 보유한 참가 관측 수입니다. 한 참가자의 여러 슬롯에 같은 증강이 있어도 한 번 셉니다. 선택지 제시 횟수는 경기 결과에서 알 수 없습니다.

새 공급원은 `src/application/collect-matches.ts`의 `CollectionSource`를 구현합니다. `history`는 경기 ID 목록과 다음 페이지, `detail`은 공급원 중립적인 `MatchSample`과 해당 공급원에서 탐색할 수 있는 계정 참조를 반환합니다. 권한 거부·통신 오류는 예외로 전달하고, 누락은 `null`로 전달합니다. 공급원을 CLI에 등록할 때 공급원 이름과 재개에 필요한 위치도 연결합니다. 경기 검증, 작업 큐, 중복 제거, 패치 집계는 같은 구현을 사용합니다.

## 접근 권한과 정책

현재 로그인 계정의 전적을 볼 수 있는 세션 권한과, 비가입자의 전적을 연쇄 조회해 통계 제품에 사용할 권한은 별도입니다. Riot은 LCU 사용 엔드포인트와 용도를 제품 등록에 명시하도록 안내합니다. KR 비가입자 전적의 대규모 조회·보관·공개 범위는 제품 단위로 확인해야 합니다. Match-V5에서 증바람 상세가 403을 반환하는 사례는 Riot이 의도된 동작으로 종결했습니다. [LCU 안내](https://developer.riotgames.com/docs/lol#league-client-api) · [제품 등록 정책](https://developer.riotgames.com/policies/general#product-registration) · [Riot 이슈 #1109](https://github.com/RiotGames/developer-relations/issues/1109)

Riot은 앱·웹·오버레이의 증강 승률 표시를 금지합니다. 수집기 출력은 챔피언별 참가·승리 건수와 증강별 보유 건수입니다. 이 도구를 추가해도 기존 Pengu 화면에 대한 심사 상태가 바뀌지는 않습니다. [LoL 개발자 정책](https://developer.riotgames.com/docs/lol#developer-api-policy)
