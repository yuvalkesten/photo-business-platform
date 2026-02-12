import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-cream overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-5 md:px-12 bg-cream-100/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="animate-fade-in">
            <span className="text-base font-bold tracking-tight text-navy">
              Photo Business
            </span>
          </div>
          <Link
            href="/auth/signin"
            className="animate-fade-in delay-200 text-sm font-semibold text-navy hover:text-honey-500 transition-colors duration-200"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="animate-fade-in-up delay-100 inline-flex items-center gap-2 bg-honey-100 text-honey-700 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Built for photographers
          </div>

          {/* Main headline */}
          <h1 className="animate-fade-in-up delay-200 text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] text-navy mb-6">
            Your Art Deserves
            <br />
            <span className="text-honey-500">Better Business</span>
          </h1>

          {/* Subheadline */}
          <p className="animate-fade-in-up delay-300 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            The all-in-one platform that handles clients, bookings, and galleries — so you can focus on creating extraordinary images.
          </p>

          {/* CTA Buttons */}
          <div className="animate-fade-in-up delay-400 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signin" className="btn-honey text-base px-8 py-3.5">
              Get Started Free
            </Link>
            <Link href="#features" className="btn-outline-honey text-base px-8 py-3.5">
              Explore Features
            </Link>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="relative py-16 border-y border-cream-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 text-center">
            <div className="animate-fade-in">
              <p className="text-3xl md:text-4xl font-bold text-navy mb-1">2,500+</p>
              <p className="text-sm text-muted-foreground font-medium">Photographers</p>
            </div>
            <div className="hidden md:block w-[1px] h-12 bg-cream-300" />
            <div className="animate-fade-in delay-100">
              <p className="text-3xl md:text-4xl font-bold text-navy mb-1">50,000+</p>
              <p className="text-sm text-muted-foreground font-medium">Sessions Booked</p>
            </div>
            <div className="hidden md:block w-[1px] h-12 bg-cream-300" />
            <div className="animate-fade-in delay-200">
              <p className="text-3xl md:text-4xl font-bold text-navy mb-1">1M+</p>
              <p className="text-sm text-muted-foreground font-medium">Photos Delivered</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 md:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-20">
            <p className="animate-fade-in text-sm font-semibold text-honey-600 uppercase tracking-wider mb-4">
              Thoughtfully Crafted
            </p>
            <h2 className="animate-fade-in-up delay-100 text-4xl md:text-5xl font-bold text-navy">
              Everything You Need,
              <br />
              <span className="text-muted-foreground">Nothing You Don&apos;t</span>
            </h2>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Large Feature - Client Management */}
            <div className="lg:col-span-7 group">
              <div className="animate-slide-in-left h-full bg-white rounded-2xl shadow-warm p-10 md:p-14 transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-1">
                <div className="flex items-start justify-between mb-8">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-honey-100 text-honey-700 text-sm font-bold">01</span>
                  <svg className="w-8 h-8 text-cream-300 group-hover:text-honey-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-navy mb-4">Client Relationships</h3>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  Every client tells a story. Track contact details, session history, preferences, and notes — all in one elegant interface. Know your clients like never before.
                </p>
                <div className="flex items-center text-sm font-semibold text-honey-600 group-hover:text-honey-700">
                  <span>Learn more</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Stacked Features */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Smart Booking */}
              <div className="group flex-1">
                <div className="animate-slide-in-right h-full bg-white rounded-2xl shadow-warm p-10 transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-1">
                  <div className="flex items-start justify-between mb-6">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-honey-100 text-honey-700 text-sm font-bold">02</span>
                    <svg className="w-8 h-8 text-cream-300 group-hover:text-honey-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-navy mb-3">Intelligent Scheduling</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Seamless Google Calendar sync. Set availability, accept bookings, send reminders — automatically.
                  </p>
                </div>
              </div>

              {/* Photo Galleries */}
              <div className="group flex-1">
                <div className="animate-slide-in-right delay-200 h-full bg-white rounded-2xl shadow-warm p-10 transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-1">
                  <div className="flex items-start justify-between mb-6">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-honey-100 text-honey-700 text-sm font-bold">03</span>
                    <svg className="w-8 h-8 text-cream-300 group-hover:text-honey-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-navy mb-3">Gallery Delivery</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Present your work beautifully. Secure, fast galleries that reflect your artistic vision.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="relative py-24 md:py-32 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <div>
              <p className="animate-fade-in text-sm font-semibold text-honey-600 uppercase tracking-wider mb-4">
                Seamless Workflow
              </p>
              <h2 className="animate-fade-in-up delay-100 text-3xl md:text-4xl font-bold text-navy mb-6">
                Integrates With Your
                <br />
                <span className="text-muted-foreground">Existing Tools</span>
              </h2>
              <p className="animate-fade-in-up delay-200 text-muted-foreground text-lg leading-relaxed mb-10">
                We believe in harmony, not disruption. Connect with the tools you already trust and love.
              </p>

              {/* Integration list */}
              <div className="space-y-5">
                <div className="animate-slide-in-left delay-300 flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-xl bg-honey-50 flex items-center justify-center group-hover:bg-honey-100 transition-colors duration-200">
                    <svg className="w-6 h-6 text-honey-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.5 22.5H4.5C3.12 22.5 2 21.38 2 20V6C2 4.62 3.12 3.5 4.5 3.5H7V2H9V3.5H15V2H17V3.5H19.5C20.88 3.5 22 4.62 22 6V20C22 21.38 20.88 22.5 19.5 22.5ZM4.5 5.5C4.22 5.5 4 5.72 4 6V20C4 20.28 4.22 20.5 4.5 20.5H19.5C19.78 20.5 20 20.28 20 20V6C20 5.72 19.78 5.5 19.5 5.5H4.5ZM17 9H7V11H17V9Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-navy font-semibold">Google Calendar</p>
                    <p className="text-sm text-muted-foreground">Two-way sync for all your sessions</p>
                  </div>
                </div>

                <div className="animate-slide-in-left delay-400 flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-xl bg-honey-50 flex items-center justify-center group-hover:bg-honey-100 transition-colors duration-200">
                    <svg className="w-6 h-6 text-honey-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-navy font-semibold">Gmail</p>
                    <p className="text-sm text-muted-foreground">Client communication in one place</p>
                  </div>
                </div>

                <div className="animate-slide-in-left delay-500 flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-xl bg-honey-50 flex items-center justify-center group-hover:bg-honey-100 transition-colors duration-200">
                    <svg className="w-6 h-6 text-honey-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14C0 17.31 2.69 20 6 20H19C21.76 20 24 17.76 24 15C24 12.36 21.95 10.22 19.35 10.04ZM19 18H6C3.79 18 2 16.21 2 14C2 11.95 3.53 10.24 5.56 10.03L6.63 9.92L7.13 8.97C8.08 7.14 9.94 6 12 6C14.62 6 16.88 7.86 17.39 10.43L17.69 11.93L19.22 12.04C20.78 12.14 22 13.45 22 15C22 16.65 20.65 18 19 18Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-navy font-semibold">Cloud Storage</p>
                    <p className="text-sm text-muted-foreground">Secure, unlimited photo storage</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Visual */}
            <div className="animate-scale-in delay-300 relative">
              <div className="aspect-square bg-cream-100 rounded-2xl border border-cream-300 flex items-center justify-center shadow-warm">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-honey-100 flex items-center justify-center">
                    <svg className="w-10 h-10 text-honey-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-navy mb-2">Effortless</p>
                  <p className="text-muted-foreground text-sm">One-click connections</p>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 border-2 border-honey-200 rounded-2xl" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-honey-50 rounded-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="relative py-24 md:py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-fade-in mb-8">
            <svg className="w-12 h-12 mx-auto text-honey-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
          </div>
          <blockquote className="animate-fade-in-up delay-100 text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-navy mb-10">
            Finally, a platform that understands photographers.
            <span className="text-muted-foreground font-normal"> My workflow has never been smoother.</span>
          </blockquote>
          <div className="animate-fade-in-up delay-300">
            <p className="text-navy font-semibold">Sarah Chen</p>
            <p className="text-sm text-muted-foreground">Wedding & Portrait Photographer</p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-24 md:py-32 px-6 bg-white">
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="animate-fade-in-up delay-100 text-4xl md:text-5xl lg:text-6xl font-bold text-navy mb-6">
            Ready to Transform
            <br />
            <span className="text-honey-500">Your Business?</span>
          </h2>

          <p className="animate-fade-in-up delay-200 text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            Join thousands of photographers who&apos;ve reclaimed their time and elevated their client experience.
          </p>

          <div className="animate-fade-in-up delay-300">
            <Link href="/auth/signin" className="btn-honey text-base px-10 py-4">
              Get Started Free
            </Link>
          </div>

          <p className="animate-fade-in delay-500 mt-8 text-sm text-muted-foreground">
            No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cream-300 py-12 px-6 bg-cream">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Photo Business Platform
          </div>
          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#" className="hover:text-navy transition-colors duration-200">Privacy</a>
            <a href="#" className="hover:text-navy transition-colors duration-200">Terms</a>
            <a href="#" className="hover:text-navy transition-colors duration-200">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
