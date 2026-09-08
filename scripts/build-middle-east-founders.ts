import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type Tier = 1 | 2 | 3

type FounderSeed = {
  companies: string[]
  founderRole: string
  influenceSignal: string
  name: string
  primaryMarket: string
  sector: string
  sourceLabel: string
  sourceUrl: string
  tier: Tier
  whySelected: string
}

type UnifiedPeopleRecord = {
  name?: { display?: string }
  profiles?: Array<{ platform?: string; url?: string }>
}

type UnifiedPeopleFile = {
  people?: UnifiedPeopleRecord[]
}

type LinkedInReviewMatch = {
  confidence: 'high' | 'medium'
  evidence: string
  name: string
  profile_name: string
  source: 'linkedin-public-search' | 'unified-people-alias-match'
  url: string
}

type LinkedInReviewUnresolved = {
  name: string
  reason: string
}

type LinkedInReviewFile = {
  matches: LinkedInReviewMatch[]
  methodology: string
  observed_at: string
  schema_version: string
  unresolved: LinkedInReviewUnresolved[]
}

type FounderRowOverride = Partial<{
  companies: string[]
  editorial_order: number
  founder_role: string
  followers: number | null
  influence_signal: string
  linkedin_url: string | null
  name: string
  primary_market: string
  sector: string
  source_label: string
  source_url: string
  target: boolean
  tier: Tier
  why_selected: string
}>

type FounderEditsFile = {
  rows: Record<string, FounderRowOverride>
  schema_version: 'middle-east-founder-edits.v1'
  updated_at: string | null
}

const GENERATED_AT = new Date().toISOString()
const OBSERVED_AT = '2026-09-01'
const FOUNDER_SOURCE = 'founder-search' as const

