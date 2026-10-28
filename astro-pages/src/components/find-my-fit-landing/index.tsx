// Two separate Astro islands so a runtime error in one does not take down the other.
// Both use client:load — HeroIsland for immediate interactivity, FeaturesSection to
// ensure scroll tracking fires even if the user reaches it before idle hydration.
export { default as HeroIsland } from './HeroIsland'
export { default as FeaturesSection } from './FeaturesSection'
