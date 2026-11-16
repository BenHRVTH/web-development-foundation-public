# UI Lab — M3–M5 közös interakciós szerződés

Forrás: felhasználói M3-megbízás, [ADR-0005](../../docs/adr/0005-m3-website-preview.md),
[Preview API](../../docs/M3-PREVIEW-API.md). Vizuális tulajdon: [DESIGN](DESIGN.md).
Magyar fejlesztői felület, a kért angol szakmai kategórianevekkel és eredeti token-ID-kkal.
Nincs billing vagy távoli felhasználói fiók. Az M5 helyi designadat-életciklusának irányadó forrása az ADR-0007/0008; a korábbi M3/M4 szakaszok történeti viselkedése az M5 kiegészítéssel együtt olvasandó.

| Capability     | Canonical owner                     | Source of truth                 | Allowed variants                                            | Verification    |
| -------------- | ----------------------------------- | ------------------------------- | ----------------------------------------------------------- | --------------- |
| Select/Listbox | TokenField és scope natív select    | Contract típusok, M1 engedélyek | native; OS popup elfogadott                                 | M3-B02/B06      |
| Form           | TokenField + M1 updateTokensInScope | M1 javító API                   | közvetlen érték / típusos hivatkozás / deklarált responsive | M3-T*/B02/B03   |
| Scrollbar      | src/lab.css globális baseline       | Lab --lab-* értékek             | panel és vászon geometria                                   | M3-B06          |
| Toast          | App status/inline alert és mezőhiba | Preview protokoll és validáció  | routine status / megmaradó hiba                             | M3-B04/B05, P05 |

A két munkaterület Website View és Component Studio. A kategóriák natív gombok `aria-pressed`
állapottal, nem egyedi ARIA-tablist. A panel bezárása csak a chrome elrendezését
módosítja, a jelöltet és iframe-et nem. A szélességváltás ugyancsak állapotmegtartó.

Az induló viewport a vászon mért belső szélességén elférő legnagyobb Contract-méret.
A padding és a scrollbar-gutter helye nem használható fel a választás becsléséhez.
Ha a belső tér a minimumnál kisebb, a legkisebb valódi viewport és látható tájékoztatás
marad; a ténylegesen kilógó tartalom vízszintesen görgethető. A kiválasztás egyszeri:
ResizeObserver csak a rendelkezésre álló tér figyelmeztetését frissíti. Ablakátméretezés
és panelváltás nem írja felül a felhasználó döntését, nem cseréli az iframe-et.
Regresszió: `tests/m3/viewport.spec.ts` (M3-V01/V02/V03).

A mező címkéje kattintható, az érvénytelen input `aria-invalid` és hozzákapcsolt
szöveges hibaállapotot kap. A numerikus érték üresen nem konvertálódhat nullává.
IME alatt a szöveg helyben frissül, az érték elfogadása compositionend után történik.
Egyébként a típushelyes szerkesztés élő; nincs színlelt mentés gomb vagy loading.
Az eredeti hibás értékeket a közös M1 javító primitív lépésenként javítja.
A teljes gráfdiagnosztika és az elfogadott edit sikere külön állítás.

A kapcsolat státusza csak a hiteles preview-válaszra lesz kész/frissített.
Tokenhiba nem írja felül az utolsó érvényes stílust, update-hiba nem jelenik meg sikernek.
A nem hiteles üzenet ignorált, a hiteles de tiltott edit elutasított. A kapcsolat
timeoutja megőrzi a jelöltet és Újracsatlakozást kínál. Nincs automatikus reload.

Az explicit preview-reload inline, nem modal megerősítést kap; a felirat pontosan
közli az alkalmazásadatok elvesztését és a Lab-tokenek megmaradását. A Mégse nem
változtat adatot. A Lab bezárását dirty esetben beforeunload védi. Sem az egyik,
sem a másik művelet nem írhat hiteles projektfájlt. Nincs localStorage vagy mentett Draft.

## M4 kiegészítés

Forrás: M4 felhasználói megbízás, [ADR-0006](../../docs/adr/0006-m4-component-studio.md),
[M4 API](../../docs/M4-API.md). A közös tulajdonosok a fenti táblázatból maradnak.
A Studio native selectjeinek nyitott popupja szintén OS-tulajdonú. A galéria a teljes,
kis Registryt rendereli, nem távoli feed; nincs kereső, pagináció vagy adatvesztő szűrő.

A workspace-váltó natív gombcsoport `aria-pressed` állapottal. A kiválasztás
munkameneten belüli memória: a Registry és az adat maga is helyi/transient. URL-ben
nincs session vagy designadat. A már meglátogatott munkaterület mounted marad;
`hidden` alatt kikerül a fókuszsorrendből és az akadálymentes fából. A dokumentumcím
az aktív workspace nevét követi. A skip link az aktív iframe-re mutat.

