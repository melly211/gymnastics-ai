import { ArrowRight, BarChart3, Camera, Gauge, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import yogaBalanceImage from '../assets/yoga-balance.png'
import yogaFlowImage from '../assets/yoga-flow.png'
import yogaPracticeImage from '../assets/yoga-practice.png'

const yogaImages = [
  { src: yogaFlowImage, alt: 'Gymnast in a pink leotard holding an arched floor pose against a white backdrop', title: 'Strength and flexibility' },
  { src: yogaBalanceImage, alt: 'Gymnast in pink performing a backbend on a light outdoor surface', title: 'Build balance and control' },
  { src: yogaPracticeImage, alt: 'Athlete in pink activewear stretching with one leg raised in a bright studio', title: 'Train with intention' },
]

const featureCards = [
  {
    icon: Camera,
    title: 'Pose Tracking',
    text: 'Detect body landmarks from the uploaded video using MediaPipe in-browser.',
  },
  {
    icon: Gauge,
    title: 'Joint Angle Measurement',
    text: 'Measure knee, hip, and elbow angles using real geometric calculations.',
  },
  {
    icon: BarChart3,
    title: 'Movement Symmetry',
    text: 'Compare left and right-side motion across the analyzed sequence.',
  },
  {
    icon: Sparkles,
    title: 'Range of Motion',
    text: 'Review min, max, average, and motion range for each key joint.',
  },
]

const workflow = ['Upload Video', 'Track Body Position', 'Calculate Joint Motion', 'Review Results']

function Home() {
  return (
    <div className="page home-page">
      <section className="hero-section panel">
        <div className="hero-copy">
          <p className="eyebrow">Gymnastics movement analysis</p>
          <h1>Gymnastics Movement Analysis</h1>
          <p className="hero-subtitle">
            Analyze joint movement, symmetry, and range of motion directly from video.
          </p>

          <div className="cta-row">
            <Link to="/analyze" className="primary-button">
              Analyze a Video
              <ArrowRight size={18} />
            </Link>
            <Link to="/results" className="secondary-button">
              View demo results
            </Link>
          </div>
        </div>

        <div className="hero-panel">
          <div className="mini-panel">
            <span className="mini-label">Balance</span>
            <strong>94%</strong>
          </div>
          <div className="mini-panel accent">
            <span className="mini-label">Control</span>
            <strong>High</strong>
          </div>
          <div className="mini-panel">
            <span className="mini-label">Tempo</span>
            <strong>Stable</strong>
          </div>
        </div>
      </section>

      <section className="yoga-gallery" aria-labelledby="yoga-gallery-heading">
        <div className="yoga-gallery-heading">
          <p className="eyebrow">Yoga &amp; gymnastics</p>
          <h2 id="yoga-gallery-heading">Strength, balance, and flexibility in motion</h2>
        </div>
        <div className="yoga-gallery-grid">
          {yogaImages.map(({ src, alt, title }) => (
            <figure key={title} className="yoga-photo-card">
              <img src={src} alt={alt} loading="lazy" />
              <figcaption>{title}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="feature-grid">
        {featureCards.map(({ icon: Icon, title, text }) => (
          <article key={title} className="feature-card panel">
            <div className="feature-icon">
              <Icon size={22} />
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="workflow panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">How it works</p>
            <h3>Simple analysis workflow</h3>
          </div>
        </div>

        <div className="workflow-steps">
          {workflow.map((step, index) => (
            <div key={step} className="workflow-step">
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Home
