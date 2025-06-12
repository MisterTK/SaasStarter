<script lang="ts">
  import "../app.css"
  import { navigating } from "$app/stores"
  import { expoOut } from "svelte/easing"
  import { slide } from "svelte/transition"
  import Header from "$lib/components/Header.svelte"
  import Footer from "$lib/components/Footer.svelte"
  
  interface Props {
    children?: import("svelte").Snippet
  }

  let { children }: Props = $props()
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
  <Header />
  
  {#if $navigating}
    <!-- 
      Loading animation for next page since svelte doesn't show any indicator. 
       - delay 100ms because most page loads are instant, and we don't want to flash 
       - long 12s duration because we don't actually know how long it will take
       - exponential easing so fast loads (>100ms and <1s) still see enough progress,
         while slow networks see it moving for a full 12 seconds
    -->
    <div
      class="fixed w-full top-0 right-0 left-0 h-1 z-50 bg-primary-600"
      in:slide={{ delay: 100, duration: 12000, axis: "x", easing: expoOut }}
    ></div>
  {/if}
  
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
    {@render children?.()}
  </main>
  
  <Footer />
</div>
