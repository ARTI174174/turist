/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Токены дизайна (см. design-notes.md): палитра уральской тайги + карты-хребта
        ink: '#141F19',        // основной текст, глубокий хвойный тёмный
        forest: {
          DEFAULT: '#1F4235',
          light: '#2E5B47',
          dark: '#12291F',
        },
        moss: '#4C7A5E',
        parchment: '#EFE8D8',   // фон карточек — оттенок старой топокарты
        parchmentDark: '#E2D8C0',
        amber: {
          DEFAULT: '#C68A3A',  // акцент — цвет осенней рябины/латуни компаса
          light: '#DDA65C',
          dark: '#9C6B26',
        },
        stone: '#8A8172',
        danger: '#A23B2E',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      backgroundImage: {
        'topo-lines':
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cg fill='none' stroke='%238A8172' stroke-opacity='0.12' stroke-width='1'%3E%3Cpath d='M0 60 Q30 20 60 60 T120 60'/%3E%3Cpath d='M0 90 Q30 50 60 90 T120 90'/%3E%3Cpath d='M0 30 Q30 -10 60 30 T120 30'/%3E%3C/g%3E%3C/svg%3E\")",
      },
      borderRadius: {
        stamp: '3px',
      },
    },
  },
  plugins: [],
};
