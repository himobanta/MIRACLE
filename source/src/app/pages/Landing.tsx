import { Navbar } from '../components/miracle/Navbar';
import { CartDrawer } from '../components/miracle/CartDrawer';
import { QuizModal } from '../components/miracle/QuizModal';
import { Hero } from '../components/miracle/sections/Hero';
import { Stats } from '../components/miracle/sections/Stats';
import { Products } from '../components/miracle/sections/Products';
import { Concerns } from '../components/miracle/sections/Concerns';
import { Ingredients } from '../components/miracle/sections/Ingredients';
import { Routine } from '../components/miracle/sections/Routine';
import { Results } from '../components/miracle/sections/Results';
import { WhyCare } from '../components/miracle/sections/WhyCare';
import { Journal } from '../components/miracle/sections/Journal';
import { Testimonials } from '../components/miracle/sections/Testimonials';
import { FinalCTA } from '../components/miracle/sections/FinalCTA';
import { Footer } from '../components/miracle/sections/Footer';

export function Landing() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%', overflowX: 'hidden', background: 'var(--bg)', color: 'var(--fg)', fontFamily: "'Inter',ui-sans-serif,system-ui,sans-serif", WebkitFontSmoothing: 'antialiased', transition: 'background .4s, color .4s' }}>
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Products />
        <Concerns />
        <Ingredients />
        <Routine />
        <Results />
        <WhyCare />
        <Journal />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
      <CartDrawer />
      <QuizModal />
    </div>
  );
}
