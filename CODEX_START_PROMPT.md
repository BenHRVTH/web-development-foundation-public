# CODEX_START_PROMPT.md

A feladatod egy új Web Development Foundation (WDF) rendszer megvalósítása a mellékelt specifikációk alapján.

**Kötelező dokumentumok:**

1. `WDF_IMPLEMENTATION_BLUEPRINT.md`
2. `AGENTS.md`
3. `WDF_TEST_PLAN.md`

Olvasd el mindhárom dokumentumot teljes terjedelmében, mielőtt architekturális vagy implementációs döntést hozol.

## A legfontosabb követelmény

Ez egy új, specifikációvezérelt implementáció.

A korábbi WDF és UI Lab verziók nem képeznek kiindulópontot, és nem szükséges azokkal kompatibilis rendszert készíteni.

Ne másold át a korábbi WDF működési modelljét. Ne alakítsd az új követelményeket a régi megoldáshoz.

A mellékelt Implementation Blueprint az irányadó.

## Fejlesztési cél

Hozz létre egy professzionális, közösen verziózott, projektenként fejlesztői függőségként használható WDF-rendszert.

A rendszernek az első verzióban React + TypeScript + Vite projekteket kell támogatnia.

Kötelező elemek:

- Technológiafüggetlen Foundation-szabályrendszer.
- Géppel ellenőrizhető Project Contract.
- Négyszintű Design Token Interface.
- Valódi React-komponenseket használó Component Registry.
- Két munkaterületű UI Lab: Website View és Component Studio.
- Közös Review panel Audit és Changes fülekkel.
- Automatikus Initial Reference, Working Draft és Approved Baseline.
- Kizárólag designkonfigurációt összehasonlító A/B.
- Egyenként elfogadható Audit-javítások.
- A teljes Working Draft egyben történő, ellenőrzött véglegesítése.
- Valódi böngészős és automatizált QA.
- Működő Task Manager referenciaprojekt.

## Végrehajtási utasítás

**Elsőként kizárólag az M0 mérföldkövet készítsd elő és valósítsd meg.**

Ennek részeként:

1. Ellenőrizd a három dokumentum belső összhangját.
2. Azonosítsd a megvalósításhoz szükséges modulokat és függőségeiket.
3. Javasolj minimális, tiszta monorepo- vagy csomagstruktúrát.
4. Rögzítsd a géppel ellenőrizhető szerződések tervezett helyét.
5. Hozd létre a fejlesztési eszközláncot és az alapvető tesztparancsokat.
6. Dokumentáld a releváns technikai alapértelmezéseket és architekturális döntéseket.
7. Futtasd az M0-hoz tartozó tényleges ellenőrzéseket.

Az M0 lezárásakor adj rövid, ellenőrizhető átadási jelentést.

Az M1–M6 mérföldköveket az Implementation Blueprint szerint, egymás után valósítsd meg. A mérföldkő-kapuknál mutasd be a kész eredményt és az ellenőrzések bizonyítékait. **Az M0 lezárásakor állj meg, és kérj jóváhagyást az M1-re való továbblépéshez.**

## Különösen fontos szabályok

Ne építs általános vizuális weboldalszerkesztőt.

Ne készíts a valós komponenstől eltérő, külön UI Lab-demókomponenst.

Ne engedj önkényes spacingértékeket vagy rejtett CSS-felülírásokat.

Ne alkalmazz Audit-javítást a felhasználó kifejezett döntése nélkül.

Ne módosítsd automatikusan a projekt jóváhagyott konfigurációját szerkesztés közben.

Ne vezess be komponenspéldány-szintű szerkesztést.

Ne követelj külön React-forráskódverziókat az A/B funkcióhoz.

Ne téveszd össze a sikeres automatizált tesztet a teljes vizuális és akadálymentességi megfelelőség bizonyításával.

Ne helyettesítsd a végrehajtott teszteket tervezett vagy feltételezett eredményekkel.

## Sikerfeltétel

A végleges WDF akkor fogadható el, ha a Task Manager referenciaprojektben bizonyíthatóan működik a teljes fejlesztési, vizuális finomhangolási, Audit- és jóváhagyási folyamat.

A referenciaprojekt legyen önállóan futtatható, a UI Lab pedig az `npm run ui-lab` paranccsal induljon az adott projektből.

A projekt módosítás nélkül megnyitva nem változtathatja meg eredeti megjelenését.

A végleges rendszerhez tartozzon reprodukálható tesztkészlet, pontos használati dokumentáció és ismert korlátokat tartalmazó átadási jelentés.

**Most kezdd az M0 mérföldkővel.**
