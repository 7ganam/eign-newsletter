// server/app.ts
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { csvFormat, csvParse } from "d3";
import { Hono } from "hono";
import { logger } from "hono/logger";

// src/influencerData.ts
var verifiedAt = "2026-08-28";
var INFLUENCERS_VERIFIED_AT = verifiedAt;
var INFLUENCERS = [
  // Cross-regional research and media
  {
    name: "Zubair Naeem Paracha",
    country: "Regional",
    lane: "Media & Research",
    organisation: "MENAbytes, Termsheet",
    linkedinUrl: "https://www.linkedin.com/in/xparacha",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Wesley Schwalje",
    country: "Regional",
    lane: "Media & Research",
    organisation: "Tahseen Consulting",
    linkedinUrl: "https://www.linkedin.com/in/wesschwalje",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Miram Wafik",
    country: "Regional",
    lane: "Media & Research",
    organisation: "The Associate / Funding Pulse",
    linkedinUrl: "https://www.linkedin.com/in/miram-wafik-31b093133",
    priority: false,
    arabicOrBilingual: true
  },
  {
    name: "Lisa van Vuuren",
    country: "Regional",
    lane: "Media & Research",
    organisation: "The Start-up Pulse",
    linkedinUrl: "https://www.linkedin.com/in/lisa-van-vuuren-60785b13",
    priority: false,
    arabicOrBilingual: false
  },
  // Egypt
  {
    name: "Mounir Nakhla",
    country: "Egypt",
    lane: "Founder",
    organisation: "MNT-Halan",
    linkedinUrl: "https://www.linkedin.com/in/mounir-nakhla",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Mostafa Kandil",
    country: "Egypt",
    lane: "Founder",
    organisation: "Swvl",
    linkedinUrl: "https://www.linkedin.com/in/mostafaeissakandil",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Ashraf Sabry",
    country: "Egypt",
    lane: "Founder",
    organisation: "Fawry",
    linkedinUrl: "https://www.linkedin.com/in/ashraf-sabry",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Islam Shawky",
    country: "Egypt",
    lane: "Founder",
    organisation: "Paymob",
    linkedinUrl: "https://www.linkedin.com/in/islam-shawky-993306265",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Mostafa Amin",
    country: "Egypt",
    lane: "Founder",
    organisation: "Breadfast",
    linkedinUrl: "https://www.linkedin.com/in/mostafaaminway",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Ahmed Wadi",
    country: "Egypt",
    lane: "Founder",
    organisation: "Money Fellows",
    linkedinUrl: "https://www.linkedin.com/in/ahmadwadi",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Mostafa El-Beltagy",
    country: "Egypt",
    lane: "Founder",
    organisation: "Nawy",
    linkedinUrl: "https://www.linkedin.com/in/mostafa-el-beltagy-240b8342",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Mohamed Ezzat",
    country: "Egypt",
    lane: "Founder",
    organisation: "Bosta",
    linkedinUrl: "https://www.linkedin.com/in/mohamed-ezzat-67aba7a4",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Omar Saleh",
    country: "Egypt",
    lane: "Founder",
    organisation: "Khazna",
    linkedinUrl: "https://www.linkedin.com/in/omar-saleh-7078555",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Ahmed Sabbah",
    country: "Egypt",
    lane: "Founder",
    organisation: "Telda",
    linkedinUrl: "https://www.linkedin.com/in/ahmedsabbah",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Belal El-Megharbel",
    country: "Egypt",
    lane: "Founder",
    organisation: "MaxAB",
    linkedinUrl: "https://www.linkedin.com/in/belal-el-megharbel-34718023",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Aly Eltayeb",
    country: "Egypt",
    lane: "Founder",
    organisation: "Shift EV",
    linkedinUrl: "https://www.linkedin.com/in/alyeltayeb",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Omar Gabr",
    country: "Egypt",
    lane: "Founder",
    organisation: "Luciq, formerly Instabug",
    linkedinUrl: "https://www.linkedin.com/in/okgabr",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Omar Shoukry Sakr",
    country: "Egypt",
    lane: "Founder",
    organisation: "Nawah Scientific",
    linkedinUrl: "https://www.linkedin.com/in/omar-shoukry-sakr-phd-mba",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Nour Emam",
    country: "Egypt",
    lane: "Founder",
    organisation: "Daleela",
    linkedinUrl: "https://www.linkedin.com/in/nourmemam",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Amir Barsoum",
    country: "Egypt",
    lane: "Founder",
    organisation: "InVitro Capital; Vezeeta founder",
    linkedinUrl: "https://www.linkedin.com/in/amirmbarsoum",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Tarek Assaad",
    country: "Egypt",
    lane: "Investor",
    organisation: "Algebra Ventures",
    linkedinUrl: "https://www.linkedin.com/in/tassaad",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Karim Hussein",
    country: "Egypt",
    lane: "Investor",
    organisation: "Algebra Ventures",
    linkedinUrl: "https://www.linkedin.com/in/karimhussein",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Laila Hassan",
    country: "Egypt",
    lane: "Investor",
    organisation: "Algebra Ventures",
    linkedinUrl: "https://www.linkedin.com/in/lailaohassan",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Omar Khashaba",
    country: "Egypt",
    lane: "Investor",
    organisation: "Algebra Ventures",
    linkedinUrl: "https://www.linkedin.com/in/okhashaba",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Ahmed El Alfi",
    country: "Egypt",
    lane: "Investor",
    organisation: "Sawari Ventures; Flat6Labs cofounder",
    linkedinUrl: "https://www.linkedin.com/in/ahmed-el-alfi-622a204b",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Hany Al-Sonbaty",
    country: "Egypt",
    lane: "Investor",
    organisation: "Sawari Ventures; F6 Group",
    linkedinUrl: "https://www.linkedin.com/in/hany-al-sonbaty-12274322",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Dina el-Shenoufy",
    country: "Egypt",
    lane: "Investor",
    organisation: "F6 Group and F6 Ventures",
    linkedinUrl: "https://www.linkedin.com/in/dinaelshenoufy",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Ramez El-Serafy",
    country: "Egypt",
    lane: "Investor",
    organisation: "F6 Group and F6 Ventures",
    linkedinUrl: "https://www.linkedin.com/in/ramezm",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Mohamed El Sayed Okasha",
    country: "Egypt",
    lane: "Investor",
    organisation: "DisrupTech Ventures",
    linkedinUrl: "https://www.linkedin.com/in/mohamed-el-sayed-okasha-056b87a2",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Tarek Fahim",
    country: "Egypt",
    lane: "Investor",
    organisation: "Endure Capital",
    linkedinUrl: "https://www.linkedin.com/in/tarekfahim",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Karim Beshara",
    country: "Egypt",
    lane: "Investor",
    organisation: "A15",
    linkedinUrl: "https://www.linkedin.com/in/karimbeshara",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Hanan Abdel Meguid",
    country: "Egypt",
    lane: "Investor",
    organisation: "Kamelizer",
    linkedinUrl: "https://www.linkedin.com/in/hmeguid",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Dalia Ibrahim",
    country: "Egypt",
    lane: "Investor",
    organisation: "EdVentures",
    linkedinUrl: "https://www.linkedin.com/in/daliamohamedibrahim",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Mohamed Aboulnaga \u201CNagaty\u201D",
    country: "Egypt",
    lane: "Founder",
    organisation: "Exits MENA; FORAS AI",
    linkedinUrl: "https://www.linkedin.com/in/nagaty",
    priority: false,
    arabicOrBilingual: true
  },
  {
    name: "Fadi Antaki",
    country: "Egypt",
    lane: "Ecosystem",
    organisation: "BitRoot; formerly A15",
    linkedinUrl: "https://www.linkedin.com/in/fadiantaki",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Abdelhameed Sharara",
    country: "Egypt",
    lane: "Ecosystem",
    organisation: "RiseUp",
    linkedinUrl: "https://www.linkedin.com/in/abdelhameed-sharara-6a983456",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Ayman Ismail",
    country: "Egypt",
    lane: "Ecosystem",
    organisation: "AUC",
    linkedinUrl: "https://www.linkedin.com/in/aymanism",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Amr El Abd",
    country: "Egypt",
    lane: "Ecosystem",
    organisation: "Endeavor MENA; PM adviser",
    linkedinUrl: "https://www.linkedin.com/in/amr-elabd79",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Maged Ghoneima",
    country: "Egypt",
    lane: "Ecosystem",
    organisation: "Startup Egypt",
    linkedinUrl: "https://www.linkedin.com/in/mghoneima",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Mohamed Ehab Hafez",
    country: "Egypt",
    lane: "Media & Research",
    organisation: "Entlaq",
    linkedinUrl: "https://www.linkedin.com/in/mohamed-ehab-hafez",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Tamer Taha",
    country: "Egypt",
    lane: "Policy",
    organisation: "Egypt Startup Charter contributor",
    linkedinUrl: "https://www.linkedin.com/in/tamertaha",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Mohamed Farid Saleh",
    country: "Egypt",
    lane: "Policy",
    organisation: "Minister of Investment and Foreign Trade",
    linkedinUrl: "https://www.linkedin.com/in/mohamed-farid-saleh-97527246",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Rania Ayman",
    country: "Egypt",
    lane: "Ecosystem",
    organisation: "Entreprenelle",
    linkedinUrl: "https://www.linkedin.com/in/raniaayman",
    priority: false,
    arabicOrBilingual: true
  },
  {
    name: "Gamal Helmy",
    country: "Egypt",
    lane: "Media & Research",
    organisation: "WAYA Media",
    linkedinUrl: "https://www.linkedin.com/in/gamal-helmy",
    priority: false,
    arabicOrBilingual: true
  },
  // Saudi Arabia
  {
    name: "Nora M. Alsarhan",
    country: "Saudi Arabia",
    lane: "Investor",
    organisation: "Saudi Venture Capital",
    linkedinUrl: "https://www.linkedin.com/in/nora-m-alsarhan",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Bandr Alhomaly",
    country: "Saudi Arabia",
    lane: "Investor",
    organisation: "Jada",
    linkedinUrl: "https://www.linkedin.com/in/bandr-alhomaly-cfa-a0603152",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Abdulrahman Tarabzouni",
    country: "Saudi Arabia",
    lane: "Investor",
    organisation: "STV",
    linkedinUrl: "https://www.linkedin.com/in/aitmit",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Amal Dokhan",
    country: "Saudi Arabia",
    lane: "Investor",
    organisation: "500 Global MENA",
    linkedinUrl: "https://www.linkedin.com/in/amaldokhan",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Omar Almajdouie",
    country: "Saudi Arabia",
    lane: "Investor",
    organisation: "RAED Ventures",
    linkedinUrl: "https://www.linkedin.com/in/omaralmajdouie",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Abdulaziz Al Omran",
    country: "Saudi Arabia",
    lane: "Investor",
    organisation: "Impact46",
    linkedinUrl: "https://www.linkedin.com/in/abdulaziz-al-omran-82029a2",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Abdullah Altamami",
    country: "Saudi Arabia",
    lane: "Investor",
    organisation: "Merak Capital",
    linkedinUrl: "https://www.linkedin.com/in/aaltamami",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Adwa AlDakheel",
    country: "Saudi Arabia",
    lane: "Investor",
    organisation: "Falak Investment Hub",
    linkedinUrl: "https://www.linkedin.com/in/adwa-aldakheel-ababb23a",
    priority: false,
    arabicOrBilingual: true
  },
  {
    name: "Fahad Alidi",
    country: "Saudi Arabia",
    lane: "Investor",
    organisation: "Wa\u2019ed",
    linkedinUrl: "https://www.linkedin.com/in/fahadalidi",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Mohammed Almeshekah",
    country: "Saudi Arabia",
    lane: "Investor",
    organisation: "Outliers",
    linkedinUrl: "https://www.linkedin.com/in/meshekah",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Badr Al Badr",
    country: "Saudi Arabia",
    lane: "Ecosystem",
    organisation: "Misk Foundation",
    linkedinUrl: "https://www.linkedin.com/in/badralbadr",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Ibrahim Neyaz",
    country: "Saudi Arabia",
    lane: "Policy",
    organisation: "NTDP",
    linkedinUrl: "https://www.linkedin.com/in/alneyazi",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Saud Alsabhan",
    country: "Saudi Arabia",
    lane: "Ecosystem",
    organisation: "Monsha\u2019at",
    linkedinUrl: "https://www.linkedin.com/in/saud-alsabhan-16b1927",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Hattan Ahmed",
    country: "Saudi Arabia",
    lane: "Ecosystem",
    organisation: "KAUST and TAQADAM",
    linkedinUrl: "https://www.linkedin.com/in/hattan-ahmed-2222484",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Tareq Amin",
    country: "Saudi Arabia",
    lane: "Ecosystem",
    organisation: "HUMAIN",
    linkedinUrl: "https://www.linkedin.com/in/tareq-amin-b58302",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Abdulmajeed Alsukhan",
    country: "Saudi Arabia",
    lane: "Founder",
    organisation: "Tamara",
    linkedinUrl: "https://www.linkedin.com/in/abdulmajeed-alsukhan-%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D9%85%D8%AC%D9%8A%D8%AF-%D8%A7%D9%84%D8%B5%D9%8A%D8%AE%D8%A7%D9%86-13000a58",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Ahmad AlZaini",
    country: "Saudi Arabia",
    lane: "Founder",
    organisation: "Foodics",
    linkedinUrl: "https://www.linkedin.com/in/alzaini",
    priority: false,
    arabicOrBilingual: true
  },
  {
    name: "Hisham Al-Falih",
    country: "Saudi Arabia",
    lane: "Founder",
    organisation: "Lean Technologies",
    linkedinUrl: "https://www.linkedin.com/in/hishamfalih",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Abdullah Asiri",
    country: "Saudi Arabia",
    lane: "Founder",
    organisation: "Lucidya",
    linkedinUrl: "https://www.linkedin.com/in/amasiri",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Ahmed Hamdan",
    country: "Saudi Arabia",
    lane: "Founder",
    organisation: "Unifonic",
    linkedinUrl: "https://www.linkedin.com/in/hamdanahmed",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Abdulaziz Al Jouf",
    country: "Saudi Arabia",
    lane: "Founder",
    organisation: "PayTabs",
    linkedinUrl: "https://www.linkedin.com/in/abdulaziz-aljouf",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Nawaf Hareeri",
    country: "Saudi Arabia",
    lane: "Founder",
    organisation: "Salla",
    linkedinUrl: "https://www.linkedin.com/in/nawaf-hareeri-47b42a152",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Osama AlRaee",
    country: "Saudi Arabia",
    lane: "Founder",
    organisation: "Lendo",
    linkedinUrl: "https://www.linkedin.com/in/osamaalraee",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Sami Alhelwah",
    country: "Saudi Arabia",
    lane: "Founder",
    organisation: "Nana",
    linkedinUrl: "https://www.linkedin.com/in/samialhulwah",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Mohammad Almadani",
    country: "Saudi Arabia",
    lane: "Founder",
    organisation: "Classera",
    linkedinUrl: "https://www.linkedin.com/in/mohammad-s-almadani-12307b29",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Mojahed Akil",
    country: "Saudi Arabia",
    lane: "Media & Research",
    organisation: "Beyond Ventures; Saudi startup newsletter",
    linkedinUrl: "https://www.linkedin.com/in/mojahedakil",
    priority: false,
    arabicOrBilingual: true
  },
  // United Arab Emirates
  {
    name: "Omar Sultan AlOlama",
    country: "United Arab Emirates",
    lane: "Policy",
    organisation: "UAE government; Dubai Chamber",
    linkedinUrl: "https://www.linkedin.com/in/omar-sultan-alolama-305b8366",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Khalfan Belhoul",
    country: "United Arab Emirates",
    lane: "Ecosystem",
    organisation: "Dubai Future Foundation",
    linkedinUrl: "https://www.linkedin.com/in/khalfan-belhoul-937a4a1a2",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Ahmad Ali Alwan",
    country: "United Arab Emirates",
    lane: "Ecosystem",
    organisation: "Hub71",
    linkedinUrl: "https://www.linkedin.com/in/ahmad-ali-alwan-64900b18",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Sara Al Nuaimi",
    country: "United Arab Emirates",
    lane: "Ecosystem",
    organisation: "Sheraa",
    linkedinUrl: "https://www.linkedin.com/in/sara-al-nuaimi-910a882",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Bodour Al Qasimi",
    country: "United Arab Emirates",
    lane: "Ecosystem",
    organisation: "Sheraa",
    linkedinUrl: "https://www.linkedin.com/in/bodour-al-qasimi-61a79b165",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Badr Al-Olama",
    country: "United Arab Emirates",
    lane: "Policy",
    organisation: "Abu Dhabi Investment Office",
    linkedinUrl: "https://www.linkedin.com/in/badr-al-olama-828816",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Hadi Badri",
    country: "United Arab Emirates",
    lane: "Ecosystem",
    organisation: "Dubai Founders HQ",
    linkedinUrl: "https://www.linkedin.com/in/hadibadri",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Arif Amiri",
    country: "United Arab Emirates",
    lane: "Ecosystem",
    organisation: "DIFC",
    linkedinUrl: "https://www.linkedin.com/in/arif-amiri",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Saeed Al Gergawi",
    country: "United Arab Emirates",
    lane: "Ecosystem",
    organisation: "Dubai Chamber",
    linkedinUrl: "https://www.linkedin.com/in/saeedalgergawi",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Ammar Al Malik",
    country: "United Arab Emirates",
    lane: "Ecosystem",
    organisation: "Dubai Internet City",
    linkedinUrl: "https://www.linkedin.com/in/ammaralmalik",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Noor Sweid",
    country: "United Arab Emirates",
    lane: "Investor",
    organisation: "Global Ventures",
    linkedinUrl: "https://www.linkedin.com/in/noor-sweid",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Fadi Ghandour",
    country: "United Arab Emirates",
    lane: "Investor",
    organisation: "Wamda Capital; Aramex founder",
    linkedinUrl: "https://www.linkedin.com/in/fadi-ghandour-52353b",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Dany Farha",
    country: "United Arab Emirates",
    lane: "Investor",
    organisation: "BECO Capital",
    linkedinUrl: "https://www.linkedin.com/in/danyfarha",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Amir Farha",
    country: "United Arab Emirates",
    lane: "Investor",
    organisation: "COTU Ventures",
    linkedinUrl: "https://www.linkedin.com/in/amirfarha",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Walid Hanna",
    country: "United Arab Emirates",
    lane: "Investor",
    organisation: "MEVP",
    linkedinUrl: "https://www.linkedin.com/in/walid-s-hanna",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Mahmoud Adi",
    country: "United Arab Emirates",
    lane: "Investor",
    organisation: "Shorooq",
    linkedinUrl: "https://www.linkedin.com/in/m-adi",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Shane Shin",
    country: "United Arab Emirates",
    lane: "Investor",
    organisation: "Shorooq",
    linkedinUrl: "https://www.linkedin.com/in/shaneykshin",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Sonia Weymuller",
    country: "United Arab Emirates",
    lane: "Investor",
    organisation: "VentureSouq",
    linkedinUrl: "https://www.linkedin.com/in/soniaweymuller",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Ibrahim Ajami",
    country: "United Arab Emirates",
    lane: "Investor",
    organisation: "Mubadala Capital",
    linkedinUrl: "https://www.linkedin.com/in/ibrahim-ajami-17925456",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Huda Al-Lawati",
    country: "United Arab Emirates",
    lane: "Investor",
    organisation: "Aliph Capital",
    linkedinUrl: "https://www.linkedin.com/in/huda-al-lawati-62051a5",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Philip Bahoshy",
    country: "United Arab Emirates",
    lane: "Media & Research",
    organisation: "MAGNiTT",
    linkedinUrl: "https://www.linkedin.com/in/philipbahoshy",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Mudassir Sheikha",
    country: "United Arab Emirates",
    lane: "Founder",
    organisation: "Careem",
    linkedinUrl: "https://www.linkedin.com/in/mudassirsheikha",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Ronaldo Mouchawar",
    country: "United Arab Emirates",
    lane: "Founder",
    organisation: "Souq.com; Amazon",
    linkedinUrl: "https://www.linkedin.com/in/ronaldomouchawar",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Hosam Arab",
    country: "United Arab Emirates",
    lane: "Founder",
    organisation: "Tabby",
    linkedinUrl: "https://www.linkedin.com/in/hosam",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Michael Lahyani",
    country: "United Arab Emirates",
    lane: "Founder",
    organisation: "Property Finder",
    linkedinUrl: "https://www.linkedin.com/in/michael-lahyani-25827b4",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Faisal Toukan",
    country: "United Arab Emirates",
    lane: "Founder",
    organisation: "Ziina",
    linkedinUrl: "https://www.linkedin.com/in/faisal-toukan-64865064",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Ola Doudin",
    country: "United Arab Emirates",
    lane: "Founder",
    organisation: "BitOasis",
    linkedinUrl: "https://www.linkedin.com/in/ola-doudin-5a026511",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Elie Habib",
    country: "United Arab Emirates",
    lane: "Founder",
    organisation: "Anghami",
    linkedinUrl: "https://www.linkedin.com/in/eliashabib",
    priority: false,
    arabicOrBilingual: false
  },
  // Qatar
  {
    name: "Sheikh Ali bin Alwaleed Al-Thani",
    country: "Qatar",
    lane: "Policy",
    organisation: "Invest Qatar",
    linkedinUrl: "https://www.linkedin.com/in/ali-al-thani-794879196",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Rama Chakaki",
    country: "Qatar",
    lane: "Ecosystem",
    organisation: "QSTP",
    linkedinUrl: "https://www.linkedin.com/in/rchakaki",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Hayfa Al-Abdulla",
    country: "Qatar",
    lane: "Ecosystem",
    organisation: "QSTP",
    linkedinUrl: "https://www.linkedin.com/in/haifaa",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Mansoor Al-Khater",
    country: "Qatar",
    lane: "Ecosystem",
    organisation: "Qatar Financial Centre",
    linkedinUrl: "https://www.linkedin.com/in/mansooralkhater",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Huzayfa Patel",
    country: "Qatar",
    lane: "Ecosystem",
    organisation: "QFC Digital Assets Lab",
    linkedinUrl: "https://www.linkedin.com/in/huzayfa-patel",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Michael Lints",
    country: "Qatar",
    lane: "Investor",
    organisation: "Golden Gate Ventures MENA",
    linkedinUrl: "https://www.linkedin.com/in/mhlints",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Alexander Wiedmer",
    country: "Qatar",
    lane: "Investor",
    organisation: "Rasmal Ventures",
    linkedinUrl: "https://www.linkedin.com/in/alexwiedmer13061968",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Soumaya Ben Beya Dridje",
    country: "Qatar",
    lane: "Investor",
    organisation: "Rasmal Ventures",
    linkedinUrl: "https://www.linkedin.com/in/soumaya-ben-beya-dridje-25574466",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Hamad Mubarak Al-Hajri",
    country: "Qatar",
    lane: "Founder",
    organisation: "Snoonu; GrowthX",
    linkedinUrl: "https://www.linkedin.com/in/hamadmubarkalhajri",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Nayef Al-Ibrahim",
    country: "Qatar",
    lane: "Founder",
    organisation: "Ibtechar",
    linkedinUrl: "https://www.linkedin.com/in/nayef-al-ibrahim-070a5916",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Steve Mackie",
    country: "Qatar",
    lane: "Media & Research",
    organisation: "Business Start Up Qatar",
    linkedinUrl: "https://www.linkedin.com/in/stevemackiesolutionsfour",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Dr Hanan El Basha",
    country: "Qatar",
    lane: "Ecosystem",
    organisation: "The Business Doctor",
    linkedinUrl: "https://www.linkedin.com/in/drhananelbasha",
    priority: false,
    arabicOrBilingual: false
  },
  // Bahrain
  {
    name: "Maha Mofeez",
    country: "Bahrain",
    lane: "Ecosystem",
    organisation: "Tamkeen",
    linkedinUrl: "https://www.linkedin.com/in/maha-mofeez-40291525",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Dalal Buhejji",
    country: "Bahrain",
    lane: "Policy",
    organisation: "Bahrain EDB",
    linkedinUrl: "https://www.linkedin.com/in/dbuhejji",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Bader Sater",
    country: "Bahrain",
    lane: "Ecosystem",
    organisation: "Bahrain FinTech Bay",
    linkedinUrl: "https://www.linkedin.com/in/badersater",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Latifa Mohamed Jabbar",
    country: "Bahrain",
    lane: "Investor",
    organisation: "Hope Ventures",
    linkedinUrl: "https://www.linkedin.com/in/latifa-mohammed",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Areije Al Shakar",
    country: "Bahrain",
    lane: "Investor",
    organisation: "BeVentures",
    linkedinUrl: "https://www.linkedin.com/in/areije",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Hasan Haider",
    country: "Bahrain",
    lane: "Investor",
    organisation: "Plus VC",
    linkedinUrl: "https://www.linkedin.com/in/hasanhaider",
    priority: true,
    arabicOrBilingual: true
  },
  {
    name: "Ahmed Al Rawi",
    country: "Bahrain",
    lane: "Founder",
    organisation: "Calo",
    linkedinUrl: "https://www.linkedin.com/in/rawi",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Abdulla Almoayed",
    country: "Bahrain",
    lane: "Founder",
    organisation: "Tarabut",
    linkedinUrl: "https://www.linkedin.com/in/aalmoayed",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Nezar Kadhem",
    country: "Bahrain",
    lane: "Founder",
    organisation: "Eat App",
    linkedinUrl: "https://www.linkedin.com/in/nezarkadhem",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Wafa Al Obaidat",
    country: "Bahrain",
    lane: "Founder",
    organisation: "PLAYBOOK",
    linkedinUrl: "https://www.linkedin.com/in/wafa-al-obaidat-8a992046",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Ali Alalawi",
    country: "Bahrain",
    lane: "Founder",
    organisation: "Unipal",
    linkedinUrl: "https://www.linkedin.com/in/ali-alalawi",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Fajer Al Pachachi",
    country: "Bahrain",
    lane: "Policy",
    organisation: "Esterad Bank; Bahrain Chamber",
    linkedinUrl: "https://www.linkedin.com/in/fajer-saleh-al-pachachi-b38ab116",
    priority: false,
    arabicOrBilingual: false
  },
  // Kuwait
  {
    name: "Mohammed Jaffar",
    country: "Kuwait",
    lane: "Investor",
    organisation: "Faith Capital; former Talabat CEO",
    linkedinUrl: "https://www.linkedin.com/in/mohammed-jaffar-01110a71",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Abdulaziz Al Loughani",
    country: "Kuwait",
    lane: "Founder",
    organisation: "Floward; Faith Capital",
    linkedinUrl: "https://www.linkedin.com/in/aballoughani",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Hasan Zainal",
    country: "Kuwait",
    lane: "Investor",
    organisation: "Arzan VC",
    linkedinUrl: "https://www.linkedin.com/in/hasanzainal",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Mona Al-Mukhaizeem",
    country: "Kuwait",
    lane: "Investor",
    organisation: "Savour Ventures; Sirdab Lab",
    linkedinUrl: "https://www.linkedin.com/in/mona-al-mukhaizeem-921aba8",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Nawaf Arhamah",
    country: "Kuwait",
    lane: "Investor",
    organisation: "F3 Capital",
    linkedinUrl: "https://www.linkedin.com/in/nawafarhamah",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Ali Abulhasan",
    country: "Kuwait",
    lane: "Founder",
    organisation: "Tap Payments",
    linkedinUrl: "https://www.linkedin.com/in/akabulhasan",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Yousef Alhusaini",
    country: "Kuwait",
    lane: "Founder",
    organisation: "Baims",
    linkedinUrl: "https://www.linkedin.com/in/yalhusaini",
    priority: false,
    arabicOrBilingual: true
  },
  {
    name: "Hashim Behbehani",
    country: "Kuwait",
    lane: "Ecosystem",
    organisation: "CODED; StartupQ8",
    linkedinUrl: "https://www.linkedin.com/in/hashimkb",
    priority: false,
    arabicOrBilingual: true
  },
  {
    name: "Haya AlMana",
    country: "Kuwait",
    lane: "Ecosystem",
    organisation: "BNK Academy; formerly ZINC",
    linkedinUrl: "https://www.linkedin.com/in/hayaalmana",
    priority: false,
    arabicOrBilingual: true
  },
  {
    name: "Malek Hammoud",
    country: "Kuwait",
    lane: "Investor",
    organisation: "Zain Ventures",
    linkedinUrl: "https://www.linkedin.com/in/malek-hammoud-cfa-6689545",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Dalal AlRayes",
    country: "Kuwait",
    lane: "Founder",
    organisation: "Spare",
    linkedinUrl: "https://www.linkedin.com/in/dalalalrayes",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Bader Al-Ghanim",
    country: "Kuwait",
    lane: "Ecosystem",
    organisation: "talabat",
    linkedinUrl: "https://www.linkedin.com/in/bader-al-ghanim-973a5b17",
    priority: false,
    arabicOrBilingual: false
  },
  // Oman
  {
    name: "Talib Al-Rashdi",
    country: "Oman",
    lane: "Investor",
    organisation: "ITHCA Group",
    linkedinUrl: "https://www.linkedin.com/in/talib-al-rashdi-5214abb8",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Dr Ali Al Shidhani",
    country: "Oman",
    lane: "Policy",
    organisation: "MTCIT",
    linkedinUrl: "https://www.linkedin.com/in/alialshidhani",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Ali Muqaibal",
    country: "Oman",
    lane: "Investor",
    organisation: "Sharakah",
    linkedinUrl: "https://www.linkedin.com/in/alimuqaibal",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Abdullah Al-Shaksy",
    country: "Oman",
    lane: "Investor",
    organisation: "Phaze Ventures",
    linkedinUrl: "https://www.linkedin.com/in/abdullah-al-shaksy",
    priority: true,
    arabicOrBilingual: false
  },
  {
    name: "Masoud Al-Rawahi",
    country: "Oman",
    lane: "Investor",
    organisation: "Phaze Ventures; PhazeRo",
    linkedinUrl: "https://www.linkedin.com/in/masoud-al-rawahi-15bb0714",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Adnan Alshuaili",
    country: "Oman",
    lane: "Founder",
    organisation: "eMushrif",
    linkedinUrl: "https://www.linkedin.com/in/adnan-alshuaili-470413136",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Majid AlAmri",
    country: "Oman",
    lane: "Founder",
    organisation: "Thawani Pay",
    linkedinUrl: "https://www.linkedin.com/in/majid-alamri-0144271a9",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Talal Hasan",
    country: "Oman",
    lane: "Founder",
    organisation: "44.01",
    linkedinUrl: "https://www.linkedin.com/in/talal-hasan",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Harith Maqbali",
    country: "Oman",
    lane: "Founder",
    organisation: "OTaxi",
    linkedinUrl: "https://www.linkedin.com/in/harith-maqbali-85456365",
    priority: false,
    arabicOrBilingual: false
  },
  {
    name: "Mohammed Al-Tamami",
    country: "Oman",
    lane: "Media & Research",
    organisation: "Mamun",
    linkedinUrl: "https://www.linkedin.com/in/mohamed-tamami",
    priority: false,
    arabicOrBilingual: true
  }
];

