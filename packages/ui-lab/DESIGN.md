# WDF UI Lab — fejlesztői munkapad

## Overview

Egy projekt tényleges megjelenésének finomhangolása fejlesztők és designreviewerek
számára. Product/tool register. A referencia egy szerkesztőprogram viewport-vászna:
semleges keret, pontos CSS-szélességjelzés, jobb oldali tulajdonságszerkesztő.
A karakteres rész az öt valódi viewport közötti mérhető váltás, nem dekoratív dashboard.
A projekt kapja a fő hangsúlyt. Nincs hero, KPI-kártya, felesleges bal navigáció vagy díszítő navigáció. A Studio galériája a valódi Registry tartalmát mutatja.

## Colors

Tulajdonos a `src/lab.css` `--lab-*` rendszere. Tintás palaszürke `--lab-ink`,
fehér papír `--lab-paper`, semleges szürke vászon `--lab-canvas`, mély petrol
`--lab-accent` és világos megfelelője `--lab-accent-soft`. A hiba `--lab-danger`,
mindig szöveges magyarázattal. Ezek a Lab chrome saját értékei, nem projekt-tokenek.
A preview háttérfestése a projekt adapterből kapott számított vászonszíne.

## Typography

Helyi system-ui a kezelőfelülethez; ui-monospace a viewportértékekhez és token-ID-khoz.
A rövid cím 24 px, a tulajdonságpanel 12–14 px körüli, az ID másodlagos technikai adat.
Nincs külső fontkérés vagy fontcsere. A kategóriák kért szakmai neve angol,
a műveletek, visszajelzések és hozzáférhető nevek magyarok.

## Layout

A dokumentum természetes magasságú. Egy széles vászon, egy 328/300 px-es jobb panel;
a panel összecsukható, 760 px alatt a dokumentumba sorolódik. A panel saját mezőlistája
görget, fejléce/lábléce megmarad. A vászon szándékosan görgethető, a viewport 100%-os
mérete és 900 px magassága látható. A projekt belső görgetése saját dokumentumé.
Az induló nézet a mért belső térben elférő legnagyobb támogatott szélesség;
a kézi választás átméretezés után is megmarad. A minimumnál kisebb belső tér
szöveges tájékoztatást kap, nem skálázást. Nincs CSS transform vagy zoom. A vászon elhelyezése egész pixeles; geometriai eltérést
nem rejthet el screenshotkivágás vagy skálázás.

A munkaterületváltó a meglévő fejlécben marad, így a Website preview fizikai
helyzete és az eredeti R01 feltételei megőrzöttek. A két workspace külön megőrzött vásznat kap. A Studio felső, csoportosított
komponenssora nem vesz el tartós bal oldalsávot a previewtól. A kiválasztott
komponens/variáns/állapot külön sorban olvasható; a Family/Variant szerkesztés a
közös jobb panelben marad. A Studio vásznának látható magassága a magasabb
vezérlősorhoz igazodik, az iframe továbbra valódi 900 px. A dokumentum görgethető,
a nagyobb viewport szándékosan a vásznon belül érhető el.

## Elevation & Depth

Vékony határvonalak, lapos panelek, nincs kártyagyártó komponensrendszer.
Nincs animáció; reduced-motion mellett és nélkül azonnali változások.
A hibajelzés a vászon felett megmaradó szöveg, nem elúszó toast.

## Shapes

Visszafogott 4/6 px-es keretlekerekítés. Egyetlen Lucide ikonkészlet, jellemzően
14/18/20 px-es szerepekben. A projekt ikon-, spacing- és shape-világa az iframe-ben marad.

## Components

`TokenField` az egyetlen ismétlődő értékszerkesztő; a mező típusát és scope-ját a
Contractból olvassa. Natív select és color picker tudatosan OS-tulajdonú popupot kap.
`usePreview` közös connection/status/recovery tulajdonos; az App szervezi a panelt,
kategóriákat, a Change Managerhez kapcsolt editet és a viewportot. A Lab nem importál projektkomponenst; a Studio adapterdokumentuma rendereli a Registryt.

