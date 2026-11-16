# M5 — Change & Quality API

Állapotmodell: [ADR-0007](adr/0007-m5-change-manager.md). Biztonság és QA:
[ADR-0008](adr/0008-m5-local-security-qa.md). A Contract/token `1.0.0` és a Preview
`1.1.0` megmarad; az új helyi Change API külön `1.0.0` verziójú.

## Közös Core

`@wdf/core/change` exportálja a strict kérés-, művelet-, history-, állapot-, QA-
és identitássémákat; `applyPatches`, `spacingPreset`, `changesBetween`, `liveAudit`,
`runStatus`, `canApprove`, `sameContext` és `sameDesignContext` függvényeket.
A meglévő `updateTokensInScope`, `resolveTokens` és M1 generátor marad az egyetlen
tokenmotor. Az új API nem bővíti a Foundation-engedélyeket.

A `ChangeManager` a Node oldalon serializálja és tartósítja a műveleteket.
A böngészős `useChangeManager` kizárólag visszaigazolt állapotot ad a két workspace-nek.
1,5 másodperces állapotellenőrzés és explicit visszatöltés támogatja a külső változások
és másik lap mentéseinek felismerését. A régi lap CAS-hibát kap; nem írhat felül újabb Draftot.

## HTTP-kérés

Minden POST borítéka:

```ts
{
  version: '1.0.0', projectId, session,
  requestId: crypto.randomUUID(), expectedRevision,
  operation
}
```

Az engedélyezett műveletek:

| type            | Kötelező adat                                | Hatás                                                   |
| --------------- | -------------------------------------------- | ------------------------------------------------------- |
| edit            | patch: scope, changes, opcionális responsive | Csak meglévő, pontos scope-ú tokenértékek               |
| preset          | compact / comfortable / spacious név         | Globális spacingkategória atomikus cseréje              |
| undo / redo     | nincs                                        | Egyetlen logikai history-elem mozgatása                 |
| accept / reject | aktuális findingId                           | Egy kiválasztott Audit-javaslat döntése                 |
| qa              | targeted / approval szint                    | Valódi aszinkron futás indítása, külön result commit    |
| approve         | runId, configurationDigest, confirmed: true  | Kapuk után tokenforrás + CSS + TS + Baseline tranzakció |

Siker: `ChangeView` a teljes mentett állapottal, aktuális kontextussal,
findingokkal, kompatibilitással, referenciaérvényességgel és mentési hely megjelölésével.
403: hozzáférés/origin/módszer; 413: túl nagy kérés; 409: séma, revízió, ismétlés,
scope, konfliktus, QA- vagy I/O-hiba. A hiba nem jelent műveletsikert.

A kiadott munkamenet-képesség az adott indításra érvényes. Újraindítás után
újratöltés kell; a korábbi lap nem kap automatikus új jogosultságot.
Kérés timeoutjánál az eredmény bizonytalan: a kliens blokkol, a mentett állapotot
explicit visszatölti. Nem ismétli vakon a véglegesítést.

A böngészős QA teljes futási korlátja 600 másodperc: a 160 állapotot valóban
renderelő Approval mátrix lassabb, megosztott CI-gépen is végigfuthat. Az egyedi
preview- és vezérlővárakozások továbbra is korlátozottak. A teljes határ lejárta
bezárja a böngészőt, `QA_TIMEOUT`/`ERROR` eredményt ad, és tiltja a jóváhagyást.

## Mentés és helyreállítás

A natív útvonalak és a Linux/Windows tartóssági különbség szerződése:
[ADR-0009](adr/0009-m5-platform-storage.md). Windows alatt a fájl-fsync és journal
aktív, de a Node nem biztosít Linuxszal azonos könyvtár-fsync-et. Áramszünet/OS-crash
utáni tartósság ott nem garantált; a Lab ezt `STORAGE_DURABILITY_LIMIT` üzenettel
induláskor és a közös diagnosztikában jelzi. A célfájl törlésével történő rename-
fallback nincs. A célzott platformteszt: `npm run test:m5:storage`.

`state.json`: strict, checksumolt envelope, benne Initial, opcionális Baseline,
egyetlen Draft, history/cursor, elutasított javaslat-ID-k, QA és műveletnyugták.
A helyi adat nem Git-tracked és nem produkciós adat. Nincs automatikus lejárat,
Draft-rotáció, rebase vagy alapértékekkel helyettesítés.

`transaction.json`: checksumolt, zárt célazonosítós rollback-journal.
A pontos atomi és megszakítási szerződést az ADR írja le. Az átmeneti `*.tmp`
fájl nem hiteles állapot; megszakítás után megmaradhat, helyreállításhoz előbb
a teljes `.wdf-lab` könyvtárat kell másolatban megőrizni. A journal és state
kézi átírása helyett az alábbi lépéseket kövesd.

1. Állítsd le a Labot; mentsd külön a `.wdf-lab/<id>` könyvtárat és a három
   hiteles/generált fájlt. Ne töröld a sérült vagy konfliktusos adatot.
2. Indítsd újra. Ép journal esetén a szolgáltatás az adapter előtt automatikusan
   visszaállítja az összes régi fájlt, vagy felismeri a teljes új commitot.
3. Sérült state/journal vagy ismeretlen külső eltérés esetén a CLI megáll.
   Válassz ellenőrzött, teljes állapotmásolatot; a hozzá tartozó token/CSS/TS/state
   fájlokat együtt állítsd vissza. Ne másolj be csak egy generált kimenetet.
4. Külső Contract-/tokenkonfliktusnál őrizd meg mindkét oldalt. A nem kívánt
   külső változást fejlesztői workflow-val vond vissza, majd indítsd újra a Labot.
   Szándékos Contract-váltás manuális, külön review-zott migrációs feladat.
5. Ellenőrizd a `check:generated` és `verify:m5` kaput. Korábbi QA-t ne minősíts
   érvényesnek; az új környezetben futtasd újra az Approval QA-t.

Új tiszta helyi munkamenet csak a mentett könyvtár kifejezett, leállított állapotban
történő archiválása után kezdhető; ezzel az archivált Initial/history nem vész el.
A UI nem kínál veszélyes „töröld a hibás Draftot” automatikát.

## Tesztintegráció

`StorageFault` és `SimulatedCrash` kizárólag megbízható Node tesztfüggőség-injektálás.
Nem részei a HTTP-sémának. Az `isolatedLab` másolt, külön projektet futtat saját
állományokkal és portokkal. Ez nem több Draft egy projekten belül.
A régi M3/M4 tesztek sorosan, valódi Undo-val állítják helyre a közös Draftot.
Az M3 korábbi reload-elvárása az M5 előírásának megfelelően tartós megőrzést vár;
az R01 vizuális algoritmusa, geometriai feltétele és toleranciája változatlan.