// src/linkedinFollowerData.ts
var LINKEDIN_FOLLOWERS_UPDATED_AT = "2026-08-30";
var LINKEDIN_PROFILE_OBSERVED_AT = "2026-08-30";
var SEARCH_INDEX_OBSERVED_AT = "2026-08-28";
var FOLLOWER_COUNTS = [
  42451,
  16611,
  5408,
  14867,
  10388,
  19575,
  2366,
  9087,
  24653,
  22224,
  13413,
  30973,
  31151,
  18402,
  9466,
  4791,
  32398,
  27929,
  7032,
  14290,
  3754,
  3754,
  4101,
  4101,
  6257,
  3844,
  4338,
  4338,
  4726,
  14960,
  4607,
  11213,
  8098,
  463063,
  14445,
  19144,
  29404,
  10187,
  48004,
  10512,
  5943,
  5439,
  121505,
  921,
  4854,
  10880,
  22808,
  16110,
  22224,
  12192,
  12933,
  58788,
  1788,
  11246,
  44408,
  6245,
  14593,
  15599,
  198702,
  10568,
  42129,
  4662,
  28346,
  19405,
  15015,
  2707,
  4580,
  20347,
  1250,
  8721,
  37775,
  2356,
  8224,
  4214,
  414587,
  50967,
  11017,
  10158,
  4203,
  9357,
  71414,
  747360,
  6226,
  12300,
  6825,
  41578,
  33326,
  5955,
  571,
  22551,
  30397,
  32743,
  15166,
  13671,
  4168,
  18815,
  6581,
  48998,
  2807,
  19743,
  3815,
  17308,
  3527,
  24943,
  1598,
  1598,
  135525,
  6259,
  17393,
  6803,
  1509,
  15859,
  2186,
  20937,
  3279,
  31228,
  null,
  24593,
  5202,
  35348,
  9433,
  null,
  5837,
  7444,
  2718,
  null,
  739,
  13378,
  7348,
  4810,
  2688,
  null,
  6187,
  4683,
  null,
  28054,
  3743,
  7745,
  7296,
  1207,
  4791,
  6142,
  1052,
  24768
];
var REFRESHED_PROFILE_INDEXES = /* @__PURE__ */ new Set(
  [
    ...Array.from({ length: 114 }, (_, zeroBasedIndex) => zeroBasedIndex + 1),
    118,
    123,
    127,
    133
  ]
);
var LIVE_PROFILE_INDEXES = /* @__PURE__ */ new Set([...REFRESHED_PROFILE_INDEXES, 116]);
var ROUNDED_INDEXES = /* @__PURE__ */ new Set();
var LINKEDIN_FOLLOWERS = Object.fromEntries(
  INFLUENCERS.map((influencer, zeroBasedIndex) => {
    const index = zeroBasedIndex + 1;
    const count = FOLLOWER_COUNTS[zeroBasedIndex] ?? null;
    const observed = count != null;
    const liveProfile = LIVE_PROFILE_INDEXES.has(index);
    const refreshedProfile = REFRESHED_PROFILE_INDEXES.has(index);
    return [influencer.linkedinUrl, {
      count,
      observedAt: observed ? refreshedProfile ? LINKEDIN_PROFILE_OBSERVED_AT : SEARCH_INDEX_OBSERVED_AT : null,
      status: observed ? "observed" : "not-verified",
      precision: observed && ROUNDED_INDEXES.has(index) ? "rounded" : observed ? "exact" : void 0,
      source: observed && liveProfile ? "linkedin-profile" : observed ? "search-index" : void 0
    }];
  })
);