| Forrás                                             | Runtime cél                                   | Fogyasztó                                |
| -------------------------------------------------- | --------------------------------------------- | ---------------------------------------- |
| `src/lab.css :root --lab-*`                        | Lab dokumentum saját CSS-változói             | header, toolbar, panel, mezők, scrollbar |
| Project Contract és Registry engedélyezett értékei | M1 közös CSS-emitter, preview style           | a projekt valódi komponensei             |
| Projekt root/body számított vászonháttér           | ellenőrzött Preview válasz, iframe background | csak beágyazó elem festése               |

## Do's and Don'ts

A preview maradjon domináns. Az érték és hivatkozás látszódjon külön, a hibás érték
maradjon javítható, a LOCKED állapot kapjon szöveget. Ne másold át a Task Manager lila
arculatát a Labba, és ne másold a Lab chrome-ját más projektek tokenforrásába.
Az M4 Studio ugyanazt a semleges keretet és TokenFieldet használja. A közös M5 Review panel a preview alatt másodlagos, összecsukható felület, Audit és Changes fülekkel. Nincs új elsődleges workspace. A/B kontroll és státusz mindkét munkaterületen ugyanazt a közös designválasztást mutatja. A referencia csak olvasható; a mezők disable állapota szöveges magyarázatot kap.

## M5 kiegészítés

A meglévő petrol/szürke tokenszínek és system/monospace tipográfia maradnak.
Az egyetlen új hangsúly a Review-rail, amely a preview helyének elvétele nélkül
mutatja a blocker- és eltérésszámot, valamint a helyi mentés állapotát. A nyitott
panel asztalon legfeljebb 560 px, saját listagörgetéssel; 760 px alatt természetes
magasságban a dokumentum görgetését használja. A műveletgombok Lucide ikonja
és szövege közös flex-sorban áll. Hosszú ID-k/bizonyítékok tördelhetők.

A mutáció tulajdonosa a Node ChangeManager; a useChangeManager csak visszaigazolt
Draftot ad. A TokenField helyi hibás bevitelt megőriz, Undo/Redo és explicit
visszatöltés után az új közös értéket mutatja. A scrollt továbbra az editor-body
div birtokolja, a benne lévő disabled fieldset csak az olvasható referenciamódot kezeli.

Az ApprovalDialog saját, semleges natív showModal felszín: legfeljebb 600 px,
32 px viewportbiztonság, belső overflow, inert háttér, Escape és fókuszvisszaadás.
A megerősítés kezdeti fókusza a Mégse; hibája a modalban és a közös megmaradó
alertben is látható. A másodlagos overlay nem importál Task Manager komponenst
a Labba. A projekt eredeti Dialog implementációja változatlan.

## M6 R05 — bizonyított tipográfiai opciók

A közös TokenField a `fontWeight` mezőnél natív selectet használ, az eddigi
OS-tulajdonú popupdöntés szerint. A meglévő tipográfiai panel rövid státuszt és
ellenőrzőgombot kap; nincs új workspace vagy preview-geometriaváltozás. Csak az
aktuális közös QA-val igazolt súly választható. Az összeolvadó, nem ellenőrzött,
elavult és megőrzött értékek szöveggel elkülönülnek, nem pusztán színnel.
A projekt arculata és tokenadata változatlan; nincs automatikus font-/súlycsere.

A súlyválasztó az igazolt CSS-súlyképviselőket nevezi meg. Azonos betűkép esetén
lehetőség szerint a jelenlegi deklarált érték marad képviselő; az alternatív alias
nem külön megjelenés. Ez nem külön natív fontmetszet vagy Semibold face ígérete.
A számérték és a natív select tulajdonosa, színei és geometriája változatlan.
