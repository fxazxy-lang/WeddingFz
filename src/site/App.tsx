import { EnvelopeIntro } from './components/EnvelopeIntro';
import { Footer } from './components/Footer';
import { Gifts } from './components/Gifts';
import { Guestbook } from './components/Guestbook';
import { Hero } from './components/Hero';
import { LightboxProvider } from './components/Lightbox';
import { MusicToggle } from './components/MusicToggle';
import { Nav } from './components/Nav';
import { RsvpForm } from './components/RsvpForm';
import { Schedule } from './components/Schedule';
import { Story } from './components/Story';
import { Venue } from './components/Venue';

export function App() {
  return (
    <LightboxProvider>
      <a className="skip-link" href="#rsvp">
        RSVP
      </a>
      <Nav />
      <main>
        <Hero />
        <Story />
        <Schedule />
        <Venue />
        <RsvpForm />
        <Guestbook />
        <Gifts />
      </main>
      <Footer />
      <MusicToggle />
      <EnvelopeIntro />
    </LightboxProvider>
  );
}
