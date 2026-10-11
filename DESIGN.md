# Default-off network behavior

Journey: on fresh start and opening Settings or Capabilities, users see locally available provider and model choices without network discovery. Selecting or configuring Copilot permits its account discovery. A configured branded catalog endpoint can refresh model metadata; otherwise the local catalog is used.
Hierarchy: retain existing model picker and provider layout. Fonts use local bundled faces where available and system fallbacks otherwise.
States: loading is local and immediate by default; a configured endpoint may load asynchronously; errors fall back to cached or curated content. Explicit Copilot setup retains its current error feedback.
Responsive and accessibility: no layout or focus changes; local font fallbacks must preserve readable text at current sizes and contrast.
Tokens: keep existing font family and weight tokens, replacing remote font URLs with local assets or system equivalents.

Font sources: the existing JetBrains Mono WOFF2 files stay bundled; Courier Prime and IBM Plex Mono faces are now bundled from Google Fonts under their respective OFL texts in `apps/desktop/public/licenses/fonts/`. Built-in theme font stacks and focus behavior remain unchanged.
