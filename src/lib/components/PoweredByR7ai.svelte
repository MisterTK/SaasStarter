<script lang="ts">
  interface Props {
    size?: "sm" | "md" | "lg"
    showWellSaid?: boolean
  }

  let { size = "md", showWellSaid = false }: Props = $props()

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base", 
    lg: "text-lg"
  }

  const logoSizes = {
    sm: { width: 60, height: 27 },
    md: { width: 90, height: 40 },
    lg: { width: 120, height: 53 }
  }
</script>

<div class="flex items-center gap-3">
  {#if showWellSaid}
    <h1 class="text-2xl font-bold text-gray-900">WellSaid</h1>
  {/if}
  
  <div class="flex items-center gap-2 {sizeClasses[size]} text-gray-600">
    <span>Powered by</span>
    <a 
      href="https://r7ai.com" 
      target="_blank" 
      rel="noopener noreferrer"
      class="inline-flex items-center hover:opacity-80 transition-opacity"
    >
      <svg 
        width={logoSizes[size].width} 
        height={logoSizes[size].height} 
        viewBox="0 0 90 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        class="inline-block"
      >
        <!-- Rotated square -->
        <rect x="20" y="1.414" width="26" height="26" transform="rotate(45 20 20)" fill="#00aae6"/>
        <!-- "r7" text -->
        <text x="20" y="25" font-family="Arial, sans-serif" font-size="16" font-weight="700" text-anchor="middle" fill="white">r7</text>
        <!-- "r7ai" text -->
        <text x="45" y="28" font-family="Arial, sans-serif" font-size="24" font-weight="300" fill="#0A0A0A">
          r<tspan fill="#00aae6">7</tspan>ai
        </text>
      </svg>
    </a>
  </div>
</div>