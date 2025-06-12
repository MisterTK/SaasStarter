<script lang="ts">
  import Logo from './Logo.svelte'
</script>

<header class="bg-white shadow-sm border-b border-gray-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center h-16">
      <a href="https://www.r7ai.com" target="_blank" rel="noopener noreferrer" class="flex items-center space-x-4 hover:opacity-80 transition-opacity">
        <Logo size="sm" showText={false} />
        <div>
          <h1 class="text-xl font-semibold text-gray-900">WellSaid</h1>
          <p class="text-xs text-gray-500">Powered by r<span style="color: #00aae6;">7</span>ai</p>
        </div>
      </a>
      <nav class="flex items-center space-x-4">
        <a href="/" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
          Home
        </a>
      </nav>
    </div>
  </div>
</header>