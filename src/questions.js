// Going Once: question bank (72 questions, 6 categories x 3 difficulties x 4 questions).
// Each question has exactly 4 options and exactly one correct answer (answerIndex, 0 to 3).
// Difficulty: 1 = Common, 2 = Uncommon, 3 = Rare.
// All facts are stable (no records or figures that change year to year).

export const CATEGORIES = ["Geography", "History", "Science", "Sport", "Film & TV", "Music"];

export const QUESTIONS = [
  // ---------- Geography ----------
  { id: "geo-1-1", category: "Geography", difficulty: 1, question: "What is the capital city of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Perth"], answerIndex: 2 },
  { id: "geo-1-2", category: "Geography", difficulty: 1, question: "Which is the largest ocean on Earth?", options: ["Pacific", "Atlantic", "Indian", "Arctic"], answerIndex: 0 },
  { id: "geo-1-3", category: "Geography", difficulty: 1, question: "Which river flows through the city of Cairo?", options: ["Congo", "Niger", "Zambezi", "Nile"], answerIndex: 3 },
  { id: "geo-1-4", category: "Geography", difficulty: 1, question: "Marrakech is a famous city in which country?", options: ["Egypt", "Morocco", "Tunisia", "Turkey"], answerIndex: 1 },
  { id: "geo-2-1", category: "Geography", difficulty: 2, question: "What is the capital city of Canada?", options: ["Toronto", "Ottawa", "Vancouver", "Montreal"], answerIndex: 1 },
  { id: "geo-2-2", category: "Geography", difficulty: 2, question: "Which African country has the largest population?", options: ["Ethiopia", "Egypt", "South Africa", "Nigeria"], answerIndex: 3 },
  { id: "geo-2-3", category: "Geography", difficulty: 2, question: "The Strait of Gibraltar separates Spain from which African country?", options: ["Morocco", "Algeria", "Tunisia", "Libya"], answerIndex: 0 },
  { id: "geo-2-4", category: "Geography", difficulty: 2, question: "Which desert covers much of southern Mongolia and northern China?", options: ["Kalahari", "Thar", "Gobi", "Sonoran"], answerIndex: 2 },
  { id: "geo-3-1", category: "Geography", difficulty: 3, question: "What is the capital city of Kazakhstan?", options: ["Almaty", "Astana", "Tashkent", "Bishkek"], answerIndex: 1 },
  { id: "geo-3-2", category: "Geography", difficulty: 3, question: "Lake Titicaca sits on the border of Peru and which other country?", options: ["Bolivia", "Chile", "Ecuador", "Argentina"], answerIndex: 0 },
  { id: "geo-3-3", category: "Geography", difficulty: 3, question: "Which is the longest river in Europe?", options: ["Danube", "Rhine", "Dnieper", "Volga"], answerIndex: 3 },
  { id: "geo-3-4", category: "Geography", difficulty: 3, question: "Which strait separates Asia from North America?", options: ["Malacca", "Hormuz", "Bering", "Magellan"], answerIndex: 2 },

  // ---------- History ----------
  { id: "his-1-1", category: "History", difficulty: 1, question: "Who was the first President of the United States?", options: ["Abraham Lincoln", "George Washington", "Thomas Jefferson", "John Adams"], answerIndex: 1 },
  { id: "his-1-2", category: "History", difficulty: 1, question: "In which year did the Second World War end?", options: ["1918", "1939", "1950", "1945"], answerIndex: 3 },
  { id: "his-1-3", category: "History", difficulty: 1, question: "Which ancient civilisation built the great pyramids at Giza?", options: ["The Egyptians", "The Romans", "The Aztecs", "The Vikings"], answerIndex: 0 },
  { id: "his-1-4", category: "History", difficulty: 1, question: "In which year did the Titanic sink?", options: ["1898", "1905", "1912", "1921"], answerIndex: 2 },
  { id: "his-2-1", category: "History", difficulty: 2, question: "In which year did the Berlin Wall fall?", options: ["1989", "1961", "1975", "1991"], answerIndex: 0 },
  { id: "his-2-2", category: "History", difficulty: 2, question: "Who was the first woman to win a Nobel Prize?", options: ["Florence Nightingale", "Mother Teresa", "Pearl S. Buck", "Marie Curie"], answerIndex: 3 },
  { id: "his-2-3", category: "History", difficulty: 2, question: "The Magna Carta was sealed in 1215 in which country?", options: ["France", "England", "Scotland", "Spain"], answerIndex: 1 },
  { id: "his-2-4", category: "History", difficulty: 2, question: "Which Carthaginian general famously crossed the Alps with war elephants?", options: ["Hamilcar", "Hasdrubal", "Hannibal", "Scipio"], answerIndex: 2 },
  { id: "his-3-1", category: "History", difficulty: 3, question: "Much of the Great Wall of China that survives today was built during which dynasty?", options: ["Han", "Ming", "Tang", "Qing"], answerIndex: 1 },
  { id: "his-3-2", category: "History", difficulty: 3, question: "Which Mughal emperor commissioned the Taj Mahal?", options: ["Akbar", "Babur", "Aurangzeb", "Shah Jahan"], answerIndex: 3 },
  { id: "his-3-3", category: "History", difficulty: 3, question: "The Rosetta Stone helped scholars decipher which writing system?", options: ["Egyptian hieroglyphs", "Cuneiform", "Linear B", "Mayan glyphs"], answerIndex: 0 },
  { id: "his-3-4", category: "History", difficulty: 3, question: "Which Portuguese explorer was the first European to reach India by sea?", options: ["Ferdinand Magellan", "Bartolomeu Dias", "Vasco da Gama", "Pedro Cabral"], answerIndex: 2 },

  // ---------- Science ----------
  { id: "sci-1-1", category: "Science", difficulty: 1, question: "Which gas do plants absorb from the air to carry out photosynthesis?", options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], answerIndex: 2 },
  { id: "sci-1-2", category: "Science", difficulty: 1, question: "What is the chemical symbol for gold?", options: ["Au", "Ag", "Gd", "Go"], answerIndex: 0 },
  { id: "sci-1-3", category: "Science", difficulty: 1, question: "How many planets are in our solar system?", options: ["7", "9", "10", "8"], answerIndex: 3 },
  { id: "sci-1-4", category: "Science", difficulty: 1, question: "What is the closest star to Earth?", options: ["Proxima Centauri", "The Sun", "Sirius", "Betelgeuse"], answerIndex: 1 },
  { id: "sci-2-1", category: "Science", difficulty: 2, question: "What is the hardest naturally occurring substance?", options: ["Quartz", "Topaz", "Obsidian", "Diamond"], answerIndex: 3 },
  { id: "sci-2-2", category: "Science", difficulty: 2, question: "Which organ in the human body produces insulin?", options: ["Pancreas", "Liver", "Kidney", "Spleen"], answerIndex: 0 },
  { id: "sci-2-3", category: "Science", difficulty: 2, question: "About how fast does light travel through a vacuum?", options: ["3,000 km per second", "30,000 km per second", "300,000 km per second", "3,000,000 km per second"], answerIndex: 2 },
  { id: "sci-2-4", category: "Science", difficulty: 2, question: "Which gas makes up most of Earth's atmosphere?", options: ["Oxygen", "Nitrogen", "Argon", "Carbon dioxide"], answerIndex: 1 },
  { id: "sci-3-1", category: "Science", difficulty: 3, question: "Which element has the chemical symbol W?", options: ["Tungsten", "Titanium", "Tantalum", "Thorium"], answerIndex: 0 },
  { id: "sci-3-2", category: "Science", difficulty: 3, question: "What is the term for a solid turning directly into a gas without becoming a liquid?", options: ["Evaporation", "Condensation", "Deposition", "Sublimation"], answerIndex: 3 },
  { id: "sci-3-3", category: "Science", difficulty: 3, question: "Who formulated the three laws of planetary motion?", options: ["Galileo Galilei", "Johannes Kepler", "Nicolaus Copernicus", "Isaac Newton"], answerIndex: 1 },
  { id: "sci-3-4", category: "Science", difficulty: 3, question: "Which blood type is known as the universal donor for red blood cells?", options: ["AB positive", "A negative", "O negative", "B positive"], answerIndex: 2 },

  // ---------- Sport ----------
  { id: "spo-1-1", category: "Sport", difficulty: 1, question: "How many players does each team have on the field in a soccer match?", options: ["9", "10", "11", "12"], answerIndex: 2 },
  { id: "spo-1-2", category: "Sport", difficulty: 1, question: "In which sport would you score with a slam dunk?", options: ["Basketball", "Volleyball", "Netball", "Handball"], answerIndex: 0 },
  { id: "spo-1-3", category: "Sport", difficulty: 1, question: "How many rings are there on the Olympic flag?", options: ["3", "4", "6", "5"], answerIndex: 3 },
  { id: "spo-1-4", category: "Sport", difficulty: 1, question: "The Wimbledon tennis championships are held in which country?", options: ["United States", "United Kingdom", "France", "Australia"], answerIndex: 1 },
  { id: "spo-2-1", category: "Sport", difficulty: 2, question: "In golf, what is the term for finishing a hole one stroke under par?", options: ["Eagle", "Birdie", "Bogey", "Albatross"], answerIndex: 1 },
  { id: "spo-2-2", category: "Sport", difficulty: 2, question: "Which city hosted the 2000 Summer Olympics?", options: ["Athens", "Atlanta", "Barcelona", "Sydney"], answerIndex: 3 },
  { id: "spo-2-3", category: "Sport", difficulty: 2, question: "How long is an Olympic-size swimming pool?", options: ["50 metres", "25 metres", "75 metres", "100 metres"], answerIndex: 0 },
  { id: "spo-2-4", category: "Sport", difficulty: 2, question: "How many points is a try worth in rugby union?", options: ["3", "4", "5", "6"], answerIndex: 2 },
  { id: "spo-3-1", category: "Sport", difficulty: 3, question: "Which country won the first FIFA World Cup in 1930?", options: ["Brazil", "Argentina", "Uruguay", "Italy"], answerIndex: 2 },
  { id: "spo-3-2", category: "Sport", difficulty: 3, question: "Which player has won the most men's singles titles at the French Open?", options: ["Rafael Nadal", "Roger Federer", "Novak Djokovic", "Bjorn Borg"], answerIndex: 0 },
  { id: "spo-3-3", category: "Sport", difficulty: 3, question: "Which nation has won the most Rugby World Cup titles?", options: ["New Zealand", "Australia", "England", "South Africa"], answerIndex: 3 },
  { id: "spo-3-4", category: "Sport", difficulty: 3, question: "In which year were the first modern Olympic Games held?", options: ["1880", "1896", "1900", "1912"], answerIndex: 1 },

  // ---------- Film & TV ----------
  { id: "fil-1-1", category: "Film & TV", difficulty: 1, question: "Which animated film follows a clownfish searching for his lost son?", options: ["Shark Tale", "Moana", "Ratatouille", "Finding Nemo"], answerIndex: 3 },
  { id: "fil-1-2", category: "Film & TV", difficulty: 1, question: "Which school of magic does Harry Potter attend?", options: ["Hogwarts", "Beauxbatons", "Durmstrang", "Ilvermorny"], answerIndex: 0 },
  { id: "fil-1-3", category: "Film & TV", difficulty: 1, question: "In The Lion King, what is the name of Simba's father?", options: ["Scar", "Rafiki", "Mufasa", "Timon"], answerIndex: 2 },
  { id: "fil-1-4", category: "Film & TV", difficulty: 1, question: "Which superhero's alter ego is Peter Parker?", options: ["Batman", "Spider-Man", "Iron Man", "Superman"], answerIndex: 1 },
  { id: "fil-2-1", category: "Film & TV", difficulty: 2, question: "Which 1997 film features the line 'I'm the king of the world'?", options: ["Gladiator", "Titanic", "Braveheart", "Avatar"], answerIndex: 1 },
  { id: "fil-2-2", category: "Film & TV", difficulty: 2, question: "Which actor played Captain Jack Sparrow in the Pirates of the Caribbean films?", options: ["Orlando Bloom", "Geoffrey Rush", "Brad Pitt", "Johnny Depp"], answerIndex: 3 },
  { id: "fil-2-3", category: "Film & TV", difficulty: 2, question: "In the TV series Friends, what is the name of the coffee shop the group hangs out in?", options: ["Central Perk", "Cafe Nervosa", "Monk's Cafe", "Luke's Diner"], answerIndex: 0 },
  { id: "fil-2-4", category: "Film & TV", difficulty: 2, question: "Which studio made the first Toy Story film?", options: ["DreamWorks", "Illumination", "Pixar", "Blue Sky"], answerIndex: 2 },
  { id: "fil-3-1", category: "Film & TV", difficulty: 3, question: "Which film won the Academy Award for Best Picture at the 2020 ceremony?", options: ["1917", "Parasite", "Joker", "Little Women"], answerIndex: 1 },
  { id: "fil-3-2", category: "Film & TV", difficulty: 3, question: "Who directed the 1980 horror film The Shining?", options: ["Alfred Hitchcock", "John Carpenter", "Wes Craven", "Stanley Kubrick"], answerIndex: 3 },
  { id: "fil-3-3", category: "Film & TV", difficulty: 3, question: "Who composed the original score for the first Star Wars film?", options: ["John Williams", "Hans Zimmer", "Ennio Morricone", "Howard Shore"], answerIndex: 0 },
  { id: "fil-3-4", category: "Film & TV", difficulty: 3, question: "Which was the first full-length animated feature film produced by Walt Disney?", options: ["Pinocchio", "Bambi", "Snow White and the Seven Dwarfs", "Fantasia"], answerIndex: 2 },

  // ---------- Music ----------
  { id: "mus-1-1", category: "Music", difficulty: 1, question: "How many strings does a standard guitar have?", options: ["5", "6", "7", "8"], answerIndex: 1 },
  { id: "mus-1-2", category: "Music", difficulty: 1, question: "Which band recorded 'Bohemian Rhapsody'?", options: ["The Beatles", "Led Zeppelin", "ABBA", "Queen"], answerIndex: 3 },
  { id: "mus-1-3", category: "Music", difficulty: 1, question: "A standard piano has how many keys?", options: ["88", "76", "92", "100"], answerIndex: 0 },
  { id: "mus-1-4", category: "Music", difficulty: 1, question: "Which singer is nicknamed the 'King of Pop'?", options: ["Prince", "Elvis Presley", "Michael Jackson", "Justin Timberlake"], answerIndex: 2 },
  { id: "mus-2-1", category: "Music", difficulty: 2, question: "Which member of The Beatles played the drums?", options: ["George Harrison", "Ringo Starr", "Paul McCartney", "John Lennon"], answerIndex: 1 },
  { id: "mus-2-2", category: "Music", difficulty: 2, question: "Which composer wrote The Four Seasons?", options: ["Antonio Vivaldi", "Johann Sebastian Bach", "Wolfgang Amadeus Mozart", "George Frideric Handel"], answerIndex: 0 },
  { id: "mus-2-3", category: "Music", difficulty: 2, question: "Taylor Swift's album 1989 takes its title from what?", options: ["The year of her first concert", "The year her mother was born", "The year she signed her first record deal", "The year she was born"], answerIndex: 3 },
  { id: "mus-2-4", category: "Music", difficulty: 2, question: "Which country is the band ABBA from?", options: ["Norway", "Denmark", "Sweden", "Finland"], answerIndex: 2 },
  { id: "mus-3-1", category: "Music", difficulty: 3, question: "How many symphonies did Ludwig van Beethoven complete?", options: ["9", "5", "7", "12"], answerIndex: 0 },
  { id: "mus-3-2", category: "Music", difficulty: 3, question: "Which instrument did the jazz musician Miles Davis play?", options: ["Saxophone", "Piano", "Trombone", "Trumpet"], answerIndex: 3 },
  { id: "mus-3-3", category: "Music", difficulty: 3, question: "Which Italian musical term means gradually getting louder?", options: ["Diminuendo", "Crescendo", "Staccato", "Legato"], answerIndex: 1 },
  { id: "mus-3-4", category: "Music", difficulty: 3, question: "Which composer wrote the opera The Magic Flute?", options: ["Giuseppe Verdi", "Giacomo Puccini", "Wolfgang Amadeus Mozart", "Richard Wagner"], answerIndex: 2 }
];
