import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { UnifiedPeopleFile, UnifiedPerson } from '../src/unifiedPeopleTypes'

type FollowerSeed = {
  count: number
  observedAt: string
  precision: 'exact' | 'rounded'
  source: 'linkedin-profile' | 'search-index'
  note: string
}

type PersonSeed = {
  city: string | null
  country: string
  countryCode: string
  firm: string
  followers?: FollowerSeed
  leadershipSource: string
  linkedin?: string
  name: string
  role: string
}

const DIRECT_OBSERVED_AT = '2026-08-30'
const SEARCH_OBSERVED_AT = '2026-08-31'
const CURRENT_SEARCH_OBSERVED_AT = '2026-09-01'
const direct = (count: number): FollowerSeed => ({
  count,
  observedAt: DIRECT_OBSERVED_AT,
  precision: 'exact',
  source: 'linkedin-profile',
  note: 'Exact count captured from the LinkedIn profile surface.',
})
const exactSearch = (count: number): FollowerSeed => ({
  count,
  observedAt: SEARCH_OBSERVED_AT,
  precision: 'exact',
  source: 'search-index',
  note: 'Exact count exposed by a LinkedIn profile card in the search index.',
})
const roundedSearch = (count: number): FollowerSeed => ({
  count,
  observedAt: SEARCH_OBSERVED_AT,
  precision: 'rounded',
  source: 'search-index',
  note: 'Rounded count exposed by LinkedIn in the search index; stored as the displayed rounded value.',
})
const directAt = (count: number, observedAt: string): FollowerSeed => ({
  count,
  observedAt,
  precision: 'exact',
  source: 'linkedin-profile',
  note: 'Exact count captured from the LinkedIn profile surface.',
})
const exactSearchAt = (count: number, observedAt: string): FollowerSeed => ({
  count,
  observedAt,
  precision: 'exact',
  source: 'search-index',
  note: 'Exact count exposed by a LinkedIn profile card in the search index.',
})
const roundedCurrentSearch = (count: number): FollowerSeed => ({
  count,
  observedAt: CURRENT_SEARCH_OBSERVED_AT,
  precision: 'rounded',
  source: 'search-index',
  note: 'Rounded count exposed by LinkedIn in the current search index; stored as the displayed rounded value.',
})

const sources = {
  '500 Global MENA': 'https://500.co/team',
  'Algebra Ventures': 'https://algebraventures.com/',
  'BECO Capital': 'https://www.becocapital.com/team/',
  'COTU Ventures': 'https://www.cotu.vc/about-1',
  'DisrupTech Ventures': 'https://www.disruptechventures.com/team',
  'Disrupt.com': 'https://www.disrupt.com/team',
  'Endure Capital': 'https://endure.capital/',
  'Exits MENA': 'https://naqla.exits.me/home.html',
  'Flat6Labs': 'https://www.flat6labs.com/',
  'Foundation Ventures': 'https://www.foundationventures.com/',
  'Global Ventures': 'https://www.global.vc/',
  'Impact46': 'https://impact46.sa/team-2/',
  'Iliad Partners': 'https://www.iliad-partners.com/investment-team',
  'Khwarizmi Ventures': 'https://www.khwarizmivc.com/team',
  'MEVP': 'https://mevp.com/team',
  'Nama Ventures': 'https://www.namaventures.com/team/',
  'Nuwa Capital': 'https://www.nuwacapital.io/who-we-are',
  'Plus VC': 'https://plus.vc/team',
  'RAED Ventures': 'https://raed.vc/about/',
  'Rasmal Ventures': 'https://www.linkedin.com/company/rasmal-ventures/',
  'Sawari Ventures': 'https://sawariventures.com/people/',
  'SEEDRA Ventures': 'https://seedra.com/team/',
  'STV': 'https://stv.vc/team',
  'Shorooq': 'https://www.shorooq.com/team',
  'Sukna Ventures': 'https://suknaventures.com/team',
  'VentureSouq': 'https://www.venturesouq.com/team',
  'Wa’ed Ventures': 'https://www.waed.com/',
  'Wamda Capital': 'https://wamdacapital.com/team/',
  'Arzan Venture Capital': 'https://arzan.com.kw/en/arzan-venture-capital/',
  'BY Venture Partners': 'https://www.byvp.com/',
  'e& capital': 'https://www.eand.com/en/capital.html',
} as const

