# M6 elfogadási ellenőrzőlista — tiszta export

A teljes kiadási mátrix még nem friss teljes kapueredmény. Az R05 helyi Linux-
részvizsgálata PASS, minden eredeti pár megőrzésével; friss natív Windows és a
teljes Linux/Windows-kapu NOT_RUN, ezért az R05 összesített sora itt NOT_RUN marad.
[Részletes aktuális helyi átadás](M6-R05-FINALIZATION.md),
[történeti nyilvános CI FAIL](M6-R05-HISTORY.md). Más sorok korábbi NOT_RUN
státusza nem jelenti a külön helyi regressziók sikertelenségét vagy teljes
kiadási megfelelőségét; ezek eredményeit az új átadás külön rögzíti.

| ID    | Eljárás                                                                            | Elvárt eredmény                                                                                                   | Státusz |
| ----- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------- |
| T01   | Projektből indított CLI és bootstrap                                               | Saját projekt töltődik be                                                                                         | NOT_RUN |
| T02   | Első indítás és mentett Initial ellenőrzése                                        | Automatikus, nem jóváhagyott, változatlan referencia                                                              | NOT_RUN |
| T03   | Globális accent → tényleges app CSS                                                | Megfelelő UI-előfordulások frissülnek                                                                             | NOT_RUN |
| T04   | Teljes spacing preset                                                              | Minden deklarált érintett hely cserélődik                                                                         | NOT_RUN |
| T05   | Preset egyetlen Undo                                                               | Teljes logikai művelet visszavonható                                                                              | NOT_RUN |
| T06   | Family/variant edit mindkét workspace-ben                                          | Csak a megfelelő előfordulások változnak                                                                          | NOT_RUN |
| T07   | Registry/Studio valódi komponens és fixture                                        | Task Manager 7/27; fogyasztó 4/15                                                                                 | NOT_RUN |
| T08   | Öt valódi iframe viewport                                                          | 320/390/768/1024/1440 CSS px, skálázás nélkül                                                                     | NOT_RUN |
| T09   | Initial/Baseline A/B                                                               | Ugyanaz a React-forrás, külön design, változatlan Draft                                                           | NOT_RUN |
| T10   | 19 px Foundation-hibainjektálás                                                    | Pontos blocker és nincs automatikus javítás                                                                       | NOT_RUN |
| T11   | Egy Audit-javítás elfogadása                                                       | Csak a kiválasztott javítás kerül Draftba                                                                         | NOT_RUN |
| T12   | Audit-javaslat elutasítása                                                         | Draft változatlan; blocker nem tűnik el                                                                           | NOT_RUN |
| T13   | Lab valódi leállítás/újraindítás                                                   | Draft és history visszatöltődik                                                                                   | NOT_RUN |
| T14   | Valódi Approval QA + külön modal                                                   | Koherens token/CSS/TS/Approved Baseline                                                                           | NOT_RUN |
| T15   | Véglegesítési hiba és journal                                                      | Korábbi elfogadott állapot sértetlen                                                                              | NOT_RUN |
| T16   | Külső React/CSS/Contract drift                                                     | QA érvénytelenítés, nincs néma Draft-felülírás                                                                    | NOT_RUN |
| C01   | Inkompatibilis Contract valódi CLI                                                 | Szerkesztés blokkol, pontos hiba                                                                                  | NOT_RUN |
| C02   | Nem létező tokenreferencia                                                         | Pontos függőségi diagnosztika                                                                                     | NOT_RUN |
| C03   | Körkörös tokenfüggőség                                                             | Ciklus és útvonala felismerve                                                                                     | NOT_RUN |
| C04   | Hibás props/validator/render                                                       | Fixture-lokális hiba, egészséges komponensek használhatók                                                         | NOT_RUN |
| C05   | Scope-határok                                                                      | Global/family/variant nem keveredik                                                                               | NOT_RUN |
| C06   | Explicit reszponzív értékhelyek                                                    | Deklarálatlan eltérés elutasítva                                                                                  | NOT_RUN |
| C07   | Audit-fix Undo                                                                     | Elfogadott javítás egy Undo-egység                                                                                | NOT_RUN |
| C08   | Elavult/hiányos/hibás QA                                                           | Nem használható véglegesítéshez                                                                                   | NOT_RUN |
| C09   | Külső forrásmódosítás                                                              | Draft megmarad, konfliktus látható                                                                                | NOT_RUN |
| C10   | Önálló production build                                                            | WDF/Registry runtime nem kerül a bundle-be                                                                        | NOT_RUN |
| R01   | Szigorú pixel/DOM összevetés                                                       | 25 pár, 0 geometriai eltérés; <=8 pixel és <=1/255, maszk nélkül                                                  | NOT_RUN |
| R02   | Valódi kártyainset                                                                 | Compact 16, Comfortable 24, Spacious 32 px                                                                        | NOT_RUN |
| R03   | Mobilos Spacious                                                                   | 320/390-en is 32 px, implicit paddingcsere nélkül                                                                 | NOT_RUN |
| R04   | Ikon/szöveg DOMRect + vizuális review                                              | Igazítás több hosszon/viewporton megfelelő                                                                        | NOT_RUN |
| R05   | Valódi alkalmazásszerepek és Lab-tokenmódosítás                                    | Helyes computed family/size/weight és megkülönböztethető deklarált opciók                                         | NOT_RUN |
| R06   | Szemantikus színek és scope                                                        | Accent nem írja felül a hiba/siker szerepet                                                                       | NOT_RUN |
| R07   | DOM ID-k minden szélességen                                                        | Nincs hibás ID-duplikáció                                                                                         | NOT_RUN |
| R08   | Overflow/scroll/reflow                                                             | Nincs váratlan vízszintes overflow vagy levágott művelet                                                          | NOT_RUN |
| R09   | Valódi fixture/interakció                                                          | Disabled/busy/error/hover/focus/modal megfelelő                                                                   | NOT_RUN |
| R10   | axe, valódi billentyűzet/fókusz, CSS-reflow és a natív 200% külön vizsgálata       | Releváns ellenőrzések teljesülnek; nem kizárólag scanner                                                          | NOT_RUN |
| N01   | 19 px spacing                                                                      | Foundation-hiba, nem alkalmazható                                                                                 | NOT_RUN |
| N02   | Hiányzó tokenref                                                                   | Elutasítva                                                                                                        | NOT_RUN |
| N03   | Referencia-ciklus                                                                  | Elutasítva                                                                                                        | NOT_RUN |
| N04   | Hibás komponensregisztráció                                                        | Lokalizált hiba                                                                                                   | NOT_RUN |
| N05   | Duplikált DOM ID                                                                   | Böngészőteszt észleli                                                                                             | NOT_RUN |
| N06   | Hibás kontraszt                                                                    | axe észleli                                                                                                       | NOT_RUN |
| N07   | Mobiloverflow                                                                      | Geometriai check észleli                                                                                          | NOT_RUN |
| N08   | Elavult QA                                                                         | Jóváhagyás elutasítva                                                                                             | NOT_RUN |
| N09   | Hibás véglegesítés                                                                 | Rollback, előző Baseline megmarad                                                                                 | NOT_RUN |
| N10   | Váratlan külső kódváltozás                                                         | Draft nem íródik felül                                                                                            | NOT_RUN |
| N11   | Hibás/foundation/scope/protokoll/HTTP művelet                                      | Pontos jogosultsági határ                                                                                         | NOT_RUN |
| N12   | Hiányzó vagy hibás új projekt-QA                                                   | Nincs sikeres üres mátrix                                                                                         | NOT_RUN |
| PKG01 | ESM exportok, types és deep import                                                 | Telepített publikus API működik; privát import tiltott                                                            | NOT_RUN |
| PKG02 | npm pack és tiszta install/ci                                                      | Öt valós artifact, sem symlink, sem workspace alias                                                               | NOT_RUN |
| PKG03 | Megismételt build/pack                                                             | Byte-azonos SHA-256 inventory                                                                                     | NOT_RUN |
| E2E01 | Draft → Audit → tényleges Approval → külön jóváhagyás                              | Valós token/CSS/TS/Baseline commit                                                                                | NOT_RUN |
| N13   | Single read polling, transient read recovery, lost response after real Draft write | No overlapping GETs; fresh read restores UI; uncertain POST not retried and stays blocked until explicit readback | NOT_RUN |

A tesztminták és eljárások a [gépi ellenőrzőlistában](M6-acceptance-matrix.json), a változatlan tesztforrásokban és a WDF_TEST_PLAN.md-ben vannak. Minden platform-/kézi sor NOT_RUN; új GitHub Actions-futás nem történt.
