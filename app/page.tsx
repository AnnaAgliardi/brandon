import Link from 'next/link'
import { LandingNav } from '@/components/landing-nav'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-blue-600">
      <LandingNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Background effects */}
          <div className="hero-background absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-background pointer-events-none" />

          <div className="relative container px-4 pt-24 pb-24 md:pt-32 md:pb-32 lg:pt-40 lg:pb-40">
            <div className="mx-auto max-w-4xl text-center space-y-8">
              <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-[5rem] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 fill-mode-both">
                Find brand assets with{' '}
                <span className="relative whitespace-nowrap">
                  <span className="relative bg-gradient-to-r from-blue-600 via-indigo-500 to-indigo-600 bg-clip-text text-transparent">
                    natural language
                  </span>
                </span>
              </h1>
              <p className="text-lg text-muted-foreground md:text-xl leading-relaxed max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200 fill-mode-both">
                Brandon is your AI assistant for Digital Asset Management.
                Ask in plain English and get the right visuals instantly — built for
                marketing, PR, and corporate communications teams.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
                <Button asChild size="lg" className="group h-14 px-8 rounded-full bg-blue-600 hover:bg-blue-700 text-base shadow-[0_0_40px_-10px_rgba(37,99,235,0.4)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.6)] transition-all duration-300 hover:-translate-y-0.5">
                  <Link href="/signup">
                    Get started
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 px-8 rounded-full text-base border-blue-200 hover:bg-blue-50/50 hover:text-blue-700 transition-all duration-300 hover:-translate-y-0.5">
                  <Link href="/login">Log in</Link>
                </Button>
              </div>
            </div>

            {/* Hero Mockup */}
            <div className="mt-16 md:mt-24 mx-auto max-w-4xl relative z-10 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-500 fill-mode-both">
              <div className="relative">
                <div className="relative rounded-2xl border bg-background shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                    <div className="w-3 h-3 rounded-full bg-green-400/80" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="bg-muted rounded-md px-4 py-1 text-xs text-muted-foreground w-64 text-center">
                      brandon.app/chat
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 space-y-6 bg-gradient-to-b from-background to-muted/20">
                  <div className="flex justify-end">
                    <div className="bg-slate-100 rounded-2xl px-5 py-3 text-sm max-w-sm">
                      I&apos;m looking for a picture of a car in the snow.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="space-y-3">
                      <div className="text-sm leading-relaxed max-w-md">
                        Found 9 assets featuring snow, ranging from winter
                        landscapes to vehicle details. Here are the best matches:
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3 max-w-3xl">
                        {[
                          {
                            title: 'Blue Sedan in Snow',
                            detail: 'Fresh snowfall around parked vehicles',
                            image: '/landing/blue-sedan-in-snow.png',
                          },
                          {
                            title: 'Cleaning Snow Off Vehicle',
                            detail: 'A person brushing snow near pickup trucks',
                            image: '/landing/cleaning-snow-off-vehicle.png',
                          },
                          {
                            title: 'Taillight Snow Detail',
                            detail: 'Close-up of taillight covered in snow',
                            image: '/landing/taillight-snow-detail.png',
                          },
                        ].map((item) => (
                          <div key={item.title} className="rounded-xl border bg-white shadow-sm overflow-hidden">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="h-20 w-full object-cover border-b"
                            />
                            <div className="p-2.5 space-y-1">
                              <p className="text-[11px] font-semibold leading-tight">{item.title}</p>
                              <p className="text-[10px] text-muted-foreground leading-tight">{item.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-blue-600 relative overflow-hidden">
          <div className="relative container px-4 py-24 md:py-32">
            <div className="text-center mb-16 md:mb-24 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-6">
                Everything you need to manage brand assets
              </h2>
              <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto">
                From AI-powered search to smart ranking, Brandon understands
                your content and your team&apos;s needs.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Natural language search */}
              <div className="relative animate-in fade-in slide-in-from-bottom-10 duration-700 delay-100 fill-mode-both">
                <div className="relative rounded-2xl border bg-card/50 backdrop-blur-sm p-6 md:p-8 h-full flex flex-col">
                  <h3 className="text-xl font-bold mb-3">
                    Natural language search
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-8 flex-1">
                    Ask in plain English — &quot;Show me the latest autonomous driving
                    visuals&quot; or &quot;Find images with digital cockpit and GPS.&quot; No tags
                    or keywords required.
                  </p>
                  <div className="rounded-xl bg-background/50 border p-5 space-y-4 shadow-inner">
                    <div className="flex justify-end">
                      <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm shadow-md">
                        &quot;Find EV charging visuals&quot;
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 text-sm font-bold shadow-sm">
                        B
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2 text-sm border shadow-sm w-full">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-75"></span>
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-150"></span>
                          </div>
                          Searching assets...
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI-powered analysis */}
              <div className="relative animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200 fill-mode-both">
                <div className="relative rounded-2xl border bg-card/50 backdrop-blur-sm p-6 md:p-8 h-full flex flex-col">
                  <h3 className="text-xl font-bold mb-3">
                    AI-powered analysis
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-8 flex-1">
                    Every uploaded image is analyzed by AI to generate rich
                    descriptions — subjects, mood, setting, composition — so every
                    asset is findable.
                  </p>
                  <div className="rounded-xl bg-background/50 border p-5 shadow-inner">
                    <div className="flex items-center gap-4">
                      <div className="space-y-2.5 min-w-0 flex-1">
                        <div className="h-2 w-24 bg-muted rounded-full"></div>
                        <div className="text-sm font-semibold truncate">
                          Urban EV charging station
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {['futuristic', 'urban', 'sustainable'].map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex px-2.5 py-0.5 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-[10px] font-semibold uppercase tracking-wider"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recency-aware ranking */}
              <div className="relative animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300 fill-mode-both">
                <div className="relative rounded-2xl border bg-card/50 backdrop-blur-sm p-6 md:p-8 h-full flex flex-col">
                  <h3 className="text-xl font-bold mb-3">
                    Recency-aware ranking
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-8 flex-1">
                    Results blend semantic similarity with acquisition date. Ask for
                    &quot;latest&quot; or &quot;new&quot; visuals and Brandon prioritizes the most
                    recent assets.
                  </p>
                  <div className="rounded-xl bg-background/50 border p-5 space-y-3 shadow-inner">
                    {[
                      { label: 'EV concept render', date: 'Jan 2026', score: '98%', bg: 'from-emerald-50 to-emerald-100/50', border: 'border-emerald-200' },
                      { label: 'Charging hub aerial', date: 'Dec 2025', score: '94%', bg: 'from-muted to-muted/50', border: 'border-muted' },
                      { label: 'Highway autopilot', date: 'Nov 2025', score: '91%', bg: 'from-muted to-muted/50', border: 'border-muted' },
                    ].map((item, i) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border shadow-sm"
                        style={{ transitionDelay: `${i * 75}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-8 rounded-lg bg-gradient-to-br ${item.bg} border ${item.border}`} />
                          <span className="text-sm font-semibold">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground font-medium">
                            {item.date}
                          </span>
                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${i === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {item.score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Role-based access */}
              <div className="relative animate-in fade-in slide-in-from-bottom-10 duration-700 delay-400 fill-mode-both">
                <div className="relative rounded-2xl border bg-card/50 backdrop-blur-sm p-6 md:p-8 h-full flex flex-col">
                  <h3 className="text-xl font-bold mb-3">
                    Role-based access
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-8 flex-1">
                    Admins ingest and manage assets; everyone else can search and
                    discover. Perfect for teams with distinct content governance
                    needs.
                  </p>
                  <div className="rounded-xl bg-background/50 border p-5 space-y-3 shadow-inner">
                    <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center border border-orange-200">
                          <span className="text-xs font-bold text-orange-600">A</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">Admin</span>
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Workspace Owner</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {['Upload', 'Manage', 'Search'].map(p => (
                          <span key={p} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                          <span className="text-xs font-bold text-slate-600">U</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">User</span>
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Member</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {['Search', 'View'].map(p => (
                          <span key={p} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative border-t border-blue-400 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-background pointer-events-none" />
          
          <div className="relative container px-4 py-24 md:py-32">
            <div className="mx-auto max-w-3xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700 fill-mode-both">
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-balance">
                Ready to find your brand assets{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  faster?
                </span>
              </h2>
              <p className="text-blue-100 text-lg md:text-xl max-w-xl mx-auto leading-relaxed">
                Sign up in seconds and start searching your DAM with the
                power of AI.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
                <Button asChild size="lg" className="group h-14 px-8 rounded-full bg-blue-600 hover:bg-blue-700 text-base shadow-[0_0_40px_-10px_rgba(37,99,235,0.4)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.6)] transition-all duration-300 hover:-translate-y-0.5">
                  <Link href="/signup">
                    Get started
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 px-8 rounded-full text-base border-blue-200 hover:bg-blue-50/50 hover:text-blue-700 transition-all duration-300 hover:-translate-y-0.5">
                  <Link href="/login">Log in</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-black py-10">
          <div className="container px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">Brandon</span>
              <span>&middot;</span>
              <span>Brand Asset Assistant</span>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="/#features"
                className="hover:text-white transition-colors"
              >
                Features
              </Link>
              <Link
                href="/login"
                className="hover:text-white transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="hover:text-white transition-colors"
              >
                Sign up
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
