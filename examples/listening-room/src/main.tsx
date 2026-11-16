import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Action, Notice, Reservation, SessionCard } from './components';
import './app.css';
const long =
  'Árvíztűrő tükörfúrógép – hangok, történetek és közös figyelem '.repeat(5);
function App() {
  const state = new URLSearchParams(location.search).get('state') ?? 'normal';
  const [selected, setSelected] = useState<string | null>(
    state === 'error' ? 'Nyitott hallgatószoba' : null,
  );
  const [notice, setNotice] = useState('');
  return (
    <>
      <a href="#program" className="skip">
        Ugrás a programhoz
      </a>
      <header>
        <a href="/" className="wordmark">
          HANGÁR / HALLGATÓSZOBA
        </a>
        <p>Budapest · Közös hangélmények</p>
      </header>
      <main id="program">
        <section className="intro">
          <p className="eyebrow">A következő találkozók</p>
          <h1>Figyeljünk együtt.</h1>
          <p>
            Kis létszámú alkalmak kíváncsi füleknek. Válassz programot, és
            foglalj helyet.
          </p>
        </section>
        {notice && <Notice>{notice}</Notice>}
        {state === 'missing' ? (
          <div role="alert">
            <h2>Ez az alkalom nem található.</h2>
            <a href="/">Vissza a programokhoz</a>
          </div>
        ) : state === 'empty' ? (
          <section>
            <h2>Most nincs nyitott alkalom.</h2>
            <p>Új időpontokkal hamarosan jelentkezünk.</p>
            <Action
              onClick={() => {
                location.href = '/';
              }}
            >
              Programok újratöltése
            </Action>
          </section>
        ) : (
          <section aria-label="Hallgatási alkalmak">
            <SessionCard
              time="CSÜTÖRTÖK · 18:00"
              title={state === 'long' ? long : 'Nyitott hallgatószoba'}
              description={
                state === 'long'
                  ? long
                  : 'Hozz egy felvételt, amit szívesen megmutatnál másoknak.'
              }
              onReserve={() => setSelected('Nyitott hallgatószoba')}
            />
            <SessionCard
              time="PÉNTEK · 19:00"
              title="Városi hangutak"
              description="Séták és történetek a város kevésbé hallott helyeiről."
              variant="spacious"
              onReserve={() => setSelected('Városi hangutak')}
            />
            <SessionCard
              time="SZOMBAT · 10:00"
              title="Lemez és kávé"
              description="Egy album, egy asztal, kötetlen beszélgetés."
              variant="compact"
              unavailable
            />
          </section>
        )}
        <p className="footnote">
          Helyi bemutató: a foglalások csak ebben a munkamenetben élnek.
        </p>
      </main>
      {selected && (
        <Reservation
          title={selected}
          initialError={state === 'error'}
          onClose={() => setSelected(null)}
          onReserved={(name) => {
            setSelected(null);
            setNotice(`Helyed rögzítve, ${name}.`);
          }}
        />
      )}
    </>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