const founders: FounderSeed[] = [
  { name: 'Mohamed Alabbar', companies: ['Emaar Properties', 'noon'], primaryMarket: 'United Arab Emirates', sector: 'Real estate & digital commerce', tier: 1, founderRole: 'Founder', whySelected: 'Built two of the region’s defining platforms: a globally recognized urban-development company and a homegrown digital-commerce ecosystem.', influenceSignal: 'Emaar shaped modern Dubai landmarks, while noon created a major GCC alternative in e-commerce and adjacent digital services.', sourceLabel: 'Emaar · founder profile', sourceUrl: 'https://www.emaar.com/en/about-emaar' },
  { name: 'Fadi Ghandour', companies: ['Aramex', 'Wamda'], primaryMarket: 'Jordan / United Arab Emirates', sector: 'Logistics & entrepreneurship ecosystem', tier: 1, founderRole: 'Founder', whySelected: 'Combined company-building, a landmark public listing, angel investing, venture capital, media, and ecosystem development over four decades.', influenceSignal: 'Aramex became an early Arab public-market success; Wamda then institutionalized founder support and startup coverage across MENA.', sourceLabel: 'Wamda Capital · our story', sourceUrl: 'https://wamdacapital.com/our-story/' },
  { name: 'Naguib Sawiris', companies: ['Orascom Telecom', 'Orascom Investment Holding'], primaryMarket: 'Egypt / Regional', sector: 'Telecom & investment', tier: 1, founderRole: 'Founder & business builder', whySelected: 'Built one of the Arab world’s most consequential cross-border telecom groups and remained a major investor and public business voice.', influenceSignal: 'Orascom Telecom expanded across emerging markets before its merger with VimpelCom created one of the world’s largest mobile operators.', sourceLabel: 'Orascom Investment Holding · company history', sourceUrl: 'https://www.orascomih.com/en/about/' },
  { name: 'Nassef Sawiris', companies: ['Orascom Construction', 'OCI'], primaryMarket: 'Egypt / Global', sector: 'Construction, industrials & investment', tier: 1, founderRole: 'Founder & industrial entrepreneur', whySelected: 'Scaled Egyptian construction and fertilizer businesses into global industrial platforms and became a major international investor.', influenceSignal: 'Built and led globally listed businesses rooted in Egyptian construction and industrial capacity.', sourceLabel: 'Sawiris Foundation · founders and trustees', sourceUrl: 'https://sawirisfoundation.org/about-us/' },
  { name: 'Samih Sawiris', companies: ['Orascom Development', 'El Gouna'], primaryMarket: 'Egypt / Regional', sector: 'Destinations, hospitality & urban development', tier: 1, founderRole: 'Founder', whySelected: 'Pioneered integrated destination development from Egypt to Europe and made El Gouna a reference point for privately built towns in the region.', influenceSignal: 'Created and scaled tourism, hospitality, residential, and infrastructure businesses around destination-led development.', sourceLabel: 'Sawiris Foundation · founders and trustees', sourceUrl: 'https://sawirisfoundation.org/about-us/' },
  { name: 'Hussain Sajwani', companies: ['DAMAC Properties', 'DAMAC Group'], primaryMarket: 'United Arab Emirates', sector: 'Real estate & diversified investment', tier: 1, founderRole: 'Founder & chairman', whySelected: 'Helped define Dubai’s luxury real-estate sector and expanded a local developer into a diversified international group.', influenceSignal: 'DAMAC reports more than 43,700 homes delivered and projects across multiple global cities.', sourceLabel: 'Hussain Sajwani · official profile', sourceUrl: 'https://hussainsajwani.com/profile/' },
  { name: 'Khalaf Ahmad Al Habtoor', companies: ['Al Habtoor Group'], primaryMarket: 'United Arab Emirates', sector: 'Construction, hospitality & diversified business', tier: 1, founderRole: 'Founder & chairman', whySelected: 'Built a self-made Emirati engineering business into a diversified conglomerate alongside the UAE’s economic development.', influenceSignal: 'The group grew from a 1970 engineering company into hospitality, automotive, real estate, education, and publishing.', sourceLabel: 'Al Habtoor Group · chairman profile', sourceUrl: 'https://www.habtoor.com/en/3/the-group/chairmans-profile/' },
  { name: 'Sulaiman Al Habib', companies: ['Dr. Sulaiman Al Habib Medical Services Group'], primaryMarket: 'Saudi Arabia / GCC', sector: 'Healthcare', tier: 1, founderRole: 'Founder & chairman', whySelected: 'Built one of the Middle East’s largest private healthcare groups and helped institutionalize scaled, listed healthcare delivery in Saudi Arabia.', influenceSignal: 'HMG grew from a single outpatient complex into a regional network of hospitals, medical centers, and pharmacies.', sourceLabel: 'Saudi Exchange · HMG prospectus', sourceUrl: 'https://www.saudiexchange.sa/wps/wcm/connect/7c965f6c-9366-4519-994c-50ee1f6a8a15/HMG.pdf?CACHE=NONE&ContentCache=NONE&MOD=AJPERES' },
  { name: 'Mohammad Abunayyan', companies: ['ACWA Power', 'Vision Invest'], primaryMarket: 'Saudi Arabia / Global', sector: 'Energy, water & infrastructure', tier: 1, founderRole: 'Founder & chairman', whySelected: 'Turned a Saudi infrastructure venture into a global developer central to power, desalination, renewables, and green hydrogen.', influenceSignal: 'ACWA reports 111 assets across 16 countries and $126.6B in assets under management.', sourceLabel: 'ACWA Power · about us', sourceUrl: 'https://www.acwapower.com/en/who-we-are/about-us/' },
  { name: 'Waleed Al Ibrahim', companies: ['MBC Group'], primaryMarket: 'Saudi Arabia / Regional', sector: 'Media & entertainment', tier: 1, founderRole: 'Founder & chairman', whySelected: 'Built the region’s most influential private broadcasting group and carried it from satellite TV into streaming and public markets.', influenceSignal: 'MBC has shaped pan-Arab entertainment since 1991 and now spans broadcast, production, music, gaming, and Shahid.', sourceLabel: 'Saudi CMA · MBC prospectus', sourceUrl: 'https://cma.gov.sa/en/Market/Prospectuses/Documents/MBC_En.pdf' },
  { name: 'Talal Abu-Ghazaleh', companies: ['Talal Abu-Ghazaleh Global'], primaryMarket: 'Jordan / Regional', sector: 'Professional services, IP & education', tier: 1, founderRole: 'Founder & chairman', whySelected: 'Built one of the Arab world’s longest-running professional-services and knowledge-economy institutions.', influenceSignal: 'TAG.Global traces its founding to 1972 and reports more than 100 offices worldwide.', sourceLabel: 'Talal Abu-Ghazaleh · official profile', sourceUrl: 'https://www.talalabughazaleh.com/Profile/en' },
  { name: 'Bashar Masri', companies: ['Massar International', 'Rawabi'], primaryMarket: 'Palestine / Regional', sector: 'Urban development & investment', tier: 1, founderRole: 'Founder & chairman', whySelected: 'Used private enterprise to build jobs, housing, technology capacity, and the first modern planned Palestinian city.', influenceSignal: 'Massar spans more than 30 companies, while Rawabi became Palestine’s largest private development project.', sourceLabel: 'Bashar Masri · official profile', sourceUrl: 'https://www.basharmasri.com/en/bashar-masri' },
  { name: 'Ghassan Aboud', companies: ['Ghassan Aboud Holding'], primaryMarket: 'Syria / United Arab Emirates', sector: 'Trade, logistics & diversified commerce', tier: 1, founderRole: 'Founder & chairman', whySelected: 'Built an automotive-trading venture into a global multi-sector group while maintaining a strong UAE and Syrian economic footprint.', influenceSignal: 'The group operates across automotive, food, logistics, hospitality, healthcare, retail, and digital marketplaces in more than 100 countries.', sourceLabel: 'Ghassan Aboud Holding · about', sourceUrl: 'https://gaholding.com/about/' },
  { name: 'Shamsheer Vayalil', companies: ['Burjeel Holdings', 'VPS Healthcare'], primaryMarket: 'United Arab Emirates / GCC', sector: 'Healthcare', tier: 1, founderRole: 'Founder, chairman & CEO', whySelected: 'Built a single Abu Dhabi hospital into a listed, multi-country healthcare group with broad regional reach.', influenceSignal: 'Burjeel has become one of the Middle East’s largest private healthcare platforms and serves millions of patients annually.', sourceLabel: 'Burjeel Holdings · leadership', sourceUrl: 'https://burjeelholdings.com/company/leadership/' },
  { name: 'Faisal Al Bannai', companies: ['Axiom Telecom', 'DarkMatter'], primaryMarket: 'United Arab Emirates', sector: 'Technology distribution & cybersecurity', tier: 1, founderRole: 'Founder', whySelected: 'Created major homegrown technology companies across mobile distribution and cybersecurity before taking national technology leadership roles.', influenceSignal: 'Axiom grew from a four-person startup into a leading regional mobile-device distributor.', sourceLabel: 'Axiom Telecom · about', sourceUrl: 'https://axiomtelecom.com/about.html' },
  { name: 'Huda Kattan', companies: ['Huda Beauty'], primaryMarket: 'United Arab Emirates / Global', sector: 'Beauty & creator-led commerce', tier: 1, founderRole: 'Founder & chairwoman', whySelected: 'Converted creator influence into one of the Middle East’s rare globally recognized consumer brands.', influenceSignal: 'Huda Beauty became a category-defining founder-led brand, and Kattan restored full founder ownership in 2025.', sourceLabel: 'Huda Beauty · founder ownership announcement', sourceUrl: 'https://www.prnewswire.com/news-releases/huda-beauty-reclaims-full-ownership-as-an-independent-beauty-brand-302471853.html' },
  { name: 'Elie Saab', companies: ['ELIE SAAB'], primaryMarket: 'Lebanon / Global', sector: 'Fashion & luxury', tier: 1, founderRole: 'Founder', whySelected: 'Built a Beirut atelier into a global luxury house and one of the Arab world’s most visible creative businesses.', influenceSignal: 'The house now spans couture, ready-to-wear, bridal, accessories, fragrance, interiors, and boutiques across major global cities.', sourceLabel: 'ELIE SAAB · brand story', sourceUrl: 'https://eliesaab.com/pages/about-us' },

  { name: 'Samih Toukan', companies: ['Maktoob', 'Jabbar Internet Group'], primaryMarket: 'Jordan / Regional', sector: 'Internet & venture building', tier: 2, founderRole: 'Co-founder', whySelected: 'Helped create the Arab internet’s first landmark platform and then recycled experience and capital into new regional technology companies.', influenceSignal: 'Yahoo’s 2009 acquisition of Maktoob became a watershed exit for the MENA startup ecosystem.', sourceLabel: 'Royal Hashemite Court · Maktoob founders', sourceUrl: 'https://rhc.jo/en/news/king-congratulates-maktoob-founders-yahoo-deal' },
  { name: 'Hussam Khoury', companies: ['Maktoob', 'Jabbar Internet Group'], primaryMarket: 'Jordan / Regional', sector: 'Internet & venture building', tier: 2, founderRole: 'Co-founder', whySelected: 'Co-built Maktoob’s Arabic internet platform and became a repeat company builder and investor after its acquisition.', influenceSignal: 'Maktoob reached roughly 16.5 million users before Yahoo acquired it in 2009.', sourceLabel: 'Royal Hashemite Court · Maktoob founders', sourceUrl: 'https://rhc.jo/en/news/king-congratulates-maktoob-founders-yahoo-deal' },
  { name: 'Ronaldo Mouchawar', companies: ['Souq.com', 'Amazon MENA'], primaryMarket: 'Syria / United Arab Emirates', sector: 'E-commerce', tier: 2, founderRole: 'Co-founder', whySelected: 'Pioneered scaled e-commerce for Arabic-speaking markets and led the platform into Amazon’s regional entry.', influenceSignal: 'Amazon acquired Souq in 2017 after it became the Arab world’s largest online marketplace.', sourceLabel: 'Amazon · Souq acquisition', sourceUrl: 'https://press.aboutamazon.com/2017/3/amazon-to-acquire-souq-com' },
  { name: 'Mudassir Sheikha', companies: ['Careem'], primaryMarket: 'United Arab Emirates / Regional', sector: 'Mobility, delivery & fintech', tier: 2, founderRole: 'Co-founder & CEO', whySelected: 'Led the region’s most important technology exit and built a talent network that seeded a generation of new MENA founders.', influenceSignal: 'Uber acquired Careem for $3.1B; the company reports more than 50 million customers and 2.5 million captains created.', sourceLabel: 'Careem · about us', sourceUrl: 'https://www.careem.com/en-EG/about-us/' },
  { name: 'Magnus Olsson', companies: ['Careem'], primaryMarket: 'United Arab Emirates / Regional', sector: 'Mobility, delivery & fintech', tier: 2, founderRole: 'Co-founder & chief product architect', whySelected: 'Co-built the product and operating model behind the Middle East’s defining consumer-technology scale-up.', influenceSignal: 'Careem expanded across 14 countries before the region’s largest technology exit.', sourceLabel: 'Careem · about us', sourceUrl: 'https://www.careem.com/en-EG/about-us/' },
  { name: 'Abdulla Elyas', companies: ['Careem', 'Enwani'], primaryMarket: 'Saudi Arabia / United Arab Emirates', sector: 'Mobility, logistics & fintech', tier: 2, founderRole: 'Co-founder', whySelected: 'Brought Saudi operating depth and local-product insight into Careem’s regional scale story after building Enwani.', influenceSignal: 'Careem identifies Elyas as its third co-founder and credits the founding team with expansion into 14 countries.', sourceLabel: 'Careem · about us', sourceUrl: 'https://www.careem.com/en-EG/about-us/' },
  { name: 'Mona Ataya', companies: ['Mumzworld'], primaryMarket: 'United Arab Emirates / Regional', sector: 'E-commerce & family consumer', tier: 2, founderRole: 'Founder & CEO', whySelected: 'Built one of MENA’s earliest scaled, women-led e-commerce businesses and became a visible model for regional founders.', influenceSignal: 'Mumzworld reports serving more than two million mothers and shipping across 20 MENA markets.', sourceLabel: 'Mumzworld · founder interview', sourceUrl: 'https://blog.mumzworld.com/en/one-one-mona-ataya-founder-ceo-mumzworld' },
  { name: 'Ameer Sherif', companies: ['WUZZUF', 'Forasna'], primaryMarket: 'Egypt / Regional', sector: 'Recruitment technology & employment marketplaces', tier: 2, founderRole: 'Founder & chairman', whySelected: 'Built Egypt’s leading online recruitment platforms for professional and frontline work, combining category leadership with broad labor-market impact.', influenceSignal: 'WUZZUF and Forasna have helped more than one million people get hired, and Sherif is working toward placing ten million people in jobs across the Middle East and Africa.', sourceLabel: 'World Economic Forum · Ameer Sherif profile', sourceUrl: 'https://www.weforum.org/people/ameer-sherif/' },
  { name: 'Mona Kattan', companies: ['KAYALI', 'Huda Beauty'], primaryMarket: 'United Arab Emirates / Global', sector: 'Beauty, fragrance & creator commerce', tier: 2, founderRole: 'Founder & co-founder', whySelected: 'Helped build Huda Beauty and then created a globally scaled fragrance brand rooted in Middle Eastern scent culture.', influenceSignal: 'KAYALI reports more than six million combined followers and global distribution around a founder-led fragrance community.', sourceLabel: 'KAYALI · about', sourceUrl: 'https://kayali.com/en-au/pages/about' },
  { name: 'Mounir Nakhla', companies: ['MNT-Halan', 'Mashroey', 'Tasaheel'], primaryMarket: 'Egypt / Regional', sector: 'Fintech & financial inclusion', tier: 2, founderRole: 'Founder & CEO', whySelected: 'Built multiple inclusion businesses and combined lending, payments, and commerce into Egypt’s first fintech unicorn.', influenceSignal: 'Halan serves millions through a regulated digital platform aimed at financially underserved consumers and small businesses.', sourceLabel: 'Halan · about', sourceUrl: 'https://halan.com/about/' },
  { name: 'Hosam Arab', companies: ['Tabby', 'Namshi'], primaryMarket: 'Saudi Arabia / United Arab Emirates', sector: 'Fintech & commerce', tier: 2, founderRole: 'Co-founder & CEO', whySelected: 'Became a repeat regional founder and built MENA’s largest buy-now-pay-later platform.', influenceSignal: 'Tabby reports more than 20 million users, over 40,000 merchant partners, and a $4.5B valuation after its latest secondary sale.', sourceLabel: 'Tabby · about', sourceUrl: 'https://tabby.sa/ar-SA/help-business/about-tabby/about-us' },
  { name: 'Abdulmajeed Alsukhan', companies: ['Tamara'], primaryMarket: 'Saudi Arabia / GCC', sector: 'Fintech & commerce', tier: 2, founderRole: 'Co-founder & CEO', whySelected: 'Built one of Saudi Arabia’s first globally funded fintech scale-ups and helped normalize flexible digital payments across the GCC.', influenceSignal: 'Tamara expanded from Saudi Arabia into a multi-market payments platform integrated by major regional retailers.', sourceLabel: 'Tamara · founding announcement', sourceUrl: 'https://tamara.co/en-ae/blog-post/press-release-1' },
  { name: 'Mohamad Ballout', companies: ['Kitopi'], primaryMarket: 'United Arab Emirates / GCC', sector: 'Foodtech & restaurant operations', tier: 2, founderRole: 'Co-founder & CEO', whySelected: 'Created a new regional operating model at the intersection of restaurant brands, kitchens, logistics, and technology.', influenceSignal: 'Kitopi became one of MENA’s fastest unicorns after a $415M Series C and now operates an omnichannel food platform.', sourceLabel: 'Kitopi · Series C announcement', sourceUrl: 'https://www.kitopi.com/post/kitopi-announces-415-million-series-c-funding-round' },
  { name: 'Elie Habib', companies: ['Anghami'], primaryMarket: 'Lebanon / United Arab Emirates', sector: 'Music, media & technology', tier: 2, founderRole: 'Co-founder & CEO', whySelected: 'Co-built the Arab world’s first scaled legal music-streaming platform and a rare publicly listed regional technology company.', influenceSignal: 'Anghami became the first Arab technology company to list on Nasdaq and now reports more than 120 million registered users.', sourceLabel: 'Anghami · investor relations', sourceUrl: 'https://www.anghami.com/investors' },
  { name: 'Eddy Maroun', companies: ['Anghami'], primaryMarket: 'Lebanon / United Arab Emirates', sector: 'Music, media & technology', tier: 2, founderRole: 'Co-founder', whySelected: 'Co-created the commercial and rights-partnership engine behind MENA’s leading streaming platform.', influenceSignal: 'Anghami’s 2022 Nasdaq listing marked the first U.S. listing by an Arab technology startup.', sourceLabel: 'Anghami · Nasdaq listing', sourceUrl: 'https://talks.anghami.com/anghami-lists-on-nasdaq/' },
  { name: 'Mostafa Kandil', companies: ['Swvl'], primaryMarket: 'Egypt / United Arab Emirates', sector: 'Mobility technology', tier: 2, founderRole: 'Co-founder, chairman & CEO', whySelected: 'Built an Egyptian mobility startup into a multinational, Nasdaq-listed transport-technology company.', influenceSignal: 'Swvl began in Cairo, expanded internationally, and reached a public-market milestone for Arab technology founders.', sourceLabel: 'SEC · Swvl 2025 annual filing', sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1875609/000110465926045255/swvl-20251231x20f.htm' },
  { name: 'Amir Barsoum', companies: ['Vezeeta'], primaryMarket: 'Egypt / Regional', sector: 'Healthtech', tier: 2, founderRole: 'Co-founder & chairman', whySelected: 'Built one of MENA’s earliest and most recognizable digital-health marketplaces.', influenceSignal: 'Vezeeta scaled doctor discovery and booking across several MENA countries, normalizing consumer healthtech in the region.', sourceLabel: 'Vezeeta · leadership', sourceUrl: 'https://www.vezeeta.com/ar/Generic/OurTeam' },
  { name: 'Waleed Sadek', companies: ['PaySky', 'Yalla Super App'], primaryMarket: 'Egypt / Middle East & Africa', sector: 'Payments infrastructure & fintech', tier: 2, founderRole: 'Founder & CEO', whySelected: 'Built homegrown payment infrastructure used by central banks, institutions, merchants, and consumers across the region and Africa.', influenceSignal: 'PaySky reports operations across 18 countries and payment platforms serving hundreds of millions of people.', sourceLabel: 'PaySky · founder profile', sourceUrl: 'https://paysky.io/forbes-interview-with-dr-waleed-sadek-paysky-founder-ceo/' },
  { name: 'Islam Shawky', companies: ['Paymob'], primaryMarket: 'Egypt / Regional', sector: 'Payments infrastructure & fintech', tier: 2, founderRole: 'Co-founder & CEO', whySelected: 'Helped turn a student-founded Egyptian payments company into a major regional digital-finance infrastructure provider.', influenceSignal: 'Paymob built wallet, merchant, and bank-deployment infrastructure across Africa and the Middle East.', sourceLabel: 'Paymob · about', sourceUrl: 'https://www.paymob.sa/en/about-us' },
  { name: 'Omar Gabr', companies: ['Instabug / Luciq'], primaryMarket: 'Egypt / Global', sector: 'Developer tools & mobile observability', tier: 2, founderRole: 'Co-founder & president', whySelected: 'Co-built one of Egypt’s most globally successful enterprise-software companies from a university project.', influenceSignal: 'Instabug raised more than $50M and became a widely used mobile-app quality and observability platform.', sourceLabel: 'The National · Instabug Series B', sourceUrl: 'https://www.thenationalnews.com/business/start-ups/2022/05/18/instabug-raises-46m-to-build-new-app-performance-monitoring-platform/' },
  { name: 'Moataz Soliman', companies: ['Instabug / Luciq'], primaryMarket: 'Egypt / Global', sector: 'Developer tools & mobile observability', tier: 2, founderRole: 'Co-founder & CEO', whySelected: 'Co-created a globally adopted mobile developer tool and continued its evolution into an AI-led observability platform.', influenceSignal: 'The YC-backed company grew to roughly 250 people and more than $50M in disclosed funding.', sourceLabel: 'Y Combinator · Luciq', sourceUrl: 'https://www.ycombinator.com/companies/luciq' },
  { name: 'Shaista Asif', companies: ['PureHealth'], primaryMarket: 'United Arab Emirates / Global', sector: 'Healthcare', tier: 2, founderRole: 'Co-founder & group CEO', whySelected: 'Co-built one of the region’s largest integrated healthcare groups and led major international acquisitions.', influenceSignal: 'PureHealth combines hospitals, insurance, diagnostics, pharmacies, and technology and completed a $1.2B UK healthcare acquisition.', sourceLabel: 'PureHealth · co-founder appointment', sourceUrl: 'https://purehealth.ae/shaista-asif-cofounder-of-purehealth-has-been-named-as-the-group-ceo/' },
  { name: 'Rana el Kaliouby', companies: ['Affectiva'], primaryMarket: 'Egypt / United States / Global', sector: 'Artificial intelligence', tier: 2, founderRole: 'Co-founder & former CEO', whySelected: 'Defined the Emotion AI category and became one of the Arab world’s most visible scientist-founders and AI ethics voices.', influenceSignal: 'Affectiva raised more than $50M, reached customers in over 90 countries, and was acquired by Smart Eye in 2021.', sourceLabel: 'Rana el Kaliouby · official biography', sourceUrl: 'https://ranaelkaliouby.com/about/' },
  { name: 'Joy Ajlouny', companies: ['Fetchr', 'Bonfaire'], primaryMarket: 'Palestine / United Arab Emirates', sector: 'Logistics technology & e-commerce', tier: 2, founderRole: 'Co-founder & serial entrepreneur', whySelected: 'Became a prominent woman founder in GCC logistics and helped popularize app-enabled last-mile delivery for markets with weak addressing systems.', influenceSignal: 'Fetchr expanded from Dubai across several Middle Eastern markets and became one of the region’s best-known logistics startups.', sourceLabel: 'Kerning Cultures · Joy Ajlouny profile', sourceUrl: 'https://kerningcultures.com/joy-ajlouny-cofounder-fetchr/' },
  { name: 'Ambareen Musa', companies: ['Souqalmal', 'Yabi'], primaryMarket: 'United Arab Emirates / Regional', sector: 'Consumer fintech & financial education', tier: 2, founderRole: 'Founder & CEO', whySelected: 'Created a pioneering regional financial-comparison platform and used it to advance consumer transparency and financial literacy.', influenceSignal: 'Souqalmal became an influential UAE fintech and later attracted a strategic majority investment from SHUAA Capital.', sourceLabel: 'Mastercard · Ambareen Musa profile', sourceUrl: 'https://www.mastercard.com/news/eemea/en/perspectives/en/2023/priceless-book/ambareen-musa/' },
  { name: 'Noor Sweid', companies: ['Global Ventures', 'ZenYoga', 'Depa'], primaryMarket: 'United Arab Emirates / Regional', sector: 'Company building & venture capital', tier: 2, founderRole: 'Founder, operator & investor', whySelected: 'Combines operating scale, a consumer-business exit, public-market experience, and institution-building in MENA venture capital.', influenceSignal: 'Sweid scaled Depa tenfold, founded and exited ZenYoga, and built Global Ventures into a regional technology investor.', sourceLabel: 'Global Private Capital Association · Noor Sweid', sourceUrl: 'https://www.globalprivatecapital.org/team_member/noor-sweid/' },
  { name: 'Nuseir Yassin', companies: ['Nas Company', 'Nas Daily'], primaryMarket: 'Palestine / United Arab Emirates / Global', sector: 'Creator economy & media technology', tier: 2, founderRole: 'Founder & CEO', whySelected: 'Turned a personal storytelling format into a global creator-media company and a visible entrepreneurship platform.', influenceSignal: 'Nas grew from 1,000 daily videos into a multi-business company spanning media, creator education, communities, and software.', sourceLabel: 'Nas Company · leadership', sourceUrl: 'https://www.nas.co/work-with-us' },

  { name: 'Ahmed Wadi', companies: ['MoneyFellows'], primaryMarket: 'Egypt / North Africa', sector: 'Fintech & savings', tier: 3, founderRole: 'Founder & CEO', whySelected: 'Digitized the culturally embedded ROSCA savings model and turned it into a regulated, scalable fintech product.', influenceSignal: 'MoneyFellows reports more than 8.5 million users, $60M in total funding, and expansion beyond Egypt.', sourceLabel: 'MoneyFellows · 2025 funding update', sourceUrl: 'https://www.moneyfellows.com/en-us/3elmelgeib-home/money-fellows-expands-to-morocco-with-13m-funding/' },
  { name: 'Ahmad Hammouda', companies: ['Thndr'], primaryMarket: 'Egypt / Regional', sector: 'Investing & fintech', tier: 3, founderRole: 'Co-founder & CEO', whySelected: 'Helped open retail investing to a younger, mobile-first audience in a market with historically high account-opening friction.', influenceSignal: 'Thndr received Egypt’s first new brokerage license since 2008 and expanded access to stocks, funds, bonds, and gold.', sourceLabel: 'JIMCO · Thndr portfolio', sourceUrl: 'https://jimco.com/en/portfolio/thndr/' },
  { name: 'Seif Amr', companies: ['Thndr'], primaryMarket: 'Egypt / Regional', sector: 'Investing & fintech', tier: 3, founderRole: 'Co-founder & COO', whySelected: 'Co-built the product and operating model behind Egypt’s leading mobile-first retail-investing platform.', influenceSignal: 'Thndr combined a rare brokerage license with a consumer app and financial-education products for new investors.', sourceLabel: 'Thndr · about us', sourceUrl: 'https://thndr.app/blogpost/about-us/' },
  { name: 'Mostafa Beltagy', companies: ['Nawy'], primaryMarket: 'Egypt / Africa', sector: 'Proptech', tier: 3, founderRole: 'Co-founder & CEO', whySelected: 'Built a vertically integrated proptech platform in one of the region’s largest and least digitized asset markets.', influenceSignal: 'Nawy reports helping more than 100,000 families and raised a $52M Series A to scale its platform.', sourceLabel: 'Nawy · about us', sourceUrl: 'https://www.nawy.com/about-us' },
  { name: 'Ghassab Al-Mandil', companies: ['Jahez'], primaryMarket: 'Saudi Arabia / GCC', sector: 'Delivery & commerce technology', tier: 3, founderRole: 'Founder & CEO', whySelected: 'Built Saudi Arabia’s landmark homegrown delivery platform and took it to the public market.', influenceSignal: 'Jahez’s IPO was presented as the first listing of a Saudi homegrown technology startup.', sourceLabel: 'Jahez Group · listing journey', sourceUrl: 'https://jahezgroup.com/listing-journey/' },
  { name: 'Ahmad Al-Zaini', companies: ['Foodics'], primaryMarket: 'Saudi Arabia / Regional', sector: 'Restaurant technology & fintech', tier: 3, founderRole: 'Co-founder & CEO', whySelected: 'Built core operating and payment infrastructure for tens of thousands of restaurants across MENA.', influenceSignal: 'Foodics processed more than five billion orders and raised a $170M Series C led by major global and Saudi investors.', sourceLabel: 'PIF · Foodics Series C', sourceUrl: 'https://www.pif.gov.sa/en/news-and-insights/newswire/2022/pifs-sanabil-investments-co-leads-170m-funding-of-foodics/' },
  { name: 'Nawaf Hariri', companies: ['Salla'], primaryMarket: 'Saudi Arabia / GCC', sector: 'E-commerce enablement', tier: 3, founderRole: 'Co-founder & CEO', whySelected: 'Built the Arabic-first commerce infrastructure used by a large share of Saudi online merchants.', influenceSignal: 'Salla reports more than 68,000 active merchants and over $13.3B in processed sales.', sourceLabel: 'Salla · official company information', sourceUrl: 'https://salla.com/en/tools/ai-info' },
  { name: 'Salman Butt', companies: ['Salla'], primaryMarket: 'Saudi Arabia / GCC', sector: 'E-commerce enablement', tier: 3, founderRole: 'Co-founder', whySelected: 'Co-created a locally adapted SaaS platform that made online selling accessible to tens of thousands of Gulf merchants.', influenceSignal: 'Salla’s Arabic-native store, payments, logistics, and marketing stack became part of Saudi digital-commerce infrastructure.', sourceLabel: 'Salla · official company information', sourceUrl: 'https://salla.com/en/tools/ai-info' },
  { name: 'Mohammed Aldossary', companies: ['Sary'], primaryMarket: 'Saudi Arabia / Regional', sector: 'B2B commerce & supply chain', tier: 3, founderRole: 'Co-founder & CEO', whySelected: 'Applied marketplace technology to the fragmented wholesale supply chain serving small retailers.', influenceSignal: 'Sary connected small businesses with manufacturers and lenders and expanded the case for B2B marketplaces in MENA.', sourceLabel: 'RAED Ventures · Sary portfolio', sourceUrl: 'https://raed.vc/portfolio/sary/' },
  { name: 'Abdulaziz Al Loughani', companies: ['Floward'], primaryMarket: 'Kuwait / Regional', sector: 'E-commerce, gifting & logistics', tier: 3, founderRole: 'Founder, chairman & CEO', whySelected: 'Created a regionally resonant consumer brand and scaled a difficult same-day gifting operation across multiple markets.', influenceSignal: 'Floward grew from Kuwait into ten markets across MENA, the UK, and Malaysia.', sourceLabel: 'Floward · leadership and story', sourceUrl: 'https://careers.floward.com/' },
  { name: 'Hamad Mubarak Al Hajri', companies: ['Snoonu'], primaryMarket: 'Qatar', sector: 'Super app, delivery & commerce', tier: 3, founderRole: 'Founder & CEO', whySelected: 'Built Qatar’s leading homegrown super app and became a visible champion for the country’s technology-founder ecosystem.', influenceSignal: 'Snoonu became the first Qatari technology company reported to exceed a valuation of one billion Qatari riyals.', sourceLabel: 'Qatar Business Continuity Conference · founder bio', sourceUrl: 'https://bcrc.qa/25/BCRC%2025%20Conference%20brochure_E.pdf' },
  { name: 'Abdulla Almoayed', companies: ['Tarabut'], primaryMarket: 'Bahrain / Regional', sector: 'Open banking & financial infrastructure', tier: 3, founderRole: 'Founder & CEO', whySelected: 'Built one of MENA’s earliest regulated open-banking platforms from Bahrain and expanded it across major Gulf markets.', influenceSignal: 'Tarabut connects banks, fintechs, and businesses through open-finance APIs, payments, and data intelligence.', sourceLabel: 'BBK · Tarabut partnership', sourceUrl: 'https://www.bbkonline.com/bbk-signs-mou-with-tarabut-to-enhance-open-banking-collaboration/' },
  { name: 'Abdullah Al-Mutawa', companies: ['Carriage'], primaryMarket: 'Kuwait / GCC', sector: 'Food delivery & logistics', tier: 3, founderRole: 'Co-founder & CEO', whySelected: 'Built one of Kuwait’s fastest-scaling consumer startups and delivered an early Gulf technology exit.', influenceSignal: 'Delivery Hero acquired Carriage after the platform expanded from Kuwait across GCC markets.', sourceLabel: 'Delivery Hero · Carriage acquisition', sourceUrl: 'https://www.deliveryhero.com/newsroom/delivery-hero-announces-acquisition-of-middle-eastern-delivery-service-carriage/' },
  { name: 'Ralph Debbas', companies: ['W Motors'], primaryMarket: 'Lebanon / United Arab Emirates', sector: 'Automotive design & manufacturing', tier: 3, founderRole: 'Founder & CEO', whySelected: 'Created the Middle East’s first high-performance luxury-car manufacturer and pushed regional automotive design into global culture.', influenceSignal: 'W Motors built the Lykan HyperSport and opened a Dubai engineering and manufacturing facility with capacity above 7,000 units a year.', sourceLabel: 'W Motors · about', sourceUrl: 'https://www.wmotors.ae/' },
  { name: 'Khalid Alkhudair', companies: ['Glowork'], primaryMarket: 'Saudi Arabia', sector: 'Employment & social enterprise', tier: 3, founderRole: 'Founder', whySelected: 'Built a high-impact social enterprise focused on women’s employment during a pivotal period of Saudi labor-market change.', influenceSignal: 'Glowork linked women to employers, created thousands of jobs, and gained recognition from the World Bank, ILO, and UN.', sourceLabel: 'Khalid Alkhudair · official profile', sourceUrl: 'https://khalidalkhudair.com/en/node/6' },
  { name: 'Sara Sabry', companies: ['Deep Space Initiative', 'PULSE'], primaryMarket: 'Egypt / Global', sector: 'Space, science & education', tier: 3, founderRole: 'Founder & chair', whySelected: 'Combined a history-making spaceflight with institution-building intended to broaden access to the space sector.', influenceSignal: 'Sabry became the first Egyptian in space and the first Arab and African woman in space, then built global research and education programs.', sourceLabel: 'Deep Space Initiative · about', sourceUrl: 'https://www.deepspaceinitiative.org/about' },
  { name: 'Jeremy Crane', companies: ['Yellow Door Energy'], primaryMarket: 'United Arab Emirates / Middle East & Africa', sector: 'Distributed renewable energy', tier: 3, founderRole: 'Founder & group CEO', whySelected: 'Built a regional distributed-solar platform serving commercial and industrial customers across emerging markets.', influenceSignal: 'Yellow Door Energy reports more than 400 MW of awarded solar projects across the Middle East and Africa.', sourceLabel: 'World Utilities Congress · founder profile', sourceUrl: 'https://www.worldutilitiescongress.com/speaker-collection/2026-strategic-speakers/jeremy-crane/' },
]

const tierLabels: Record<Tier, string> = {
  1: 'Region shaper',
  2: 'Category leader',
  3: 'Breakout builder',
}

const normalizeName = (value: string) => value
  .normalize('NFKD')
  .replace(/[^a-zA-Z0-9]+/g, '')
  .toLowerCase()

const slug = (value: string) => value
  .normalize('NFKD')
  .replace(/[’']/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .toLowerCase()

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const unifiedPath = resolve(projectRoot, 'assets/people/unified-people.json')
const linkedInReviewPath = resolve(projectRoot, 'scripts/middle-east-founder-linkedin-review.json')
const founderEditsPath = resolve(projectRoot, 'assets/people/middle-east-founder-edits.json')
const outputPath = resolve(projectRoot, 'assets/people/middle-east-founders.json')
const csvOutputPath = resolve(projectRoot, 'assets/people/middle-east-founder-linkedin-pages.csv')

const [unified, linkedInReview, founderEdits] = await Promise.all([
  readFile(unifiedPath, 'utf8').then((value) => JSON.parse(value) as UnifiedPeopleFile),
  readFile(linkedInReviewPath, 'utf8').then((value) => JSON.parse(value) as LinkedInReviewFile),
  readFile(founderEditsPath, 'utf8')
    .then((value) => JSON.parse(value) as FounderEditsFile)
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return { schema_version: 'middle-east-founder-edits.v1', updated_at: null, rows: {} } as FounderEditsFile
      throw error
    }),
])
const linkedInByName = new Map<string, string>()

const canonicalLinkedInProfile = (value: string) => {
  const parsed = new URL(value)
  const host = parsed.hostname.toLowerCase()
  const pathParts = parsed.pathname.split('/').filter(Boolean)
  if (!(host === 'linkedin.com' || host.endsWith('.linkedin.com')) || pathParts[0] !== 'in' || !pathParts[1]) {
    throw new Error(`Not a canonicalizable LinkedIn personal profile URL: ${value}`)
  }
  return `https://www.linkedin.com/in/${pathParts[1]}`
}

for (const person of unified.people ?? []) {
  const displayName = person.name?.display
  if (!displayName) continue
  const linkedInUrls = (person.profiles ?? [])
    .filter((profile) => profile.platform === 'linkedin' && typeof profile.url === 'string' && profile.url.length > 0)
    .map((profile) => profile.url!)
  if (linkedInUrls.length !== 1) continue
  const normalized = normalizeName(displayName)
  if (!linkedInByName.has(normalized)) linkedInByName.set(normalized, canonicalLinkedInProfile(linkedInUrls[0]))
}

if (linkedInReview.observed_at !== OBSERVED_AT) throw new Error('LinkedIn review date must match the founder dataset review date.')

const founderNames = new Set(founders.map((founder) => normalizeName(founder.name)))
const reviewedMatches = new Map(linkedInReview.matches.map((match) => [normalizeName(match.name), {
  ...match,
  url: canonicalLinkedInProfile(match.url),
}]))
const reviewedUnresolved = new Map(linkedInReview.unresolved.map((entry) => [normalizeName(entry.name), entry]))
const reviewedNames = [...reviewedMatches.keys(), ...reviewedUnresolved.keys()]

if (new Set(reviewedNames).size !== reviewedNames.length) throw new Error('LinkedIn review names must be unique across matches and unresolved entries.')
if (!reviewedNames.every((name) => founderNames.has(name))) throw new Error('Every LinkedIn review entry must map to a founder seed.')

const founderNamesRequiringReview = founders
  .filter((founder) => !linkedInByName.has(normalizeName(founder.name)))
  .map((founder) => normalizeName(founder.name))
if (
  reviewedNames.length !== founderNamesRequiringReview.length
  || !founderNamesRequiringReview.every((name) => reviewedMatches.has(name) || reviewedUnresolved.has(name))
) throw new Error('LinkedIn review must cover every founder without an exact unified-people match.')

const rows = founders.map((founder, index) => {
  const normalizedName = normalizeName(founder.name)
  const exactUnifiedUrl = linkedInByName.get(normalizedName)
  const reviewedMatch = reviewedMatches.get(normalizedName)
  const unresolved = reviewedUnresolved.get(normalizedName)
  const linkedInUrl = reviewedMatch?.url ?? exactUnifiedUrl ?? null

  const id = `middle-east-founder-${slug(founder.name)}`
  const baseRow = {
    id,
    editorial_order: index + 1,
    name: founder.name,
    companies: founder.companies,
    founder_role: founder.founderRole,
    followers: null,
    target: false,
    primary_market: founder.primaryMarket,
    sector: founder.sector,
    tier: founder.tier,
    tier_label: tierLabels[founder.tier],
    why_selected: founder.whySelected,
    influence_signal: founder.influenceSignal,
    linkedin_url: linkedInUrl,
    linkedin_review: linkedInUrl ? {
      status: 'verified' as const,
      profile_name: reviewedMatch?.profile_name ?? founder.name,
      confidence: reviewedMatch?.confidence ?? 'high' as const,
      source: reviewedMatch?.source ?? 'unified-people-exact-match' as const,
      evidence: reviewedMatch?.evidence ?? 'Exact normalized name with one LinkedIn personal profile in the unified people dataset.',
      observed_at: OBSERVED_AT,
    } : {
      status: 'unresolved' as const,
      profile_name: null,
      confidence: null,
      source: 'linkedin-public-search' as const,
      evidence: unresolved?.reason ?? 'No verified personal LinkedIn profile found.',
      observed_at: OBSERVED_AT,
    },
    source: FOUNDER_SOURCE,
    evidence: {
      label: founder.sourceLabel,
      url: founder.sourceUrl,
      observed_at: OBSERVED_AT,
    },
  }

  const override = founderEdits.rows[id] ?? {}
  const tier = override.tier ?? baseRow.tier
  const linkedinWasEdited = Object.prototype.hasOwnProperty.call(override, 'linkedin_url')
  const overriddenLinkedInUrl = override.linkedin_url
    ? canonicalLinkedInProfile(override.linkedin_url)
    : null

  return {
    ...baseRow,
    editorial_order: override.editorial_order ?? baseRow.editorial_order,
    name: override.name ?? baseRow.name,
    companies: override.companies ?? baseRow.companies,
    founder_role: override.founder_role ?? baseRow.founder_role,
    followers: override.followers ?? baseRow.followers,
    target: override.target ?? baseRow.target,
    primary_market: override.primary_market ?? baseRow.primary_market,
    sector: override.sector ?? baseRow.sector,
    tier,
    tier_label: tierLabels[tier],
    why_selected: override.why_selected ?? baseRow.why_selected,
    influence_signal: override.influence_signal ?? baseRow.influence_signal,
    linkedin_url: linkedinWasEdited ? overriddenLinkedInUrl : baseRow.linkedin_url,
    linkedin_review: linkedinWasEdited ? (overriddenLinkedInUrl ? {
      status: 'verified' as const,
      profile_name: override.name ?? baseRow.name,
      confidence: 'high' as const,
      source: 'manual-ui' as const,
      evidence: 'Personal LinkedIn profile URL manually edited in the founders table.',
      observed_at: founderEdits.updated_at?.slice(0, 10) ?? OBSERVED_AT,
    } : {
      status: 'unresolved' as const,
      profile_name: null,
      confidence: null,
      source: 'manual-ui' as const,
      evidence: 'Personal LinkedIn profile URL manually cleared in the founders table.',
      observed_at: founderEdits.updated_at?.slice(0, 10) ?? OBSERVED_AT,
    }) : baseRow.linkedin_review,
    evidence: {
      ...baseRow.evidence,
      label: override.source_label ?? baseRow.evidence.label,
      url: override.source_url ?? baseRow.evidence.url,
    },
  }
})

const unique = <T>(values: T[]) => new Set(values).size === values.length
if (rows.length !== 61) throw new Error(`Expected 61 founders, received ${rows.length}.`)
if (!unique(rows.map((row) => row.id))) throw new Error('Founder IDs must be unique.')
if (!unique(rows.map((row) => normalizeName(row.name)))) throw new Error('Founder names must be unique after normalization.')
if (!unique(rows.map((row) => row.editorial_order))) throw new Error('Editorial order values must be unique.')
if (!rows.every((row) => row.source === FOUNDER_SOURCE)) throw new Error(`Every founder source must be ${FOUNDER_SOURCE}.`)
if (!rows.every((row) => /^https:\/\//.test(row.evidence.url))) throw new Error('Every evidence URL must use HTTPS.')
const linkedInUrls = rows.flatMap((row) => row.linkedin_url ? [row.linkedin_url] : [])
if (!unique(linkedInUrls)) throw new Error('LinkedIn URLs must be unique.')
if (!rows.every((row) => row.linkedin_review.status === 'verified' ? Boolean(row.linkedin_url) : !row.linkedin_url)) {
  throw new Error('LinkedIn review status and profile URL must agree.')
}

const output = {
  schema_version: 'middle-east-founders.v2',
  generated_at: GENERATED_AT,
  observed_at: OBSERVED_AT,
  title: 'Middle East Founders & Entrepreneurs Index',
  scope: 'A source-backed editorial v1 focused on the Arab Middle East: GCC, Egypt, and the Levant, plus non-Arab founders whose companies materially shaped the region. All listed people were living and publicly active or influential at the 1 September 2026 review date.',
  methodology: `Inclusion is based on durable economic or cultural reach, category creation, landmark exits or listings, institution-building, and ecosystem multiplier effects. Tiers are editorial working groups, not a mathematical league table; order within a tier is a research priority sequence, not a claim that adjacent people are objectively more or less influential. Investors are included only when they also have a substantial company-building record. LinkedIn: ${linkedInReview.methodology}`,
  tier_definitions: [
    { tier: 1, label: tierLabels[1], definition: 'Multi-decade or cross-sector founders whose companies changed a regional market, institution, city, or global perception of Middle Eastern business.' },
    { tier: 2, label: tierLabels[2], definition: 'Founders behind landmark exits, unicorns, public listings, global products, or durable category leadership.' },
    { tier: 3, label: tierLabels[3], definition: 'Current high-impact builders with strong scale, infrastructure value, category influence, or cultural reach.' },
  ],
  stats: {
    people: rows.length,
    tier_1: rows.filter((row) => row.tier === 1).length,
    tier_2: rows.filter((row) => row.tier === 2).length,
    tier_3: rows.filter((row) => row.tier === 3).length,
    primary_markets: new Set(rows.map((row) => row.primary_market)).size,
    sectors: new Set(rows.map((row) => row.sector)).size,
    linkedin_profiles_verified: linkedInUrls.length,
    linkedin_profiles_from_unified_people_exact: rows.filter((row) => row.linkedin_review.source === 'unified-people-exact-match').length,
    linkedin_profiles_from_unified_people_alias: rows.filter((row) => row.linkedin_review.source === 'unified-people-alias-match').length,
    linkedin_profiles_from_public_search: rows.filter((row) => row.linkedin_review.source === 'linkedin-public-search' && row.linkedin_review.status === 'verified').length,
    linkedin_profiles_unresolved: rows.filter((row) => row.linkedin_review.status === 'unresolved').length,
    linkedin_followers_filled: rows.filter((row) => row.followers !== null).length,
    targets_selected: rows.filter((row) => row.target).length,
    rows_with_sources: rows.filter((row) => row.source === FOUNDER_SOURCE).length,
    rows_with_evidence: rows.filter((row) => row.evidence.url).length,
  },
  rows,
}

const csvCell = (value: boolean | string | number | null) => `"${String(value ?? '').replace(/"/g, '""')}"`
const csvRows = [
  ['editorial_order', 'name', 'target', 'companies', 'linkedin_url', 'followers', 'status', 'profile_name', 'confidence', 'match_source', 'match_evidence', 'observed_at', 'source', 'source_evidence_label', 'source_evidence_url'],
  ...rows.map((row) => [
    row.editorial_order,
    row.name,
    row.target,
    row.companies.join(' · '),
    row.linkedin_url,
    row.followers,
    row.linkedin_review.status,
    row.linkedin_review.profile_name,
    row.linkedin_review.confidence,
    row.linkedin_review.source,
    row.linkedin_review.evidence,
    row.linkedin_review.observed_at,
    row.source,
    row.evidence.label,
    row.evidence.url,
  ]),
]
const csv = `${csvRows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`

await mkdir(dirname(outputPath), { recursive: true })
await Promise.all([
  writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8'),
  writeFile(csvOutputPath, csv, 'utf8'),
])

console.log(JSON.stringify({ output: outputPath, csv_output: csvOutputPath, ...output.stats }, null, 2))
