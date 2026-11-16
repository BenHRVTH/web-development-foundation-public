# A négy irányadó dokumentum M0 összhangvizsgálata

Dátum: 2026-11-14. Mind a négy fájl teljes egészében elolvasva.
Vizsgált forrásverzió: `4dafec21df5a175a766ef510c002928d05f29abe`;
az eredeti SHA-256 lenyomatokat a `specification-baseline.json` rögzíti.

**Eredmény: nincs az M0-t blokkoló belső ellentmondás.**

| Téma                | Összhang és M0 következmény                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Új implementáció    | Mind a négy dokumentum a korábbi WDF-től független indulást ír elő. A checkout csak a négy specifikációt tartalmazta; korábbi kód átvétele nincs.                                             |
| Rétegek             | Az AGENTS Foundation / Contract / adapter / Lab elválasztása és a Blueprint Foundation / Core / adapter / Lab / QA bontása összeillik: a Contract gépi végrehajtása a Core felelőssége.       |
| Hatókör             | A Start Prompt M0-listája részletezi a Blueprint M0-t, a Test Plan M0-kapuja az eszközlánc működését kéri. Az M1–M6 funkciólisták most tervezési háttér, nem végrehajtási feladatok.          |
| Lab-indítás         | Az `npm run ui-lab` a teljes rendszer kötelező parancsa; a tényleges helyi indítás M3. M0-ban az `npm run dev` igazolja az új projekt indulását.                                              |
| Minőség             | A Blueprint DoD és az AGENTS böngészős bizonyítékot kér; a Test Plan öt szélességét az M0 indítási oldalra alkalmazzuk. Ez nem teljesíti előre a későbbi alkalmazás tesztjeit.                |
| Audit és nyitás     | A hibás/inkompatibilis Contract a szerkesztést blokkolja; a Foundation Audit hibája önmagában nem blokkolhatja a Lab megnyitását. Külön feltételek, nem ellentmondás; implementáció M1/M3/M5. |
| Design és szabadság | Foundation-invariánsok kötelezők, a Task Manager arculata nem öröklődik minden projektre. M0-ban nem vezetünk be WDF-designrendszert.                                                         |
| Jóváhagyás          | A Draft mentése nem jóváhagyás, Audit-javítás nem automatikus, véglegesítéshez teljes QA és felhasználói döntés szükséges. Mindegyik későbbi funkció.                                         |
| Megállás            | A Start Prompt M0 utáni jóváhagyási kapuja és a jelen felhasználói utasítás egyaránt megállást ír elő. Az M1 új kifejezett fejlesztési utasításig nem indul.                                  |

## M0 elfogadási mátrix

| ID     | Követelmény                                  | Bizonyítás                                                             |
| ------ | -------------------------------------------- | ---------------------------------------------------------------------- |
| M0-A01 | Specifikációk teljes olvasása és összhang    | Ez a review; változatlanság: `check:spec`                              |
| M0-A02 | Szükséges modulok és függőségeik azonosítása | ARCHITECTURE modul- és függőségi táblák; workspace metaadatok          |
| M0-A03 | Minimális tiszta struktúra                   | npm workspaces; új alkalmazás; nincs legacy kód                        |
| M0-A04 | Gépi szerződések tervezett helye             | ARCHITECTURE útvonaltábla; implementáció nélkül                        |
| M0-A05 | Működő eszközlánc és tesztparancsok          | `npm ci`, `npm run verify:m0`, valódi React/Vite build és Chromium     |
| M0-A06 | Technikai alapértelmezések dokumentálása     | ADR-0001, README, lockfile és konfigurációk                            |
| M0-A07 | Tényleges tesztek és pontos átadás           | `docs/reports/M0-HANDOFF.md`, futási kimenetek és böngészős bizonyíték |

## Későbbi tesztek státusza

T01–T16 és C01–C10: **NOT_RUN** az M0-ban; az érintett WDF-funkciók még nem léteznek.
R01–R10 és a Test Plan negatív WDF-hibainjektálásai: **NOT_RUN** a referenciaalkalmazásra.
Az M0-oldal geometriája, ID-egyedisége és alapvető a11y ellenőrzése külön M0-B teszt,
nem a Task Manager vagy a UI Lab részleges elfogadásának állítása.
M0-A státuszok és tényleges eredmények az átadásban szerepelnek.
