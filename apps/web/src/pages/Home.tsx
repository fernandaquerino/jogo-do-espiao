import { Link } from 'react-router-dom'

export function Home() {
  return (
    <main className="screen setup-screen">
      <section className="hero-panel">
        <p className="eyebrow">Group game</p>
        <h1>Spy</h1>
        <p className="lede">
          Everyone knows the location except the spy. Ask questions, stay suspicious and find out
          who it is before time runs out.
        </p>
      </section>

      <section className="panel home-actions">
        <Link to="/online" className="primary-button button-link">
          Play online
        </Link>
        <p className="muted">Everyone uses their own phone and joins the room with a code.</p>
        <Link to="/local" className="secondary-button button-link">
          Play on this phone
        </Link>
        <p className="muted">One phone passed from hand to hand, no internet needed.</p>
      </section>
    </main>
  )
}
