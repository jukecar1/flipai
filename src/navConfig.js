// Central definition of every drawer destination. `built: true` screens
// have a real implementation; the rest render the shared PlaceholderScreen
// so the full nav from the reference app is present and tappable even
// where the underlying system isn't built out yet.
export const NAV_SECTIONS = [
  {
    title: 'Operations',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline', built: true },
      { key: 'routes', label: 'Routes', icon: 'swap-horizontal-outline', built: true, countKey: 'routes' },
      { key: 'planning', label: 'Planning', icon: 'compass-outline', built: false },
      { key: 'fleet', label: 'Fleet', icon: 'airplane-outline', built: true, countKey: 'aircraft' },
      { key: 'map', label: 'Map', icon: 'earth-outline', built: false },
      { key: 'engineering', label: 'Engineering', icon: 'construct-outline', built: false },
      { key: 'network', label: 'Network', icon: 'share-social-outline', built: false },
      { key: 'markets', label: 'Markets', icon: 'pie-chart-outline', built: false },
    ],
  },
  {
    title: 'Finance & Strategy',
    items: [
      { key: 'finances', label: 'Finances', icon: 'trending-up-outline', built: true },
      { key: 'management', label: 'Management', icon: 'business-outline', built: false },
      { key: 'competitors', label: 'Competitors', icon: 'document-text-outline', built: false },
      { key: 'cargo', label: 'Cargo', icon: 'cube-outline', built: false },
    ],
  },
];

export const SCREEN_TITLES = NAV_SECTIONS.flatMap((s) => s.items).reduce((acc, item) => {
  acc[item.key] = item.label;
  return acc;
}, {});
