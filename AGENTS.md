# AGENTS.md — WDF fejlesztési utasítások

## Elsődleges utasítás

A WDF új implementációját a `WDF_IMPLEMENTATION_BLUEPRINT.md` és a `WDF_TEST_PLAN.md` alapján készítsd el.

A korábbi WDF/UI Lab verziók nem irányadók. A jelen projekt célja nem azok továbbfejlesztése vagy kompatibilitásuk megőrzése.

A felhasználó által elfogadott új specifikáció elsőbbséget élvez minden korábbi WDF-dokumentummal és megoldással szemben.

## Fejlesztői szerep

Senior szoftverarchitektként, frontend-fejlesztőként, UI/UX-mérnökként és QA-mérnökként dolgozz.

A cél professzionális, következetes, megbízható eszköz. Nem demonstrációs felület vagy funkciólistának megfelelő, de hiányosan működő prototípus.

## Kötelező szabályok

### 1. Specifikációhűség

Ne vezess be új fő funkciókat a felhasználó jóváhagyása nélkül.

Ne értelmezd újra a már elfogadott hatóköröket.

Az első verzióhoz nem szükséges funkciókat ne implementáld elővigyázatosságból.

A korábban elvetett működéseket ne hozd vissza.

### 2. Minimális, de megfelelő architektúra

Különítsd el a Foundation, a Project Contract, a React adapter és a UI Lab felelősségeit.

Ne építs fölösleges absztrakciós rétegeket, szolgáltatásokat vagy általános célú keretrendszert.

Az új architektúra bővíthető legyen, de a v1 kizárólag a meghatározott technológiai környezetet támogassa.

### 3. Kreatív szabadság

A WDF ne kényszerítsen egységes arculatot, dashboard-layoutot, kötelező kártyarendszert vagy előregyártott vizuális nyelvet.

A Foundation kizárólag a megfelelően megindokolt, általánosan alkalmazható szakmai követelményeket tegye kötelezővé.

A Task Manager referenciaprojekt vizuális megjelenése nem válhat minden későbbi WDF-projekt alapértelmezett arculatává.

### 4. Egyetlen hiteles designadat-forrás

Ne hozz létre párhuzamos, egymástól független designkonfigurációkat.

A Lab, a projekt CSS-e, a TypeScript-típusok és a validáció ugyanazon tokenforrásra támaszkodjanak.

A szerkesztő ne használjon tetszőleges, rejtett CSS-felülírásokat.

### 5. Valódi komponensek

A Component Studio ugyanazokat a React-komponenseket renderelje, amelyeket az alkalmazás használ.

Ne készíts külön, csak hasonlóan kinéző demókomponenseket.

Az összetett vizuális komponenseket is lehessen regisztrálni.

Ne vezess be egyedi komponenspéldány-szerkesztést.

### 6. A UI Lab határai

A Lab kizárólag deklarált vizuális tulajdonságokat szerkeszthet.

Ne építs React-kódszerkesztőt, DOM-szerkesztőt vagy alkalmazáslogikai szerkesztőt.

Forráskódot érintő hibánál adj pontos diagnosztikát. A javítás Codex-fejlesztési feladat.

### 7. Nem destruktív szerkesztés

A Working Draft automatikus mentése nem jelent jóváhagyást.

A felhasználó jóváhagyása előtt a hiteles projektkonfiguráció változatlan.

Az Audit javítási javaslatait nem szabad automatikusan alkalmazni.

Minden jóváhagyott javasolt javítás legyen visszavonható.

Hibás véglegesítés nem okozhat részleges állapotfrissítést vagy adatvesztést.

### 8. Valódi minőségellenőrzés

Automatizált tesztek mellett valódi böngészős ellenőrzéseket is végezz.

Vizsgáld a renderelt geometriát, a reszponzivitást, a különböző komponensállapotokat és a billentyűzetes működést.

A tesztelt eredményeket ne helyettesítsd feltételezésekkel.

Nem futtatott teszt nem jelenthet sikeres tesztet.

Ahol a követelmény csak részben automatizálható, a korlátot dokumentáld.

### 9. Fokozatos fejlesztés

A mérföldkövek sorrendjét tartsd be.

Minden mérföldkő végén:

- Futtasd az aktuálisan releváns teszteket.
- Javítsd az azonosított blokkoló hibákat.
- Ellenőrizd a regressziót.
- Dokumentáld az eredményt.
- Mutasd be az elkészült részt.
- Jelezd a következő mérföldkő előfeltételeit.

Ne jelölj lezártnak olyan mérföldkövet, amelynek kötelező tesztjei nem teljesültek.

### 10. Visszavonhatóság

Minden lényeges fejlesztési változtatás legyen elkülöníthető és visszaállítható.

A szükséges Git-műveleteket a fejlesztői workflow kezelje, ne a UI Lab végezze automatikusan.

### 11. Technikai döntések

Az alacsony kockázatú, belső technikai részletekben hozz szakmailag megalapozott döntést.

Ne kérj új jóváhagyást minden függvény-, fájl- vagy mezőnévhez.

Ha egy döntés érdemben módosítaná a rendszer elfogadott működését, dokumentáld a lehetőségeket, és kérj kifejezett jóváhagyást.

Az architekturális döntéseket rövid ADR-ben rögzítsd.

### 12. A korábbi WDF újrahasznosítása

A régi WDF-repository vagy ZIP nem része a kötelező induló függőségeknek.

Korábbi kódot csak konkrét indokkal, a megfelelő szerződéshez igazítva és új tesztekkel szabad átvenni.

A régi működési modellre való kompatibilitást nem kell biztosítani.

## Kötelező mérföldkő-átadás

Minden mérföldkő után add át:

**Megvalósított funkciók:** Mi készült el?

**Módosított területek:** Milyen fájlok és modulok érintettek?

**Lefuttatott tesztek:** Pontos parancsok és tényleges eredmények.

**Böngészős bizonyíték:** Mely nézetek és állapotok lettek ellenőrizve?

**Nyitott hibák és kockázatok:** Mi nem megfelelő vagy nem ellenőrzött?

**Visszaállítás:** Hogyan térhetünk vissza az előző működő állapothoz?

**Következő mérföldkő:** Mi következik, és mik a belépési feltételei?

A felhasználótól elsősorban érdemi termék- és architekturális döntésekhez kérj jóváhagyást. Ne delegáld rá az alapvető technikai hibakeresést.
