# M5 — Review panel használata

A projektből indítsd a Labot: `npm run ui-lab`. Két elsődleges munkaterület marad:
Website View és Component Studio. Mindkettő alatt ugyanaz az összecsukható Review
panel található; ez nem új workspace.

## Szerkesztés és Changes

A saját módosítás a közös Working Draftba kerül. A „Mentés folyamatban” után a
„Working Draft mentve” kizárólag helyi, lemezre igazolt mentést jelent.
Az alkalmazás tokenforrása jóváhagyásig változatlan. Újraindítás után a Draft és
a history automatikusan visszatöltődik. A pontos mentési hely a Changes fülön látható.

A Spacing kategória compact/comfortable/spacious gombjai a teljes globális
spacingkategóriát cserélik (16/24/32 referencia px), a deklarált responsive helyekkel.
A komponensvariáns saját szerződését továbbra a Studio szerkeszti.
A Changes listán token, global/family/variant és responsive scope, régi és új érték
látszik. Undo/Redo mindkét előnézetet és a tartós Draftot együtt frissíti.

## Audit és javítás

Az Audit a Live Validation megállapítását, súlyosságát és státuszát mutatja.
A bizonyítékok és a konfiguráció-/forrás-/környezetazonosítók kibontva olvashatók.
A tokennévre kattintva a megfelelő workspace és mező nyílik meg, fókuszt kap.

A javaslat önmagában nem szerkeszt. „Javítás elfogadása” csak a kiválasztott javítást
alkalmazza, egyetlen Undo-lépéssel. „Javaslat elutasítása” nem módosítja a Draftot,
és a blocker megmarad. Más konfigurációból vagy forrásállapotból származó javaslat
nem alkalmazható. React-kódot igénylő hiba fejlesztői feladat.

## QA és jóváhagyás

Targeted QA az érintett Registry-scope-okat ellenőrzi. Approval QA a teljes
[kötelező designkaput](adr/0008-m5-local-security-qa.md) futtatja valódi Chromiumban.
A futás a panelen követhető; eredménye és bizonyítékai visszanyithatók.
PASS, FAIL, ERROR, NOT_RUN és STALE külön állapot. A futó és elavult eredmény
nem használható véglegesítéshez. Szerkesztés vagy releváns külső változás után új QA kell.

A Changes „Draft jóváhagyása…” gombja csak teljes, aktuális Approval QA után
használható. A saját modal megnevezi a teljes Draftot és a token/CSS/TS/Baseline
frissítését. Kezdetben a Mégse kap fókuszt; Escape visszatér a kezdeményező gombra.
A végleges megerősítés az éppen megjelenített konfiguráció- és run-ID-ra vonatkozik.

Hibánál a korábbi Baseline és hiteles állapot megmarad. A hiba a modalban és
a felületen is olvasható. „Mentett Draft visszatöltése” ellenőrzi a tényleges állapotot;
nincs vak automatikus újrapróbálás. Siker után az Approved Baseline az új referencia.
Az Initial Reference megmarad. A Lab nem commitol, nem pushol és nem publikál.

## A/B és külső változás

A = Initial Reference, később Approved Baseline. B = Working Draft. A váltó
mindkét workspace-ben azonos, kizárólag a designkonfigurációt változtatja a preview-ban.
A nézet nem szerkeszthető; a Draftot nem írja felül. A felirat megnevezi a referencia
típusát és jelzi, ha régebbi designreferenciát nézel az aktuális React-forráson.

React-/CSS-módosításnál a Draft megmarad, a QA elavul. Contract-, Registry-/preview-
integráció vagy hiteles tokeneltérésnél a konfliktus blokkolja az írást.
A mentett adatot őrizd meg, ellenőrizd a külső módosítást, majd indítsd újra a Labot.
[Biztonságos helyreállítás](M5-CHANGE-QUALITY-API.md).
