<script lang="ts">
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let showText = true;
  
  const sizes = {
    sm: { container: 'w-8 h-8', square: 'w-6 h-6', text: 'text-sm' },
    md: { container: 'w-10 h-10', square: 'w-8 h-8', text: 'text-lg' },
    lg: { container: 'w-12 h-12', square: 'w-10 h-10', text: 'text-xl' }
  };
  
  const currentSize = sizes[size];
</script>

<div class="flex items-center space-x-3">
  <div class="relative {currentSize.container} flex items-center justify-center">
    <div class="absolute {currentSize.square} bg-primary-600 transform rotate-45"></div>
    <div class="absolute flex items-center justify-center">
      <span class="text-white font-bold {currentSize.text}">r7</span>
    </div>
  </div>
  {#if showText}
    <span class="text-2xl font-light tracking-tight">
      r<span class="text-primary-600">7</span>ai
    </span>
  {/if}
</div>