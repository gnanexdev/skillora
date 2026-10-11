import Header from '../components/layout/Header.jsx'
import Footer from '../components/layout/Footer.jsx'
import Hero from '../components/landing/Hero.jsx'
import Features from '../components/landing/Features.jsx'
import AboutSkillOra from '../components/landing/AboutSkillOra.jsx'
import ProductFlow from '../components/landing/ProductFlow.jsx'
import FinalCTA from '../components/landing/FinalCTA.jsx'

export function Landing() {
  return (
    <div className="site-shell">
      <Header />
      <main>
        <Hero />
        <Features />
        <AboutSkillOra />
        <ProductFlow />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}

export default Landing