const ranks: Record<string, number | null> = {
  'BECO Capital': 1,
  'STV': 2,
  'RAED Ventures': 3,
  'Shorooq': 4,
  'Wa’ed Ventures': 5,
  'Global Ventures': 6,
  'Impact46': 7,
  'MEVP': 8,
  'Nuwa Capital': 9,
  'e& capital': 10,
  'Algebra Ventures': 11,
  '500 Global MENA': null,
  'Flat6Labs': null,
  'VentureSouq': null,
  'Wamda Capital': null,
  'COTU Ventures': null,
  'DisrupTech Ventures': null,
  'Disrupt.com': null,
  'Endure Capital': null,
  'Exits MENA': null,
  'Foundation Ventures': null,
  'Iliad Partners': null,
  'Khwarizmi Ventures': null,
  'Nama Ventures': null,
  'Plus VC': null,
  'Rasmal Ventures': null,
  'Sawari Ventures': null,
  'SEEDRA Ventures': null,
  'Sukna Ventures': null,
  'Arzan Venture Capital': null,
  'BY Venture Partners': null,
}

const people: PersonSeed[] = [
  { name: 'Dany Farha', role: 'Co-founder & Managing Partner', firm: 'BECO Capital', linkedin: 'https://www.linkedin.com/in/danyfarha', followers: direct(6226), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['BECO Capital'] },
  { name: 'Abdulaziz Shikh Al Sagha', role: 'Partner', firm: 'BECO Capital', linkedin: 'https://www.linkedin.com/in/abdulaziz-shikh-al-sagha-92516934/', followers: roundedSearch(2000), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['BECO Capital'] },
  { name: 'Amer Alaily', role: 'Partner', firm: 'BECO Capital', linkedin: 'https://ae.linkedin.com/in/amer-alaily-8793844', followers: roundedSearch(1000), country: 'United Arab Emirates', countryCode: 'AE', city: null, leadershipSource: sources['BECO Capital'] },

  { name: 'Abdulrahman Tarabzouni', role: 'Founder & CEO', firm: 'STV', linkedin: 'https://www.linkedin.com/in/aitmit', followers: direct(22808), country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources.STV },
  { name: 'Ahmad AlNaimi', role: 'Partner', firm: 'STV', linkedin: 'https://www.linkedin.com/in/ahmadalnaimi', followers: roundedSearch(2000), country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources.STV },
  { name: 'Mazin Alzaidi', role: 'Partner', firm: 'STV', linkedin: 'https://www.linkedin.com/in/mazinalzaidi/', followers: exactSearch(3728), country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources.STV },

  { name: 'Omar A. Almajdouie', role: 'Founding Partner', firm: 'RAED Ventures', linkedin: 'https://www.linkedin.com/in/omaralmajdouie', followers: direct(22224), country: 'Saudi Arabia', countryCode: 'SA', city: 'Dammam', leadershipSource: sources['RAED Ventures'] },
  { name: 'Saed Nashef', role: 'Founding Partner', firm: 'RAED Ventures', linkedin: 'https://www.linkedin.com/in/saednashef', followers: roundedSearch(6000), country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources['RAED Ventures'] },
  { name: 'Talal Alasmari', role: 'Founding Partner', firm: 'RAED Ventures', linkedin: 'https://www.linkedin.com/in/talalasmari', followers: roundedSearch(11000), country: 'Saudi Arabia', countryCode: 'SA', city: null, leadershipSource: sources['RAED Ventures'] },

  { name: 'Mahmoud Adi', role: 'Founding Partner', firm: 'Shorooq', linkedin: 'https://www.linkedin.com/in/m-adi', followers: direct(41578), country: 'United Arab Emirates', countryCode: 'AE', city: 'Abu Dhabi', leadershipSource: sources.Shorooq },
  { name: 'Shane Shin', role: 'Founding Partner', firm: 'Shorooq', linkedin: 'https://www.linkedin.com/in/shaneykshin', followers: direct(33326), country: 'United Arab Emirates', countryCode: 'AE', city: 'Abu Dhabi', leadershipSource: sources.Shorooq },
  { name: 'Dr. Bilal Baloch', role: 'Partner', firm: 'Shorooq', linkedin: 'https://www.linkedin.com/in/babaloch/', followers: exactSearch(19969), country: 'United Arab Emirates', countryCode: 'AE', city: 'Abu Dhabi', leadershipSource: sources.Shorooq },

  { name: 'Anas Algahtani', role: 'CEO', firm: 'Wa’ed Ventures', linkedin: 'https://sa.linkedin.com/in/anasalgahtani', followers: roundedSearch(5000), country: 'Saudi Arabia', countryCode: 'SA', city: 'Dammam', leadershipSource: sources['Wa’ed Ventures'] },
  { name: 'Muhammad Zeeshan Hassan', role: 'Chief Investment Officer', firm: 'Wa’ed Ventures', linkedin: 'https://sa.linkedin.com/in/muhammad-zeeshan-hassan-95451b22', followers: roundedSearch(11000), country: 'Saudi Arabia', countryCode: 'SA', city: 'Dhahran', leadershipSource: sources['Wa’ed Ventures'] },

  { name: 'Noor Sweid', role: 'Founder & Managing Partner', firm: 'Global Ventures', linkedin: 'https://www.linkedin.com/in/noor-sweid', followers: direct(71414), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['Global Ventures'] },
  { name: 'Medea Nocentini', role: 'Senior Partner', firm: 'Global Ventures', linkedin: 'https://ae.linkedin.com/in/medeanocentini', followers: roundedSearch(15000), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['Global Ventures'] },
  { name: 'Simon Sharp', role: 'Senior Partner', firm: 'Global Ventures', linkedin: 'https://ae.linkedin.com/in/simon-sharp-1458a645', followers: roundedSearch(8000), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['Global Ventures'] },

  { name: 'Abdulaziz A. Alomran', role: 'CEO, Managing Director & Direct Controller', firm: 'Impact46', linkedin: 'https://www.linkedin.com/in/abdulaziz-al-omran-82029a2', followers: direct(12192), country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources.Impact46 },
  { name: 'Basmah Alsinaidi', role: 'Vice Chairman & Manager of Assets', firm: 'Impact46', linkedin: 'https://sa.linkedin.com/in/basmahalsinaidi', followers: roundedSearch(6000), country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources.Impact46 },

  { name: 'Walid Hanna', role: 'Founder, Chairman & Co-CEO', firm: 'MEVP', linkedin: 'https://www.linkedin.com/in/walid-s-hanna', followers: direct(6825), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources.MEVP },
  { name: 'Walid Mansour', role: 'Co-founder & Co-CEO', firm: 'MEVP', linkedin: 'https://ae.linkedin.com/in/walid-mansour-3246342', followers: exactSearch(21918), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources.MEVP },
  { name: 'Rabih I. Khoury', role: 'General Partner', firm: 'MEVP', linkedin: 'https://www.linkedin.com/in/rabih-i-khoury-mevp/', country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources.MEVP },

  { name: 'Khaled Talhouni', role: 'Managing Partner', firm: 'Nuwa Capital', linkedin: 'https://ae.linkedin.com/in/khaledtalhouni', followers: roundedSearch(25000), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['Nuwa Capital'] },
  { name: 'Sarah Abu Risheh', role: 'Partner', firm: 'Nuwa Capital', linkedin: 'https://www.linkedin.com/in/sarahar9/', country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['Nuwa Capital'] },
  { name: 'Stephanie Nour Prince', role: 'Partner', firm: 'Nuwa Capital', linkedin: 'https://www.linkedin.com/in/stephanienour/', followers: exactSearch(6076), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['Nuwa Capital'] },

  { name: 'Tarek Assaad', role: 'Managing Partner', firm: 'Algebra Ventures', linkedin: 'https://www.linkedin.com/in/tassaad', followers: exactSearch(3746), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Algebra Ventures'] },
  { name: 'Karim Hussein', role: 'Managing Partner', firm: 'Algebra Ventures', linkedin: 'https://www.linkedin.com/in/karimhussein', followers: roundedSearch(3000), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Algebra Ventures'] },
  { name: 'Laila Hassan', role: 'General Partner', firm: 'Algebra Ventures', linkedin: 'https://www.linkedin.com/in/lailaohassan', followers: exactSearch(4095), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Algebra Ventures'] },
  { name: 'Omar Khashaba', role: 'General Partner', firm: 'Algebra Ventures', linkedin: 'https://www.linkedin.com/in/okhashaba', followers: exactSearch(7966), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Algebra Ventures'] },

  { name: 'Amjad Ahmad', role: 'Managing Partner, MENA', firm: '500 Global MENA', linkedin: 'https://www.linkedin.com/in/amjadahmadvc', followers: roundedSearch(9000), country: 'United States', countryCode: 'US', city: 'Washington, D.C.', leadershipSource: sources['500 Global MENA'] },
  { name: 'Amal Dokhan', role: 'Managing Partner, 500 MENA', firm: '500 Global MENA', linkedin: 'https://sa.linkedin.com/in/amaldokhan', followers: direct(16110), country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources['500 Global MENA'] },
  { name: 'Abdulrahman AlJiffry', role: 'Partner', firm: '500 Global MENA', linkedin: 'https://www.linkedin.com/in/abdulrahman-aljiffry-23834738/', followers: roundedSearch(18000), country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources['500 Global MENA'] },

  { name: 'Hany Al-Sonbaty', role: 'Co-founder & Chairman', firm: 'Flat6Labs', linkedin: 'https://eg.linkedin.com/in/hany-al-sonbaty-12274322', followers: direct(3844), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources.Flat6Labs },
  { name: 'Ramez El-Serafy', role: 'Co-founder & General Partner', firm: 'Flat6Labs', linkedin: 'https://eg.linkedin.com/in/ramezm', followers: roundedSearch(11000), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources.Flat6Labs },
  { name: 'Dina el-Shenoufy', role: 'Co-founder & General Partner', firm: 'Flat6Labs', linkedin: 'https://eg.linkedin.com/in/dinaelshenoufy', followers: roundedSearch(4000), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources.Flat6Labs },

  { name: 'Suneel Gokhale', role: 'Co-founder & General Partner', firm: 'VentureSouq', linkedin: 'https://www.linkedin.com/in/suneel-gokhale-73270ba/', country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources.VentureSouq },
  { name: 'Sonia Weymuller', role: 'Co-founder & General Partner', firm: 'VentureSouq', linkedin: 'https://ae.linkedin.com/in/soniaweymuller', followers: direct(5955), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources.VentureSouq },
  { name: 'Tammer Qaddumi', role: 'Co-founder & General Partner', firm: 'VentureSouq', linkedin: 'https://ae.linkedin.com/in/tammer-qaddumi-7b8b96ab', followers: roundedSearch(4000), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources.VentureSouq },

  { name: 'Fadi Ghandour', role: 'Executive Chairman', firm: 'Wamda Capital', linkedin: 'https://www.linkedin.com/in/fadi-ghandour-52353b', followers: direct(747360), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['Wamda Capital'] },
  { name: 'Fares Ghandour', role: 'Partner', firm: 'Wamda Capital', linkedin: 'https://ae.linkedin.com/in/faresghandour', followers: roundedSearch(18000), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['Wamda Capital'] },

  { name: 'Eddy Farhat', role: 'Executive Director', firm: 'e& capital', linkedin: 'https://ae.linkedin.com/in/eddyfarhat', followers: roundedCurrentSearch(8000), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['e& capital'] },
  { name: 'Cecilio Chidiac', role: 'Principal', firm: 'e& capital', linkedin: 'https://ae.linkedin.com/in/cecilio-chidiac-3893929a', followers: roundedCurrentSearch(2000), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['e& capital'] },
  { name: 'Laine Una Melkerte', role: 'Senior Analyst', firm: 'e& capital', linkedin: 'https://ae.linkedin.com/in/lainemelkerte', country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['e& capital'] },
  { name: 'Labeabah AlMheiri', role: 'Senior Analyst', firm: 'e& capital', linkedin: 'https://ae.linkedin.com/in/labeabahalmheiri', followers: exactSearchAt(927, CURRENT_SEARCH_OBSERVED_AT), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['e& capital'] },
  { name: 'Jina Jeehyun Cho', role: 'Senior Manager', firm: 'e& capital', linkedin: 'https://ae.linkedin.com/in/utopiajh', followers: roundedCurrentSearch(1000), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['e& capital'] },

  { name: 'Aaqib Gadit', role: 'Founding Partner', firm: 'Disrupt.com', linkedin: 'https://ae.linkedin.com/in/aaqibgadit', followers: roundedCurrentSearch(10000), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['Disrupt.com'] },
  { name: 'Uzair Gadit', role: 'Founding Partner', firm: 'Disrupt.com', linkedin: 'https://ae.linkedin.com/in/uzairgadit', followers: roundedCurrentSearch(21000), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['Disrupt.com'] },
  { name: 'Umair Gadit', role: 'Founding Partner', firm: 'Disrupt.com', linkedin: 'https://ae.linkedin.com/in/umairgadit', followers: roundedCurrentSearch(9000), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['Disrupt.com'] },
  { name: 'Ali Samir Oosman', role: 'SVP, Strategy, Partnerships & Investments', firm: 'Disrupt.com', linkedin: 'https://ae.linkedin.com/in/ali-samir-oosman', followers: roundedCurrentSearch(15000), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['Disrupt.com'] },
  { name: 'Dr. Jonathan Doerr', role: 'SVP, Venture Building', firm: 'Disrupt.com', linkedin: 'https://ae.linkedin.com/in/dr-jonathan-doerr-60b0a334', followers: roundedCurrentSearch(17000), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['Disrupt.com'] },

  { name: 'Hasan Haider', role: 'Founder & Managing Partner', firm: 'Plus VC', linkedin: 'https://bh.linkedin.com/in/hasanhaider', followers: directAt(31228, '2026-08-28'), country: 'Bahrain', countryCode: 'BH', city: 'Manama', leadershipSource: sources['Plus VC'] },
  { name: 'Zainab Al-Sharif', role: 'Partner', firm: 'Plus VC', linkedin: 'https://www.linkedin.com/in/zainabsalsharif', followers: directAt(12699, '2026-09-01'), country: 'United Arab Emirates', countryCode: 'AE', city: 'Abu Dhabi', leadershipSource: sources['Plus VC'] },
  { name: 'Ibrahim Alhejailan', role: 'Managing Partner', firm: 'Plus VC', country: 'United Arab Emirates', countryCode: 'AE', city: 'Abu Dhabi', leadershipSource: sources['Plus VC'] },
  { name: 'Hani Azzam', role: 'Venture Partner', firm: 'Plus VC', linkedin: 'https://www.linkedin.com/in/hani-azzam-90b5764b', followers: exactSearchAt(10763, CURRENT_SEARCH_OBSERVED_AT), country: 'United States', countryCode: 'US', city: 'Boston', leadershipSource: sources['Plus VC'] },
  { name: 'Nour Allam', role: 'Principal', firm: 'Plus VC', linkedin: 'https://eg.linkedin.com/in/nour-allam', followers: roundedCurrentSearch(4000), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Plus VC'] },
  { name: 'Ali Mahmood', role: 'Executive Director', firm: 'Plus VC', linkedin: 'https://bh.linkedin.com/in/ali-7', followers: exactSearchAt(931, CURRENT_SEARCH_OBSERVED_AT), country: 'Bahrain', countryCode: 'BH', city: 'Manama', leadershipSource: sources['Plus VC'] },

  { name: 'Ahmed El Alfi', role: 'Partner & Chairman', firm: 'Sawari Ventures', linkedin: 'https://www.linkedin.com/in/ahmed-el-alfi-622a204b', followers: direct(6257), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Sawari Ventures'] },
  { name: 'Hany Al-Sonbaty', role: 'Managing Partner', firm: 'Sawari Ventures', linkedin: 'https://www.linkedin.com/in/hany-al-sonbaty-12274322', followers: direct(3844), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Sawari Ventures'] },
  { name: 'Ibrahim Ramadan', role: 'Partner', firm: 'Sawari Ventures', linkedin: 'https://eg.linkedin.com/in/ibramdan', followers: roundedCurrentSearch(3000), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Sawari Ventures'] },
  { name: 'Jennifer Schoeberlein', role: 'Partner, ESG & Impact', firm: 'Sawari Ventures', linkedin: 'https://eg.linkedin.com/in/jennifer-schoeberlein-45428993', followers: exactSearchAt(2556, CURRENT_SEARCH_OBSERVED_AT), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Sawari Ventures'] },
  { name: 'Wael Amin', role: 'Partner', firm: 'Sawari Ventures', linkedin: 'https://eg.linkedin.com/in/waelamin', country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Sawari Ventures'] },
  { name: 'Anta Ndiaye', role: 'Principal', firm: 'Sawari Ventures', linkedin: 'https://sn.linkedin.com/in/anta-ndiaye-922811ba', country: 'Senegal', countryCode: 'SN', city: 'Dakar', leadershipSource: sources['Sawari Ventures'] },
  { name: 'Farah Abd El-Gawad', role: 'Principal', firm: 'Sawari Ventures', linkedin: 'https://eg.linkedin.com/in/farah-abd-el-gawad-80627b9b', followers: roundedCurrentSearch(3000), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Sawari Ventures'] },
  { name: 'Fatima-Zahra Bennani', role: 'Principal', firm: 'Sawari Ventures', linkedin: 'https://fr.linkedin.com/in/fatima-zahra-bennani-a0a9b258', followers: roundedCurrentSearch(9000), country: 'Morocco', countryCode: 'MA', city: 'Casablanca', leadershipSource: sources['Sawari Ventures'] },
  { name: 'Dalia El Mohamady', role: 'Chief Financial Officer', firm: 'Sawari Ventures', country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Sawari Ventures'] },

  { name: 'Christos Mastoras', role: 'Founder & Managing Partner', firm: 'Iliad Partners', linkedin: 'https://ae.linkedin.com/in/christosmastoras', followers: roundedCurrentSearch(11000), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['Iliad Partners'] },
  { name: 'Dalal Al Mutlaq', role: 'Partner', firm: 'Iliad Partners', linkedin: 'https://sa.linkedin.com/in/dalalalmutlaq', followers: roundedCurrentSearch(2000), country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources['Iliad Partners'] },
  { name: 'Pier Armando Vender', role: 'Principal', firm: 'Iliad Partners', linkedin: 'https://ae.linkedin.com/in/pa-vender', followers: exactSearchAt(1758, CURRENT_SEARCH_OBSERVED_AT), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['Iliad Partners'] },

  { name: 'Mohamed Okasha', role: 'Founder & Managing Partner', firm: 'DisrupTech Ventures', linkedin: 'https://eg.linkedin.com/in/mohamed-el-sayed-okasha-056b87a2', followers: direct(4726), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['DisrupTech Ventures'] },
  { name: 'Malek Sultan', role: 'Co-founder & Partner', firm: 'DisrupTech Ventures', linkedin: 'https://www.linkedin.com/in/malek-sultan-58a6441b', followers: exactSearchAt(3078, CURRENT_SEARCH_OBSERVED_AT), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['DisrupTech Ventures'] },
  { name: 'Yehia Abouelwafa', role: 'Partner & Chief Investment Officer', firm: 'DisrupTech Ventures', linkedin: 'https://eg.linkedin.com/in/yehiaabouelwafa', followers: roundedCurrentSearch(6000), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['DisrupTech Ventures'] },

  { name: 'Haitham Alforaih', role: 'Co-founder, CEO & Board Member', firm: 'SEEDRA Ventures', linkedin: 'https://sa.linkedin.com/in/halforaih', followers: roundedCurrentSearch(8000), country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources['SEEDRA Ventures'] },
  { name: 'Abdullah AlMunif', role: 'Co-founder, Partner & Board Member', firm: 'SEEDRA Ventures', linkedin: 'https://sa.linkedin.com/in/abdullahalmunif', followers: roundedCurrentSearch(2000), country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources['SEEDRA Ventures'] },
  { name: 'Waleed Albarrak', role: 'Principal', firm: 'SEEDRA Ventures', linkedin: 'https://sa.linkedin.com/in/waleedalbarrak', followers: roundedCurrentSearch(12000), country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources['SEEDRA Ventures'] },

  { name: 'Waleed A. Alballaa', role: 'Managing Partner', firm: 'Sukna Ventures', linkedin: 'https://www.linkedin.com/in/ballaa', country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources['Sukna Ventures'] },
  { name: 'Mazin Alshanbari', role: 'General Partner', firm: 'Sukna Ventures', linkedin: 'https://www.linkedin.com/in/mazin-alshanbari-41b4b419', country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources['Sukna Ventures'] },
  { name: 'Fares Bardeesi', role: 'Founding Partner', firm: 'Sukna Ventures', linkedin: 'https://sa.linkedin.com/in/fbardeesi', followers: roundedCurrentSearch(2000), country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources['Sukna Ventures'] },

  { name: 'Abdulaziz Al-Turki', role: 'Managing Partner', firm: 'Khwarizmi Ventures', linkedin: 'https://www.linkedin.com/in/abdulaziz-alturki-60b9b9ab', country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources['Khwarizmi Ventures'] },
  { name: 'Arjun Chopra', role: 'Partner', firm: 'Khwarizmi Ventures', linkedin: 'https://uk.linkedin.com/in/arjun-chopra-170146168', followers: roundedCurrentSearch(2000), country: 'United Kingdom', countryCode: 'GB', city: 'London', leadershipSource: sources['Khwarizmi Ventures'] },
  { name: 'Homam Meaddawi', role: 'Partner', firm: 'Khwarizmi Ventures', linkedin: 'https://sa.linkedin.com/in/homam-meaddawi', country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources['Khwarizmi Ventures'] },
  { name: 'Yasser AlKadi', role: 'Founding Partner', firm: 'Khwarizmi Ventures', linkedin: 'https://sa.linkedin.com/in/yasseralkadi', country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources['Khwarizmi Ventures'] },
  { name: 'Dr. Ibrahim Almojel', role: 'Founding Partner', firm: 'Khwarizmi Ventures', linkedin: 'https://sa.linkedin.com/in/almojel', followers: roundedCurrentSearch(8000), country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources['Khwarizmi Ventures'] },

  { name: 'Mohammed Alzubi', role: 'Founder, CEO & Managing Partner', firm: 'Nama Ventures', linkedin: 'https://sa.linkedin.com/in/mohammedalzubi', followers: roundedCurrentSearch(42000), country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources['Nama Ventures'] },
  { name: 'HRH Sultan Bin Fahad Bin Salman Al Saud', role: 'Chairman & General Partner', firm: 'Nama Ventures', country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources['Nama Ventures'] },
  { name: 'Deema Alyahya', role: 'Board Member', firm: 'Nama Ventures', country: 'Saudi Arabia', countryCode: 'SA', city: 'Riyadh', leadershipSource: sources['Nama Ventures'] },

  { name: 'Soumaya Ben Beya', role: 'General Partner', firm: 'Rasmal Ventures', linkedin: 'https://qa.linkedin.com/in/soumaya-ben-beya-dridje-25574466', followers: roundedCurrentSearch(15000), country: 'Qatar', countryCode: 'QA', city: 'Doha', leadershipSource: sources['Rasmal Ventures'] },
  { name: 'Alexander Wiedmer', role: 'Co-Managing Partner', firm: 'Rasmal Ventures', linkedin: 'https://qa.linkedin.com/in/alexwiedmer13061968', followers: directAt(1600, CURRENT_SEARCH_OBSERVED_AT), country: 'Qatar', countryCode: 'QA', city: 'Doha', leadershipSource: sources['Rasmal Ventures'] },
  { name: 'Dr. Shaikha Al-Jabir', role: 'Partner', firm: 'Rasmal Ventures', linkedin: 'https://qa.linkedin.com/in/dr-shaikha-al-jabir-3099971a', followers: roundedCurrentSearch(1000), country: 'Qatar', countryCode: 'QA', city: 'Doha', leadershipSource: sources['Rasmal Ventures'] },

  { name: 'Abdallah Yafi', role: 'Founding Partner', firm: 'BY Venture Partners', linkedin: 'https://ae.linkedin.com/in/abdallah-yafi-aa1642', followers: roundedCurrentSearch(7000), country: 'United Arab Emirates', countryCode: 'AE', city: 'Abu Dhabi', leadershipSource: sources['BY Venture Partners'] },
  { name: 'Ghaith Yafi', role: 'Founding Partner', firm: 'BY Venture Partners', linkedin: 'https://www.linkedin.com/in/gyafi', followers: roundedCurrentSearch(2000), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['BY Venture Partners'] },
  { name: 'Rami El Jisr', role: 'General Partner', firm: 'BY Venture Partners', linkedin: 'https://www.linkedin.com/in/rami-el-jisr-0b74b4', followers: exactSearchAt(1571, CURRENT_SEARCH_OBSERVED_AT), country: 'Switzerland', countryCode: 'CH', city: 'Geneva', leadershipSource: sources['BY Venture Partners'] },
  { name: 'Sohrab Jahanbani', role: 'Partner', firm: 'BY Venture Partners', linkedin: 'https://www.linkedin.com/in/sjahanbani', followers: roundedCurrentSearch(3000), country: 'Portugal', countryCode: 'PT', city: 'Lisbon', leadershipSource: sources['BY Venture Partners'] },
  { name: 'Tara Al Arnaout', role: 'Principal', firm: 'BY Venture Partners', linkedin: 'https://www.linkedin.com/in/tara-arnaout-305035b7', country: 'United Arab Emirates', countryCode: 'AE', city: 'Abu Dhabi', leadershipSource: sources['BY Venture Partners'] },
  { name: 'Maya Moufarek', role: 'Venture Partner', firm: 'BY Venture Partners', linkedin: 'https://www.linkedin.com/in/mmoufarek', followers: roundedCurrentSearch(26000), country: 'United Kingdom', countryCode: 'GB', city: 'London', leadershipSource: sources['BY Venture Partners'] },
  { name: 'Carl Nehme', role: 'Venture Partner', firm: 'BY Venture Partners', linkedin: 'https://www.linkedin.com/in/carl-nehme', followers: roundedCurrentSearch(3000), country: 'United States', countryCode: 'US', city: 'Boston', leadershipSource: sources['BY Venture Partners'] },

  { name: 'Hasan J. Zainal', role: 'Managing Partner', firm: 'Arzan Venture Capital', linkedin: 'https://www.linkedin.com/in/hasanzainal', followers: exactSearchAt(2718, '2026-08-28'), country: 'Kuwait', countryCode: 'KW', city: 'Kuwait City', leadershipSource: sources['Arzan Venture Capital'] },

  { name: 'Mazen Nadim', role: 'Managing Partner', firm: 'Foundation Ventures', country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Foundation Ventures'] },
  { name: 'Omar Barakat', role: 'Founding Partner', firm: 'Foundation Ventures', linkedin: 'https://eg.linkedin.com/in/omar-barakat-7b2469121', followers: roundedCurrentSearch(3000), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Foundation Ventures'] },
  { name: 'Ziyad Hamdy', role: 'Founding Partner', firm: 'Foundation Ventures', linkedin: 'https://eg.linkedin.com/in/ziyad-hamdy', followers: exactSearchAt(814, CURRENT_SEARCH_OBSERVED_AT), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Foundation Ventures'] },

  { name: 'Tarek Fahim', role: 'Founder & Managing Partner', firm: 'Endure Capital', linkedin: 'https://www.linkedin.com/in/tarekfahim', followers: direct(14960), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Endure Capital'] },
  { name: 'Mohamed Noweir', role: 'Partner', firm: 'Endure Capital', linkedin: 'https://ae.linkedin.com/in/mnoweir', country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: 'https://www.linkedin.com/company/endure-capital' },

  { name: 'Mohamed Aboulnaga (Nagaty)', role: 'Co-founder & Executive Chairman', firm: 'Exits MENA', linkedin: 'https://www.linkedin.com/in/nagaty', followers: direct(463063), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Exits MENA'] },
  { name: 'Ayman El Tanbouly', role: 'Co-founder & CEO', firm: 'Exits MENA', linkedin: 'https://eg.linkedin.com/in/ayman-el-tanbouly', followers: roundedCurrentSearch(31000), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Exits MENA'] },
  { name: 'Ahella El Saban', role: 'Co-founder & Vice Executive Chairman', firm: 'Exits MENA', linkedin: 'https://www.linkedin.com/in/ahella888', followers: roundedCurrentSearch(28000), country: 'Egypt', countryCode: 'EG', city: 'Cairo', leadershipSource: sources['Exits MENA'] },

  { name: 'Amir Farha', role: 'General Partner', firm: 'COTU Ventures', linkedin: 'https://www.linkedin.com/in/amirfarha', followers: direct(12300), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['COTU Ventures'] },
  { name: 'Saeed Alajou', role: 'Partner', firm: 'COTU Ventures', linkedin: 'https://ae.linkedin.com/in/saeed-alajou-5b2a2032', followers: roundedSearch(11000), country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', leadershipSource: sources['COTU Ventures'] },
]

const slug = (value: string) => value
  .normalize('NFKD')
  .replace(/[’']/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .toLowerCase()

const toPerson = (seed: PersonSeed): UnifiedPerson => {
  const hasLinkedIn = Boolean(seed.linkedin)
  const followerStatus = seed.followers
    ? seed.followers.precision === 'exact' ? 'observed_exact' : 'observed_rounded'
    : hasLinkedIn ? 'page_count_unavailable' : 'linkedin_profile_unresolved'
  const followerObservationNote = seed.followers?.note
    ?? (hasLinkedIn
      ? 'The profile identity was checked, but LinkedIn did not expose a follower count on an accessible public surface.'
      : 'No LinkedIn profile URL was resolved confidently; the field is intentionally blank for manual completion.')

  return {
    id: `person_${slug(seed.name)}_${slug(seed.firm)}_vc`,
    source_ids: ['middle-east-vc-people'],
    group: null,
    name: {
      display: seed.name,
      title: null,
      passport: null,
      certificate: null,
    },
    current_role: {
      title: seed.role,
      organization: seed.firm,
    },
    location: {
      country: seed.country,
      country_code: seed.countryCode,
      city: seed.city,
      nationality: null,
    },
    biography: `${seed.name} is ${seed.role} at ${seed.firm}, selected for a key investing, firm-building, or executive leadership role in the Middle East VC register.`,
    specialties: ['Venture capital', 'Middle East investing', 'Firm leadership'],
    image: {
      url: null,
      source_path: null,
      alt: seed.name,
    },
    profiles: seed.linkedin ? [{
      platform: 'linkedin',
      url: seed.linkedin,
      verification: 'name-and-organisation',
      followers: seed.followers ? {
        count: seed.followers.count,
        observed_at: seed.followers.observedAt,
        status: 'observed',
        precision: seed.followers.precision,
        source: seed.followers.source,
      } : {
        count: null,
        observed_at: CURRENT_SEARCH_OBSERVED_AT,
        status: 'not-verified',
        precision: null,
        source: null,
      },
    }] : [],
    influence: {
      lane: 'Investor',
      fit: true,
      potential_target: true,
      target: false,
      priority: true,
      middle_eastern: {
        value: true,
        method: 'research-scope',
        reason: 'Selected for senior investment leadership at a Middle East-focused VC.',
        manually_overridden: false,
      },
    },
    event_appearances: [],
    source_records: [{
      source_id: 'middle-east-vc-people',
      record_id: `vc-person:${slug(seed.firm)}:${slug(seed.name)}`,
      source_url: seed.leadershipSource,
      observed_at: CURRENT_SEARCH_OBSERVED_AT,
      verification: hasLinkedIn ? 'current-firm-leadership-and-linkedin-identity' : 'current-firm-leadership',
      raw: {
        firm_rank: ranks[seed.firm],
        firm_name: seed.firm,
        selection_basis: 'Founder, partner, principal, board member, or senior investing, firm-building, or executive leader on current firm materials.',
        leadership_source_url: seed.leadershipSource,
        linkedin_url: seed.linkedin,
        linkedin_verification_status: hasLinkedIn ? 'identity-checked' : 'not-resolved',
        follower_count_status: followerStatus,
        follower_observation_note: followerObservationNote,
        location_basis: 'Current public profile or firm operating location.',
        target: true,
      },
    }],
  }
}

const output: UnifiedPeopleFile = {
  schema_version: 'people.v1',
  generated_at: new Date().toISOString(),
  sources: [{
    id: 'middle-east-vc-people',
    name: 'Middle East VC people research',
    type: 'research',
    url: null,
    source_files: ['assets/people/middle-east-vc-people.json'],
    observed_at: CURRENT_SEARCH_OBSERVED_AT,
    record_count: people.length,
  }],
  stats: {
    source_records: people.length,
    unique_people: people.length,
    multi_source_people: 0,
    duplicate_source_records_collapsed: 0,
  },
  people: people.map(toPerson),
}

const outputPath = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/people/middle-east-vc-people.json')
await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)

console.log(`Wrote ${output.people.length} VC people to ${outputPath}`)
