const lectures = [
  {
    id: 1,
    title: "The Agricultural Revolution: Crash Course World History #1",
    description: "Episode 1 of Crash Course World History with John Green: The Agricultural Revolution.",
    instructor: "John Green (Crash Course)",
    duration: "11m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/Yocja_N5s1I/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/Yocja_N5s1I"
  },
  {
    id: 2,
    title: "Indus Valley Civilization: Crash Course World History #2",
    description: "Episode 2 of Crash Course World History with John Green: Indus Valley Civilization.",
    instructor: "John Green (Crash Course)",
    duration: "10m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/n7ndRwqJYDM/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/n7ndRwqJYDM"
  },
  {
    id: 3,
    title: "Mesopotamia: Crash Course World History #3",
    description: "Episode 3 of Crash Course World History with John Green: Mesopotamia.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/sohXPx_XZ6Y/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/sohXPx_XZ6Y"
  },
  {
    id: 4,
    title: "Ancient Egypt: Crash Course World History #4",
    description: "Episode 4 of Crash Course World History with John Green: Ancient Egypt.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/Z3Wvw6BivVI/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/Z3Wvw6BivVI"
  },
  {
    id: 5,
    title: "The Persians & Greeks: Crash Course World History #5",
    description: "Episode 5 of Crash Course World History with John Green: The Persians & Greeks.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/Q-mkVSasZIM/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/Q-mkVSasZIM"
  },
  {
    id: 6,
    title: "Buddha and Ashoka: Crash Course World History #6",
    description: "Episode 6 of Crash Course World History with John Green: Buddha and Ashoka.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/8Nn5uqE3C9w/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/8Nn5uqE3C9w"
  },
  {
    id: 7,
    title: "2,000 Years of Chinese History! The Mandate of Heaven and Confucius: World History #7",
    description: "Episode 7 of Crash Course World History with John Green: 2,000 Years of Chinese History! The Mandate of Heaven and Confucius.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/ylWORyToTo4/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/ylWORyToTo4"
  },
  {
    id: 8,
    title: "Alexander the Great: Crash Course World History #8",
    description: "Episode 8 of Crash Course World History with John Green: Alexander the Great.",
    instructor: "John Green (Crash Course)",
    duration: "11m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/0LsrkWDCvxg/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/0LsrkWDCvxg"
  },
  {
    id: 9,
    title: "The Silk Road and Ancient Trade: Crash Course World History #9",
    description: "Episode 9 of Crash Course World History with John Green: The Silk Road and Ancient Trade.",
    instructor: "John Green (Crash Course)",
    duration: "11m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/vfe-eNq-Qyg/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/vfe-eNq-Qyg"
  },
  {
    id: 10,
    title: "The Roman Empire. Or Republic. Or...Which Was It?: Crash Course World History #10",
    description: "Episode 10 of Crash Course World History with John Green: The Roman Empire. Or Republic. Or...Which Was It?.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/oPf27gAup9U/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/oPf27gAup9U"
  },
  {
    id: 11,
    title: "Christianity from Judaism to Constantine: Crash Course World History #11",
    description: "Episode 11 of Crash Course World History with John Green: Christianity from Judaism to Constantine.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/TG55ErfdaeY/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/TG55ErfdaeY"
  },
  {
    id: 12,
    title: "Fall of The Roman Empire...in the 15th Century: Crash Course World History #12",
    description: "Episode 12 of Crash Course World History with John Green: Fall of The Roman Empire...in the 15th Century.",
    instructor: "John Green (Crash Course)",
    duration: "13m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/3PszVWZNWVA/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/3PszVWZNWVA"
  },
  {
    id: 13,
    title: "Islam, the Quran, and the Five Pillars: Crash Course World History #13",
    description: "Episode 13 of Crash Course World History with John Green: Islam, the Quran, and the Five Pillars.",
    instructor: "John Green (Crash Course)",
    duration: "13m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/TpcbfxtdoI8/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/TpcbfxtdoI8"
  },
  {
    id: 14,
    title: "The Dark Ages...How Dark Were They, Really?: Crash Course World History #14",
    description: "Episode 14 of Crash Course World History with John Green: The Dark Ages...How Dark Were They, Really?.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/QV7CanyzhZg/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/QV7CanyzhZg"
  },
  {
    id: 15,
    title: "The Crusades - Pilgrimage or Holy War?: Crash Course World History #15",
    description: "Episode 15 of Crash Course World History with John Green: The Crusades - Pilgrimage or Holy War?.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/X0zudTQelzI/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/X0zudTQelzI"
  },
  {
    id: 16,
    title: "Mansa Musa and Islam in Africa: Crash Course World History #16",
    description: "Episode 16 of Crash Course World History with John Green: Mansa Musa and Islam in Africa.",
    instructor: "John Green (Crash Course)",
    duration: "11m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/jvnU0v6hcUo/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/jvnU0v6hcUo"
  },
  {
    id: 17,
    title: "Wait For It...The Mongols!: Crash Course World History #17",
    description: "Episode 17 of Crash Course World History with John Green: Wait For It...The Mongols!.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/szxPar0BcMo/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/szxPar0BcMo"
  },
  {
    id: 18,
    title: "Int'l Commerce, Snorkeling Camels, and The Indian Ocean Trade: Crash Course World History #18",
    description: "Episode 18 of Crash Course World History with John Green: Int'l Commerce, Snorkeling Camels, and The Indian Ocean Trade.",
    instructor: "John Green (Crash Course)",
    duration: "10m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/a6XtBLDmPA0/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/a6XtBLDmPA0"
  },
  {
    id: 19,
    title: "Venice and the Ottoman Empire: Crash Course World History #19",
    description: "Episode 19 of Crash Course World History with John Green: Venice and the Ottoman Empire.",
    instructor: "John Green (Crash Course)",
    duration: "10m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/UN-II_jBzzo/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/UN-II_jBzzo"
  },
  {
    id: 20,
    title: "Russia, the Kievan Rus, and the Mongols: Crash Course World History #20",
    description: "Episode 20 of Crash Course World History with John Green: Russia, the Kievan Rus, and the Mongols.",
    instructor: "John Green (Crash Course)",
    duration: "11m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/etmRI2_9Q_A/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/etmRI2_9Q_A"
  },
  {
    id: 21,
    title: "Columbus, Vasco da Gama, and Zheng He - 15th Century Mariners: Crash Course World History #21",
    description: "Episode 21 of Crash Course World History with John Green: Columbus, Vasco da Gama, and Zheng He - 15th Century Mariners.",
    instructor: "John Green (Crash Course)",
    duration: "11m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/NjEGncridoQ/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/NjEGncridoQ"
  },
  {
    id: 22,
    title: "The Renaissance: Was it a Thing? - Crash Course World History #22",
    description: "Episode 22 of Crash Course World History with John Green: The Renaissance: Was it a Thing?.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/Vufba_ZcoR0/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/Vufba_ZcoR0"
  },
  {
    id: 23,
    title: "The Columbian Exchange: Crash Course World History #23",
    description: "Episode 23 of Crash Course World History with John Green: The Columbian Exchange.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/HQPA5oNpfM4/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/HQPA5oNpfM4"
  },
  {
    id: 24,
    title: "The Atlantic Slave Trade: Crash Course World History #24",
    description: "Episode 24 of Crash Course World History with John Green: The Atlantic Slave Trade.",
    instructor: "John Green (Crash Course)",
    duration: "11m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/dnV_MTFEGIY/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/dnV_MTFEGIY"
  },
  {
    id: 25,
    title: "The Spanish Empire, Silver, & Runaway Inflation: Crash Course World History #25",
    description: "Episode 25 of Crash Course World History with John Green: The Spanish Empire, Silver, & Runaway Inflation.",
    instructor: "John Green (Crash Course)",
    duration: "11m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/rjhIzemLdos/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/rjhIzemLdos"
  },
  {
    id: 26,
    title: "The Seven Years War: Crash Course World History #26",
    description: "Episode 26 of Crash Course World History with John Green: The Seven Years War.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/j0qbzNHmfW0/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/j0qbzNHmfW0"
  },
  {
    id: 27,
    title: "The Amazing Life and Strange Death of Captain Cook: Crash Course World History #27",
    description: "Episode 27 of Crash Course World History with John Green: The Amazing Life and Strange Death of Captain Cook.",
    instructor: "John Green (Crash Course)",
    duration: "11m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/2yXNrLTddME/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/2yXNrLTddME"
  },
  {
    id: 28,
    title: "Tea, Taxes, and The American Revolution: Crash Course World History #28",
    description: "Episode 28 of Crash Course World History with John Green: Tea, Taxes, and The American Revolution.",
    instructor: "John Green (Crash Course)",
    duration: "11m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/HlUiSBXQHCw/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/HlUiSBXQHCw"
  },
  {
    id: 29,
    title: "The French Revolution: Crash Course World History #29",
    description: "Episode 29 of Crash Course World History with John Green: The French Revolution.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/lTTvKwCylFY/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/lTTvKwCylFY"
  },
  {
    id: 30,
    title: "Haitian Revolutions: Crash Course World History #30",
    description: "Episode 30 of Crash Course World History with John Green: Haitian Revolutions.",
    instructor: "John Green (Crash Course)",
    duration: "13m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/5A_o-nU5s2U/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/5A_o-nU5s2U"
  },
  {
    id: 31,
    title: "Latin American Revolutions: Crash Course World History #31",
    description: "Episode 31 of Crash Course World History with John Green: Latin American Revolutions.",
    instructor: "John Green (Crash Course)",
    duration: "14m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/ZBw35Ze3bg8/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/ZBw35Ze3bg8"
  },
  {
    id: 32,
    title: "Coal, Steam, and The Industrial Revolution: Crash Course World History #32",
    description: "Episode 32 of Crash Course World History with John Green: Coal, Steam, and The Industrial Revolution.",
    instructor: "John Green (Crash Course)",
    duration: "11m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/zhL5DCizj5c/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/zhL5DCizj5c"
  },
  {
    id: 33,
    title: "Capitalism and Socialism: Crash Course World History #33",
    description: "Episode 33 of Crash Course World History with John Green: Capitalism and Socialism.",
    instructor: "John Green (Crash Course)",
    duration: "14m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/B3u4EFTwprM/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/B3u4EFTwprM"
  },
  {
    id: 34,
    title: "Samurai, Daimyo, Matthew Perry, and Nationalism: Crash Course World History #34",
    description: "Episode 34 of Crash Course World History with John Green: Samurai, Daimyo, Matthew Perry, and Nationalism.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/Nosq94oCl_M/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/Nosq94oCl_M"
  },
  {
    id: 35,
    title: "Imperialism: Crash Course World History #35",
    description: "Episode 35 of Crash Course World History with John Green: Imperialism.",
    instructor: "John Green (Crash Course)",
    duration: "14m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/alJaltUmrGo/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/alJaltUmrGo"
  },
  {
    id: 36,
    title: "Archdukes, Cynicism, and World War I: Crash Course World History #36",
    description: "Episode 36 of Crash Course World History with John Green: Archdukes, Cynicism, and World War I.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/_XPZQ0LAlR4/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/_XPZQ0LAlR4"
  },
  {
    id: 37,
    title: "Communists, Nationalists, and China's Revolutions: Crash Course World History #37",
    description: "Episode 37 of Crash Course World History with John Green: Communists, Nationalists, and China's Revolutions.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/UUCEeC4f6ts/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/UUCEeC4f6ts"
  },
  {
    id: 38,
    title: "World War II: Crash Course World History #38",
    description: "Episode 38 of Crash Course World History with John Green: World War II.",
    instructor: "John Green (Crash Course)",
    duration: "13m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/Q78COTwT7nE/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/Q78COTwT7nE"
  },
  {
    id: 39,
    title: "USA vs USSR Fight! The Cold War: Crash Course World History #39",
    description: "Episode 39 of Crash Course World History with John Green: USA vs USSR Fight! The Cold War.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/y9HjvHZfCUI/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/y9HjvHZfCUI"
  },
  {
    id: 40,
    title: "Decolonization and Nationalism Triumphant: Crash Course World History #40",
    description: "Episode 40 of Crash Course World History with John Green: Decolonization and Nationalism Triumphant.",
    instructor: "John Green (Crash Course)",
    duration: "13m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/T_sGTspaF4Y/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/T_sGTspaF4Y"
  },
  {
    id: 41,
    title: "Globalization I - The Upside: Crash Course World History #41",
    description: "Episode 41 of Crash Course World History with John Green: Globalization I - The Upside.",
    instructor: "John Green (Crash Course)",
    duration: "12m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/5SnR-e0S6Ic/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/5SnR-e0S6Ic"
  },
  {
    id: 42,
    title: "Globalization II - Good or Bad?: Crash Course World History #42",
    description: "Episode 42 of Crash Course World History with John Green: Globalization II - Good or Bad?.",
    instructor: "John Green (Crash Course)",
    duration: "14m",
    category: "History",
    thumbnail: "https://img.youtube.com/vi/s_iwrt7D5OA/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/s_iwrt7D5OA"
  },
];

module.exports = lectures;