A konkrét fixture/állapot/variáns kiválasztása kilép az Összes variáns nézetből.
A fixture kiválasztása/visszaállítása az eredeti fixture-állapotot adja. A token- és
viewportváltás megtartja az interaktív állapotot. A Family/Variant kapcsoló ugyanazt
a Core-engedélyt követi, mint a receiver. A tokenmező nem props-szerkesztő.

A két preview kapcsolati státusza külön igazolás. A háttérben lévő workspace hibáját
az aktív nézet is megmutatja, névvel és célzott reconnect művelettel. A hibás
konfiguráció utolsó érvényes CSS-t tart meg, pontos diagnosztikával mindkét szerkesztőben.
Props-/renderhiba fixture-lokális, a globális Lab navigáció működőképes marad.
Bizonyíték: `tests/m4/studio.spec.ts`, `tests/m4/security.spec.ts`, M4 handoff.

## M5 kiegészítés — aktuális tartós életciklus

Forrás: felhasználói M5 §2–10, [ADR-0007](../../docs/adr/0007-m5-change-manager.md),
[ADR-0008](../../docs/adr/0008-m5-local-security-qa.md),
[API és helyreállítás](../../docs/M5-CHANGE-QUALITY-API.md). Ezek felülírják a fenti
transient jelölt/reload-adatvesztés M3/M4-megállapításait az M5 futásban.

| Capability   | Canonical owner                          | Source of truth                                  | Allowed variants                | Verification                |
| ------------ | ---------------------------------------- | ------------------------------------------------ | ------------------------------- | --------------------------- |
| Draft/Undo   | ChangeManager + useChangeManager         | Core change schema és egyetlen state.json        | edit/preset/audit, Undo/Redo    | M5 T02–T05/T13/C07          |
| Review       | Review komponens mindkét workspace alatt | közös ChangeView                                 | Audit / Changes, összecsukható  | tests/m5/flow.spec.ts       |
| Comparison   | ComparisonControl + meglévő usePreview   | Initial/Baseline/Draft ugyanazon ChangeState-ben | A olvasható / B szerkeszthető   | M5 T09                      |
| Confirmation | Review ApprovalDialog showModal          | aktuális QA + rögzített config/run-ID            | megerősítés / Mégse / hiba      | M5 T14/T15, Escape/fókusz   |
| Toast        | közös inline status/alert                | visszaigazolt szolgáltatáseredmény               | mentés / hiba / konfliktus / QA | M5 success/failure/security |

A mentett Draft automatikusan visszatöltődik. A mentés helyi, nem jóváhagyás.
Függő vagy bizonytalan mentésnél beforeunload védelem él; lemezre igazolt Draftnál
a Lab bezárása nem adatvesztő. Hibánál explicit visszatöltés, régi munkamenetnél
Lab-újratöltés szükséges. Nincs csendes retry, felülírás vagy új Draft-ág.

A Review fülváltó natív aria-pressed gombcsoport; nem állít egyedi ARIA-tablist
billentyűmodellt. A teljes, kis helyi historylista a panelen belül görgethető.
A Review állapota workspaceváltáskor megmarad. A/B váltás nem módosítja a historyt
vagy a mentett konfigurációt. A állapotban minden tokenszerkesztő disabled.

A modal a megnyitáskor látható konfigurációhoz és QA-runhoz köti a megerősítést.
Közben változó Draft vagy QA esetén a véglegesítő gomb nem használható. A natív
showModal biztosítja az inert hátteret; Escape/Mégse visszaadja a kezdeményező fókuszát.
A hiba tartós szöveg, a korábbi Baseline megmarad. Minden idő hu-HU/Europe/Budapest.

## M6 R05 — súlyválasztás és bizonyíték

Tulajdonos továbbra a TokenField; a TypographyProvider a közös QA friss
fontbizonyítékát közvetíti mindkét workspace-be. A nem igazolt opció disabled,
a jelenlegi érték megmarad. A hivatkozásmód sem kínálhat bizonyítatlan kerülőutat.
NOT_RUN/RUNNING/STALE/ERROR mellett nincs igazolt új választás. A rövid súgó
megmondja, hogy ellenőrzés vagy fejlesztői javítás szükséges. A natív select
billentyűzetes működése és a label/help kapcsolata megmarad. Az ellenőrzés nem
módosítja a Draftot; egy kiválasztott súly csak kifejezett editként, Undo/Redo-val
változtatja. Jóváhagyás kizárólag a friss, teljes hétcheckes Approval QA után.
Szabály: [ADR-0011](../../docs/adr/0011-m6-typography-capabilities.md).

A jelenlegi, deklarált súly kap elsőbbséget a képviselőválasztásban. A Lab azonos
betűképhez nem kínál két külön igazolt megjelenést, és nem állít minden CSS-számhoz
külön natív fontfokozatot. Az elsőbbség nem felmentés: hibás kötés, hiányzó mérés,
listán kívüli aktuális érték vagy metszetből kieső reszponzív érték továbbra blokkol.
