# Preview Interface 1.0.0

Történeti M3 API. Az aktuális M4 wire-verzió 1.1.0; a pontos bővítés és kompatibilitási határ: [M4 API](M4-API.md).

Runtime séma/típusforrás: `@wdf/core/preview`, adapter: `@wdf/adapter-react/preview`,
Vite-integráció: `@wdf/adapter-react/vite`. Döntés: [ADR-0005](adr/0005-m3-website-preview.md).

## Kötelező boríték

Mindkét irányban `channel: 'wdf-preview'`, `version: '1.0.0'`, `projectId: string`,
`session: string` (pontosan 64 hex karakter). A sémák strict-ek, ismeretlen mező hibás.
A fogadó előbb `event.origin` és `event.source` pontos egyezését vizsgálja, majd a
sémát és a projekt/session azonosságot. A helyes JSON önmagában nem jogosít kommunikációra.
A küldő `targetOrigin` mindig a másik ismert origin, soha `*`.

## Lab → preview

| type      | További adat                                    | Hatás                                                           |
| --------- | ----------------------------------------------- | --------------------------------------------------------------- |
| `connect` | nincs                                           | handshake, `ready` válasz                                       |
| `ping`    | nincs                                           | csatlakozott peernek `pong`                                     |
| `apply`   | pozitív egész `revision`, `edits: GlobalEdit[]` | ellenőrzött globális snapshot, csak teljes siker után CSS-csere |

`GlobalEdit`: `{ id: TokenId, value: TokenValue, responsive?: string }`.
Az ID, típus és global scope a betöltött Contractból származik. A responsive cél csak
már deklarált override lehet. Egy értékhely egy snapshotban legfeljebb egyszer szerepelhet;
legfeljebb 4096 edit küldhető. Nincs metaadat-, komponens-, Foundation-, DOM-, CSS-,
JavaScript-, fájl-, URL-navigációs vagy rendszerparancs.

```ts
import { previewEnvelope, globalEdits } from '@wdf/core/preview';
const message = {
  ...previewEnvelope(connection),
  type: 'apply' as const,
  revision: 1,
  edits: globalEdits(validatedConfig),
};
iframe.contentWindow?.postMessage(message, connection.previewOrigin);
```

## Preview → Lab

| type      | További adat                       | Jelentés                               |
| --------- | ---------------------------------- | -------------------------------------- |
| `ready`   | `revision >= 0`, `canvasColor`     | handshake elfogadva                    |
| `pong`    | nincs                              | peer elérhető                          |
| `applied` | `revision > 0`, `canvasColor`      | a generált CSS ténylegesen cserélve    |
| `error`   | `revision >= 0`, `code`, `message` | frissítési, revíziós vagy runtime-hiba |

`canvasColor` kizárólag ellenőrzött `rgb(...)`/`rgba(...)` festési adat; a projekt
root/body vászonhátterének számított színe. A Lab az iframe elem hátteréhez használja,
nem illeszt tetszőleges alkalmazás-CSS-t. A Canvas-adat azért szükséges, hogy a
lefoglalt gutter az önálló oldallal azonos háttérrel jelenjen meg.

Hibakódok: `PREVIEW_TOKENS_INVALID`, `PREVIEW_REVISION_STALE`,
`PREVIEW_RUNTIME_ERROR`. Hibás séma vagy idegen peer csendben elutasított;
nem adunk információt idegen címzettnek. A tokenhiba az eredeti M1 diagnosztikai
kódokat, tokenútvonalat és üzenetet tartalmazza. A Lab csak a saját aktuális apply
revíziójának visszaigazolását minősíti sikernek, a késői választ nem alkalmazza.

## Tiszta Core API-k

- `previewRequestSchema`, `previewResponseSchema`, `globalEditSchema`: runtime validáció.
- `PreviewRequest`, `PreviewResponse`, `GlobalEdit`, `PreviewIdentity`, `PreviewConnection`: TS-típusok.
- `previewEnvelope(identity)`, `matchesPreviewIdentity(message, identity)`.
- `isPreviewPeer(event, exactSource, exactOrigin)`: null sender nem lehet hiteles peer.
- `applyGlobalEdits(manifest, input, edits): Result<TokenEdit>`: az M1 javító API-ra épül;
  sem a bemenetet, sem fájlt nem módosít. Sikeres edit mellett a teljes validation még hibás lehet.
- `globalEdits(config): GlobalEdit[]`: létező globális értékhelyek snapshotja; érvényes jelöltből használandó.
- `generateTokenCss(input): Result<string>` az `@wdf/core` exportja: a közös M1 CSS-emitter,
  teljes szigorú validációval, Node crypto és IO nélkül. Hibánál nincs CSS value.

Az M1 `generateTokens` Node API és kimenete byte-pontosan változatlan. A preview a
CSS-emittert a saját oldalán futtatja; nem bízik egy Lab által küldött CSS-szövegben.

## Adapter és élettartam

`previewDefinition` a projekt fejlesztői deklarációja (`{version:'1.0.0'}`).
`createProjectPreview(options)` a projekt saját Vite-konfigurációjával külön szervert
készít, és csak annak indexéhez ad bridge-modult. A deklarációs modul helyi,
megbízható kód; nem protokollon keresztüli importparancs.

`installPreview(connection, manifest, tokenInput): () => void` telepíti a
message/error/unhandledrejection listenereket és egyetlen generált style-elemet.
Az alkalmazás main modulját nem indítja másodszor, React-gyökerét nem cseréli le.
A visszaadott disposer minden listenert és a style-elemet eltávolít; HMR ehhez kapcsolódik.
Önálló felső ablakban a bridge nem enged kommunikációt.

A heartbeat, timeout és kézi helyreállítás a Lab hookjában él; nincs új állapottároló
vagy mentési protokoll. Az alkalmazásforrás HMR által okozott React-state resetje
nem tokenfrissítés, nem M5 külső forrás-/Draft-konfliktuskezelés.
