# Task Manager — közös interakciós szerződés

A termékscope forrása: Blueprint §10 és a felhasználó M2 megbízása; architektúra:
[ADR-0004](docs/adr/0004-m2-task-manager-registry.md). Vizuális tulajdon: [DESIGN](DESIGN.md).
Nyelv: magyar (`hu-HU`). Nincs dátum, pénz, jogosultság, PII vagy külső mellékhatás.

| Capability     | Canonical owner                                   | Source of truth             | Allowed variants                             | Verification                     |
| -------------- | ------------------------------------------------- | --------------------------- | -------------------------------------------- | -------------------------------- |
| Select/Listbox | `components/Select.tsx`                           | Ez a szerződés és DESIGN.md | native; az OS popup elfogadott               | M2-I03 keyboard és nyitott popup |
| Form           | `tasks/TaskForm.tsx`, `tasks/model.ts`, TextInput | M2 létrehozás/szerkesztés   | create / edit közös validáció                | M2-F02/F03/F04/R*                |
| Scrollbar      | `src/app.css` globális baseline                   | kanonikus tokens.json       | geometry: dialog, textarea                   | M2-R* computed style             |
| Toast          | App közös `role=status` régió                     | Ez a szerződés              | tartós success szöveg, nincs időzített toast | M2-F03                           |
| CRUD           | App + TaskForm                                    | Blueprint §10; M2 scope     | create/read/update/complete/reopen           | M2-F03/F04                       |

Az útvonalak `#tasks` és `#tasks/<id>`; működik a Vissza/Előre és a közvetlen
részletlink. Navigációkor a főcím kap fókuszt. A szűrő szándékosan munkameneten
belüli memóriaállapot: az adatok maguk sem perzisztensek vagy munkamenetek közt
megoszthatók. Nincs párhuzamos URL-szűrő és nincs localStorage.

Létrehozás és szerkesztés ugyanabban a Dialog/TaskForm implementációban történik.
Sikeres mentés a listára vezet; a szűrő megmarad, kivéve ha elrejtené a mentett
feladatot: ilyenkor Minden feladat nézetre váltunk. A közös status régió jelzi a
sikert, az Új feladat gomb stabil fókuszcél. Mégse/Bezárás/Escape tiszta űrlapot
bezár és visszaadja a fókuszt; módosítás után az elvetés külön döntés, alapfókusza
Folytatom a szerkesztést. Natív beforeunload figyelmeztet a lap tényleges elhagyásakor.

A form noValidate; üres/whitespace cím, 160 karakternél hosszabb cím és 4000
karakternél hosszabb leírás hibás. A tartalom megmarad, a hiba mezőhöz kötött,
a fókusz az első hibás mezőn van. A két szöveg mentéskor trimelődik. A submit
szinkron, egyszeri; nincs színlelt hálózati várakozás. A Button busy állapota
reprodukálható komponensfixture, nem valótlan alkalmazásbetöltés.

A teljesítés azonnali, visszavonható állapotváltás; megerősítést nem kér.
A szűrt listából eltűnő feladat után a következő vezérlő vagy a szűrő a fókuszcél.
A lista természetes sorrendű, a létrehozott feladat a végére kerül. Teljes listát
renderelünk: kis, memóriában élő referencia-adatállomány, nincs távoli pagináció.
A részletekben a teljes hosszú tartalom elérhető. Ismeretlen azonosító önálló
hibaállapotot és listára vezető linket ad.

Törlés, archiválás, backend, bejelentkezés, szinkron, offline sor és adatmegőrzés
nem része az M2 megbízásnak. Újratöltés visszaállítja a determinisztikus kezdőadatokat;
ezt a felület láthatóan közli. Nincs async hiba vagy loading UI egy tisztán helyi,
szinkron művelet köré. A formhiba és hiányzó részlet valós hibaállapot.
