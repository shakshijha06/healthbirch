import React, { useEffect, useMemo, useRef, useState } from 'react'; // Import React and hooks for animation/state behavior.
import { Link } from 'react-router-dom'; // Import Link for route navigation actions.
import { Button } from '../components/shared/Button'; // Import shared button to keep styling consistent.
import { Bot, CalendarCheck, Cross, Dna, Heart, Pill, Sparkles, Stethoscope } from 'lucide-react'; // Import icons used in hero, steps, and cards.

const Landing = () => { // Declare the Landing component that renders the public marketing page.
  const statsSectionRef = useRef(null); // Create a ref to detect when stats enter the viewport.
  const [statsVisible, setStatsVisible] = useState(false); // Track whether the stats section is currently visible.
  const [counters, setCounters] = useState({ patients: 0, doctors: 0, specialties: 0 }); // Store live counter values for animated number increments.
  const [featuresVisible, setFeaturesVisible] = useState(false); // Track feature-section visibility for slide/fade animation.
  const [testimonialsVisible, setTestimonialsVisible] = useState(false); // Track testimonial-section visibility for staggered fades.
  const [stepsVisible, setStepsVisible] = useState(false); // Track how-it-works section visibility for line animation.

  const floatingIcons = useMemo(() => [ // Memoize icon metadata so random-looking placement remains stable per mount.
    { Icon: Heart, top: '8%', left: '8%', delay: '0s', duration: '6.8s' }, // Define a soft floating heart icon in the upper-left region.
    { Icon: Stethoscope, top: '18%', left: '78%', delay: '1.1s', duration: '7.6s' }, // Define a floating stethoscope icon in the upper-right region.
    { Icon: Pill, top: '65%', left: '12%', delay: '0.6s', duration: '6.4s' }, // Define a floating pill icon near lower-left region.
    { Icon: Dna, top: '56%', left: '72%', delay: '1.8s', duration: '7.8s' }, // Define a floating DNA icon near lower-right region.
    { Icon: Cross, top: '35%', left: '42%', delay: '1.4s', duration: '6.9s' }, // Define a floating medical cross icon near center region.
  ], []); // Keep this array stable because values are static for one page session.

  useEffect(() => { // Start observing key sections to trigger entrance animations when visible.
    const observer = new IntersectionObserver( // Create an observer to detect section intersections for animation triggers.
      (entries) => { // Handle intersection updates for all observed elements.
        entries.forEach((entry) => { // Iterate each observed entry and activate the associated animation state.
          const sectionName = entry.target.getAttribute('data-animate'); // Read the custom data key to map entry to state.
          if (entry.isIntersecting && sectionName === 'stats') setStatsVisible(true); // Enable count-up trigger when stats section appears.
          if (entry.isIntersecting && sectionName === 'features') setFeaturesVisible(true); // Enable feature card reveal when features appear.
          if (entry.isIntersecting && sectionName === 'testimonials') setTestimonialsVisible(true); // Enable testimonial stagger reveal when visible.
          if (entry.isIntersecting && sectionName === 'steps') setStepsVisible(true); // Enable how-it-works line/card animation when visible.
        }); // Finish processing intersection entries.
      }, // End intersection callback definition.
      { threshold: 0.25 } // Trigger once around quarter visibility for smoother UX.
    ); // Finalize observer creation.

    const observedElements = Array.from(document.querySelectorAll('[data-animate]')); // Collect all animatable sections declared in markup.
    observedElements.forEach((element) => observer.observe(element)); // Register each target element with the observer.
    return () => observer.disconnect(); // Clean up observer on unmount to avoid memory leaks.
  }, []); // Run observer setup only once when the page mounts.

  useEffect(() => { // Start count-up animation when stats visibility becomes true.
    if (!statsVisible) return; // Exit early until section is in view.
    const targets = { patients: 10000, doctors: 500, specialties: 50 }; // Define final values shown in the marketing stats row.
    const startedAt = performance.now(); // Capture animation start time for progress calculation.
    const durationMs = 1400; // Set total animation duration for a smooth fast count-up.

    const frame = (now) => { // Define one animation frame callback.
      const progress = Math.min((now - startedAt) / durationMs, 1); // Compute normalized progress between 0 and 1.
      const eased = 1 - Math.pow(1 - progress, 3); // Apply an ease-out cubic curve for natural deceleration.
      setCounters({ // Update all counters in one state update for sync rendering.
        patients: Math.floor(targets.patients * eased), // Update patients count based on eased progress.
        doctors: Math.floor(targets.doctors * eased), // Update doctors count based on eased progress.
        specialties: Math.floor(targets.specialties * eased), // Update specialties count based on eased progress.
      }); // Finish counters state assignment.
      if (progress < 1) requestAnimationFrame(frame); // Continue animation until final frame is reached.
    }; // Finish frame function definition.

    requestAnimationFrame(frame); // Kick off the first animation frame.
  }, [statsVisible]); // Rerun only when the visibility trigger changes.

  return ( // Render the modern landing layout with white/light-gray sections.
    <div className="bg-primary-dark text-white min-h-screen"> {/* Use a dark navy base for the brand style. */}
      <section className="relative overflow-hidden border-b border-gray-100 bg-animated-hero px-4 py-20 md:py-24"> {/* Build a hero section with animated gradient background and generous spacing. */}
        <div className="pointer-events-none absolute inset-0"> {/* Add a non-interactive background layer for decorative floating icons. */}
          {floatingIcons.map(({ Icon, top, left, delay, duration }, index) => // Render each floating icon with independent timing/position values.
            React.createElement(Icon, { // Create the lucide icon via React.createElement so ESLint counts the variable as used.
              key: index, // Provide stable key for the array element.
              className: 'absolute text-primary/10 float-soft', // Apply absolute positioning, soft color, and floating animation.
              style: { top, left, animationDelay: delay, animationDuration: duration }, // Apply inline style for unique placement and animation timing.
            }) // End React.createElement call.
          )} {/* Close floating icon mapping block. */}
        </div> {/* End floating icon container. */}

        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-14 lg:grid-cols-2"> {/* Create a two-column hero layout similar to modern health-tech marketing pages. */}
          <div className="relative z-10"> {/* Ensure content remains above decorative icon layer. */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/10 backdrop-blur-sm px-4 py-2 text-xs font-semibold tracking-wide text-white shadow-sm"> {/* Render a pill badge introducing the AI product value. */}
              <Sparkles className="h-4 w-4" /> {/* Show a sparkles icon to convey innovation. */}
              AI-guided care matching {/* Provide concise supporting text for hero badge context. */}
            </div> {/* End hero badge. */}
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl"> {/* Render prominent headline with modern typography hierarchy. */}
              Book the right doctor, faster. {/* Present the first hero headline line focused on benefit. */}
              <span className="block text-secondary-light mt-2">Care starts with one chat.</span> {/* Present highlighted second line using secondary accent color. */}
            </h1> {/* End hero headline. */}
            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 md:text-lg"> {/* Render explanatory hero subtext with readable line length. */}
              HealthBirch empowers patients to describe their symptoms in everyday language, uses AI to recommend the most appropriate specialist, and enables seamless appointment booking—all in just a few minutes. {/* Explain the core platform workflow in one polished statement. */}
            </p> {/* End hero subtext. */}
            <div className="mt-10 flex flex-wrap gap-4"> {/* Render dual CTA buttons with generous spacing and rounded-pill style. */}
              <Link to="/register"> {/* Link primary CTA to registration flow for conversion. */}
                <Button className="rounded-full px-7 py-3.5 text-sm font-semibold">Get Started</Button> {/* Render filled indigo CTA button as requested. */}
              </Link> {/* End primary CTA link wrapper. */}
              <Link to="/login"> {/* Link secondary CTA to login route for returning users. */}
                <Button variant="secondary" className="btn-outline">Login</Button> {/* Render outlined indigo CTA according to button style rule. */}
              </Link> {/* End secondary CTA link wrapper. */}
            </div> {/* End CTA button group. */}
          </div> {/* End hero left content column. */}

          <div className="relative z-10 flex items-center justify-center"> {/* Render hero-right visual area for animated app mockup card. */}
            <div className="w-full max-w-md rounded-3xl glass-panel p-5 bob-soft"> {/* Build floating mockup card with subtle bob animation. */}
              <div className="mb-4 flex items-center justify-between"> {/* Render mockup top row resembling app status header. */}
                <p className="text-sm font-semibold text-slate-200">HealthBirch Assistant</p> {/* Label the mini interface title inside mockup. */}
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400"> {/* Render online status badge with soft green palette. */}
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> {/* Render green status dot inside online badge. */}
                  Online {/* Render online text label in status badge. */}
                </span> {/* End online badge. */}
              </div> {/* End mockup header row. */}
              <div className="rounded-2xl bg-white/[0.04] p-4 border border-white/[0.08] backdrop-blur-md"> {/* Render mockup body area with light gray background section. */}
                <div className="mb-3 flex items-start gap-3"> {/* Render mini doctor info row in mockup body. */}
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#60A5FA]/10 text-sm font-bold text-[#60A5FA] border border-[#60A5FA]/20">DR</div> {/* Show doctor initials avatar in indigo style. */}
                  <div> {/* Wrap doctor metadata text for proper stack alignment. */}
                    <p className="text-sm font-semibold text-white">Dr. Priya Sharma</p> {/* Show doctor name in mockup preview. */}
                    <p className="text-xs text-slate-400">Cardiologist</p> {/* Show specialty using teal accent color. */}
                  </div> {/* End doctor metadata wrapper. */}
                </div> {/* End mini doctor info row. */}
                <div className="space-y-2"> {/* Render mini chat bubbles to preview interface behavior. */}
                  <p className="chat-bubble-user">I feel chest tightness while climbing stairs.</p> {/* Render patient-like message example in white bubble. */}
                  <p className="chat-bubble-ai">Let’s connect you with a heart specialist today.</p> {/* Render AI-like response in indigo bubble. */}
                </div> {/* End mini chat bubbles container. */}
              </div> {/* End mockup body area. */}
            </div> {/* End hero mockup card. */}
          </div> {/* End hero right visual column. */}
        </div> {/* End hero two-column wrapper. */}
      </section> {/* End hero section. */}

      <section className="border-y border-white/5 bg-primary-dark/30 px-4 py-16 relative overflow-hidden" ref={statsSectionRef} data-animate="stats"> {/* Render stats section on light gray background and mark for observer animation. */}
        <div className="absolute inset-0 opacity-[0.03] [background-image:radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.5)_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-3 relative z-10"> {/* Create responsive three-column stats grid. */}
          <div className="card glass-panel p-7 text-center"> {/* Render stat card with requested hover behavior. */}
            <p className="text-4xl font-extrabold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent drop-shadow-sm">{counters.patients.toLocaleString()}+</p> {/* Show animated patient counter with suffix plus. */}
            <p className="mt-2 text-sm font-medium text-slate-400">Patients helped</p> {/* Label first stat with concise descriptor. */}
          </div> {/* End first stat card. */}
          <div className="card glass-panel p-7 text-center"> {/* Render second stat card with matching visual style. */}
            <p className="text-4xl font-extrabold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent drop-shadow-sm">{counters.doctors.toLocaleString()}+</p> {/* Show animated doctors counter value. */}
            <p className="mt-2 text-sm font-medium text-slate-400">Verified doctors</p> {/* Label second stat for provider scale context. */}
          </div> {/* End second stat card. */}
          <div className="card glass-panel p-7 text-center"> {/* Render third stat card with same motion language. */}
            <p className="text-4xl font-extrabold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent drop-shadow-sm">{counters.specialties.toLocaleString()}+</p> {/* Show animated specialties counter value. */}
            <p className="mt-2 text-sm font-medium text-slate-400">Specialties available</p> {/* Label third stat to communicate coverage breadth. */}
          </div> {/* End third stat card. */}
        </div> {/* End stats grid wrapper. */}
      </section> {/* End stats section. */}

      <section id="how-it-works" className="bg-[#0a0a0f] px-4 py-20 border-y border-white/5" data-animate="steps"> {/* Render how-it-works section on dark navy with subtle borders. */}
        <div className="mx-auto max-w-7xl"> {/* Constrain section width for centered readable layout. */}
          <div className="mx-auto mb-14 max-w-2xl text-center"> {/* Render section heading block with centered copy. */}
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">How HealthBirch works</h2> {/* Present section headline with strong visual hierarchy. */}
            <p className="mt-4 text-slate-300">From symptom chat to booking confirmation in three easy steps.</p> {/* Present concise section subtext for process framing. */}
          </div> {/* End section heading block. */}
          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3"> {/* Build responsive three-step card grid with line connector support. */}
            <div className={`pointer-events-none absolute left-[18%] right-[18%] top-10 hidden h-0.5 origin-left bg-gradient-to-r from-white/10 via-white/30 to-white/10 md:block ${stepsVisible ? 'animate-draw-line' : 'scale-x-0'}`} /> {/* Render animated connector line between step cards on desktop. */}
            {[ // Start mapped step content list for reusable card generation.
              { icon: Bot, title: 'Talk to the AI like a friend', text: 'Describe what you are feeling in plain language — no medical terms needed. The AI listens, asks follow-ups, and understands.' }, // Define first step content with AI/chat context.
              { icon: Stethoscope, title: 'Get matched to the right specialist instantly', text: 'Based on your symptoms and urgency, HEALTHBIRCH recommends the exact specialty you need — no more guessing or wrong appointments.' }, // Define second step content for matching logic.
              { icon: CalendarCheck, title: 'Book in seconds, not hours', text: 'Choose your doctor, pick a slot that works for you, and confirm instantly. Your appointment summary goes straight to the doctor.' }, // Define third step content for booking action.
            ].map((step, index) => ( // Iterate step definitions to render each card consistently.
              <article key={step.title} className={`relative z-10 card glass-panel p-8 opacity-0 ${stepsVisible ? 'translate-y-0 opacity-100' : 'translate-y-6'}`} style={{ transitionDelay: `${index * 120}ms` }}> {/* Render step card with timed reveal and requested hover behavior. */}
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] shadow-inner text-secondary"> {/* Render circular icon holder with light indigo background. */}
                  <step.icon className="h-7 w-7" /> {/* Render the specific step icon in indigo tone. */}
                </div> {/* End icon holder. */}
                <h3 className="text-lg font-semibold text-white">{step.title}</h3> {/* Render step title text. */}
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{step.text}</p> {/* Render step explanation copy. */}
              </article> // End individual step card article.
            ))} {/* End step list mapping block. */}
          </div> {/* End steps grid. */}
        </div> {/* End how-it-works container. */}
      </section> {/* End how-it-works section. */}

      <section className="border-y border-white/5 bg-primary-dark/30 px-4 py-20 relative overflow-hidden" data-animate="features"> {/* Render feature cards section on light-gray background and observe for reveal. */}
        <div className="absolute inset-0 opacity-[0.03] [background-image:radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.5)_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="mx-auto max-w-7xl relative z-10"> {/* Constrain features section to readable centered width. */}
          <div className="mb-12 text-center"> {/* Render features heading block centered. */}
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Built for modern care teams</h2> {/* Present features headline in clear professional tone. */}
            <p className="mx-auto mt-4 max-w-2xl text-slate-300">A clean, health-tech interface inspired by top digital care products.</p> {/* Explain design intent and practical benefits. */}
          </div> {/* End features heading block. */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3"> {/* Render responsive three-column feature card layout. */}
            {[ // Define feature card content list for mapping.
              { title: 'AI-powered symptom triage', text: 'The AI conducts a dynamic pre-consultation interview, collects symptom history, assigns a severity score, and routes patients to exactly the right specialist.' }, // Define feature one value proposition.
              { title: 'Zero-friction appointment booking', text: 'Patients go from triage result to confirmed booking in one flow — no calls, no searching, no wrong departments.' }, // Define feature two value proposition.
              { title: 'Purpose-built role dashboards', text: 'Patients manage their health journey, doctors review AI summaries before consultations, and admins control the entire platform — each with tools built for their specific workflow.' }, // Define feature three value proposition.
            ].map((feature, index) => ( // Map features to consistent card components.
              <article key={feature.title} className={`card glass-panel p-7 opacity-0 ${featuresVisible ? 'translate-y-0 opacity-100' : 'translate-y-8'}`} style={{ transitionDelay: `${index * 120}ms` }}> {/* Render feature card with slide-up fade when section enters view. */}
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3> {/* Render feature title text. */}
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{feature.text}</p> {/* Render feature description text. */}
              </article> // End feature card.
            ))} {/* End feature cards mapping. */}
          </div> {/* End feature card grid. */}
        </div> {/* End features section container. */}
      </section> {/* End features section. */}

      <section id="about" className="bg-[#0a0a0f] px-4 py-20 border-b border-white/5" data-animate="testimonials"> {/* Render testimonial section on dark navy. */}
        <div className="mx-auto max-w-7xl"> {/* Constrain testimonial section content width. */}
          <div className="mb-12 text-center"> {/* Render testimonial heading block. */}
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">What users say</h2> {/* Present testimonial section headline. */}
            <p className="mx-auto mt-4 max-w-2xl text-slate-300">Care teams and patients trust HealthBirch for quick, confident scheduling.</p> {/* Provide brief social-proof intro sentence. */}
          </div> {/* End testimonial heading block. */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3"> {/* Render three testimonial cards in responsive grid. */}
            {[ // Define testimonial quotes and attributions for mapped rendering.
              { quote: 'I live in a small town with limited specialists nearby. HEALTHBIRCH found me the right doctor in the next city and handled the booking completely.', by: 'Priya Nair, Patient — Satara' }, // Define first testimonial content.
              { quote: 'What impressed me most is that the AI never oversteps — it always clarifies it is not a diagnosis which is the right approach for healthcare.', by: 'Dr. Sameer Joshi, Psychiatrist — Kokilaben Hospital, Mumbai' }, // Define second testimonial content.
              { quote: 'Booking for my elderly mother used to take hours of calls. HEALTHBIRCH matched her to the right cardiologist in one conversation.', by: 'Sneha Iyer, Patient — Chennai' }, // Define third testimonial content.
            ].map((item, index) => ( // Map testimonial content to card components.
              <article key={item.by} className={`card p-7 opacity-0 ${testimonialsVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: `${index * 180}ms` }}> {/* Render testimonial card with staggered fade-in delay. */}
                <p className="text-sm leading-relaxed text-slate-300">"{item.quote}"</p> {/* Render quoted testimonial statement. */}
                <p className="mt-5 text-sm font-semibold text-white">{item.by}</p> {/* Render testimonial author attribution. */}
              </article> // End testimonial card component.
            ))} {/* End testimonial mapping block. */}
          </div> {/* End testimonials grid. */}
        </div> {/* End testimonial container. */}
      </section> {/* End testimonials section. */}

      <footer className="bg-slate-900 px-4 py-10"> {/* Render dark footer as the only allowed dark section. */}
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row"> {/* Build responsive footer layout with brand and legal text. */}
          <div className="flex items-center gap-2"> {/* Render footer brand cluster. */}
            <Heart className="h-5 w-5 text-primary-light" /> {/* Show heart icon beside brand in footer context. */}
            <span className="text-lg font-semibold text-white">HealthBirch</span> {/* Render footer brand text label. */}
          </div> {/* End footer brand cluster. */}
          <p className="text-sm text-slate-300">© {new Date().getFullYear()} HealthBirch. Better access to care.</p> {/* Render dynamic copyright line. */}
        </div> {/* End footer container. */}
      </footer> {/* End footer section. */}
    </div> // End main landing page wrapper.
  ); // Return completed Landing JSX tree.
}; // Close Landing component declaration.

export default Landing; // Export Landing component for router usage.
