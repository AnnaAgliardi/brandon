import Link from 'next/link'
import { LandingNav } from '@/components/landing-nav'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  MessageSquare,
  ImageIcon,
  Zap,
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LandingNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-background pointer-events-none" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-400/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-indigo-400/20 blur-[100px] rounded-full pointer-events-none mix-blend-multiply" />

          <div className="relative container px-4 pt-24 pb-24 md:pt-32 md:pb-32 lg:pt-40 lg:pb-40">
            <div className="mx-auto max-w-4xl text-center space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/50 text-blue-600 text-sm font-medium mb-4 shadow-sm backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Zap className="h-4 w-4 fill-blue-600" />
                <span>The future of Digital Asset Management</span>
              </div>

              <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-[5rem] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 fill-mode-both">
                Find brand assets with{' '}
                <span className="relative whitespace-nowrap">
                  <span className="absolute bg-blue-600/20 blur-xl inset-0 rounded-full" />
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
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 px-8 rounded-full text-base border-blue-200 hover:bg-blue-50/50 hover:text-blue-700 transition-all duration-300 hover:-translate-y-0.5">
                  <Link href="/login">Log in</Link>
                </Button>
              </div>
            </div>

            {/* Hero Mockup */}
            <div className="mt-16 md:mt-24 mx-auto max-w-4xl relative z-10 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-500 fill-mode-both">
              <div className="relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
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
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-sm font-bold">
                      🤖
                    </div>
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
        </section>

        {/* Features */}
        <section id="features" className="bg-background">
          <div className="container px-4 py-20 md:py-28">
            <div className="text-center mb-16 md:mb-20">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                Everything you need to manage brand assets
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                From AI-powered search to smart ranking, Brandon understands
                your content and your team&apos;s needs.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Natural language search */}
              <div className="group rounded-2xl border bg-card p-6 md:p-7 hover:shadow-lg transition-all duration-300">
                <h3 className="text-xl font-semibold mb-3">Natural language search</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Ask in plain English — &quot;Show me the latest autonomous driving
                  visuals&quot; or &quot;Find images with digital cockpit and GPS.&quot; No tags
                  or keywords required.
                </p>
                <div className="rounded-xl bg-muted/50 border p-4 space-y-3">
                  <div className="flex justify-end">
                    <div className="bg-white rounded-full px-3 py-1.5 text-xs border shadow-sm">
                      &quot;Find EV charging visuals&quot;
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                      B
                    </div>
                    <div className="bg-white rounded-full px-3 py-1.5 text-xs border shadow-sm">
                      Found 12 matching assets...
                    </div>
                  </div>
                </div>
              </div>

              {/* AI-powered analysis */}
              <div className="group rounded-2xl border bg-card p-6 md:p-7 hover:shadow-lg transition-all duration-300">
                <h3 className="text-xl font-semibold mb-3">AI-powered analysis</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Every uploaded image is analyzed by AI to generate rich
                  descriptions — subjects, mood, setting, composition — so every
                  asset is findable.
                </p>
                <div className="rounded-xl bg-muted/50 border p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-violet-100 to-violet-50 border flex items-center justify-center shrink-0">
                      <ImageIcon className="h-5 w-5 text-violet-300" />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <div className="text-xs font-medium truncate">
                        Urban EV charging station
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {['futuristic', 'urban', 'sustainable'].map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 text-[10px] font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recency-aware ranking */}
              <div className="group rounded-2xl border bg-card p-6 md:p-7 hover:shadow-lg transition-all duration-300">
                <h3 className="text-xl font-semibold mb-3">Recency-aware ranking</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Results blend semantic similarity with acquisition date. Ask for
                  &quot;latest&quot; or &quot;new&quot; visuals and Brandon prioritizes the most
                  recent assets.
                </p>
                <div className="rounded-xl bg-muted/50 border p-4 space-y-2">
                  {[
                    { label: 'EV concept render', date: 'Jan 2026', score: '98%' },
                    { label: 'Charging hub aerial', date: 'Dec 2025', score: '94%' },
                    { label: 'Highway autopilot', date: 'Nov 2025', score: '91%' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-6 rounded bg-gradient-to-br from-amber-50 to-amber-100/50 border" />
                        <span className="text-xs font-medium">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {item.date}
                        </span>
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                          {item.score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Role-based access */}
              <div className="group rounded-2xl border bg-card p-6 md:p-7 hover:shadow-lg transition-all duration-300">
                <h3 className="text-xl font-semibold mb-3">Role-based access</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Admins ingest and manage assets; everyone else can search and
                  discover. Perfect for teams with distinct content governance
                  needs.
                </p>
                <div className="rounded-xl bg-muted/50 border p-4 space-y-2">
                  <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-blue-600">A</span>
                      </div>
                      <span className="text-xs font-medium">Admin</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Upload, manage, search
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-slate-600">U</span>
                      </div>
                      <span className="text-xs font-medium">User</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Search &amp; discover
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t bg-muted/30">
          <div className="container px-4 py-20 md:py-28">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                How it works
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                From upload to discovery in three simple steps.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12 max-w-4xl mx-auto">
              {[
                {
                  step: '1',
                  icon: ImageIcon,
                  title: 'Upload assets',
                  description:
                    'Admins upload images. AI automatically analyzes each one — generating descriptions, tags, mood, and composition data.',
                },
                {
                  step: '2',
                  icon: Zap,
                  title: 'AI indexes everything',
                  description:
                    'Each asset is embedded as a semantic vector and stored for instant retrieval. Metadata enriches every search.',
                },
                {
                  step: '3',
                  icon: MessageSquare,
                  title: 'Search with conversation',
                  description:
                    'Ask Brandon in natural language. Get ranked results combining relevance and recency — the right asset, every time.',
                },
              ].map((item) => (
                <div key={item.step} className="text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto text-lg font-bold shadow-lg shadow-blue-600/20">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/30 to-background pointer-events-none" />
            <div className="relative container px-4 py-20 md:py-28">
              <div className="mx-auto max-w-3xl text-center space-y-8">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Ready to find your brand assets faster?
                </h2>
                <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                  Sign up in seconds and start searching your DAM with the
                  power of AI.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Button asChild size="lg" className="h-12 px-8 rounded-full bg-blue-600 hover:bg-blue-700 text-base">
                    <Link href="/signup">
                      Get started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-12 px-8 rounded-full text-base">
                    <Link href="/login">Log in</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-muted/20 py-10">
          <div className="container px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Brandon</span>
              <span>&middot;</span>
              <span>Brand Asset Assistant</span>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="/#features"
                className="hover:text-foreground transition-colors"
              >
                Features
              </Link>
              <Link
                href="/login"
                className="hover:text-foreground transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="hover:text-foreground transition-colors"
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
