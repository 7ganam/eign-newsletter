// server/app.ts
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { csvFormat, csvParse } from "d3";
import { Hono } from "hono";
import { logger } from "hono/logger";

// assets/people/web-search-people.json
var web_search_people_default = {
  schema_version: "people.v1",
  generated_at: "2026-08-31T17:24:14.015Z",
  source: {
    id: "web-search",
    name: "Web-search influencers",
    type: "research",
    url: null,
    source_files: [
      "assets/people/web-search-people.json"
    ],
    observed_at: "2026-08-28",
    record_count: 144
  },
  people: [
    {
      id: "web-search:zubair-naeem-paracha:1cgjemn",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Zubair Naeem Paracha",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "MENAbytes, Termsheet"
      },
      location: {
        country: null,
        country_code: null,
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/xparacha",
          verification: "web-search",
          followers: {
            count: 42451,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Media & Research",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/xparacha",
          source_url: "https://www.linkedin.com/in/xparacha",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Zubair Naeem Paracha",
              country: "Regional",
              lane: "Media & Research",
              organisation: "MENAbytes, Termsheet",
              linkedinUrl: "https://www.linkedin.com/in/xparacha",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 42451,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:wesley-schwalje:0x2q5rr",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Wesley Schwalje",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Tahseen Consulting"
      },
      location: {
        country: null,
        country_code: null,
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/wesschwalje",
          verification: "web-search",
          followers: {
            count: 16611,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Media & Research",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/wesschwalje",
          source_url: "https://www.linkedin.com/in/wesschwalje",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Wesley Schwalje",
              country: "Regional",
              lane: "Media & Research",
              organisation: "Tahseen Consulting",
              linkedinUrl: "https://www.linkedin.com/in/wesschwalje",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 16611,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:miram-wafik:0qv7lxu",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Miram Wafik",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "The Associate / Funding Pulse"
      },
      location: {
        country: null,
        country_code: null,
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/miram-wafik-31b093133",
          verification: "web-search",
          followers: {
            count: 5408,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Media & Research",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/miram-wafik-31b093133",
          source_url: "https://www.linkedin.com/in/miram-wafik-31b093133",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Miram Wafik",
              country: "Regional",
              lane: "Media & Research",
              organisation: "The Associate / Funding Pulse",
              linkedinUrl: "https://www.linkedin.com/in/miram-wafik-31b093133",
              priority: false,
              arabicOrBilingual: true
            },
            follower: {
              count: 5408,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:lisa-van-vuuren:1j83j6z",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Lisa van Vuuren",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "The Start-up Pulse"
      },
      location: {
        country: null,
        country_code: null,
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/lisa-van-vuuren-60785b13",
          verification: "web-search",
          followers: {
            count: 14867,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Media & Research",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/lisa-van-vuuren-60785b13",
          source_url: "https://www.linkedin.com/in/lisa-van-vuuren-60785b13",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Lisa van Vuuren",
              country: "Regional",
              lane: "Media & Research",
              organisation: "The Start-up Pulse",
              linkedinUrl: "https://www.linkedin.com/in/lisa-van-vuuren-60785b13",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 14867,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:mounir-nakhla:1p1ba2z",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Mounir Nakhla",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "MNT-Halan"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/mounir-nakhla",
          verification: "web-search",
          followers: {
            count: 10388,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/mounir-nakhla",
          source_url: "https://www.linkedin.com/in/mounir-nakhla",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Mounir Nakhla",
              country: "Egypt",
              lane: "Founder",
              organisation: "MNT-Halan",
              linkedinUrl: "https://www.linkedin.com/in/mounir-nakhla",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 10388,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:mostafa-kandil:0ei8hga",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Mostafa Kandil",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Swvl"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/mostafaeissakandil",
          verification: "web-search",
          followers: {
            count: 19575,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/mostafaeissakandil",
          source_url: "https://www.linkedin.com/in/mostafaeissakandil",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Mostafa Kandil",
              country: "Egypt",
              lane: "Founder",
              organisation: "Swvl",
              linkedinUrl: "https://www.linkedin.com/in/mostafaeissakandil",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 19575,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ashraf-sabry:1atleqc",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Ashraf Sabry",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Fawry"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/ashraf-sabry",
          verification: "web-search",
          followers: {
            count: 2366,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/ashraf-sabry",
          source_url: "https://www.linkedin.com/in/ashraf-sabry",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Ashraf Sabry",
              country: "Egypt",
              lane: "Founder",
              organisation: "Fawry",
              linkedinUrl: "https://www.linkedin.com/in/ashraf-sabry",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 2366,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:islam-shawky:0krravl",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Islam Shawky",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Paymob"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/islam-shawky-993306265",
          verification: "web-search",
          followers: {
            count: 9087,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/islam-shawky-993306265",
          source_url: "https://www.linkedin.com/in/islam-shawky-993306265",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Islam Shawky",
              country: "Egypt",
              lane: "Founder",
              organisation: "Paymob",
              linkedinUrl: "https://www.linkedin.com/in/islam-shawky-993306265",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 9087,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:mostafa-amin:1szflxm",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Mostafa Amin",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Breadfast"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/mostafaaminway",
          verification: "web-search",
          followers: {
            count: 24653,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/mostafaaminway",
          source_url: "https://www.linkedin.com/in/mostafaaminway",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Mostafa Amin",
              country: "Egypt",
              lane: "Founder",
              organisation: "Breadfast",
              linkedinUrl: "https://www.linkedin.com/in/mostafaaminway",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 24653,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ahmed-wadi:1k1uz2r",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Ahmed Wadi",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Money Fellows"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/ahmadwadi",
          verification: "web-search",
          followers: {
            count: 22224,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/ahmadwadi",
          source_url: "https://www.linkedin.com/in/ahmadwadi",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Ahmed Wadi",
              country: "Egypt",
              lane: "Founder",
              organisation: "Money Fellows",
              linkedinUrl: "https://www.linkedin.com/in/ahmadwadi",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 22224,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:mostafa-el-beltagy:0wqpnrf",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Mostafa El-Beltagy",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Nawy"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/mostafa-el-beltagy-240b8342",
          verification: "web-search",
          followers: {
            count: 13413,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/mostafa-el-beltagy-240b8342",
          source_url: "https://www.linkedin.com/in/mostafa-el-beltagy-240b8342",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Mostafa El-Beltagy",
              country: "Egypt",
              lane: "Founder",
              organisation: "Nawy",
              linkedinUrl: "https://www.linkedin.com/in/mostafa-el-beltagy-240b8342",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 13413,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:mohamed-ezzat:1mewtkt",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Mohamed Ezzat",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Bosta"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/mohamed-ezzat-67aba7a4",
          verification: "web-search",
          followers: {
            count: 30973,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/mohamed-ezzat-67aba7a4",
          source_url: "https://www.linkedin.com/in/mohamed-ezzat-67aba7a4",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Mohamed Ezzat",
              country: "Egypt",
              lane: "Founder",
              organisation: "Bosta",
              linkedinUrl: "https://www.linkedin.com/in/mohamed-ezzat-67aba7a4",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 30973,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:omar-saleh:0h5re3o",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Omar Saleh",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Khazna"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/omar-saleh-7078555",
          verification: "web-search",
          followers: {
            count: 31151,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/omar-saleh-7078555",
          source_url: "https://www.linkedin.com/in/omar-saleh-7078555",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Omar Saleh",
              country: "Egypt",
              lane: "Founder",
              organisation: "Khazna",
              linkedinUrl: "https://www.linkedin.com/in/omar-saleh-7078555",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 31151,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ahmed-sabbah:0sn9f2h",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Ahmed Sabbah",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Telda"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/ahmedsabbah",
          verification: "web-search",
          followers: {
            count: 18402,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/ahmedsabbah",
          source_url: "https://www.linkedin.com/in/ahmedsabbah",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Ahmed Sabbah",
              country: "Egypt",
              lane: "Founder",
              organisation: "Telda",
              linkedinUrl: "https://www.linkedin.com/in/ahmedsabbah",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 18402,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:belal-el-megharbel:1s6fb4i",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Belal El-Megharbel",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "MaxAB"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/belal-el-megharbel-34718023",
          verification: "web-search",
          followers: {
            count: 9466,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/belal-el-megharbel-34718023",
          source_url: "https://www.linkedin.com/in/belal-el-megharbel-34718023",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Belal El-Megharbel",
              country: "Egypt",
              lane: "Founder",
              organisation: "MaxAB",
              linkedinUrl: "https://www.linkedin.com/in/belal-el-megharbel-34718023",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 9466,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:aly-eltayeb:06v7hy9",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Aly Eltayeb",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Shift EV"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/alyeltayeb",
          verification: "web-search",
          followers: {
            count: 4791,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/alyeltayeb",
          source_url: "https://www.linkedin.com/in/alyeltayeb",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Aly Eltayeb",
              country: "Egypt",
              lane: "Founder",
              organisation: "Shift EV",
              linkedinUrl: "https://www.linkedin.com/in/alyeltayeb",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 4791,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:omar-gabr:0al3ll1",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Omar Gabr",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Luciq, formerly Instabug"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/okgabr",
          verification: "web-search",
          followers: {
            count: 32398,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/okgabr",
          source_url: "https://www.linkedin.com/in/okgabr",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Omar Gabr",
              country: "Egypt",
              lane: "Founder",
              organisation: "Luciq, formerly Instabug",
              linkedinUrl: "https://www.linkedin.com/in/okgabr",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 32398,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:omar-shoukry-sakr:03ekfv8",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Omar Shoukry Sakr",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Nawah Scientific"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/omar-shoukry-sakr-phd-mba",
          verification: "web-search",
          followers: {
            count: 27929,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/omar-shoukry-sakr-phd-mba",
          source_url: "https://www.linkedin.com/in/omar-shoukry-sakr-phd-mba",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Omar Shoukry Sakr",
              country: "Egypt",
              lane: "Founder",
              organisation: "Nawah Scientific",
              linkedinUrl: "https://www.linkedin.com/in/omar-shoukry-sakr-phd-mba",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 27929,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:nour-emam:039dvrq",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Nour Emam",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Daleela"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/nourmemam",
          verification: "web-search",
          followers: {
            count: 7032,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/nourmemam",
          source_url: "https://www.linkedin.com/in/nourmemam",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Nour Emam",
              country: "Egypt",
              lane: "Founder",
              organisation: "Daleela",
              linkedinUrl: "https://www.linkedin.com/in/nourmemam",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 7032,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:amir-barsoum:1rtmpq6",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Amir Barsoum",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "InVitro Capital; Vezeeta founder"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/amirmbarsoum",
          verification: "web-search",
          followers: {
            count: 14290,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/amirmbarsoum",
          source_url: "https://www.linkedin.com/in/amirmbarsoum",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Amir Barsoum",
              country: "Egypt",
              lane: "Founder",
              organisation: "InVitro Capital; Vezeeta founder",
              linkedinUrl: "https://www.linkedin.com/in/amirmbarsoum",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 14290,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:tarek-assaad:1qsp8n8",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Tarek Assaad",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Algebra Ventures"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/tassaad",
          verification: "web-search",
          followers: {
            count: 3754,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/tassaad",
          source_url: "https://www.linkedin.com/in/tassaad",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Tarek Assaad",
              country: "Egypt",
              lane: "Investor",
              organisation: "Algebra Ventures",
              linkedinUrl: "https://www.linkedin.com/in/tassaad",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 3754,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:karim-hussein:1haywp0",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Karim Hussein",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Algebra Ventures"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/karimhussein",
          verification: "web-search",
          followers: {
            count: 3754,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/karimhussein",
          source_url: "https://www.linkedin.com/in/karimhussein",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Karim Hussein",
              country: "Egypt",
              lane: "Investor",
              organisation: "Algebra Ventures",
              linkedinUrl: "https://www.linkedin.com/in/karimhussein",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 3754,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:laila-hassan:0k5aipj",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Laila Hassan",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Algebra Ventures"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/lailaohassan",
          verification: "web-search",
          followers: {
            count: 4101,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/lailaohassan",
          source_url: "https://www.linkedin.com/in/lailaohassan",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Laila Hassan",
              country: "Egypt",
              lane: "Investor",
              organisation: "Algebra Ventures",
              linkedinUrl: "https://www.linkedin.com/in/lailaohassan",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 4101,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:omar-khashaba:160pjwl",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Omar Khashaba",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Algebra Ventures"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/okhashaba",
          verification: "web-search",
          followers: {
            count: 4101,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/okhashaba",
          source_url: "https://www.linkedin.com/in/okhashaba",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Omar Khashaba",
              country: "Egypt",
              lane: "Investor",
              organisation: "Algebra Ventures",
              linkedinUrl: "https://www.linkedin.com/in/okhashaba",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 4101,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ahmed-el-alfi:0brf5ol",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Ahmed El Alfi",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Sawari Ventures; Flat6Labs cofounder"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/ahmed-el-alfi-622a204b",
          verification: "web-search",
          followers: {
            count: 6257,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/ahmed-el-alfi-622a204b",
          source_url: "https://www.linkedin.com/in/ahmed-el-alfi-622a204b",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Ahmed El Alfi",
              country: "Egypt",
              lane: "Investor",
              organisation: "Sawari Ventures; Flat6Labs cofounder",
              linkedinUrl: "https://www.linkedin.com/in/ahmed-el-alfi-622a204b",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 6257,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:hany-al-sonbaty:0sirr1s",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Hany Al-Sonbaty",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Sawari Ventures; F6 Group"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/hany-al-sonbaty-12274322",
          verification: "web-search",
          followers: {
            count: 3844,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/hany-al-sonbaty-12274322",
          source_url: "https://www.linkedin.com/in/hany-al-sonbaty-12274322",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Hany Al-Sonbaty",
              country: "Egypt",
              lane: "Investor",
              organisation: "Sawari Ventures; F6 Group",
              linkedinUrl: "https://www.linkedin.com/in/hany-al-sonbaty-12274322",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 3844,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:dina-el-shenoufy:1ozh2gh",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Dina el-Shenoufy",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "F6 Group and F6 Ventures"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/dinaelshenoufy",
          verification: "web-search",
          followers: {
            count: 4338,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/dinaelshenoufy",
          source_url: "https://www.linkedin.com/in/dinaelshenoufy",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Dina el-Shenoufy",
              country: "Egypt",
              lane: "Investor",
              organisation: "F6 Group and F6 Ventures",
              linkedinUrl: "https://www.linkedin.com/in/dinaelshenoufy",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 4338,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ramez-el-serafy:0fcec7p",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Ramez El-Serafy",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "F6 Group and F6 Ventures"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/ramezm",
          verification: "web-search",
          followers: {
            count: 4338,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/ramezm",
          source_url: "https://www.linkedin.com/in/ramezm",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Ramez El-Serafy",
              country: "Egypt",
              lane: "Investor",
              organisation: "F6 Group and F6 Ventures",
              linkedinUrl: "https://www.linkedin.com/in/ramezm",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 4338,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:mohamed-el-sayed-okasha:0i2kk9v",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Mohamed El Sayed Okasha",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "DisrupTech Ventures"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/mohamed-el-sayed-okasha-056b87a2",
          verification: "web-search",
          followers: {
            count: 4726,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/mohamed-el-sayed-okasha-056b87a2",
          source_url: "https://www.linkedin.com/in/mohamed-el-sayed-okasha-056b87a2",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Mohamed El Sayed Okasha",
              country: "Egypt",
              lane: "Investor",
              organisation: "DisrupTech Ventures",
              linkedinUrl: "https://www.linkedin.com/in/mohamed-el-sayed-okasha-056b87a2",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 4726,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:tarek-fahim:0b9awiz",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Tarek Fahim",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Endure Capital"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/tarekfahim",
          verification: "web-search",
          followers: {
            count: 14960,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/tarekfahim",
          source_url: "https://www.linkedin.com/in/tarekfahim",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Tarek Fahim",
              country: "Egypt",
              lane: "Investor",
              organisation: "Endure Capital",
              linkedinUrl: "https://www.linkedin.com/in/tarekfahim",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 14960,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:karim-beshara:1lpn563",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Karim Beshara",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "A15"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/karimbeshara",
          verification: "web-search",
          followers: {
            count: 4607,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/karimbeshara",
          source_url: "https://www.linkedin.com/in/karimbeshara",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Karim Beshara",
              country: "Egypt",
              lane: "Investor",
              organisation: "A15",
              linkedinUrl: "https://www.linkedin.com/in/karimbeshara",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 4607,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:hanan-abdel-meguid:0vlrrm6",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Hanan Abdel Meguid",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Kamelizer"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/hmeguid",
          verification: "web-search",
          followers: {
            count: 11213,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/hmeguid",
          source_url: "https://www.linkedin.com/in/hmeguid",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Hanan Abdel Meguid",
              country: "Egypt",
              lane: "Investor",
              organisation: "Kamelizer",
              linkedinUrl: "https://www.linkedin.com/in/hmeguid",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 11213,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:dalia-ibrahim:19l8yar",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Dalia Ibrahim",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "EdVentures"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/daliamohamedibrahim",
          verification: "web-search",
          followers: {
            count: 8098,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/daliamohamedibrahim",
          source_url: "https://www.linkedin.com/in/daliamohamedibrahim",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Dalia Ibrahim",
              country: "Egypt",
              lane: "Investor",
              organisation: "EdVentures",
              linkedinUrl: "https://www.linkedin.com/in/daliamohamedibrahim",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 8098,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:mohamed-aboulnaga-nagaty:0f0f0gx",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Mohamed Aboulnaga \u201CNagaty\u201D",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Exits MENA; FORAS AI"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/nagaty",
          verification: "web-search",
          followers: {
            count: 463063,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/nagaty",
          source_url: "https://www.linkedin.com/in/nagaty",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Mohamed Aboulnaga \u201CNagaty\u201D",
              country: "Egypt",
              lane: "Founder",
              organisation: "Exits MENA; FORAS AI",
              linkedinUrl: "https://www.linkedin.com/in/nagaty",
              priority: false,
              arabicOrBilingual: true
            },
            follower: {
              count: 463063,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:fadi-antaki:18b8dz9",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Fadi Antaki",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "BitRoot; formerly A15"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/fadiantaki",
          verification: "web-search",
          followers: {
            count: 14445,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/fadiantaki",
          source_url: "https://www.linkedin.com/in/fadiantaki",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Fadi Antaki",
              country: "Egypt",
              lane: "Ecosystem",
              organisation: "BitRoot; formerly A15",
              linkedinUrl: "https://www.linkedin.com/in/fadiantaki",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 14445,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:abdelhameed-sharara:0d1g2n1",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Abdelhameed Sharara",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "RiseUp"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/abdelhameed-sharara-6a983456",
          verification: "web-search",
          followers: {
            count: 19144,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/abdelhameed-sharara-6a983456",
          source_url: "https://www.linkedin.com/in/abdelhameed-sharara-6a983456",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Abdelhameed Sharara",
              country: "Egypt",
              lane: "Ecosystem",
              organisation: "RiseUp",
              linkedinUrl: "https://www.linkedin.com/in/abdelhameed-sharara-6a983456",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 19144,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ayman-ismail:1tcgqx6",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Ayman Ismail",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "AUC"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/aymanism",
          verification: "web-search",
          followers: {
            count: 29404,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/aymanism",
          source_url: "https://www.linkedin.com/in/aymanism",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Ayman Ismail",
              country: "Egypt",
              lane: "Ecosystem",
              organisation: "AUC",
              linkedinUrl: "https://www.linkedin.com/in/aymanism",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 29404,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:amr-el-abd:1re7j4i",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Amr El Abd",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Endeavor MENA; PM adviser"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/amr-elabd79",
          verification: "web-search",
          followers: {
            count: 10187,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/amr-elabd79",
          source_url: "https://www.linkedin.com/in/amr-elabd79",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Amr El Abd",
              country: "Egypt",
              lane: "Ecosystem",
              organisation: "Endeavor MENA; PM adviser",
              linkedinUrl: "https://www.linkedin.com/in/amr-elabd79",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 10187,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:maged-ghoneima:0f1dpys",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Maged Ghoneima",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Startup Egypt"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/mghoneima",
          verification: "web-search",
          followers: {
            count: 48004,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/mghoneima",
          source_url: "https://www.linkedin.com/in/mghoneima",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Maged Ghoneima",
              country: "Egypt",
              lane: "Ecosystem",
              organisation: "Startup Egypt",
              linkedinUrl: "https://www.linkedin.com/in/mghoneima",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 48004,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:mohamed-ehab-hafez:0me2itu",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Mohamed Ehab Hafez",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Entlaq"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/mohamed-ehab-hafez",
          verification: "web-search",
          followers: {
            count: 10512,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Media & Research",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/mohamed-ehab-hafez",
          source_url: "https://www.linkedin.com/in/mohamed-ehab-hafez",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Mohamed Ehab Hafez",
              country: "Egypt",
              lane: "Media & Research",
              organisation: "Entlaq",
              linkedinUrl: "https://www.linkedin.com/in/mohamed-ehab-hafez",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 10512,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:tamer-taha:015pzi4",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Tamer Taha",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Egypt Startup Charter contributor"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/tamertaha",
          verification: "web-search",
          followers: {
            count: 5943,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Policy",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/tamertaha",
          source_url: "https://www.linkedin.com/in/tamertaha",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Tamer Taha",
              country: "Egypt",
              lane: "Policy",
              organisation: "Egypt Startup Charter contributor",
              linkedinUrl: "https://www.linkedin.com/in/tamertaha",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 5943,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:mohamed-farid-saleh:13rbdj6",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Mohamed Farid Saleh",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Minister of Investment and Foreign Trade"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/mohamed-farid-saleh-97527246",
          verification: "web-search",
          followers: {
            count: 5439,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Policy",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/mohamed-farid-saleh-97527246",
          source_url: "https://www.linkedin.com/in/mohamed-farid-saleh-97527246",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Mohamed Farid Saleh",
              country: "Egypt",
              lane: "Policy",
              organisation: "Minister of Investment and Foreign Trade",
              linkedinUrl: "https://www.linkedin.com/in/mohamed-farid-saleh-97527246",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 5439,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:rania-ayman:1eo2y4o",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Rania Ayman",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Entreprenelle"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/raniaayman",
          verification: "web-search",
          followers: {
            count: 121505,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/raniaayman",
          source_url: "https://www.linkedin.com/in/raniaayman",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Rania Ayman",
              country: "Egypt",
              lane: "Ecosystem",
              organisation: "Entreprenelle",
              linkedinUrl: "https://www.linkedin.com/in/raniaayman",
              priority: false,
              arabicOrBilingual: true
            },
            follower: {
              count: 121505,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:gamal-helmy:0nrvkkl",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Gamal Helmy",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "WAYA Media"
      },
      location: {
        country: "Egypt",
        country_code: "EG",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/gamal-helmy",
          verification: "web-search",
          followers: {
            count: 921,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Media & Research",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/gamal-helmy",
          source_url: "https://www.linkedin.com/in/gamal-helmy",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Gamal Helmy",
              country: "Egypt",
              lane: "Media & Research",
              organisation: "WAYA Media",
              linkedinUrl: "https://www.linkedin.com/in/gamal-helmy",
              priority: false,
              arabicOrBilingual: true
            },
            follower: {
              count: 921,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:nora-m-alsarhan:0fjw6du",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Nora M. Alsarhan",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Saudi Venture Capital"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/nora-m-alsarhan",
          verification: "web-search",
          followers: {
            count: 4854,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/nora-m-alsarhan",
          source_url: "https://www.linkedin.com/in/nora-m-alsarhan",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Nora M. Alsarhan",
              country: "Saudi Arabia",
              lane: "Investor",
              organisation: "Saudi Venture Capital",
              linkedinUrl: "https://www.linkedin.com/in/nora-m-alsarhan",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 4854,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:bandr-alhomaly:0fktka8",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Bandr Alhomaly",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Jada"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/bandr-alhomaly-cfa-a0603152",
          verification: "web-search",
          followers: {
            count: 10880,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/bandr-alhomaly-cfa-a0603152",
          source_url: "https://www.linkedin.com/in/bandr-alhomaly-cfa-a0603152",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Bandr Alhomaly",
              country: "Saudi Arabia",
              lane: "Investor",
              organisation: "Jada",
              linkedinUrl: "https://www.linkedin.com/in/bandr-alhomaly-cfa-a0603152",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 10880,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:abdulrahman-tarabzouni:0uf37p3",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Abdulrahman Tarabzouni",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "STV"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/aitmit",
          verification: "web-search",
          followers: {
            count: 22808,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/aitmit",
          source_url: "https://www.linkedin.com/in/aitmit",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Abdulrahman Tarabzouni",
              country: "Saudi Arabia",
              lane: "Investor",
              organisation: "STV",
              linkedinUrl: "https://www.linkedin.com/in/aitmit",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 22808,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:amal-dokhan:0al7k81",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Amal Dokhan",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "500 Global MENA"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/amaldokhan",
          verification: "web-search",
          followers: {
            count: 16110,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/amaldokhan",
          source_url: "https://www.linkedin.com/in/amaldokhan",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Amal Dokhan",
              country: "Saudi Arabia",
              lane: "Investor",
              organisation: "500 Global MENA",
              linkedinUrl: "https://www.linkedin.com/in/amaldokhan",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 16110,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:omar-almajdouie:19qpkkr",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Omar Almajdouie",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "RAED Ventures"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/omaralmajdouie",
          verification: "web-search",
          followers: {
            count: 22224,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/omaralmajdouie",
          source_url: "https://www.linkedin.com/in/omaralmajdouie",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Omar Almajdouie",
              country: "Saudi Arabia",
              lane: "Investor",
              organisation: "RAED Ventures",
              linkedinUrl: "https://www.linkedin.com/in/omaralmajdouie",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 22224,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:abdulaziz-al-omran:04ihqnk",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Abdulaziz Al Omran",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Impact46"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/abdulaziz-al-omran-82029a2",
          verification: "web-search",
          followers: {
            count: 12192,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/abdulaziz-al-omran-82029a2",
          source_url: "https://www.linkedin.com/in/abdulaziz-al-omran-82029a2",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Abdulaziz Al Omran",
              country: "Saudi Arabia",
              lane: "Investor",
              organisation: "Impact46",
              linkedinUrl: "https://www.linkedin.com/in/abdulaziz-al-omran-82029a2",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 12192,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:abdullah-altamami:1qxdvxk",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Abdullah Altamami",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Merak Capital"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/aaltamami",
          verification: "web-search",
          followers: {
            count: 12933,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/aaltamami",
          source_url: "https://www.linkedin.com/in/aaltamami",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Abdullah Altamami",
              country: "Saudi Arabia",
              lane: "Investor",
              organisation: "Merak Capital",
              linkedinUrl: "https://www.linkedin.com/in/aaltamami",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 12933,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:adwa-aldakheel:0vda2i9",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Adwa AlDakheel",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Falak Investment Hub"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/adwa-aldakheel-ababb23a",
          verification: "web-search",
          followers: {
            count: 58788,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/adwa-aldakheel-ababb23a",
          source_url: "https://www.linkedin.com/in/adwa-aldakheel-ababb23a",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Adwa AlDakheel",
              country: "Saudi Arabia",
              lane: "Investor",
              organisation: "Falak Investment Hub",
              linkedinUrl: "https://www.linkedin.com/in/adwa-aldakheel-ababb23a",
              priority: false,
              arabicOrBilingual: true
            },
            follower: {
              count: 58788,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:fahad-alidi:0mz0eye",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Fahad Alidi",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Wa\u2019ed"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/fahadalidi",
          verification: "web-search",
          followers: {
            count: 1788,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/fahadalidi",
          source_url: "https://www.linkedin.com/in/fahadalidi",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Fahad Alidi",
              country: "Saudi Arabia",
              lane: "Investor",
              organisation: "Wa\u2019ed",
              linkedinUrl: "https://www.linkedin.com/in/fahadalidi",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 1788,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:mohammed-almeshekah:1f81467",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Mohammed Almeshekah",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Outliers"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/meshekah",
          verification: "web-search",
          followers: {
            count: 11246,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/meshekah",
          source_url: "https://www.linkedin.com/in/meshekah",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Mohammed Almeshekah",
              country: "Saudi Arabia",
              lane: "Investor",
              organisation: "Outliers",
              linkedinUrl: "https://www.linkedin.com/in/meshekah",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 11246,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:badr-al-badr:19td0ui",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Badr Al Badr",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Misk Foundation"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/badralbadr",
          verification: "web-search",
          followers: {
            count: 44408,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/badralbadr",
          source_url: "https://www.linkedin.com/in/badralbadr",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Badr Al Badr",
              country: "Saudi Arabia",
              lane: "Ecosystem",
              organisation: "Misk Foundation",
              linkedinUrl: "https://www.linkedin.com/in/badralbadr",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 44408,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ibrahim-neyaz:1t4x5eg",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Ibrahim Neyaz",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "NTDP"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/alneyazi",
          verification: "web-search",
          followers: {
            count: 6245,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Policy",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/alneyazi",
          source_url: "https://www.linkedin.com/in/alneyazi",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Ibrahim Neyaz",
              country: "Saudi Arabia",
              lane: "Policy",
              organisation: "NTDP",
              linkedinUrl: "https://www.linkedin.com/in/alneyazi",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 6245,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:saud-alsabhan:0opcbxe",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Saud Alsabhan",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Monsha\u2019at"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/saud-alsabhan-16b1927",
          verification: "web-search",
          followers: {
            count: 14593,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/saud-alsabhan-16b1927",
          source_url: "https://www.linkedin.com/in/saud-alsabhan-16b1927",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Saud Alsabhan",
              country: "Saudi Arabia",
              lane: "Ecosystem",
              organisation: "Monsha\u2019at",
              linkedinUrl: "https://www.linkedin.com/in/saud-alsabhan-16b1927",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 14593,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:hattan-ahmed:1csco4a",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Hattan Ahmed",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "KAUST and TAQADAM"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/hattan-ahmed-2222484",
          verification: "web-search",
          followers: {
            count: 15599,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/hattan-ahmed-2222484",
          source_url: "https://www.linkedin.com/in/hattan-ahmed-2222484",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Hattan Ahmed",
              country: "Saudi Arabia",
              lane: "Ecosystem",
              organisation: "KAUST and TAQADAM",
              linkedinUrl: "https://www.linkedin.com/in/hattan-ahmed-2222484",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 15599,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:tareq-amin:09q9ou3",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Tareq Amin",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "HUMAIN"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/tareq-amin-b58302",
          verification: "web-search",
          followers: {
            count: 198702,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/tareq-amin-b58302",
          source_url: "https://www.linkedin.com/in/tareq-amin-b58302",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Tareq Amin",
              country: "Saudi Arabia",
              lane: "Ecosystem",
              organisation: "HUMAIN",
              linkedinUrl: "https://www.linkedin.com/in/tareq-amin-b58302",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 198702,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:abdulmajeed-alsukhan:1d56u66",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Abdulmajeed Alsukhan",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Tamara"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/abdulmajeed-alsukhan-%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D9%85%D8%AC%D9%8A%D8%AF-%D8%A7%D9%84%D8%B5%D9%8A%D8%AE%D8%A7%D9%86-13000a58",
          verification: "web-search",
          followers: {
            count: 10568,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/abdulmajeed-alsukhan-%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D9%85%D8%AC%D9%8A%D8%AF-%D8%A7%D9%84%D8%B5%D9%8A%D8%AE%D8%A7%D9%86-13000a58",
          source_url: "https://www.linkedin.com/in/abdulmajeed-alsukhan-%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D9%85%D8%AC%D9%8A%D8%AF-%D8%A7%D9%84%D8%B5%D9%8A%D8%AE%D8%A7%D9%86-13000a58",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Abdulmajeed Alsukhan",
              country: "Saudi Arabia",
              lane: "Founder",
              organisation: "Tamara",
              linkedinUrl: "https://www.linkedin.com/in/abdulmajeed-alsukhan-%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D9%85%D8%AC%D9%8A%D8%AF-%D8%A7%D9%84%D8%B5%D9%8A%D8%AE%D8%A7%D9%86-13000a58",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 10568,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ahmad-alzaini:1d4fc87",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Ahmad AlZaini",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Foodics"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/alzaini",
          verification: "web-search",
          followers: {
            count: 42129,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/alzaini",
          source_url: "https://www.linkedin.com/in/alzaini",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Ahmad AlZaini",
              country: "Saudi Arabia",
              lane: "Founder",
              organisation: "Foodics",
              linkedinUrl: "https://www.linkedin.com/in/alzaini",
              priority: false,
              arabicOrBilingual: true
            },
            follower: {
              count: 42129,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:hisham-al-falih:0qbk2t5",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Hisham Al-Falih",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Lean Technologies"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/hishamfalih",
          verification: "web-search",
          followers: {
            count: 4662,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/hishamfalih",
          source_url: "https://www.linkedin.com/in/hishamfalih",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Hisham Al-Falih",
              country: "Saudi Arabia",
              lane: "Founder",
              organisation: "Lean Technologies",
              linkedinUrl: "https://www.linkedin.com/in/hishamfalih",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 4662,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:abdullah-asiri:09uiyid",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Abdullah Asiri",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Lucidya"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/amasiri",
          verification: "web-search",
          followers: {
            count: 28346,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/amasiri",
          source_url: "https://www.linkedin.com/in/amasiri",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Abdullah Asiri",
              country: "Saudi Arabia",
              lane: "Founder",
              organisation: "Lucidya",
              linkedinUrl: "https://www.linkedin.com/in/amasiri",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 28346,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ahmed-hamdan:1ycy7s3",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Ahmed Hamdan",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Unifonic"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/hamdanahmed",
          verification: "web-search",
          followers: {
            count: 19405,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/hamdanahmed",
          source_url: "https://www.linkedin.com/in/hamdanahmed",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Ahmed Hamdan",
              country: "Saudi Arabia",
              lane: "Founder",
              organisation: "Unifonic",
              linkedinUrl: "https://www.linkedin.com/in/hamdanahmed",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 19405,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:abdulaziz-al-jouf:10ehfbh",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Abdulaziz Al Jouf",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "PayTabs"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/abdulaziz-aljouf",
          verification: "web-search",
          followers: {
            count: 15015,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/abdulaziz-aljouf",
          source_url: "https://www.linkedin.com/in/abdulaziz-aljouf",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Abdulaziz Al Jouf",
              country: "Saudi Arabia",
              lane: "Founder",
              organisation: "PayTabs",
              linkedinUrl: "https://www.linkedin.com/in/abdulaziz-aljouf",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 15015,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:nawaf-hareeri:1wp3wnq",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Nawaf Hareeri",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Salla"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/nawaf-hareeri-47b42a152",
          verification: "web-search",
          followers: {
            count: 2707,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/nawaf-hareeri-47b42a152",
          source_url: "https://www.linkedin.com/in/nawaf-hareeri-47b42a152",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Nawaf Hareeri",
              country: "Saudi Arabia",
              lane: "Founder",
              organisation: "Salla",
              linkedinUrl: "https://www.linkedin.com/in/nawaf-hareeri-47b42a152",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 2707,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:osama-alraee:1jj2b5g",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Osama AlRaee",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Lendo"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/osamaalraee",
          verification: "web-search",
          followers: {
            count: 4580,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/osamaalraee",
          source_url: "https://www.linkedin.com/in/osamaalraee",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Osama AlRaee",
              country: "Saudi Arabia",
              lane: "Founder",
              organisation: "Lendo",
              linkedinUrl: "https://www.linkedin.com/in/osamaalraee",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 4580,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:sami-alhelwah:17hatv3",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Sami Alhelwah",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Nana"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/samialhulwah",
          verification: "web-search",
          followers: {
            count: 20347,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/samialhulwah",
          source_url: "https://www.linkedin.com/in/samialhulwah",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Sami Alhelwah",
              country: "Saudi Arabia",
              lane: "Founder",
              organisation: "Nana",
              linkedinUrl: "https://www.linkedin.com/in/samialhulwah",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 20347,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:mohammad-almadani:0xm6gz2",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Mohammad Almadani",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Classera"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/mohammad-s-almadani-12307b29",
          verification: "web-search",
          followers: {
            count: 1250,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/mohammad-s-almadani-12307b29",
          source_url: "https://www.linkedin.com/in/mohammad-s-almadani-12307b29",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Mohammad Almadani",
              country: "Saudi Arabia",
              lane: "Founder",
              organisation: "Classera",
              linkedinUrl: "https://www.linkedin.com/in/mohammad-s-almadani-12307b29",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 1250,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:mojahed-akil:12fj1s6",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Mojahed Akil",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Beyond Ventures; Saudi startup newsletter"
      },
      location: {
        country: "Saudi Arabia",
        country_code: "SA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/mojahedakil",
          verification: "web-search",
          followers: {
            count: 8721,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Media & Research",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/mojahedakil",
          source_url: "https://www.linkedin.com/in/mojahedakil",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Mojahed Akil",
              country: "Saudi Arabia",
              lane: "Media & Research",
              organisation: "Beyond Ventures; Saudi startup newsletter",
              linkedinUrl: "https://www.linkedin.com/in/mojahedakil",
              priority: false,
              arabicOrBilingual: true
            },
            follower: {
              count: 8721,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:omar-sultan-alolama:0a8nms8",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Omar Sultan AlOlama",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "UAE government; Dubai Chamber"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/omar-sultan-alolama-305b8366",
          verification: "web-search",
          followers: {
            count: 37775,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Policy",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/omar-sultan-alolama-305b8366",
          source_url: "https://www.linkedin.com/in/omar-sultan-alolama-305b8366",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Omar Sultan AlOlama",
              country: "United Arab Emirates",
              lane: "Policy",
              organisation: "UAE government; Dubai Chamber",
              linkedinUrl: "https://www.linkedin.com/in/omar-sultan-alolama-305b8366",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 37775,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:khalfan-belhoul:0pi8ow4",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Khalfan Belhoul",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Dubai Future Foundation"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/khalfan-belhoul-937a4a1a2",
          verification: "web-search",
          followers: {
            count: 2356,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/khalfan-belhoul-937a4a1a2",
          source_url: "https://www.linkedin.com/in/khalfan-belhoul-937a4a1a2",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Khalfan Belhoul",
              country: "United Arab Emirates",
              lane: "Ecosystem",
              organisation: "Dubai Future Foundation",
              linkedinUrl: "https://www.linkedin.com/in/khalfan-belhoul-937a4a1a2",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 2356,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ahmad-ali-alwan:00t93r4",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Ahmad Ali Alwan",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Hub71"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/ahmad-ali-alwan-64900b18",
          verification: "web-search",
          followers: {
            count: 8224,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/ahmad-ali-alwan-64900b18",
          source_url: "https://www.linkedin.com/in/ahmad-ali-alwan-64900b18",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Ahmad Ali Alwan",
              country: "United Arab Emirates",
              lane: "Ecosystem",
              organisation: "Hub71",
              linkedinUrl: "https://www.linkedin.com/in/ahmad-ali-alwan-64900b18",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 8224,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:sara-al-nuaimi:0vqw7nq",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Sara Al Nuaimi",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Sheraa"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/sara-al-nuaimi-910a882",
          verification: "web-search",
          followers: {
            count: 4214,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/sara-al-nuaimi-910a882",
          source_url: "https://www.linkedin.com/in/sara-al-nuaimi-910a882",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Sara Al Nuaimi",
              country: "United Arab Emirates",
              lane: "Ecosystem",
              organisation: "Sheraa",
              linkedinUrl: "https://www.linkedin.com/in/sara-al-nuaimi-910a882",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 4214,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:bodour-al-qasimi:08pfq16",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Bodour Al Qasimi",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Sheraa"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/bodour-al-qasimi-61a79b165",
          verification: "web-search",
          followers: {
            count: 414587,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/bodour-al-qasimi-61a79b165",
          source_url: "https://www.linkedin.com/in/bodour-al-qasimi-61a79b165",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Bodour Al Qasimi",
              country: "United Arab Emirates",
              lane: "Ecosystem",
              organisation: "Sheraa",
              linkedinUrl: "https://www.linkedin.com/in/bodour-al-qasimi-61a79b165",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 414587,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:badr-al-olama:1jr68vj",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Badr Al-Olama",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Abu Dhabi Investment Office"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/badr-al-olama-828816",
          verification: "web-search",
          followers: {
            count: 50967,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Policy",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/badr-al-olama-828816",
          source_url: "https://www.linkedin.com/in/badr-al-olama-828816",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Badr Al-Olama",
              country: "United Arab Emirates",
              lane: "Policy",
              organisation: "Abu Dhabi Investment Office",
              linkedinUrl: "https://www.linkedin.com/in/badr-al-olama-828816",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 50967,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:hadi-badri:15pj6sj",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Hadi Badri",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Dubai Founders HQ"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/hadibadri",
          verification: "web-search",
          followers: {
            count: 11017,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/hadibadri",
          source_url: "https://www.linkedin.com/in/hadibadri",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Hadi Badri",
              country: "United Arab Emirates",
              lane: "Ecosystem",
              organisation: "Dubai Founders HQ",
              linkedinUrl: "https://www.linkedin.com/in/hadibadri",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 11017,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:arif-amiri:1cyihky",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Arif Amiri",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "DIFC"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/arif-amiri",
          verification: "web-search",
          followers: {
            count: 10158,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/arif-amiri",
          source_url: "https://www.linkedin.com/in/arif-amiri",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Arif Amiri",
              country: "United Arab Emirates",
              lane: "Ecosystem",
              organisation: "DIFC",
              linkedinUrl: "https://www.linkedin.com/in/arif-amiri",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 10158,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:saeed-al-gergawi:0qk47mg",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Saeed Al Gergawi",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Dubai Chamber"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/saeedalgergawi",
          verification: "web-search",
          followers: {
            count: 4203,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/saeedalgergawi",
          source_url: "https://www.linkedin.com/in/saeedalgergawi",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Saeed Al Gergawi",
              country: "United Arab Emirates",
              lane: "Ecosystem",
              organisation: "Dubai Chamber",
              linkedinUrl: "https://www.linkedin.com/in/saeedalgergawi",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 4203,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ammar-al-malik:1u8frmg",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Ammar Al Malik",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Dubai Internet City"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/ammaralmalik",
          verification: "web-search",
          followers: {
            count: 9357,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/ammaralmalik",
          source_url: "https://www.linkedin.com/in/ammaralmalik",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Ammar Al Malik",
              country: "United Arab Emirates",
              lane: "Ecosystem",
              organisation: "Dubai Internet City",
              linkedinUrl: "https://www.linkedin.com/in/ammaralmalik",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 9357,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:noor-sweid:0zoxvvs",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Noor Sweid",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Global Ventures"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/noor-sweid",
          verification: "web-search",
          followers: {
            count: 71414,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/noor-sweid",
          source_url: "https://www.linkedin.com/in/noor-sweid",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Noor Sweid",
              country: "United Arab Emirates",
              lane: "Investor",
              organisation: "Global Ventures",
              linkedinUrl: "https://www.linkedin.com/in/noor-sweid",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 71414,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:fadi-ghandour:1xln8xb",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Fadi Ghandour",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Wamda Capital; Aramex founder"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/fadi-ghandour-52353b",
          verification: "web-search",
          followers: {
            count: 747360,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/fadi-ghandour-52353b",
          source_url: "https://www.linkedin.com/in/fadi-ghandour-52353b",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Fadi Ghandour",
              country: "United Arab Emirates",
              lane: "Investor",
              organisation: "Wamda Capital; Aramex founder",
              linkedinUrl: "https://www.linkedin.com/in/fadi-ghandour-52353b",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 747360,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:dany-farha:0f7u6y1",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Dany Farha",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "BECO Capital"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/danyfarha",
          verification: "web-search",
          followers: {
            count: 6226,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/danyfarha",
          source_url: "https://www.linkedin.com/in/danyfarha",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Dany Farha",
              country: "United Arab Emirates",
              lane: "Investor",
              organisation: "BECO Capital",
              linkedinUrl: "https://www.linkedin.com/in/danyfarha",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 6226,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:amir-farha:0aqtdsw",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Amir Farha",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "COTU Ventures"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/amirfarha",
          verification: "web-search",
          followers: {
            count: 12300,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/amirfarha",
          source_url: "https://www.linkedin.com/in/amirfarha",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Amir Farha",
              country: "United Arab Emirates",
              lane: "Investor",
              organisation: "COTU Ventures",
              linkedinUrl: "https://www.linkedin.com/in/amirfarha",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 12300,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:walid-hanna:0actzxf",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Walid Hanna",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "MEVP"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/walid-s-hanna",
          verification: "web-search",
          followers: {
            count: 6825,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/walid-s-hanna",
          source_url: "https://www.linkedin.com/in/walid-s-hanna",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Walid Hanna",
              country: "United Arab Emirates",
              lane: "Investor",
              organisation: "MEVP",
              linkedinUrl: "https://www.linkedin.com/in/walid-s-hanna",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 6825,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:mahmoud-adi:04npqd7",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Mahmoud Adi",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Shorooq"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/m-adi",
          verification: "web-search",
          followers: {
            count: 41578,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/m-adi",
          source_url: "https://www.linkedin.com/in/m-adi",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Mahmoud Adi",
              country: "United Arab Emirates",
              lane: "Investor",
              organisation: "Shorooq",
              linkedinUrl: "https://www.linkedin.com/in/m-adi",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 41578,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:shane-shin:1fjr0tu",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Shane Shin",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Shorooq"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/shaneykshin",
          verification: "web-search",
          followers: {
            count: 33326,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/shaneykshin",
          source_url: "https://www.linkedin.com/in/shaneykshin",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Shane Shin",
              country: "United Arab Emirates",
              lane: "Investor",
              organisation: "Shorooq",
              linkedinUrl: "https://www.linkedin.com/in/shaneykshin",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 33326,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:sonia-weymuller:1qa67uj",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Sonia Weymuller",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "VentureSouq"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/soniaweymuller",
          verification: "web-search",
          followers: {
            count: 5955,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/soniaweymuller",
          source_url: "https://www.linkedin.com/in/soniaweymuller",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Sonia Weymuller",
              country: "United Arab Emirates",
              lane: "Investor",
              organisation: "VentureSouq",
              linkedinUrl: "https://www.linkedin.com/in/soniaweymuller",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 5955,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ibrahim-ajami:0rz74e2",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Ibrahim Ajami",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Mubadala Capital"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/ibrahim-ajami-17925456",
          verification: "web-search",
          followers: {
            count: 571,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/ibrahim-ajami-17925456",
          source_url: "https://www.linkedin.com/in/ibrahim-ajami-17925456",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Ibrahim Ajami",
              country: "United Arab Emirates",
              lane: "Investor",
              organisation: "Mubadala Capital",
              linkedinUrl: "https://www.linkedin.com/in/ibrahim-ajami-17925456",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 571,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:huda-al-lawati:19jcczf",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Huda Al-Lawati",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Aliph Capital"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/huda-al-lawati-62051a5",
          verification: "web-search",
          followers: {
            count: 22551,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/huda-al-lawati-62051a5",
          source_url: "https://www.linkedin.com/in/huda-al-lawati-62051a5",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Huda Al-Lawati",
              country: "United Arab Emirates",
              lane: "Investor",
              organisation: "Aliph Capital",
              linkedinUrl: "https://www.linkedin.com/in/huda-al-lawati-62051a5",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 22551,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:philip-bahoshy:1bp4gzn",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Philip Bahoshy",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "MAGNiTT"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/philipbahoshy",
          verification: "web-search",
          followers: {
            count: 30397,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Media & Research",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/philipbahoshy",
          source_url: "https://www.linkedin.com/in/philipbahoshy",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Philip Bahoshy",
              country: "United Arab Emirates",
              lane: "Media & Research",
              organisation: "MAGNiTT",
              linkedinUrl: "https://www.linkedin.com/in/philipbahoshy",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 30397,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:mudassir-sheikha:0ni1hn0",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Mudassir Sheikha",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Careem"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/mudassirsheikha",
          verification: "web-search",
          followers: {
            count: 32743,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/mudassirsheikha",
          source_url: "https://www.linkedin.com/in/mudassirsheikha",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Mudassir Sheikha",
              country: "United Arab Emirates",
              lane: "Founder",
              organisation: "Careem",
              linkedinUrl: "https://www.linkedin.com/in/mudassirsheikha",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 32743,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ronaldo-mouchawar:0n7rpid",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Ronaldo Mouchawar",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Souq.com; Amazon"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/ronaldomouchawar",
          verification: "web-search",
          followers: {
            count: 15166,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/ronaldomouchawar",
          source_url: "https://www.linkedin.com/in/ronaldomouchawar",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Ronaldo Mouchawar",
              country: "United Arab Emirates",
              lane: "Founder",
              organisation: "Souq.com; Amazon",
              linkedinUrl: "https://www.linkedin.com/in/ronaldomouchawar",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 15166,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:hosam-arab:1rxp5cx",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Hosam Arab",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Tabby"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/hosam",
          verification: "web-search",
          followers: {
            count: 13671,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/hosam",
          source_url: "https://www.linkedin.com/in/hosam",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Hosam Arab",
              country: "United Arab Emirates",
              lane: "Founder",
              organisation: "Tabby",
              linkedinUrl: "https://www.linkedin.com/in/hosam",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 13671,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:michael-lahyani:1pgihsw",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Michael Lahyani",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Property Finder"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/michael-lahyani-25827b4",
          verification: "web-search",
          followers: {
            count: 4168,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/michael-lahyani-25827b4",
          source_url: "https://www.linkedin.com/in/michael-lahyani-25827b4",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Michael Lahyani",
              country: "United Arab Emirates",
              lane: "Founder",
              organisation: "Property Finder",
              linkedinUrl: "https://www.linkedin.com/in/michael-lahyani-25827b4",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 4168,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:faisal-toukan:1qj0vn4",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Faisal Toukan",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Ziina"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/faisal-toukan-64865064",
          verification: "web-search",
          followers: {
            count: 18815,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/faisal-toukan-64865064",
          source_url: "https://www.linkedin.com/in/faisal-toukan-64865064",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Faisal Toukan",
              country: "United Arab Emirates",
              lane: "Founder",
              organisation: "Ziina",
              linkedinUrl: "https://www.linkedin.com/in/faisal-toukan-64865064",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 18815,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ola-doudin:0hkvpbb",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Ola Doudin",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "BitOasis"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/ola-doudin-5a026511",
          verification: "web-search",
          followers: {
            count: 6581,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/ola-doudin-5a026511",
          source_url: "https://www.linkedin.com/in/ola-doudin-5a026511",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Ola Doudin",
              country: "United Arab Emirates",
              lane: "Founder",
              organisation: "BitOasis",
              linkedinUrl: "https://www.linkedin.com/in/ola-doudin-5a026511",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 6581,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:elie-habib:1alpcg7",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Elie Habib",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Anghami"
      },
      location: {
        country: "United Arab Emirates",
        country_code: "AE",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/eliashabib",
          verification: "web-search",
          followers: {
            count: 48998,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/eliashabib",
          source_url: "https://www.linkedin.com/in/eliashabib",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Elie Habib",
              country: "United Arab Emirates",
              lane: "Founder",
              organisation: "Anghami",
              linkedinUrl: "https://www.linkedin.com/in/eliashabib",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 48998,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:sheikh-ali-bin-alwaleed-al-thani:01u98fn",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Sheikh Ali bin Alwaleed Al-Thani",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Invest Qatar"
      },
      location: {
        country: "Qatar",
        country_code: "QA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/ali-al-thani-794879196",
          verification: "web-search",
          followers: {
            count: 2807,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Policy",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/ali-al-thani-794879196",
          source_url: "https://www.linkedin.com/in/ali-al-thani-794879196",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Sheikh Ali bin Alwaleed Al-Thani",
              country: "Qatar",
              lane: "Policy",
              organisation: "Invest Qatar",
              linkedinUrl: "https://www.linkedin.com/in/ali-al-thani-794879196",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 2807,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:rama-chakaki:14jifwb",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Rama Chakaki",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "QSTP"
      },
      location: {
        country: "Qatar",
        country_code: "QA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/rchakaki",
          verification: "web-search",
          followers: {
            count: 19743,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/rchakaki",
          source_url: "https://www.linkedin.com/in/rchakaki",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Rama Chakaki",
              country: "Qatar",
              lane: "Ecosystem",
              organisation: "QSTP",
              linkedinUrl: "https://www.linkedin.com/in/rchakaki",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 19743,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:hayfa-al-abdulla:0xbo41t",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Hayfa Al-Abdulla",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "QSTP"
      },
      location: {
        country: "Qatar",
        country_code: "QA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/haifaa",
          verification: "web-search",
          followers: {
            count: 3815,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/haifaa",
          source_url: "https://www.linkedin.com/in/haifaa",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Hayfa Al-Abdulla",
              country: "Qatar",
              lane: "Ecosystem",
              organisation: "QSTP",
              linkedinUrl: "https://www.linkedin.com/in/haifaa",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 3815,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:mansoor-al-khater:1g5ddh2",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Mansoor Al-Khater",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Qatar Financial Centre"
      },
      location: {
        country: "Qatar",
        country_code: "QA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/mansooralkhater",
          verification: "web-search",
          followers: {
            count: 17308,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/mansooralkhater",
          source_url: "https://www.linkedin.com/in/mansooralkhater",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Mansoor Al-Khater",
              country: "Qatar",
              lane: "Ecosystem",
              organisation: "Qatar Financial Centre",
              linkedinUrl: "https://www.linkedin.com/in/mansooralkhater",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 17308,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:huzayfa-patel:1gllg9k",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Huzayfa Patel",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "QFC Digital Assets Lab"
      },
      location: {
        country: "Qatar",
        country_code: "QA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/huzayfa-patel",
          verification: "web-search",
          followers: {
            count: 3527,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/huzayfa-patel",
          source_url: "https://www.linkedin.com/in/huzayfa-patel",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Huzayfa Patel",
              country: "Qatar",
              lane: "Ecosystem",
              organisation: "QFC Digital Assets Lab",
              linkedinUrl: "https://www.linkedin.com/in/huzayfa-patel",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 3527,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:michael-lints:18pwcks",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Michael Lints",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Golden Gate Ventures MENA"
      },
      location: {
        country: "Qatar",
        country_code: "QA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/mhlints",
          verification: "web-search",
          followers: {
            count: 24943,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/mhlints",
          source_url: "https://www.linkedin.com/in/mhlints",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Michael Lints",
              country: "Qatar",
              lane: "Investor",
              organisation: "Golden Gate Ventures MENA",
              linkedinUrl: "https://www.linkedin.com/in/mhlints",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 24943,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:alexander-wiedmer:09hhrqk",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Alexander Wiedmer",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Rasmal Ventures"
      },
      location: {
        country: "Qatar",
        country_code: "QA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/alexwiedmer13061968",
          verification: "web-search",
          followers: {
            count: 1598,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/alexwiedmer13061968",
          source_url: "https://www.linkedin.com/in/alexwiedmer13061968",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Alexander Wiedmer",
              country: "Qatar",
              lane: "Investor",
              organisation: "Rasmal Ventures",
              linkedinUrl: "https://www.linkedin.com/in/alexwiedmer13061968",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 1598,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:soumaya-ben-beya-dridje:0pif7gd",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Soumaya Ben Beya Dridje",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Rasmal Ventures"
      },
      location: {
        country: "Qatar",
        country_code: "QA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/soumaya-ben-beya-dridje-25574466",
          verification: "web-search",
          followers: {
            count: 1598,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/soumaya-ben-beya-dridje-25574466",
          source_url: "https://www.linkedin.com/in/soumaya-ben-beya-dridje-25574466",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Soumaya Ben Beya Dridje",
              country: "Qatar",
              lane: "Investor",
              organisation: "Rasmal Ventures",
              linkedinUrl: "https://www.linkedin.com/in/soumaya-ben-beya-dridje-25574466",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 1598,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:hamad-mubarak-al-hajri:1gixq8z",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Hamad Mubarak Al-Hajri",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Snoonu; GrowthX"
      },
      location: {
        country: "Qatar",
        country_code: "QA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/hamadmubarkalhajri",
          verification: "web-search",
          followers: {
            count: 135525,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/hamadmubarkalhajri",
          source_url: "https://www.linkedin.com/in/hamadmubarkalhajri",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Hamad Mubarak Al-Hajri",
              country: "Qatar",
              lane: "Founder",
              organisation: "Snoonu; GrowthX",
              linkedinUrl: "https://www.linkedin.com/in/hamadmubarkalhajri",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 135525,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:nayef-al-ibrahim:1juvhbj",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Nayef Al-Ibrahim",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Ibtechar"
      },
      location: {
        country: "Qatar",
        country_code: "QA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/nayef-al-ibrahim-070a5916",
          verification: "web-search",
          followers: {
            count: 6259,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/nayef-al-ibrahim-070a5916",
          source_url: "https://www.linkedin.com/in/nayef-al-ibrahim-070a5916",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Nayef Al-Ibrahim",
              country: "Qatar",
              lane: "Founder",
              organisation: "Ibtechar",
              linkedinUrl: "https://www.linkedin.com/in/nayef-al-ibrahim-070a5916",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 6259,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:steve-mackie:004ouxk",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Steve Mackie",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Business Start Up Qatar"
      },
      location: {
        country: "Qatar",
        country_code: "QA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/stevemackiesolutionsfour",
          verification: "web-search",
          followers: {
            count: 17393,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Media & Research",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/stevemackiesolutionsfour",
          source_url: "https://www.linkedin.com/in/stevemackiesolutionsfour",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Steve Mackie",
              country: "Qatar",
              lane: "Media & Research",
              organisation: "Business Start Up Qatar",
              linkedinUrl: "https://www.linkedin.com/in/stevemackiesolutionsfour",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 17393,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:hanan-el-basha:12iz70r",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Dr Hanan El Basha",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "The Business Doctor"
      },
      location: {
        country: "Qatar",
        country_code: "QA",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/drhananelbasha",
          verification: "web-search",
          followers: {
            count: 6803,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/drhananelbasha",
          source_url: "https://www.linkedin.com/in/drhananelbasha",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Dr Hanan El Basha",
              country: "Qatar",
              lane: "Ecosystem",
              organisation: "The Business Doctor",
              linkedinUrl: "https://www.linkedin.com/in/drhananelbasha",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 6803,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:maha-mofeez:02y2ed0",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Maha Mofeez",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Tamkeen"
      },
      location: {
        country: "Bahrain",
        country_code: "BH",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/maha-mofeez-40291525",
          verification: "web-search",
          followers: {
            count: 1509,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/maha-mofeez-40291525",
          source_url: "https://www.linkedin.com/in/maha-mofeez-40291525",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Maha Mofeez",
              country: "Bahrain",
              lane: "Ecosystem",
              organisation: "Tamkeen",
              linkedinUrl: "https://www.linkedin.com/in/maha-mofeez-40291525",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 1509,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:dalal-buhejji:0l8cjbm",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Dalal Buhejji",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Bahrain EDB"
      },
      location: {
        country: "Bahrain",
        country_code: "BH",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/dbuhejji",
          verification: "web-search",
          followers: {
            count: 15859,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Policy",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/dbuhejji",
          source_url: "https://www.linkedin.com/in/dbuhejji",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Dalal Buhejji",
              country: "Bahrain",
              lane: "Policy",
              organisation: "Bahrain EDB",
              linkedinUrl: "https://www.linkedin.com/in/dbuhejji",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 15859,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:bader-sater:1piq9k8",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Bader Sater",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Bahrain FinTech Bay"
      },
      location: {
        country: "Bahrain",
        country_code: "BH",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/badersater",
          verification: "web-search",
          followers: {
            count: 2186,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/badersater",
          source_url: "https://www.linkedin.com/in/badersater",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Bader Sater",
              country: "Bahrain",
              lane: "Ecosystem",
              organisation: "Bahrain FinTech Bay",
              linkedinUrl: "https://www.linkedin.com/in/badersater",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 2186,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:latifa-mohamed-jabbar:0mt1g7l",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Latifa Mohamed Jabbar",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Hope Ventures"
      },
      location: {
        country: "Bahrain",
        country_code: "BH",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/latifa-mohammed",
          verification: "web-search",
          followers: {
            count: 20937,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/latifa-mohammed",
          source_url: "https://www.linkedin.com/in/latifa-mohammed",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Latifa Mohamed Jabbar",
              country: "Bahrain",
              lane: "Investor",
              organisation: "Hope Ventures",
              linkedinUrl: "https://www.linkedin.com/in/latifa-mohammed",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 20937,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:areije-al-shakar:1r9bf97",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Areije Al Shakar",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "BeVentures"
      },
      location: {
        country: "Bahrain",
        country_code: "BH",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/areije",
          verification: "web-search",
          followers: {
            count: 3279,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/areije",
          source_url: "https://www.linkedin.com/in/areije",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Areije Al Shakar",
              country: "Bahrain",
              lane: "Investor",
              organisation: "BeVentures",
              linkedinUrl: "https://www.linkedin.com/in/areije",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 3279,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:hasan-haider:12j45rb",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Hasan Haider",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Plus VC"
      },
      location: {
        country: "Bahrain",
        country_code: "BH",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/hasanhaider",
          verification: "web-search",
          followers: {
            count: 31228,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/hasanhaider",
          source_url: "https://www.linkedin.com/in/hasanhaider",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Hasan Haider",
              country: "Bahrain",
              lane: "Investor",
              organisation: "Plus VC",
              linkedinUrl: "https://www.linkedin.com/in/hasanhaider",
              priority: false,
              arabicOrBilingual: true
            },
            follower: {
              count: 31228,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ahmed-al-rawi:0ubidl2",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Ahmed Al Rawi",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Calo"
      },
      location: {
        country: "Bahrain",
        country_code: "BH",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/rawi",
          verification: "web-search",
          followers: {
            count: null,
            observed_at: null,
            status: "not-verified",
            precision: null,
            source: null
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/rawi",
          source_url: "https://www.linkedin.com/in/rawi",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Ahmed Al Rawi",
              country: "Bahrain",
              lane: "Founder",
              organisation: "Calo",
              linkedinUrl: "https://www.linkedin.com/in/rawi",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: null,
              observed_at: null,
              status: "not-verified",
              precision: null,
              source: null
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:abdulla-almoayed:0a868ts",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Abdulla Almoayed",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Tarabut"
      },
      location: {
        country: "Bahrain",
        country_code: "BH",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/aalmoayed",
          verification: "web-search",
          followers: {
            count: 24593,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/aalmoayed",
          source_url: "https://www.linkedin.com/in/aalmoayed",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Abdulla Almoayed",
              country: "Bahrain",
              lane: "Founder",
              organisation: "Tarabut",
              linkedinUrl: "https://www.linkedin.com/in/aalmoayed",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 24593,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:nezar-kadhem:1fcrx65",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Nezar Kadhem",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Eat App"
      },
      location: {
        country: "Bahrain",
        country_code: "BH",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/nezarkadhem",
          verification: "web-search",
          followers: {
            count: 5202,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/nezarkadhem",
          source_url: "https://www.linkedin.com/in/nezarkadhem",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Nezar Kadhem",
              country: "Bahrain",
              lane: "Founder",
              organisation: "Eat App",
              linkedinUrl: "https://www.linkedin.com/in/nezarkadhem",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 5202,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:wafa-al-obaidat:1vmmhs9",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Wafa Al Obaidat",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "PLAYBOOK"
      },
      location: {
        country: "Bahrain",
        country_code: "BH",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/wafa-al-obaidat-8a992046",
          verification: "web-search",
          followers: {
            count: 35348,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/wafa-al-obaidat-8a992046",
          source_url: "https://www.linkedin.com/in/wafa-al-obaidat-8a992046",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Wafa Al Obaidat",
              country: "Bahrain",
              lane: "Founder",
              organisation: "PLAYBOOK",
              linkedinUrl: "https://www.linkedin.com/in/wafa-al-obaidat-8a992046",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 35348,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ali-alalawi:1dl6ngn",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Ali Alalawi",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Unipal"
      },
      location: {
        country: "Bahrain",
        country_code: "BH",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/ali-alalawi",
          verification: "web-search",
          followers: {
            count: 9433,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/ali-alalawi",
          source_url: "https://www.linkedin.com/in/ali-alalawi",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Ali Alalawi",
              country: "Bahrain",
              lane: "Founder",
              organisation: "Unipal",
              linkedinUrl: "https://www.linkedin.com/in/ali-alalawi",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 9433,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:fajer-al-pachachi:0jn44d6",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Fajer Al Pachachi",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Esterad Bank; Bahrain Chamber"
      },
      location: {
        country: "Bahrain",
        country_code: "BH",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/fajer-saleh-al-pachachi-b38ab116",
          verification: "web-search",
          followers: {
            count: null,
            observed_at: null,
            status: "not-verified",
            precision: null,
            source: null
          }
        }
      ],
      influence: {
        lane: "Policy",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/fajer-saleh-al-pachachi-b38ab116",
          source_url: "https://www.linkedin.com/in/fajer-saleh-al-pachachi-b38ab116",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Fajer Al Pachachi",
              country: "Bahrain",
              lane: "Policy",
              organisation: "Esterad Bank; Bahrain Chamber",
              linkedinUrl: "https://www.linkedin.com/in/fajer-saleh-al-pachachi-b38ab116",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: null,
              observed_at: null,
              status: "not-verified",
              precision: null,
              source: null
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:mohammed-jaffar:1p4qou9",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Mohammed Jaffar",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Faith Capital; former Talabat CEO"
      },
      location: {
        country: "Kuwait",
        country_code: "KW",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/mohammed-jaffar-01110a71",
          verification: "web-search",
          followers: {
            count: 5837,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/mohammed-jaffar-01110a71",
          source_url: "https://www.linkedin.com/in/mohammed-jaffar-01110a71",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Mohammed Jaffar",
              country: "Kuwait",
              lane: "Investor",
              organisation: "Faith Capital; former Talabat CEO",
              linkedinUrl: "https://www.linkedin.com/in/mohammed-jaffar-01110a71",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 5837,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:abdulaziz-al-loughani:1cpelgq",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Abdulaziz Al Loughani",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Floward; Faith Capital"
      },
      location: {
        country: "Kuwait",
        country_code: "KW",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/aballoughani",
          verification: "web-search",
          followers: {
            count: 7444,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/aballoughani",
          source_url: "https://www.linkedin.com/in/aballoughani",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Abdulaziz Al Loughani",
              country: "Kuwait",
              lane: "Founder",
              organisation: "Floward; Faith Capital",
              linkedinUrl: "https://www.linkedin.com/in/aballoughani",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 7444,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:hasan-zainal:0l2j3fx",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Hasan Zainal",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Arzan VC"
      },
      location: {
        country: "Kuwait",
        country_code: "KW",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/hasanzainal",
          verification: "web-search",
          followers: {
            count: 2718,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/hasanzainal",
          source_url: "https://www.linkedin.com/in/hasanzainal",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Hasan Zainal",
              country: "Kuwait",
              lane: "Investor",
              organisation: "Arzan VC",
              linkedinUrl: "https://www.linkedin.com/in/hasanzainal",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 2718,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:mona-al-mukhaizeem:0wdsj52",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Mona Al-Mukhaizeem",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Savour Ventures; Sirdab Lab"
      },
      location: {
        country: "Kuwait",
        country_code: "KW",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/mona-al-mukhaizeem-921aba8",
          verification: "web-search",
          followers: {
            count: null,
            observed_at: null,
            status: "not-verified",
            precision: null,
            source: null
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/mona-al-mukhaizeem-921aba8",
          source_url: "https://www.linkedin.com/in/mona-al-mukhaizeem-921aba8",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Mona Al-Mukhaizeem",
              country: "Kuwait",
              lane: "Investor",
              organisation: "Savour Ventures; Sirdab Lab",
              linkedinUrl: "https://www.linkedin.com/in/mona-al-mukhaizeem-921aba8",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: null,
              observed_at: null,
              status: "not-verified",
              precision: null,
              source: null
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:nawaf-arhamah:0a0hc3e",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Nawaf Arhamah",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "F3 Capital"
      },
      location: {
        country: "Kuwait",
        country_code: "KW",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/nawafarhamah",
          verification: "web-search",
          followers: {
            count: 739,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/nawafarhamah",
          source_url: "https://www.linkedin.com/in/nawafarhamah",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Nawaf Arhamah",
              country: "Kuwait",
              lane: "Investor",
              organisation: "F3 Capital",
              linkedinUrl: "https://www.linkedin.com/in/nawafarhamah",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 739,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ali-abulhasan:039iss4",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Ali Abulhasan",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Tap Payments"
      },
      location: {
        country: "Kuwait",
        country_code: "KW",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/akabulhasan",
          verification: "web-search",
          followers: {
            count: 13378,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/akabulhasan",
          source_url: "https://www.linkedin.com/in/akabulhasan",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Ali Abulhasan",
              country: "Kuwait",
              lane: "Founder",
              organisation: "Tap Payments",
              linkedinUrl: "https://www.linkedin.com/in/akabulhasan",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 13378,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:yousef-alhusaini:0nir5m6",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Yousef Alhusaini",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Baims"
      },
      location: {
        country: "Kuwait",
        country_code: "KW",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/yalhusaini",
          verification: "web-search",
          followers: {
            count: 7348,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/yalhusaini",
          source_url: "https://www.linkedin.com/in/yalhusaini",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Yousef Alhusaini",
              country: "Kuwait",
              lane: "Founder",
              organisation: "Baims",
              linkedinUrl: "https://www.linkedin.com/in/yalhusaini",
              priority: false,
              arabicOrBilingual: true
            },
            follower: {
              count: 7348,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:hashim-behbehani:0wdua6s",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Hashim Behbehani",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "CODED; StartupQ8"
      },
      location: {
        country: "Kuwait",
        country_code: "KW",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/hashimkb",
          verification: "web-search",
          followers: {
            count: 4810,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/hashimkb",
          source_url: "https://www.linkedin.com/in/hashimkb",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Hashim Behbehani",
              country: "Kuwait",
              lane: "Ecosystem",
              organisation: "CODED; StartupQ8",
              linkedinUrl: "https://www.linkedin.com/in/hashimkb",
              priority: false,
              arabicOrBilingual: true
            },
            follower: {
              count: 4810,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:haya-almana:00qgkbg",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Haya AlMana",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "BNK Academy; formerly ZINC"
      },
      location: {
        country: "Kuwait",
        country_code: "KW",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/hayaalmana",
          verification: "web-search",
          followers: {
            count: 2688,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/hayaalmana",
          source_url: "https://www.linkedin.com/in/hayaalmana",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Haya AlMana",
              country: "Kuwait",
              lane: "Ecosystem",
              organisation: "BNK Academy; formerly ZINC",
              linkedinUrl: "https://www.linkedin.com/in/hayaalmana",
              priority: false,
              arabicOrBilingual: true
            },
            follower: {
              count: 2688,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:malek-hammoud:0845u04",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Malek Hammoud",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Zain Ventures"
      },
      location: {
        country: "Kuwait",
        country_code: "KW",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/malek-hammoud-cfa-6689545",
          verification: "web-search",
          followers: {
            count: null,
            observed_at: null,
            status: "not-verified",
            precision: null,
            source: null
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/malek-hammoud-cfa-6689545",
          source_url: "https://www.linkedin.com/in/malek-hammoud-cfa-6689545",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Malek Hammoud",
              country: "Kuwait",
              lane: "Investor",
              organisation: "Zain Ventures",
              linkedinUrl: "https://www.linkedin.com/in/malek-hammoud-cfa-6689545",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: null,
              observed_at: null,
              status: "not-verified",
              precision: null,
              source: null
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:dalal-alrayes:1vxqx5c",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Dalal AlRayes",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Spare"
      },
      location: {
        country: "Kuwait",
        country_code: "KW",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/dalalalrayes",
          verification: "web-search",
          followers: {
            count: 6187,
            observed_at: "2026-08-30",
            status: "observed",
            precision: "exact",
            source: "linkedin-profile"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/dalalalrayes",
          source_url: "https://www.linkedin.com/in/dalalalrayes",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Dalal AlRayes",
              country: "Kuwait",
              lane: "Founder",
              organisation: "Spare",
              linkedinUrl: "https://www.linkedin.com/in/dalalalrayes",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 6187,
              observed_at: "2026-08-30",
              status: "observed",
              precision: "exact",
              source: "linkedin-profile"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:bader-al-ghanim:0jul9xa",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Bader Al-Ghanim",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "talabat"
      },
      location: {
        country: "Kuwait",
        country_code: "KW",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/bader-al-ghanim-973a5b17",
          verification: "web-search",
          followers: {
            count: 4683,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Ecosystem",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/bader-al-ghanim-973a5b17",
          source_url: "https://www.linkedin.com/in/bader-al-ghanim-973a5b17",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Bader Al-Ghanim",
              country: "Kuwait",
              lane: "Ecosystem",
              organisation: "talabat",
              linkedinUrl: "https://www.linkedin.com/in/bader-al-ghanim-973a5b17",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 4683,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:talib-al-rashdi:0r0x9u1",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Talib Al-Rashdi",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "ITHCA Group"
      },
      location: {
        country: "Oman",
        country_code: "OM",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/talib-al-rashdi-5214abb8",
          verification: "web-search",
          followers: {
            count: null,
            observed_at: null,
            status: "not-verified",
            precision: null,
            source: null
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/talib-al-rashdi-5214abb8",
          source_url: "https://www.linkedin.com/in/talib-al-rashdi-5214abb8",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Talib Al-Rashdi",
              country: "Oman",
              lane: "Investor",
              organisation: "ITHCA Group",
              linkedinUrl: "https://www.linkedin.com/in/talib-al-rashdi-5214abb8",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: null,
              observed_at: null,
              status: "not-verified",
              precision: null,
              source: null
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ali-al-shidhani:117ayfg",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Dr Ali Al Shidhani",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "MTCIT"
      },
      location: {
        country: "Oman",
        country_code: "OM",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/alialshidhani",
          verification: "web-search",
          followers: {
            count: 28054,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Policy",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/alialshidhani",
          source_url: "https://www.linkedin.com/in/alialshidhani",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Dr Ali Al Shidhani",
              country: "Oman",
              lane: "Policy",
              organisation: "MTCIT",
              linkedinUrl: "https://www.linkedin.com/in/alialshidhani",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 28054,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:ali-muqaibal:08rhr03",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Ali Muqaibal",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Sharakah"
      },
      location: {
        country: "Oman",
        country_code: "OM",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/alimuqaibal",
          verification: "web-search",
          followers: {
            count: 3743,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/alimuqaibal",
          source_url: "https://www.linkedin.com/in/alimuqaibal",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Ali Muqaibal",
              country: "Oman",
              lane: "Investor",
              organisation: "Sharakah",
              linkedinUrl: "https://www.linkedin.com/in/alimuqaibal",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 3743,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:abdullah-al-shaksy:1w5brh4",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Abdullah Al-Shaksy",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Phaze Ventures"
      },
      location: {
        country: "Oman",
        country_code: "OM",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/abdullah-al-shaksy",
          verification: "web-search",
          followers: {
            count: 7745,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/abdullah-al-shaksy",
          source_url: "https://www.linkedin.com/in/abdullah-al-shaksy",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Abdullah Al-Shaksy",
              country: "Oman",
              lane: "Investor",
              organisation: "Phaze Ventures",
              linkedinUrl: "https://www.linkedin.com/in/abdullah-al-shaksy",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 7745,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:masoud-al-rawahi:1r7a4ju",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Masoud Al-Rawahi",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Phaze Ventures; PhazeRo"
      },
      location: {
        country: "Oman",
        country_code: "OM",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/masoud-al-rawahi-15bb0714",
          verification: "web-search",
          followers: {
            count: 7296,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Investor",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/masoud-al-rawahi-15bb0714",
          source_url: "https://www.linkedin.com/in/masoud-al-rawahi-15bb0714",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Masoud Al-Rawahi",
              country: "Oman",
              lane: "Investor",
              organisation: "Phaze Ventures; PhazeRo",
              linkedinUrl: "https://www.linkedin.com/in/masoud-al-rawahi-15bb0714",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 7296,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:adnan-alshuaili:1xvwbeq",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Adnan Alshuaili",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "eMushrif"
      },
      location: {
        country: "Oman",
        country_code: "OM",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/adnan-alshuaili-470413136",
          verification: "web-search",
          followers: {
            count: 1207,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/adnan-alshuaili-470413136",
          source_url: "https://www.linkedin.com/in/adnan-alshuaili-470413136",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Adnan Alshuaili",
              country: "Oman",
              lane: "Founder",
              organisation: "eMushrif",
              linkedinUrl: "https://www.linkedin.com/in/adnan-alshuaili-470413136",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 1207,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:majid-alamri:04kdaoh",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Majid AlAmri",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Thawani Pay"
      },
      location: {
        country: "Oman",
        country_code: "OM",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/majid-alamri-0144271a9",
          verification: "web-search",
          followers: {
            count: 4791,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/majid-alamri-0144271a9",
          source_url: "https://www.linkedin.com/in/majid-alamri-0144271a9",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Majid AlAmri",
              country: "Oman",
              lane: "Founder",
              organisation: "Thawani Pay",
              linkedinUrl: "https://www.linkedin.com/in/majid-alamri-0144271a9",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 4791,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:talal-hasan:0k9y29j",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Talal Hasan",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "44.01"
      },
      location: {
        country: "Oman",
        country_code: "OM",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/talal-hasan",
          verification: "web-search",
          followers: {
            count: 6142,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/talal-hasan",
          source_url: "https://www.linkedin.com/in/talal-hasan",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Talal Hasan",
              country: "Oman",
              lane: "Founder",
              organisation: "44.01",
              linkedinUrl: "https://www.linkedin.com/in/talal-hasan",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 6142,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:harith-maqbali:0bf1rw8",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Harith Maqbali",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "OTaxi"
      },
      location: {
        country: "Oman",
        country_code: "OM",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/harith-maqbali-85456365",
          verification: "web-search",
          followers: {
            count: 1052,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Founder",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/harith-maqbali-85456365",
          source_url: "https://www.linkedin.com/in/harith-maqbali-85456365",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Harith Maqbali",
              country: "Oman",
              lane: "Founder",
              organisation: "OTaxi",
              linkedinUrl: "https://www.linkedin.com/in/harith-maqbali-85456365",
              priority: false,
              arabicOrBilingual: false
            },
            follower: {
              count: 1052,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    },
    {
      id: "web-search:mohammed-al-tamami:1pqtqsq",
      source_ids: [
        "web-search"
      ],
      name: {
        display: "Mohammed Al-Tamami",
        title: null,
        passport: null,
        certificate: null
      },
      current_role: {
        title: null,
        organization: "Mamun"
      },
      location: {
        country: "Oman",
        country_code: "OM",
        city: null,
        nationality: null
      },
      biography: null,
      specialties: [],
      image: {
        url: null,
        source_path: null,
        alt: null
      },
      profiles: [
        {
          platform: "linkedin",
          url: "https://www.linkedin.com/in/mohamed-tamami",
          verification: "web-search",
          followers: {
            count: 24768,
            observed_at: "2026-08-28",
            status: "observed",
            precision: "exact",
            source: "search-index"
          }
        }
      ],
      influence: {
        lane: "Media & Research",
        priority: false,
        middle_eastern: {
          value: null,
          method: null,
          reason: null,
          manually_overridden: false
        }
      },
      event_appearances: [],
      source_records: [
        {
          source_id: "web-search",
          record_id: "https://www.linkedin.com/in/mohamed-tamami",
          source_url: "https://www.linkedin.com/in/mohamed-tamami",
          observed_at: "2026-08-28",
          verification: "web-search",
          raw: {
            directory: {
              name: "Mohammed Al-Tamami",
              country: "Oman",
              lane: "Media & Research",
              organisation: "Mamun",
              linkedinUrl: "https://www.linkedin.com/in/mohamed-tamami",
              priority: false,
              arabicOrBilingual: true
            },
            follower: {
              count: 24768,
              observed_at: "2026-08-28",
              status: "observed",
              precision: "exact",
              source: "search-index"
            },
            followers_updated_at: "2026-08-30"
          }
        }
      ]
    }
  ]
};

// server/app.ts
var PROJECT_ROOT = process.env.VERCEL ? process.cwd() : resolve(dirname(fileURLToPath(import.meta.url)), "..");
var DATA_FILES = {
  companies: resolve(PROJECT_ROOT, "eign_index.companies.json"),
  rounds: resolve(PROJECT_ROOT, "eign_index.rounds.json")
};
var TABLE_PREFERENCES_FILE = resolve(PROJECT_ROOT, "assets/table-preferences.json");
var WEB_SEARCH_PEOPLE_FILE = resolve(PROJECT_ROOT, "assets/people/web-search-people.json");
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
var webSearchPeopleFile = structuredClone(web_search_people_default);
var webSearchRawRecord = (person) => person.source_records.find((record) => record.source_id === "web-search")?.raw;
var influencerFromPerson = (person) => {
  const rawDirectory = webSearchRawRecord(person)?.directory;
  const linkedIn = person.profiles.find((profile) => profile.platform === "linkedin");
  return {
    name: person.name.display,
    country: rawDirectory?.country ?? person.location.country ?? "Regional",
    lane: person.influence.lane ?? rawDirectory?.lane ?? "Ecosystem",
    organisation: person.current_role.organization ?? rawDirectory?.organisation ?? "Unknown",
    linkedinUrl: linkedIn?.url ?? rawDirectory?.linkedinUrl ?? "",
    priority: person.influence.priority ?? rawDirectory?.priority ?? false
  };
};
var followerFromPerson = (person) => {
  const follower = person.profiles.find((profile) => profile.platform === "linkedin")?.followers;
  return follower ? {
    count: follower.count,
    observedAt: follower.observed_at,
    status: follower.status,
    precision: follower.precision ?? void 0,
    source: follower.source ?? void 0
  } : {
    count: null,
    observedAt: null,
    status: "not-verified"
  };
};
var influencerRecords = webSearchPeopleFile.people.map(influencerFromPerson);
var influencerFollowerSnapshots = webSearchPeopleFile.people.map(followerFromPerson);
var influencerWriteQueue = Promise.resolve();
var influencerRow = (index) => ({
  ...influencerRecords[index],
  __rowId: String(index),
  follower: influencerFollowerSnapshots[index]
});
var saveWebSearchPeopleFile = async () => {
  const tempPath = `${WEB_SEARCH_PEOPLE_FILE}.${process.pid}.tmp`;
  try {
    await writeFile(tempPath, `${JSON.stringify(webSearchPeopleFile, null, 2)}
`, "utf8");
    await rename(tempPath, WEB_SEARCH_PEOPLE_FILE);
  } catch (error) {
    await unlink(tempPath).catch(() => void 0);
    throw error;
  }
};
var COUNTRY_CODES = {
  Bahrain: "BH",
  Egypt: "EG",
  Kuwait: "KW",
  Oman: "OM",
  Qatar: "QA",
  "Saudi Arabia": "SA",
  "United Arab Emirates": "AE"
};
var saveInfluencerRecord = async (index, record) => {
  const person = webSearchPeopleFile.people[index];
  if (!person) throw new Error("The influencer row could not be located in assets/people/web-search-people.json.");
  const linkedIn = person.profiles.find((profile) => profile.platform === "linkedin");
  const sourceRecord = person.source_records.find((source) => source.source_id === "web-search");
  const rawRecord = webSearchRawRecord(person);
  person.name.display = record.name;
  person.current_role.organization = record.organisation;
  person.location.country = record.country === "Regional" ? null : record.country;
  person.location.country_code = COUNTRY_CODES[record.country] ?? null;
  person.influence.lane = record.lane;
  person.influence.priority = record.priority;
  if (linkedIn) linkedIn.url = record.linkedinUrl;
  if (sourceRecord) sourceRecord.source_url = record.linkedinUrl;
  if (rawRecord) rawRecord.directory = { ...rawRecord.directory, ...structuredClone(record) };
  await saveWebSearchPeopleFile();
};
var saveFollowerCount = async (index, count) => {
  const person = webSearchPeopleFile.people[index];
  if (!person) throw new Error("The follower row could not be located in assets/people/web-search-people.json.");
  const linkedIn = person.profiles.find((profile) => profile.platform === "linkedin");
  if (!linkedIn) throw new Error("The converted influencer record has no LinkedIn profile.");
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const snapshot = count === null ? {
    count: null,
    observed_at: null,
    status: "not-verified",
    precision: null,
    source: null
  } : {
    count,
    observed_at: today,
    status: "observed",
    precision: "exact",
    source: "linkedin-profile"
  };
  linkedIn.followers = snapshot;
  const rawRecord = webSearchRawRecord(person);
  if (rawRecord) {
    rawRecord.follower = structuredClone(snapshot);
    rawRecord.followers_updated_at = today;
  }
  await saveWebSearchPeopleFile();
};
var INFLUENCER_COUNTRIES = new Set(influencerRecords.map((influencer) => influencer.country));
var INFLUENCER_LANES = new Set(influencerRecords.map((influencer) => influencer.lane));
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
    } else if (field === "priority") {
      if (typeof value !== "boolean") throw new Error("Expected true or false.");
      next.priority = value;
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
    source: "assets/people/web-search-people.json",
    followerSource: "assets/people/web-search-people.json \xB7 profiles[].followers",
    verifiedAt: webSearchPeopleFile.source.observed_at ?? webSearchPeopleFile.generated_at.slice(0, 10),
    followersUpdatedAt: webSearchPeopleFile.people.map(webSearchRawRecord).find(Boolean)?.followers_updated_at ?? webSearchPeopleFile.generated_at.slice(0, 10)
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
