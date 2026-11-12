import { Link } from 'react-router-dom'

export function Home() {
  return (
    <main className="screen setup-screen">
      <section className="hero-panel">
        <p className="eyebrow">Jogo em grupo</p>
        <h1>Espião</h1>
        <p className="lede">
          Todo mundo sabe o lugar, menos o espião. Façam perguntas, desconfiem e descubram quem é
          antes do tempo acabar.
        </p>
      </section>

      <section className="panel home-actions">
        <Link to="/online" className="primary-button button-link">
          Jogar online
        </Link>
        <p className="muted">Cada pessoa usa o próprio celular e entra na sala com um código.</p>
        <Link to="/local" className="secondary-button button-link">
          Jogar neste celular
        </Link>
        <p className="muted">Um celular passado de mão em mão, sem internet.</p>
      </section>
    </main>
  )
}
