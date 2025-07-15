<script lang="ts">
  import {
    WebsiteName,
    WebsiteBaseUrl,
    WebsiteDescription,
  } from "./../../config"
  import Logo from "$lib/components/Logo.svelte"

  const ldJson = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: WebsiteName,
    url: WebsiteBaseUrl,
  }
  const jsonldScript = `<script type="application/ld+json">${
    JSON.stringify(ldJson) + "<"
  }/script>`

  const features = [
    {
      name: "User Authentication",
      description:
        "Secure authentication with Supabase including social login providers.",
      icon: "auth",
    },
    {
      name: "Multi-Tenant Organizations",
      description:
        "Built-in organization management with role-based access control.",
      icon: "organizations",
    },
    {
      name: "Subscription Management",
      description:
        "Integrated Stripe subscriptions with customer portal and billing management.",
      icon: "billing",
    },
    {
      name: "Modern Tech Stack",
      description:
        "SvelteKit, TypeScript, Tailwind CSS, and DaisyUI for fast development.",
      icon: "tech",
    },
    {
      name: "Database Ready",
      description:
        "PostgreSQL with Row Level Security (RLS) policies pre-configured.",
      icon: "database",
    },
    {
      name: "Email Integration",
      description:
        "Handlebars templates with Resend API for transactional emails.",
      icon: "email",
    },
  ]

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "CTO",
      company: "TechStart Inc.",
      quote: "This SaaS starter kit saved us months of development time. The authentication and billing integration worked perfectly out of the box.",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Founder",
      company: "Chen's Apps",
      quote: "The multi-tenant architecture is exactly what we needed. Clean code, great documentation, and excellent developer experience.",
      rating: 5,
    },
    {
      name: "Emily Rodriguez",
      role: "Lead Developer",
      company: "CloudFlow Solutions",
      quote: "Modern stack with SvelteKit and TypeScript. The build process is fast and the code is well-organized for scaling.",
      rating: 5,
    },
  ]
</script>

<svelte:head>
  <title>{WebsiteName} - SaaS Starter Kit</title>
  <meta name="description" content={WebsiteDescription} />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html jsonldScript}
</svelte:head>

<!-- Hero Section -->
<section class="relative overflow-hidden bg-gradient-to-br from-base-100 to-base-200">
  <div class="absolute inset-0 bg-grid-pattern opacity-5"></div>
  <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
    <div class="text-center">
      <h1 class="text-5xl md:text-6xl font-serif font-bold text-primary mb-6">
        Build your SaaS,
        <span class="text-accent">faster.</span>
      </h1>
      <p class="text-xl text-neutral max-w-3xl mx-auto mb-8">
        Production-ready SvelteKit starter with authentication, billing, multi-tenancy, and everything you need to launch your SaaS.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="/login/sign_up" class="btn btn-accent btn-lg">
          Start Free Trial
        </a>
        <a href="/pricing" class="btn btn-outline btn-primary btn-lg">
          View Pricing
        </a>
      </div>
    </div>
  </div>
</section>

<!-- Features Section -->
<section class="py-20 bg-base-100">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-16">
      <h2 class="text-3xl md:text-4xl font-serif font-bold text-primary mb-4">
        Everything you need to build a successful SaaS
      </h2>
      <p class="text-lg text-neutral max-w-2xl mx-auto">
        Skip months of boilerplate code and focus on your unique features with our comprehensive starter template.
      </p>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {#each features as feature}
        <div class="card bg-base-200 hover:shadow-lg transition-shadow duration-300">
          <div class="card-body">
            <div class="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
              <Logo size="sm" variant="icon" />
            </div>
            <h3 class="card-title text-primary">{feature.name}</h3>
            <p class="text-neutral">{feature.description}</p>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- How It Works Section -->
<section class="py-20 bg-base-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-16">
      <h2 class="text-3xl md:text-4xl font-serif font-bold text-primary mb-4">
        How It Works
      </h2>
      <p class="text-lg text-neutral max-w-2xl mx-auto">
        Get started in minutes and transform your review management process
      </p>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="text-center">
        <div class="w-16 h-16 bg-accent text-primary rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          1
        </div>
        <h3 class="text-xl font-semibold text-primary mb-2">Connect Your Platforms</h3>
        <p class="text-neutral">Link your Google, Yelp, Facebook, and other review platforms in one click.</p>
      </div>
      
      <div class="text-center">
        <div class="w-16 h-16 bg-accent text-primary rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          2
        </div>
        <h3 class="text-xl font-semibold text-primary mb-2">Train Your AI</h3>
        <p class="text-neutral">Our AI learns your brand voice from examples and guidelines you provide.</p>
      </div>
      
      <div class="text-center">
        <div class="w-16 h-16 bg-accent text-primary rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          3
        </div>
        <h3 class="text-xl font-semibold text-primary mb-2">Generate & Publish</h3>
        <p class="text-neutral">Review AI-generated responses, customize if needed, and publish with one click.</p>
      </div>
    </div>
  </div>
</section>

<!-- Testimonials Section -->
<section class="py-20 bg-base-100">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-16">
      <h2 class="text-3xl md:text-4xl font-serif font-bold text-primary mb-4">
        Trusted by businesses worldwide
      </h2>
      <p class="text-lg text-neutral max-w-2xl mx-auto">
        See how AptlySaid is helping businesses transform their customer relationships
      </p>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      {#each testimonials as testimonial}
        <div class="card bg-base-200 hover:shadow-lg transition-shadow duration-300">
          <div class="card-body">
            <div class="flex mb-4">
              {#each Array.from({length: testimonial.rating}, (_, i) => i) as i (i)}
                <svg class="w-5 h-5 text-accent fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                </svg>
              {/each}
            </div>
            <p class="text-neutral italic mb-4">"{testimonial.quote}"</p>
            <div>
              <p class="font-semibold text-primary">{testimonial.name}</p>
              <p class="text-sm text-neutral">{testimonial.role}, {testimonial.company}</p>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- CTA Section -->
<section class="py-20 bg-gradient-to-r from-primary to-primary/90">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <h2 class="text-3xl md:text-4xl font-serif font-bold text-secondary mb-4">
      Ready to perfect your brand's voice?
    </h2>
    <p class="text-xl text-secondary/90 mb-8">
      Join thousands of businesses using AptlySaid to manage reviews professionally.
    </p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <a href="/login/sign_up" class="btn btn-accent btn-lg">
        Start Your Free Trial
      </a>
      <a href="/contact_us" class="btn btn-outline btn-secondary btn-lg">
        Schedule a Demo
      </a>
    </div>
    <p class="text-sm text-secondary/70 mt-4">
      No credit card required • 14-day free trial • Cancel anytime
    </p>
  </div>
</section>

<style>
  .bg-grid-pattern {
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231A2A4F' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }
</style>