export const defaultPlanId = "free"

export const pricingPlans = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for small businesses just getting started",
    price: "$0",
    priceIntervalName: "per month",
    stripe_price_id: null,
    features: [
      "Up to 10 API calls per month",
      "Basic dashboard access",
      "Community support",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Professional",
    description:
      "Ideal for growing businesses managing multiple review platforms",
    price: "$29",
    priceIntervalName: "per month",
    stripe_price_id: "price_1NkdZCHMjzZ8mGZnRSjUm4yA",
    stripe_product_id: "prod_OXj1CcemGMWOlU",
    features: [
      "Unlimited API calls",
      "Advanced dashboard features",
      "Custom integrations",
      "Analytics & insights",
      "Priority email support",
      "Export data to CSV",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description:
      "For large organizations and agencies managing multiple brands",
    price: "$99",
    priceIntervalName: "per month",
    stripe_price_id: "price_1Nkda2HMjzZ8mGZn4sKvbDAV",
    stripe_product_id: "prod_OXj20YNpHYOXi7",
    features: [
      "Everything in Professional",
      "Multi-tenant management",
      "White-label options",
      "API access",
      "Dedicated account manager",
      "24/7 phone & email support",
      "Custom integrations",
    ],
  },
]