// server/app.ts
var PROJECT_ROOT = process.env.VERCEL ? process.cwd() : resolve(dirname(fileURLToPath(import.meta.url)), "..");
var DATA_FILES = {
  companies: resolve(PROJECT_ROOT, "eign_index.companies.json"),
  rounds: resolve(PROJECT_ROOT, "eign_index.rounds.json")
};
var TABLE_PREFERENCES_FILE = resolve(PROJECT_ROOT, "assets/table-preferences.json");
var INFLUENCER_FILES = {
  directory: resolve(PROJECT_ROOT, "src/influencerData.ts"),
  followers: resolve(PROJECT_ROOT, "src/linkedinFollowerData.ts")
};
var FileObjectId = class {
  constructor(value) {
    this.value = value;
  }
  value;
  toString() {
    return this.value;
  }
  toJSON() {
    return this.value;
  }
};
var reviveExtendedJson = (value) => {
  if (Array.isArray(value)) return value.map(reviveExtendedJson);
  if (!value || typeof value !== "object") return value;
  const record = value;
  const keys = Object.keys(record);
  if (keys.length === 1 && typeof record.$oid === "string") return new FileObjectId(record.$oid);
  if (keys.length === 1 && typeof record.$date === "string") return new Date(record.$date);
  return Object.fromEntries(Object.entries(record).map(([key, entry]) => [key, reviveExtendedJson(entry)]));
};
var loadJsonRecords = async (path) => {
  const parsed = JSON.parse(await readFile(path, "utf8"));
  if (!Array.isArray(parsed)) throw new Error(`Expected a JSON array in ${path}`);
  return parsed.map((record) => reviveExtendedJson(record));
};
var toExtendedJson = (value) => {
  if (value instanceof FileObjectId) return { $oid: value.value };
  if (value instanceof Date) return { $date: value.toISOString() };
  if (Array.isArray(value)) return value.map(toExtendedJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, toExtendedJson(entry)]));
};
var saveJsonRecords = async (path, records) => {
  const tempPath = `${path}.${process.pid}.tmp`;
  try {
    await writeFile(tempPath, `${JSON.stringify(toExtendedJson(records), null, 2)}
`, "utf8");
    await rename(tempPath, path);
  } catch (error) {
    await unlink(tempPath).catch(() => void 0);
    throw error;
  }
};
var RISEUP_SPEAKER_COLUMNS = [
  "speaker",
  "linkedin",
  "role",
  "organisation",
  "profile",
  "specialty",
  "biography",
  "sessions",
  "source",
  "record"
];
var DEFAULT_RISEUP_SPEAKER_PREFERENCE = {
  columnOrder: [...RISEUP_SPEAKER_COLUMNS],
  sort: { direction: "asc", field: "speaker" },
  updatedAt: null
};
var isRiseUpSpeakerColumn = (value) => typeof value === "string" && RISEUP_SPEAKER_COLUMNS.includes(value);
var normaliseRiseUpSpeakerPreference = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_RISEUP_SPEAKER_PREFERENCE;
  const record = value;
  const requestedOrder = Array.isArray(record.columnOrder) ? record.columnOrder : [];
  const seen = /* @__PURE__ */ new Set();
  const columnOrder = requestedOrder.flatMap((column) => {
    if (!isRiseUpSpeakerColumn(column) || seen.has(column)) return [];
    seen.add(column);
    return [column];
  });
  columnOrder.push(...RISEUP_SPEAKER_COLUMNS.filter((column) => !seen.has(column)));
  const requestedSort = record.sort && typeof record.sort === "object" && !Array.isArray(record.sort) ? record.sort : {};
  const field = isRiseUpSpeakerColumn(requestedSort.field) ? requestedSort.field : DEFAULT_RISEUP_SPEAKER_PREFERENCE.sort.field;
  const direction = requestedSort.direction === "asc" || requestedSort.direction === "desc" ? requestedSort.direction : DEFAULT_RISEUP_SPEAKER_PREFERENCE.sort.direction;
  return {
    columnOrder,
    sort: { direction, field },
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : null
  };
};
var loadTablePreferences = async () => {
  try {
    const parsed = JSON.parse(await readFile(TABLE_PREFERENCES_FILE, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, normaliseRiseUpSpeakerPreference(value)])
    );
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
};
var tablePreferenceWriteQueue = Promise.resolve();
var saveTablePreference = async (tableId, preference) => {
  const operation = tablePreferenceWriteQueue.then(async () => {
    const store = await loadTablePreferences();
    store[tableId] = preference;
    const tempPath = `${TABLE_PREFERENCES_FILE}.${process.pid}.tmp`;
    try {
      await writeFile(tempPath, `${JSON.stringify(store, null, 2)}
`, "utf8");
      await rename(tempPath, TABLE_PREFERENCES_FILE);
    } catch (error) {
      await unlink(tempPath).catch(() => void 0);
      throw error;
    }
  });
  tablePreferenceWriteQueue = operation.catch(() => void 0);
  await operation;
};
var companyRecords = [];
var roundRecords = [];
var companyById = /* @__PURE__ */ new Map();
var roundsByCompanyId = /* @__PURE__ */ new Map();
var companySchema = [];
var indexDataPromise = null;
var idString = (value) => value instanceof FileObjectId ? value.value : String(value ?? "");
var ensureIndexData = () => {
  if (!indexDataPromise) {
    indexDataPromise = (async () => {
      try {
        const [companies, rounds] = await Promise.all([
          loadJsonRecords(DATA_FILES.companies),
          loadJsonRecords(DATA_FILES.rounds)
        ]);
        companyRecords = companies;
        roundRecords = rounds;
        companyById.clear();
        for (const company of companyRecords) {
          companyById.set(idString(company._id), company);
        }
        roundsByCompanyId.clear();
        for (const round of roundRecords) {
          const companyId = idString(round.companyId);
          const companyRounds = roundsByCompanyId.get(companyId) ?? [];
          companyRounds.push(round);
          roundsByCompanyId.set(companyId, companyRounds);
        }
        companySchema = getCompanySchema();
      } catch (error) {
        console.error("Failed to load index data", {
          cwd: process.cwd(),
          vercel: Boolean(process.env.VERCEL),
          companies: DATA_FILES.companies,
          rounds: DATA_FILES.rounds,
          error
        });
        throw error;
      }
    })();
  }
  return indexDataPromise;
};
var jsonWriteQueues = {
  companies: Promise.resolve(),
  rounds: Promise.resolve()
};
var IMMUTABLE_JSON_FIELDS = /* @__PURE__ */ new Set(["_id", "companyId", "slug"]);
var coerceJsonCellValue = (records, field, value) => {
  if (value === null) return null;
  const sample = records.map((record) => record[field]).find((entry) => entry !== null && entry !== void 0);
  if (sample instanceof FileObjectId) throw new Error("ObjectId fields cannot be edited.");
  if (sample instanceof Date) {
    if (typeof value !== "string") throw new Error("Expected an ISO date value.");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error("The date value is invalid.");
    return date;
  }
  if (typeof sample === "number") {
    const number = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(number)) throw new Error("Expected a finite number.");
    return number;
  }
  if (typeof sample === "boolean") {
    if (typeof value !== "boolean") throw new Error("Expected true or false.");
    return value;
  }
  if (typeof sample === "string") {
    if (typeof value !== "string") throw new Error("Expected text.");
    return value;
  }
  if (Array.isArray(sample)) {
    if (!Array.isArray(value)) throw new Error("Expected a JSON array.");
    return value;
  }
  if (sample && typeof sample === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a JSON object.");
    return value;
  }
  if (["string", "number", "boolean"].includes(typeof value) || value === null || Array.isArray(value) || value && typeof value === "object") return value;
  throw new Error("That value cannot be stored in the file.");
};
var saveJsonCell = async (collection, recordId, field, value) => {
  const records = collection === "companies" ? companyRecords : roundRecords;
  const operation = jsonWriteQueues[collection].then(async () => {
    if (!field || IMMUTABLE_JSON_FIELDS.has(field)) throw new Error("That identity field is read-only.");
    if (!records.some((record2) => Object.prototype.hasOwnProperty.call(record2, field))) throw new Error("That file field does not exist.");
    const record = records.find((candidate) => idString(candidate._id) === recordId);
    if (!record) return void 0;
    const previousValue = record[field];
    const nextValue = coerceJsonCellValue(records, field, value);
    record[field] = nextValue;
    try {
      await saveJsonRecords(DATA_FILES[collection], records);
    } catch (error) {
      record[field] = previousValue;
      throw error;
    }
    return nextValue;
  });
  jsonWriteQueues[collection] = operation.then(() => void 0, () => void 0);
  return operation;
};
var app = new Hono();
app.use("/api/*", async (context, next) => {
  try {
    await ensureIndexData();
  } catch (error) {
    return context.json({
      error: "Failed to load index data",
      detail: error instanceof Error ? error.message : String(error),
      cwd: process.cwd()
    }, 500);
  }
  await next();
});
var escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var hasOwn = (record, field) => Object.prototype.hasOwnProperty.call(record, field);
var asNumber = (value) => typeof value === "number" && Number.isFinite(value) ? value : 0;
var asString = (value) => typeof value === "string" ? value : "";
var comparableValue = (value) => {
  if (value instanceof Date) return value.getTime();
  if (value instanceof FileObjectId) return value.value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return null;
};
var compareValues = (left, right) => {
  const leftValue = comparableValue(left);
  const rightValue = comparableValue(right);
  if (leftValue === rightValue) return 0;
  if (leftValue === null) return -1;
  if (rightValue === null) return 1;
  if (typeof leftValue === "number" && typeof rightValue === "number") return leftValue - rightValue;
  if (typeof leftValue === "boolean" && typeof rightValue === "boolean") return Number(leftValue) - Number(rightValue);
  return String(leftValue).localeCompare(String(rightValue));
};
var sortRecords = (records, spec) => [...records].sort((left, right) => {
  for (const [field, direction] of spec) {
    const comparison = compareValues(left[field], right[field]);
    if (comparison !== 0) return comparison * direction;
  }
  return 0;
});
var pick = (record, fields) => Object.fromEntries(
  fields.filter((field) => hasOwn(record, field)).map((field) => [field, record[field]])
);
var omit = (record, fields) => Object.fromEntries(
  Object.entries(record).filter(([field]) => !fields.includes(field))
);
var SOFTWARE_COMPANY_FILES = {
  curated: resolve(PROJECT_ROOT, "assets/companies/software-companies-middle-east.csv"),
  review: resolve(PROJECT_ROOT, "assets/companies/software-companies-non-middle-east-review.csv")
};
var SOFTWARE_COMPANY_FLAG_COLUMNS = ["fit", "reviewed"];
var softwareCompanyRowKey = (row) => JSON.stringify([
  row.source ?? "",
  row.linkedin_company_url ?? "",
  row.id ?? "",
  row.company_name ?? ""
]);
var softwareCompanyColumns = (columns) => {
  const next = [...columns];
  let insertIndex = Math.max(0, next.indexOf("source") + 1);
  SOFTWARE_COMPANY_FLAG_COLUMNS.forEach((column) => {
    const currentIndex = next.indexOf(column);
    if (currentIndex >= 0) {
      insertIndex = currentIndex + 1;
      return;
    }
    next.splice(insertIndex, 0, column);
    insertIndex += 1;
  });
  return next;
};
var loadSoftwareCompanyCsv = async () => {
  const input = await readFile(SOFTWARE_COMPANY_FILES.curated, "utf8");
  const rows = csvParse(input.replace(/^\uFEFF/, ""));
  return {
    bom: input.startsWith("\uFEFF"),
    columns: softwareCompanyColumns(rows.columns),
    newline: input.includes("\r\n") ? "\r\n" : "\n",
    rows
  };
};
var saveSoftwareCompanyCsv = async ({
  bom,
  columns,
  newline,
  rows
}) => {
  const tempPath = `${SOFTWARE_COMPANY_FILES.curated}.${process.pid}.tmp`;
  const output = csvFormat(rows, columns).replace(/\n/g, newline);
  try {
    await writeFile(tempPath, `${bom ? "\uFEFF" : ""}${output}${newline}`, "utf8");
    await rename(tempPath, SOFTWARE_COMPANY_FILES.curated);
  } catch (error) {
    await unlink(tempPath).catch(() => void 0);
    throw error;
  }
};
var softwareCompanyWriteQueue = Promise.resolve();
var saveSoftwareCompanyFlag = async (rowKey, flag, value) => {
  const operation = softwareCompanyWriteQueue.then(async () => {
    const curated = await loadSoftwareCompanyCsv();
    const row = curated.rows.find((candidate) => softwareCompanyRowKey(candidate) === rowKey);
    if (!row) return false;
    row[flag] = value ? "true" : "false";
    await saveSoftwareCompanyCsv(curated);
    return true;
  });
  softwareCompanyWriteQueue = operation.then(() => void 0, () => void 0);
  return operation;
};
var saveSoftwareCompanyCell = async (rowKey, field, value) => {
  const operation = softwareCompanyWriteQueue.then(async () => {
    const curated = await loadSoftwareCompanyCsv();
    if (!field || field === "__rowKey" || !curated.columns.includes(field)) throw new Error("That CSV column is read-only.");
    if (field === "source" && !["linkedin", "kattch"].includes(value)) throw new Error("Source must be linkedin or kattch.");
    const row = curated.rows.find((candidate) => softwareCompanyRowKey(candidate) === rowKey);
    if (!row) return null;
    row[field] = value;
    const nextRowKey = softwareCompanyRowKey(row);
    await saveSoftwareCompanyCsv(curated);
    return { rowKey: nextRowKey, value };
  });
  softwareCompanyWriteQueue = operation.then(() => void 0, () => void 0);
  return operation;
};
var VALID_LINKS_FILE = resolve(PROJECT_ROOT, "valid links.json");
var crunchbasePermalinkFromUrl = (url) => {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("crunchbase.com")) return "";
    const match = parsed.pathname.match(/^\/organization\/([^/]+)\/?$/i);
    return match ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
};
var organizationLabelFromPermalink = (permalink) => {
  if (!permalink) return "";
  return permalink.split(/[-_]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
};
var loadValidLinks = async () => {
  const parsed = JSON.parse(await readFile(VALID_LINKS_FILE, "utf8"));
  if (!Array.isArray(parsed)) throw new Error("Expected a JSON array in valid links.json");
  const items = parsed.flatMap((value, index) => {
    if (typeof value !== "string") return [];
    const url = value.trim();
    if (!url) return [];
    const permalink = crunchbasePermalinkFromUrl(url);
    return [{
      __rowId: String(index),
      organization: organizationLabelFromPermalink(permalink) || permalink || url,
      permalink,
      url
    }];
  });
  return {
    items,
    summary: {
      total: items.length,
      unique: new Set(items.map((item) => item.url)).size
    },
    source: "valid links.json"
  };
};
var NEWSLETTER_RESEARCH_FILE = resolve(PROJECT_ROOT, "assets/newsletter-research.csv");
var NEWSLETTER_FIELD_COLUMNS = {
  newsletter: "Newsletter",
  segment: "Segment",
  geography: "Geography",
  postFocus: "Post Focus & Examples",
  similarity: "Similarity to Eign",
  menaRelevance: "MENA Relevance",
  howEignCanUseIt: "How Eign Can Use It",
  whatEignCanLearn: "What Eign Can Learn",
  website: "Website",
  linkedin: "LinkedIn",
  linkedinFollowers: "LinkedIn Followers",
  linkedinEmployeeRange: "LinkedIn Employee Range",
  linkedinMetricsStatus: "LinkedIn Metrics Status",
  linkedinMetricsObservedAt: "LinkedIn Metrics Observed At"
};
var loadNewsletterCsv = async () => {
  const input = await readFile(NEWSLETTER_RESEARCH_FILE, "utf8");
  const rows = csvParse(input.replace(/^\uFEFF/, ""));
  return {
    bom: input.startsWith("\uFEFF"),
    columns: rows.columns,
    newline: input.includes("\r\n") ? "\r\n" : "\n",
    rows
  };
};
var saveNewsletterCsv = async ({
  bom,
  columns,
  newline,
  rows
}) => {
  const tempPath = `${NEWSLETTER_RESEARCH_FILE}.${process.pid}.tmp`;
  const output = csvFormat(rows, columns).replace(/\n/g, newline);
  try {
    await writeFile(tempPath, `${bom ? "\uFEFF" : ""}${output}${newline}`, "utf8");
    await rename(tempPath, NEWSLETTER_RESEARCH_FILE);
  } catch (error) {
    await unlink(tempPath).catch(() => void 0);
    throw error;
  }
};
var newsletterWriteQueue = Promise.resolve();
var saveNewsletterCell = async (rowId, field, value) => {
  const operation = newsletterWriteQueue.then(async () => {
    const newsletterCsv = await loadNewsletterCsv();
    const rowIndex = Number(rowId);
    const row = Number.isInteger(rowIndex) ? newsletterCsv.rows[rowIndex] : void 0;
    if (!row) return false;
    row[NEWSLETTER_FIELD_COLUMNS[field]] = value === null ? "" : String(value);
    await saveNewsletterCsv(newsletterCsv);
    return true;
  });
  newsletterWriteQueue = operation.then(() => void 0, () => void 0);
  return operation;
};
var influencerRecords = INFLUENCERS.map((influencer) => ({ ...influencer }));
var influencerFollowerSnapshots = INFLUENCERS.map((influencer) => ({
  ...LINKEDIN_FOLLOWERS[influencer.linkedinUrl] ?? { count: null, observedAt: null, status: "not-verified" }
}));
var influencerWriteQueue = Promise.resolve();
var influencerRow = (index) => ({
  ...influencerRecords[index],
  __rowId: String(index),
  follower: influencerFollowerSnapshots[index]
});
var findArrayObjectBounds = (source, marker, targetIndex) => {
  const markerIndex = source.indexOf(marker);
  const assignmentIndex = markerIndex >= 0 ? source.indexOf("= [", markerIndex + marker.length) : -1;
  const arrayStart = assignmentIndex >= 0 ? source.indexOf("[", assignmentIndex) : -1;
  if (arrayStart < 0) return null;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let depth = 0;
  let objectStart = -1;
  let objectIndex = -1;
  for (let index = arrayStart + 1; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") {
      if (depth === 0) {
        objectStart = index;
        objectIndex += 1;
      }
      depth += 1;
      continue;
    }
    if (character === "}") {
      depth -= 1;
      if (depth === 0 && objectIndex === targetIndex) return { start: objectStart, end: index + 1 };
      continue;
    }
    if (character === "]" && depth === 0) break;
  }
  return null;
};
var formatInfluencerRecord = (record) => [
  "{",
  `    name: ${JSON.stringify(record.name)},`,
  `    country: ${JSON.stringify(record.country)},`,
  `    lane: ${JSON.stringify(record.lane)},`,
  `    organisation: ${JSON.stringify(record.organisation)},`,
  `    linkedinUrl: ${JSON.stringify(record.linkedinUrl)},`,
  `    priority: ${record.priority},`,
  `    arabicOrBilingual: ${record.arabicOrBilingual},`,
  "  }"
].join("\n");
var saveInfluencerRecord = async (index, record) => {
  const source = await readFile(INFLUENCER_FILES.directory, "utf8");
  const bounds = findArrayObjectBounds(source, "export const INFLUENCERS", index);
  if (!bounds) throw new Error("The influencer row could not be located in src/influencerData.ts.");
  const tempPath = `${INFLUENCER_FILES.directory}.${process.pid}.tmp`;
  const output = `${source.slice(0, bounds.start)}${formatInfluencerRecord(record)}${source.slice(bounds.end)}`;
  try {
    await writeFile(tempPath, output, "utf8");
    await rename(tempPath, INFLUENCER_FILES.directory);
  } catch (error) {
    await unlink(tempPath).catch(() => void 0);
    throw error;
  }
};
var saveFollowerCount = async (index, count) => {
  const source = await readFile(INFLUENCER_FILES.followers, "utf8");
  const markerIndex = source.indexOf("const FOLLOWER_COUNTS = [");
  const arrayStart = markerIndex >= 0 ? source.indexOf("[", markerIndex) : -1;
  const arrayEnd = arrayStart >= 0 ? source.indexOf("] as const satisfies", arrayStart) : -1;
  if (arrayStart < 0 || arrayEnd < 0) throw new Error("The follower array could not be located in src/linkedinFollowerData.ts.");
  const arraySource = source.slice(arrayStart + 1, arrayEnd);
  const matches = [...arraySource.matchAll(/\b(?:null|\d+)\b/g)];
  const match = matches[index];
  if (!match || match.index === void 0) throw new Error("The follower row could not be located in src/linkedinFollowerData.ts.");
  const valueStart = arrayStart + 1 + match.index;
  const valueEnd = valueStart + match[0].length;
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const nextSource = `${source.slice(0, valueStart)}${count ?? "null"}${source.slice(valueEnd)}`.replace(/export const LINKEDIN_FOLLOWERS_UPDATED_AT = '[^']+' as const/, `export const LINKEDIN_FOLLOWERS_UPDATED_AT = '${today}' as const`);
  const tempPath = `${INFLUENCER_FILES.followers}.${process.pid}.tmp`;
  try {
    await writeFile(tempPath, nextSource, "utf8");
    await rename(tempPath, INFLUENCER_FILES.followers);
  } catch (error) {
    await unlink(tempPath).catch(() => void 0);
    throw error;
  }
};
var INFLUENCER_COUNTRIES = new Set(INFLUENCERS.map((influencer) => influencer.country));
var INFLUENCER_LANES = new Set(INFLUENCERS.map((influencer) => influencer.lane));
var saveInfluencerCell = async (rowId, field, value) => {
  const operation = influencerWriteQueue.then(async () => {
    const index = Number(rowId);
    const current = Number.isInteger(index) ? influencerRecords[index] : void 0;
    if (!current) return null;
    if (field === "followers") {
      const count = value === null || value === "" ? null : Number(value);
      if (count !== null && (!Number.isInteger(count) || count < 0)) throw new Error("Followers must be a non-negative whole number.");
      await saveFollowerCount(index, count);
      influencerFollowerSnapshots[index] = count === null ? { count: null, observedAt: null, status: "not-verified" } : { count, observedAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), status: "observed", precision: "exact", source: "linkedin-profile" };
      return influencerRow(index);
    }
    const next = { ...current };
    if (field === "country") {
      if (typeof value !== "string" || !INFLUENCER_COUNTRIES.has(value)) throw new Error("Choose a supported market.");
      next.country = value;
    } else if (field === "lane") {
      if (typeof value !== "string" || !INFLUENCER_LANES.has(value)) throw new Error("Choose a supported influence lane.");
      next.lane = value;
    } else if (field === "priority" || field === "arabicOrBilingual") {
      if (typeof value !== "boolean") throw new Error("Expected true or false.");
      next[field] = value;
    } else if (["name", "organisation", "linkedinUrl"].includes(field)) {
      if (typeof value !== "string" || !value.trim()) throw new Error("This value cannot be empty.");
      next[field] = value.trim();
    } else {
      throw new Error("That influencer field is read-only.");
    }
    await saveInfluencerRecord(index, next);
    influencerRecords[index] = next;
    return influencerRow(index);
  });
  influencerWriteQueue = operation.then(() => void 0, () => void 0);
  return operation;
};
var normaliseCompanyName = (value) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
var FACET_FIELDS = [
  "acceleratorProgram",
  "businessType",
  "industry",
  "batch",
  "fundingTotalType",
  "fundingHistoryCompleteness",
  "fundingReconciliationStatus",
  "fundingReconciliationMethod"
];
var FIELD_PRIORITY = [
  "name",
  "slug",
  "acceleratorProgram",
  "businessType",
  "industry",
  "batch",
  "totalFundingUsd"
];
var valueType = (value) => {
  if (value === null) return "null";
  if (value instanceof FileObjectId) return "objectId";
  if (value instanceof Date) return "date";
  if (typeof value === "boolean") return "bool";
  if (typeof value === "number") return "double";
  if (typeof value === "string") return "string";
  return "unknown";
};
var normaliseBsonType = (types) => {
  const meaningfulTypes = types.filter((type) => type !== "null" && type !== "missing");
  if (meaningfulTypes.includes("objectId")) return "objectId";
  if (meaningfulTypes.includes("date")) return "date";
  if (meaningfulTypes.includes("bool")) return "boolean";
  if (meaningfulTypes.some((type) => ["double", "int", "long", "decimal"].includes(type))) return "number";
  if (meaningfulTypes.includes("string")) return "string";
  return "unknown";
};
function getCompanySchema() {
  const fieldNames = new Set(companyRecords.flatMap((company) => Object.keys(company)));
  return [...fieldNames].map((name) => {
    const bsonTypes = [...new Set(companyRecords.map((company) => hasOwn(company, name) ? valueType(company[name]) : "missing"))];
    return { name, bsonTypes, type: normaliseBsonType(bsonTypes) };
  }).sort((left, right) => {
    const leftPriority = FIELD_PRIORITY.indexOf(left.name);
    const rightPriority = FIELD_PRIORITY.indexOf(right.name);
    if (leftPriority !== -1 || rightPriority !== -1) {
      if (leftPriority === -1) return 1;
      if (rightPriority === -1) return -1;
      return leftPriority - rightPriority;
    }
    return left.name.localeCompare(right.name);
  });
}
var parseFilterValue = (value, type) => {
  if (type === "number") {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  if (type === "date") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (type === "boolean") return value === "true";
  if (type === "objectId") return /^[a-f\d]{24}$/i.test(value) ? value.toLowerCase() : null;
  return value;
};
var equalsValue = (left, right) => comparableValue(left) === comparableValue(right);
var buildResearchPredicate = (filter, field) => {
  const operator = filter.operator;
  const value = filter.value?.trim() ?? "";
  const secondValue = filter.secondValue?.trim() ?? "";
  const getValue = (record) => record[field.name];
  const compareFieldValue = (record, expected) => {
    const actual = getValue(record);
    if (field.type === "date" && !(actual instanceof Date)) return null;
    if (field.type === "objectId" && !(actual instanceof FileObjectId)) return null;
    if (field.type === "number" && typeof actual !== "number") return null;
    if (field.type === "boolean" && typeof actual !== "boolean") return null;
    if (field.type === "string" && typeof actual !== "string") return null;
    return compareValues(actual, expected);
  };
  if (operator === "exists") return (record) => hasOwn(record, field.name);
  if (operator === "not_exists") return (record) => !hasOwn(record, field.name);
  if (operator === "empty") return (record) => hasOwn(record, field.name) && [null, ""].includes(getValue(record));
  if (operator === "not_empty") return (record) => hasOwn(record, field.name) && ![null, ""].includes(getValue(record));
  if (!value) return null;
  if (["contains", "not_contains", "starts_with", "ends_with"].includes(operator)) {
    const anchorStart = operator === "starts_with" ? "^" : "";
    const anchorEnd = operator === "ends_with" ? "$" : "";
    const regex = new RegExp(`${anchorStart}${escapeRegex(value)}${anchorEnd}`, "i");
    return operator === "not_contains" ? (record) => typeof getValue(record) !== "string" || !regex.test(getValue(record)) : (record) => typeof getValue(record) === "string" && regex.test(getValue(record));
  }
  if (operator === "in") {
    const values = value.split(",").map((item) => parseFilterValue(item.trim(), field.type)).filter((item) => item !== null);
    return values.length ? (record) => values.some((entry) => equalsValue(getValue(record), entry)) : null;
  }
  const parsedValue = parseFilterValue(value, field.type);
  if (parsedValue === null) return null;
  if (operator === "equals") {
    if (field.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value) && parsedValue instanceof Date) {
      const nextDay = new Date(parsedValue);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      return (record) => {
        const startComparison = compareFieldValue(record, parsedValue);
        const endComparison = compareFieldValue(record, nextDay);
        return startComparison !== null && endComparison !== null && startComparison >= 0 && endComparison < 0;
      };
    }
    return (record) => equalsValue(getValue(record), parsedValue);
  }
  if (operator === "not_equals") return (record) => !equalsValue(getValue(record), parsedValue);
  if (operator === "greater_than" || operator === "after") return (record) => (compareFieldValue(record, parsedValue) ?? -1) > 0;
  if (operator === "greater_or_equal") return (record) => (compareFieldValue(record, parsedValue) ?? -1) >= 0;
  if (operator === "less_than" || operator === "before") return (record) => {
    const comparison = compareFieldValue(record, parsedValue);
    return comparison !== null && comparison < 0;
  };
  if (operator === "less_or_equal") return (record) => {
    const comparison = compareFieldValue(record, parsedValue);
    return comparison !== null && comparison <= 0;
  };
  if (operator === "between" && secondValue) {
    const parsedSecondValue = parseFilterValue(secondValue, field.type);
    if (parsedSecondValue !== null) {
      if (field.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(secondValue) && parsedSecondValue instanceof Date) {
        const nextDay = new Date(parsedSecondValue);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        return (record) => {
          const startComparison = compareFieldValue(record, parsedValue);
          const endComparison = compareFieldValue(record, nextDay);
          return startComparison !== null && endComparison !== null && startComparison >= 0 && endComparison < 0;
        };
      }
      return (record) => {
        const lowerComparison = compareFieldValue(record, parsedValue);
        const upperComparison = compareFieldValue(record, parsedSecondValue);
        return lowerComparison !== null && upperComparison !== null && lowerComparison >= 0 && upperComparison <= 0;
      };
    }
  }
  return null;
};
app.use("/api/*", logger());
app.get("/api/health", (context) => context.json({
  status: "ok",
  source: "files",
  files: {
    companies: "eign_index.companies.json",
    rounds: "eign_index.rounds.json"
  },
  records: {
    companies: companyRecords.length,
    rounds: roundRecords.length
  }
}));
app.patch("/api/records/:collection/:recordId", async (context) => {
  const collection = context.req.param("collection");
  if (collection !== "companies" && collection !== "rounds") return context.json({ error: "Unknown file-backed collection." }, 404);
  const body = await context.req.json().catch(() => null);
  if (!body || typeof body.field !== "string" || !Object.prototype.hasOwnProperty.call(body, "value")) {
    return context.json({ error: "Expected a field and value." }, 400);
  }
  try {
    const value = await saveJsonCell(collection, context.req.param("recordId"), body.field, body.value);
    if (value === void 0) return context.json({ error: "The source record no longer exists." }, 404);
    return context.json({ collection, field: body.field, recordId: context.req.param("recordId"), value });
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : "The value could not be saved." }, 400);
  }
});
app.get("/api/software-companies", async (context) => {
  const curated = await loadSoftwareCompanyCsv();
  const items = curated.rows.map((row) => ({
    ...row,
    __rowKey: softwareCompanyRowKey(row),
    fit: row.fit === "false" ? "" : "true",
    reviewed: row.reviewed === "true" ? "true" : "",
    source: row.source === "kattch" ? "kattch" : "linkedin"
  }));
  const linkedinRows = items.filter((row) => row.source === "linkedin");
  const kattchRows = items.filter((row) => row.source === "kattch");
  const linkedinNames = new Set(linkedinRows.map((row) => normaliseCompanyName(row.company_name ?? "")).filter(Boolean));
  const overlappingNames = new Set(
    kattchRows.map((row) => normaliseCompanyName(row.company_name ?? "")).filter((name) => name && linkedinNames.has(name))
  );
  return context.json({
    columns: curated.columns,
    items,
    summary: {
      total: items.length,
      linkedin: linkedinRows.length,
      kattch: kattchRows.length,
      columns: curated.columns.length,
      exactNameOverlaps: overlappingNames.size
    },
    sources: {
      curated: "assets/companies/software-companies-middle-east.csv",
      review: "assets/companies/software-companies-non-middle-east-review.csv"
    }
  });
});
app.patch("/api/software-companies/fit", async (context) => {
  const body = await context.req.json().catch(() => null);
  if (!body || typeof body.fit !== "boolean" || typeof body.rowKey !== "string") {
    return context.json({ error: "Expected a company row key and boolean fit value." }, 400);
  }
  if (!await saveSoftwareCompanyFlag(body.rowKey, "fit", body.fit)) return context.json({ error: "The company row no longer exists in the curated CSV." }, 404);
  return context.json({ fit: body.fit, rowKey: body.rowKey });
});
app.patch("/api/software-companies/reviewed", async (context) => {
  const body = await context.req.json().catch(() => null);
  if (!body || typeof body.reviewed !== "boolean" || typeof body.rowKey !== "string") {
    return context.json({ error: "Expected a company row key and boolean reviewed value." }, 400);
  }
  if (!await saveSoftwareCompanyFlag(body.rowKey, "reviewed", body.reviewed)) return context.json({ error: "The company row no longer exists in the curated CSV." }, 404);
  return context.json({ reviewed: body.reviewed, rowKey: body.rowKey });
});
app.patch("/api/software-companies/cell", async (context) => {
  const body = await context.req.json().catch(() => null);
  if (!body || typeof body.field !== "string" || typeof body.rowKey !== "string" || typeof body.value !== "string") {
    return context.json({ error: "Expected a CSV row key, field, and text value." }, 400);
  }
  try {
    const saved = await saveSoftwareCompanyCell(body.rowKey, body.field, body.value);
    if (!saved) return context.json({ error: "The company row no longer exists in the curated CSV." }, 404);
    return context.json({ field: body.field, ...saved });
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : "The CSV cell could not be saved." }, 400);
  }
});
app.get("/api/influencers", (context) => context.json({
  items: influencerRecords.map((_, index) => influencerRow(index)),
  meta: {
    source: "src/influencerData.ts",
    followerSource: "src/linkedinFollowerData.ts",
    verifiedAt: INFLUENCERS_VERIFIED_AT,
    followersUpdatedAt: LINKEDIN_FOLLOWERS_UPDATED_AT
  }
}));
app.patch("/api/influencers/:rowId", async (context) => {
  const body = await context.req.json().catch(() => null);
  if (!body || typeof body.field !== "string" || !Object.prototype.hasOwnProperty.call(body, "value")) {
    return context.json({ error: "Expected an influencer field and value." }, 400);
  }
  try {
    const item = await saveInfluencerCell(context.req.param("rowId"), body.field, body.value);
    if (!item) return context.json({ error: "The influencer row no longer exists." }, 404);
    return context.json({ item });
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : "The influencer cell could not be saved." }, 400);
  }
});
app.get("/api/valid-links", async (context) => {
  try {
    return context.json(await loadValidLinks());
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : "Unable to load valid links.json." }, 500);
  }
});
app.get("/api/table-preferences/:tableId", async (context) => {
  const tableId = context.req.param("tableId");
  if (tableId !== "riseup-speakers") return context.json({ error: "Unknown table preference ID." }, 404);
  try {
    const store = await loadTablePreferences();
    return context.json({ tableId, ...store[tableId] ?? DEFAULT_RISEUP_SPEAKER_PREFERENCE });
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : "Unable to load table preferences." }, 500);
  }
});
app.put("/api/table-preferences/:tableId", async (context) => {
  const tableId = context.req.param("tableId");
  if (tableId !== "riseup-speakers") return context.json({ error: "Unknown table preference ID." }, 404);
  const body = await context.req.json().catch(() => null);
  if (!body || !Array.isArray(body.columnOrder) || body.columnOrder.length !== RISEUP_SPEAKER_COLUMNS.length) {
    return context.json({ error: "Expected every RiseUp speaker column exactly once." }, 400);
  }
  if (!body.columnOrder.every(isRiseUpSpeakerColumn) || new Set(body.columnOrder).size !== RISEUP_SPEAKER_COLUMNS.length) {
    return context.json({ error: "The RiseUp speaker column order is invalid." }, 400);
  }
  if (!body.sort || typeof body.sort !== "object" || Array.isArray(body.sort)) {
    return context.json({ error: "Expected a RiseUp speaker sort field and direction." }, 400);
  }
  const sort = body.sort;
  if (!isRiseUpSpeakerColumn(sort.field) || sort.direction !== "asc" && sort.direction !== "desc") {
    return context.json({ error: "The RiseUp speaker sort field or direction is invalid." }, 400);
  }
  const preference = {
    columnOrder: body.columnOrder,
    sort: { field: sort.field, direction: sort.direction },
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    await saveTablePreference(tableId, preference);
    return context.json({ tableId, ...preference });
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : "Unable to save table preferences." }, 500);
  }
});
app.get("/api/newsletters", async (context) => {
  const newsletterCsv = await loadNewsletterCsv();
  const items = newsletterCsv.rows.flatMap((row, rowIndex) => {
    const newsletter = row.Newsletter?.trim();
    if (!newsletter) return [];
    const similarity = Number(row["Similarity to Eign"]);
    return [{
      __rowId: String(rowIndex),
      newsletter,
      segment: row.Segment?.trim() ?? "",
      geography: row.Geography?.trim() ?? "",
      postFocus: row["Post Focus & Examples"]?.trim() ?? "",
      similarity: Number.isFinite(similarity) ? similarity : null,
      menaRelevance: row["MENA Relevance"]?.trim() ?? "",
      howEignCanUseIt: row["How Eign Can Use It"]?.trim() ?? "",
      whatEignCanLearn: row["What Eign Can Learn"]?.trim() ?? "",
      website: row.Website?.trim() ?? "",
      linkedin: row.LinkedIn?.trim() ?? "",
      linkedinFollowers: row["LinkedIn Followers"]?.trim() ?? "",
      linkedinEmployeeRange: row["LinkedIn Employee Range"]?.trim() ?? "",
      linkedinMetricsStatus: row["LinkedIn Metrics Status"]?.trim() ?? "",
      linkedinMetricsObservedAt: row["LinkedIn Metrics Observed At"]?.trim() ?? ""
    }];
  });
  return context.json({
    items,
    summary: {
      total: items.length,
      segments: new Set(items.map((item) => item.segment).filter(Boolean)).size,
      geographies: new Set(items.map((item) => item.geography).filter(Boolean)).size,
      highMenaRelevance: items.filter((item) => item.menaRelevance.toLocaleLowerCase() === "high").length,
      closestMatches: items.filter((item) => item.similarity === 5).length,
      linkedin: items.filter((item) => item.linkedin).length,
      linkedinFollowers: items.filter((item) => item.linkedinFollowers).length,
      linkedinEmployeeRanges: items.filter((item) => item.linkedinEmployeeRange).length
    },
    source: "assets/newsletter-research.csv"
  });
});
app.patch("/api/newsletters/:rowId", async (context) => {
  const body = await context.req.json().catch(() => null);
  if (!body || typeof body.field !== "string" || !Object.prototype.hasOwnProperty.call(body, "value")) {
    return context.json({ error: "Expected a newsletter field and value." }, 400);
  }
  if (!(body.field in NEWSLETTER_FIELD_COLUMNS)) return context.json({ error: "That newsletter field is read-only." }, 400);
  if (body.field === "similarity" && body.value !== null && (typeof body.value !== "number" || !Number.isFinite(body.value))) {
    return context.json({ error: "Similarity must be a number or blank." }, 400);
  }
  if (body.field !== "similarity" && typeof body.value !== "string") return context.json({ error: "Expected text." }, 400);
  if (!await saveNewsletterCell(context.req.param("rowId"), body.field, body.value)) {
    return context.json({ error: "The newsletter row no longer exists." }, 404);
  }
  return context.json({ field: body.field, rowId: context.req.param("rowId"), value: body.value });
});
var groupCompanyData = (field, outputField) => {
  const groups = /* @__PURE__ */ new Map();
  for (const company of companyRecords) {
    const name = asString(company[field]) || "Unclassified";
    const current = groups.get(name) ?? { companies: 0, fundingUsd: 0 };
    current.companies += 1;
    current.fundingUsd += asNumber(company.totalFundingUsd);
    groups.set(name, current);
  }
  return [...groups.entries()].sort(([leftName, left], [rightName, right]) => right.companies - left.companies || leftName.localeCompare(rightName)).map(([name, values]) => ({ [outputField]: name, ...values }));
};
app.get("/api/dashboard", (context) => {
  const totalFundingUsd = companyRecords.reduce((sum, company) => sum + asNumber(company.totalFundingUsd), 0);
  const fundedCompanies = companyRecords.filter((company) => asNumber(company.totalFundingUsd) > 0).length;
  const reconciledCompanies = companyRecords.filter((company) => company.fundingReconciliationStatus === "reconciled").length;
  const industries = groupCompanyData("industry", "industry");
  const batches = groupCompanyData("batch", "batch");
  const timelineGroups = /* @__PURE__ */ new Map();
  const stageGroups = /* @__PURE__ */ new Map();
  for (const round of roundRecords) {
    if (round.recordType !== "financing_event") continue;
    const stage = asString(round.roundStage) || "Unspecified";
    const stageGroup = stageGroups.get(stage) ?? { fundingUsd: 0, rounds: 0 };
    stageGroup.rounds += 1;
    stageGroup.fundingUsd += asNumber(round.amountUsd);
    stageGroups.set(stage, stageGroup);
    if (round.announcementDate instanceof Date && typeof round.amountUsd === "number") {
      const month = round.announcementDate.toISOString().slice(0, 7);
      const timelineGroup = timelineGroups.get(month) ?? { fundingUsd: 0, rounds: 0 };
      timelineGroup.rounds += 1;
      timelineGroup.fundingUsd += round.amountUsd;
      timelineGroups.set(month, timelineGroup);
    }
  }
  const timeline = [...timelineGroups.entries()].map(([month, values]) => ({ month, ...values })).sort((left, right) => left.month.localeCompare(right.month));
  const stages = [...stageGroups.entries()].map(([stage, values]) => ({ stage, ...values })).sort((left, right) => right.rounds - left.rounds || left.stage.localeCompare(right.stage));
  const topCompanies = sortRecords(companyRecords, [["totalFundingUsd", -1], ["name", 1]]).slice(0, 8).map((company) => ({
    __recordId: idString(company._id),
    ...pick(company, ["name", "slug", "logoUrl", "industry", "batch", "totalFundingUsd"])
  }));
  const recentRounds = sortRecords(
    roundRecords.filter((round) => round.announcementDate instanceof Date),
    [["announcementDate", -1]]
  ).slice(0, 8).map((round) => {
    const company = companyById.get(idString(round.companyId));
    return {
      __recordId: idString(round._id),
      companyRecordId: company ? idString(company._id) : null,
      companySlug: round.companySlug,
      companyName: company?.name ?? round.companySlug,
      logoUrl: company?.logoUrl,
      round: round.round,
      roundStage: round.roundStage,
      amountUsd: round.amountUsd,
      announcementDate: round.announcementDate
    };
  });
  const updatedAt = companyRecords.reduce((latest, company) => {
    const value = company.updatedAt;
    return value instanceof Date && (!latest || value > latest) ? value : latest;
  }, null);
  return context.json({
    summary: {
      companies: companyRecords.length,
      rounds: roundRecords.length,
      totalFundingUsd,
      fundedCompanies,
      reconciledCompanies,
      updatedAt
    },
    industries,
    batches,
    timeline,
    stages,
    topCompanies,
    recentRounds
  });
});
app.get("/api/visualisations/funding-landscape", (context) => {
  const rows = sortRecords(companyRecords, [["totalFundingUsd", -1], ["name", 1]]);
  const grouped = /* @__PURE__ */ new Map();
  for (const company of rows) {
    const industry = asString(company.industry).trim() || "Unclassified";
    const group = grouped.get(industry) ?? [];
    group.push(company);
    grouped.set(industry, group);
  }
  const individuallyNamedIds = new Set(
    rows.filter((company) => asNumber(company.totalFundingUsd) > 0).slice(0, 80).map((company) => idString(company._id))
  );
  for (const industryRows of grouped.values()) {
    industryRows.filter((company) => asNumber(company.totalFundingUsd) > 0).sort((left, right) => asNumber(right.totalFundingUsd) - asNumber(left.totalFundingUsd)).slice(0, 2).forEach((company) => individuallyNamedIds.add(idString(company._id)));
  }
  const industries = [...grouped.entries()].map(([name, industryRows]) => {
    const sorted = sortRecords(industryRows, [["totalFundingUsd", -1]]);
    const named = sorted.filter((company) => individuallyNamedIds.has(idString(company._id)) && asNumber(company.totalFundingUsd) > 0).map((company) => ({
      name: asString(company.name) || asString(company.slug) || "Unnamed company",
      slug: asString(company.slug) || null,
      logoUrl: asString(company.logoUrl) || null,
      website: asString(company.website) || null,
      fundingUsd: asNumber(company.totalFundingUsd),
      fundingTotalType: asString(company.fundingTotalType) || "Recorded total",
      primaryFundingBasis: asString(company.primaryFundingBasis) || "Funding evidence on file"
    }));
    const remainder = sorted.filter((company) => !individuallyNamedIds.has(idString(company._id)));
    const remainderFundingUsd = remainder.reduce((sum, company) => sum + asNumber(company.totalFundingUsd), 0);
    if (remainder.length && remainderFundingUsd > 0) {
      named.push({
        name: `Other ${remainder.length} companies`,
        slug: null,
        logoUrl: null,
        website: null,
        fundingUsd: remainderFundingUsd,
        fundingTotalType: "Aggregated remainder",
        primaryFundingBasis: "Sum of remaining company totals",
        aggregatedCompanyCount: remainder.length
      });
    }
    return {
      name,
      companyCount: industryRows.length,
      fundingUsd: industryRows.reduce((sum, company) => sum + asNumber(company.totalFundingUsd), 0),
      companies: named
    };
  }).filter((industry) => industry.fundingUsd > 0).sort((left, right) => right.fundingUsd - left.fundingUsd);
  const totalFundingUsd = rows.reduce((sum, company) => sum + asNumber(company.totalFundingUsd), 0);
  const fundedCompanyCount = rows.filter((company) => asNumber(company.totalFundingUsd) > 0).length;
  const namedCompanyCount = industries.reduce(
    (sum, industry) => sum + industry.companies.filter((company) => !company.aggregatedCompanyCount).length,
    0
  );
  return context.json({
    summary: {
      companyCount: rows.length,
      fundedCompanyCount,
      totalFundingUsd,
      namedCompanyCount,
      aggregatedCompanyCount: rows.length - namedCompanyCount
    },
    industries
  });
});
var sortOptions = {
  funding_desc: [["totalFundingUsd", -1], ["name", 1]],
  funding_asc: [["totalFundingUsd", 1], ["name", 1]],
  name_asc: [["name", 1]],
  name_desc: [["name", -1]]
};
app.get("/api/companies", (context) => {
  const query = context.req.query();
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(5, Number.parseInt(query.limit ?? "15", 10) || 15));
  const search = query.q?.trim().slice(0, 80).toLocaleLowerCase();
  const matched = companyRecords.filter((company) => {
    if (search && !["name", "slug", "summary"].some((field) => asString(company[field]).toLocaleLowerCase().includes(search))) return false;
    if (query.industry && company.industry !== query.industry) return false;
    if (query.batch && company.batch !== query.batch) return false;
    return true;
  });
  const sorted = sortRecords(matched, sortOptions[query.sort ?? "funding_desc"] ?? sortOptions.funding_desc);
  const items = sorted.slice((page - 1) * limit, page * limit).map((company) => {
    const companyRounds = sortRecords(roundsByCompanyId.get(idString(company._id)) ?? [], [
      ["announcementDate", -1],
      ["createdAt", -1]
    ]);
    const latestRound = companyRounds[0];
    return {
      __recordId: idString(company._id),
      ...pick(company, [
        "name",
        "slug",
        "logoUrl",
        "industry",
        "businessType",
        "batch",
        "totalFundingUsd",
        "fundingTotalType",
        "fundingReconciliationStatus",
        "summary",
        "website"
      ]),
      roundCount: companyRounds.length,
      ...latestRound ? { latestRound: pick(latestRound, ["amountUsd", "announcementDate", "roundStage"]) } : {}
    };
  });
  return context.json({
    items,
    pagination: {
      page,
      limit,
      total: matched.length,
      pages: Math.max(1, Math.ceil(matched.length / limit))
    }
  });
});
app.get("/api/companies/:slug", (context) => {
  const company = companyRecords.find((record) => record.slug === context.req.param("slug"));
  if (!company) return context.json({ error: "Company not found" }, 404);
  const companyRounds = sortRecords(roundsByCompanyId.get(idString(company._id)) ?? [], [
    ["announcementDate", -1],
    ["amountUsd", -1]
  ]).map((round) => ({
    __recordId: idString(round._id),
    ...omit(round, ["_id", "companyId", "notionId", "createdAt", "updatedAt"])
  }));
  return context.json({
    company: { __recordId: idString(company._id), ...omit(company, ["_id", "notionId"]) },
    rounds: companyRounds
  });
});
app.get("/api/research/schema", (context) => {
  const facetEntries = FACET_FIELDS.map((field) => {
    const values = /* @__PURE__ */ new Set();
    for (const company of companyRecords) {
      const value = company[field];
      if (Array.isArray(value)) value.forEach((entry) => values.add(String(entry)));
      else if (value !== null && value !== void 0 && value !== "") values.add(String(value));
    }
    return [field, [...values].sort((left, right) => left.localeCompare(right))];
  });
  return context.json({
    collection: "companies",
    fields: companySchema,
    facets: Object.fromEntries(facetEntries)
  });
});
app.post("/api/research/companies/query", async (context) => {
  const body = await context.req.json().catch(() => ({}));
  const fieldMap = new Map(companySchema.map((field) => [field.name, field]));
  const page = Math.max(1, Math.floor(Number(body.page) || 1));
  const limit = Math.min(100, Math.max(10, Math.floor(Number(body.limit) || 25)));
  const filters = Array.isArray(body.filters) ? body.filters.slice(0, 30) : [];
  const predicates = filters.map((filter) => {
    const field = fieldMap.get(filter.field);
    return field ? buildResearchPredicate(filter, field) : null;
  }).filter((predicate) => predicate !== null);
  const search = body.search?.trim().slice(0, 120);
  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    const textFields = companySchema.filter((field) => field.type === "string").map((field) => field.name);
    predicates.push((record) => textFields.some((field) => typeof record[field] === "string" && regex.test(record[field])));
  }
  const matched = companyRecords.filter((record) => predicates.every((predicate) => predicate(record)));
  const sortField = body.sortField && fieldMap.has(body.sortField) ? body.sortField : "name";
  const sortDirection = body.sortDirection === "desc" ? -1 : 1;
  const items = sortRecords(matched, [[sortField, sortDirection], ["_id", 1]]).slice((page - 1) * limit, page * limit).map((record) => ({ ...record, __recordId: idString(record._id) }));
  return context.json({
    items,
    pagination: {
      page,
      limit,
      total: matched.length,
      pages: Math.max(1, Math.ceil(matched.length / limit))
    },
    fieldCount: companySchema.length,
    appliedFilterCount: predicates.length
  });
});
app.onError((error, context) => {
  console.error(error);
  return context.json({ error: "The local file data service could not complete this request." }, 500);
});

// api/vercel-handler.ts
var handle = (request) => app.fetch(request);
var GET = handle;
var HEAD = handle;
var POST = handle;
var PUT = handle;
var PATCH = handle;
var DELETE = handle;
var OPTIONS = handle;
export {
  DELETE,
  GET,
  HEAD,
  OPTIONS,
  PATCH,
  POST,
  PUT
};
