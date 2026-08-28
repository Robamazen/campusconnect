module.exports = {
  theme: {
    extend: {
      colors: {
        bg: '#0B0B0D',
        surface: '#14141A',
        border: '#2A2A33',
        borderMuted: '#23232A',
        text: '#F4F4F5',
        textMuted: '#8E8E99',
        textFaint: '#5B5B66',
        accent: '#E91E8C',
        accentHover: '#FF3D9E',
        accentActive: '#C2166F',
        accentLight: '#FF5FB2'
      },
      fontFamily: {
        heading: ['Archivo', 'sans-serif'],
        body: ['Hanken Grotesk', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace']
      },
      borderRadius: {
        DEFAULT: '0px' // this system uses 0 radius everywhere — structure from rules, not corners
      }
    }
  }
};