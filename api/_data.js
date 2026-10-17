// Curated Bengaluru phrasebook + street-smart tips (used by Learn decks and the agent's playbook tool)
export const DECKS = {
  survival: {
    title: 'Survival', icon: '🛟', level: 1,
    tips: ['"Swalpa adjust maadi" (please adjust a little) is the unofficial city motto.', 'Most locals switch to Hindi/English, but starting in Kannada wins instant smiles.'],
    phrases: [
      ['Hello / Greetings', 'ನಮಸ್ಕಾರ', 'namaskaara'],
      ['Thank you', 'ಧನ್ಯವಾದಗಳು', 'dhanyavaadagalu'],
      ['How much?', 'ಎಷ್ಟು?', 'eshtu?'],
      ['I don\'t know Kannada', 'ನನಗೆ ಕನ್ನಡ ಬರಲ್ಲ', 'nanage kannada baralla'],
      ['Yes / No', 'ಹೌದು / ಇಲ್ಲ', 'haudu / illa'],
      ['Okay', 'ಸರಿ', 'sari'],
      ['Water', 'ನೀರು', 'neeru'],
      ['Please adjust a little', 'ಸ್ವಲ್ಪ ಅಡ್ಜಸ್ಟ್ ಮಾಡಿ', 'swalpa adjust maadi'],
    ],
  },
  auto: {
    title: 'Auto-rickshaw', icon: '🛺', level: 2,
    tips: ['Ask "meter haaki" before getting in; after 10pm, 1.5x fare is normal.', 'Name a landmark, not an address: drivers navigate by landmarks.', 'If they quote a flat rate, counter at ~70% and settle in between.'],
    phrases: [
      ['Will you come to MG Road?', 'ಎಂ.ಜಿ. ರೋಡ್‌ಗೆ ಬರ್ತೀರಾ?', 'MG Road-ge barteeraa?'],
      ['Please put the meter', 'ಮೀಟರ್ ಹಾಕಿ', 'meter haaki'],
      ['Stop here', 'ಇಲ್ಲೇ ನಿಲ್ಲಿಸಿ', 'ille nillisi'],
      ['Go straight', 'ನೇರವಾಗಿ ಹೋಗಿ', 'neravaagi hogi'],
      ['Turn left', 'ಎಡಕ್ಕೆ ತಿರುಗಿ', 'edakke tirugi'],
      ['Turn right', 'ಬಲಕ್ಕೆ ತಿರುಗಿ', 'balakke tirugi'],
      ['Too much, reduce a little', 'ತುಂಬಾ ಜಾಸ್ತಿ, ಸ್ವಲ್ಪ ಕಡಿಮೆ ಮಾಡಿ', 'tumbaa jaasti, swalpa kadime maadi'],
      ['Go slowly please', 'ನಿಧಾನವಾಗಿ ಹೋಗಿ', 'nidhaanavaagi hogi'],
    ],
  },
  food: {
    title: 'Darshini & Food', icon: '☕', level: 2,
    tips: ['At darshinis you pay first at the counter, collect the token, then eat standing.', 'Filter coffee comes in a davara-tumbler: pour between them to cool it.', 'Try: masala dosa, idli-vada, bisi bele bath, Mysore pak.'],
    phrases: [
      ['One filter coffee please', 'ಒಂದು ಫಿಲ್ಟರ್ ಕಾಫಿ ಕೊಡಿ', 'ondu filter coffee kodi'],
      ['One masala dosa', 'ಒಂದು ಮಸಾಲೆ ದೋಸೆ', 'ondu masaale dose'],
      ['Not spicy please', 'ಖಾರ ಬೇಡ', 'khaara beda'],
      ['Bill please', 'ಬಿಲ್ ಕೊಡಿ', 'bill kodi'],
      ['Very tasty!', 'ತುಂಬಾ ರುಚಿಯಾಗಿದೆ!', 'tumbaa ruchiyaagide!'],
      ['A little more please', 'ಇನ್ನೂ ಸ್ವಲ್ಪ ಕೊಡಿ', 'innoo swalpa kodi'],
    ],
  },
  metro: {
    title: 'Metro & Bus', icon: '🚇', level: 3,
    tips: ['Namma Metro Purple line runs east–west (Whitefield–Challaghatta), Green north–south.', 'Majestic (Kempegowda) is the big interchange for metro, BMTC buses and the railway station.', 'Women ride free on BMTC buses (Shakti scheme) — conductors may ask for ID.'],
    phrases: [
      ['Where is the metro station?', 'ಮೆಟ್ರೋ ಸ್ಟೇಷನ್ ಎಲ್ಲಿದೆ?', 'metro station ellide?'],
      ['Which bus goes to Majestic?', 'ಮೆಜೆಸ್ಟಿಕ್‌ಗೆ ಯಾವ ಬಸ್ ಹೋಗುತ್ತೆ?', 'majestic-ge yaava bus hogutte?'],
      ['One ticket', 'ಒಂದು ಟಿಕೆಟ್', 'ondu ticket'],
      ['Where should I get down?', 'ನಾನು ಎಲ್ಲಿ ಇಳೀಬೇಕು?', 'naanu elli ileebeku?'],
      ['How far is it?', 'ಎಷ್ಟು ದೂರ?', 'eshtu doora?'],
    ],
  },
  smalltalk: {
    title: 'Small talk', icon: '🗣️', level: 3,
    tips: ['"Oota aayta?" (Had your meal?) is a warm Bengaluru greeting.', 'Add "-ri" or "saar/maydum" for politeness.'],
    phrases: [
      ['How are you?', 'ಹೇಗಿದ್ದೀರಾ?', 'hegiddeeraa?'],
      ['I am fine', 'ನಾನು ಚೆನ್ನಾಗಿದ್ದೀನಿ', 'naanu chennaagiddeeni'],
      ['What is your name?', 'ನಿಮ್ಮ ಹೆಸರು ಏನು?', 'nimma hesaru enu?'],
      ['Had your meal?', 'ಊಟ ಆಯ್ತಾ?', 'oota aaytaa?'],
      ['Please speak slowly', 'ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಮಾತಾಡಿ', 'dayavittu nidhaanavaagi maataadi'],
      ['Bengaluru is very nice', 'ಬೆಂಗಳೂರು ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ', 'bengalooru tumbaa chennaagide'],
    ],
  },
  emergency: {
    title: 'Emergency', icon: '🚨', level: 1,
    tips: ['Emergency: 112. Police: 100. Ambulance: 108.', 'Namma Metro & BMTC have women helpline 1091.'],
    phrases: [
      ['Help!', 'ಸಹಾಯ ಮಾಡಿ!', 'sahaaya maadi!'],
      ['Call the police', 'ಪೊಲೀಸ್ ಕರೆಯಿರಿ', 'police kareyiri'],
      ['Where is the hospital?', 'ಆಸ್ಪತ್ರೆ ಎಲ್ಲಿದೆ?', 'aaspatre ellide?'],
      ['I am lost', 'ನಾನು ದಾರಿ ತಪ್ಪಿದ್ದೀನಿ', 'naanu daari tappiddeeni'],
    ],
  },
};
