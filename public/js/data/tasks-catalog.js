/**
 * EARNWAVE - Comprehensive Production Task Catalog
 * Contains 315+ distinct, completely executable tasks with rich assets & experience types.
 */

export const TASK_CATEGORIES = [
  { id: 'all', name: 'All Tasks', iconKey: 'cat_all' },
  { id: 'surveys', name: 'Surveys & Feedback', iconKey: 'cat_surveys' },
  { id: 'ai_data', name: 'AI Evaluation & Tuning', iconKey: 'cat_ai_data' },
  { id: 'writing', name: 'Writing & Translation', iconKey: 'cat_writing' },
  { id: 'forex', name: 'Forex & Market Analysis', iconKey: 'trendUp' },
  { id: 'testing', name: 'App & Website Testing', iconKey: 'cat_testing' },
  { id: 'research', name: 'Fact-Checking & Research', iconKey: 'cat_research' },
  { id: 'local', name: 'Location & Hotel Reviews', iconKey: 'cat_local' },
  { id: 'transcription', name: 'Audio & Video Transcription', iconKey: 'cat_transcription' },
  { id: 'data_entry', name: 'Data Entry & Extraction', iconKey: 'cat_data_entry' },
  { id: 'image', name: 'Image Annotation & Vision', iconKey: 'tag' },
  { id: 'knowledge', name: 'Logic, Code & Quizzes', iconKey: 'cat_knowledge' }
];

// Helper to generate realistic OHLC candlestick bars for Forex tasks
function generateOhlcBars(basePrice, trend, count = 28) {
  const bars = [];
  let currentPrice = basePrice;
  const now = Date.now();
  const stepMs = 15 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const time = new Date(now - (count - i) * stepMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const drift = trend === 'bullish' ? 0.0003 : trend === 'bearish' ? -0.0003 : (Math.random() - 0.5) * 0.0002;
    const change = (Math.random() - 0.48) * 0.0008 + drift;
    const open = currentPrice;
    const close = +(open + change).toFixed(5);
    const high = +(Math.max(open, close) + Math.random() * 0.0004).toFixed(5);
    const low = +(Math.min(open, close) - Math.random() * 0.0004).toFixed(5);
    const volume = Math.floor(120 + Math.random() * 450);

    bars.push({ time, open, high, low, close, volume });
    currentPrice = close;
  }
  return bars;
}

function generateCatalog() {
  const tasks = [];
  let idCounter = 1;

  // ========================================================
  // 1. SURVEYS & FEEDBACK (35 tasks)
  // ========================================================
  const surveyBlueprints = [
    {
      title: 'Mobile Money Interoperability & Fee Sensitivity',
      desc: 'Evaluate monthly M-Pesa, Airtel Money, and bank cross-transfer usage and fee elasticity.',
      reward: 140,
      time: 7,
      diff: 'easy',
      questions: [
        { q: 'Which mobile money platform processes the majority of your daily transactions?', options: ['M-Pesa (Safaricom)', 'Airtel Money', 'T-Kash (Telkom)', 'Bank App Direct (Pesalink)'] },
        { q: 'What is your primary complaint regarding mobile payment charges?', options: ['Withdrawal fees at agents', 'Paybill merchant charges', 'Pay-to-other-network fees', 'Lack of fee transparency before sending'] },
        { q: 'If zero-fee bank-to-mobile transfers are introduced, would you switch providers?', options: ['Definitely yes', 'Likely yes', 'Neutral / No preference', 'No, network reliability matters more'] }
      ]
    },
    {
      title: 'Remote Freelance Connectivity & Power Backup',
      desc: 'Report on fiber internet uptime (Safaricom/Zuku), mobile hotspots, and backup solar generators.',
      reward: 160,
      time: 8,
      diff: 'easy',
      questions: [
        { q: 'What is your primary home internet connection for remote work?', options: ['Fiber Optic (Safaricom / Zuku / Faiba)', '4G/5G Home WiFi Router', 'Mobile Phone Hotspot', 'Shared Co-working Space'] },
        { q: 'How often do unexpected power cuts disrupt your working hours each month?', options: ['Never or rarely (0-1 times)', '2-4 times a month', '5+ times a month', 'Weekly occurrence'] },
        { q: 'What backup equipment do you keep active during blackouts?', options: ['UPS / Inverter battery', 'Mini portable router power bank', 'Secondary mobile data line', 'None / Work pauses'] }
      ]
    },
    {
      title: 'E-Commerce Delivery Reliability in Urban Hubs',
      desc: 'Survey on parcel delivery tracking, rider courtesies, and return friction on local platforms.',
      reward: 130,
      time: 6,
      diff: 'easy',
      questions: [
        { q: 'When ordering goods online, which delivery method do you prefer?', options: ['Doorstep delivery to home/office', 'Collection point / Pick-up station', 'Bus courier parcel office', 'Meet rider at nearby landmark'] },
        { q: 'Have you ever refused a delivery or requested a return due to incorrect items?', options: ['Yes, resolved smoothly', 'Yes, but refund took too long', 'No, deliveries have been accurate', 'I rarely buy physical goods online'] },
        { q: 'What is the maximum acceptable delivery window for local goods?', options: ['Same-day (within 6 hours)', 'Next-day (within 24 hours)', '2-3 business days', 'Up to 5 business days'] }
      ]
    },
    {
      title: 'Digital Micro-Lending Apps & Repayment Terms',
      desc: 'Consumer perceptions of short-term mobile loans, rollover interest, and credit scoring.',
      reward: 190,
      time: 10,
      diff: 'medium',
      questions: [
        { q: 'Have you used a mobile lending app (e.g. Fuliza, Tala, Branch) in the past 6 months?', options: ['Frequently (weekly)', 'Occasionally (monthly)', 'Only in rare emergencies', 'Never used mobile credit'] },
        { q: 'Do you find the interest rates and repayment periods transparent before borrowing?', options: ['Very transparent', 'Somewhat clear but confusing fees', 'Hidden rollover costs', 'Unacceptable rates'] },
        { q: 'How should mobile lenders improve their credit risk assessment?', options: ['Lower interest for on-time payers', 'Longer repayment flexibility', 'Fewer SMS reminders', 'No access to contact lists'] }
      ]
    },
    {
      title: 'Renewable Solar & Pay-As-You-Go Energy Adoption',
      desc: 'Feedback on solar home systems, solar water heating, and grid displacement in peri-urban areas.',
      reward: 175,
      time: 9,
      diff: 'medium',
      questions: [
        { q: 'Do you currently utilize any solar power solutions at your residence?', options: ['Full solar inverter with batteries', 'Solar water heating only', 'Solar security lighting', 'Exclusively national grid'] },
        { q: 'What holds you back from expanding your solar installation?', options: ['High upfront battery capital cost', 'Rented apartment restrictions', 'Lack of trusted technicians', 'Satisfied with current setup'] },
        { q: 'How would you rate the value of Pay-As-You-Go solar financing models?', options: ['Excellent for accessibility', 'Good but total cost is high', 'Prefer buying outright', 'Unfamiliar with the model'] }
      ]
    },
    {
      title: 'Public Matatu Transit vs Ride-Hailing Safety',
      desc: 'Compare safety precautions, cashless fare adoption, and reliability across commute options.',
      reward: 150,
      time: 8,
      diff: 'easy',
      questions: [
        { q: 'What is your primary mode of commute for work or university?', options: ['Matatu / Public bus', 'Ride-hailing (Uber / Bolt / Little)', 'Boda Boda motorcycle', 'Personal car or walking'] },
        { q: 'How often do matatu conductors demand cash instead of mobile money?', options: ['Always accept mobile money', 'Often complain about transaction fees', 'Strictly demand cash during rush hour', 'I only use card or app'] },
        { q: 'What factor most strongly influences your ride-hailing app choice?', options: ['Lowest pricing / Discounts', 'Driver arrival speed', 'Safety / Ride-sharing tracking', 'Driver professionalism'] }
      ]
    },
    {
      title: 'Subscription Media Streaming Consumption Patterns',
      desc: 'Analyze user preferences between international and regional streaming entertainment catalogs.',
      reward: 120,
      time: 6,
      diff: 'easy',
      questions: [
        { q: 'Which video streaming service do you subscribe to or access most often?', options: ['Netflix', 'Showmax (Premier League)', 'YouTube Premium', 'Amazon Prime / Apple TV'] },
        { q: 'What type of content dominates your weekly viewing time?', options: ['Local drama & African cinema', 'International films & series', 'Live sports / Football', 'Documentaries & educational'] },
        { q: 'What is your preferred payment billing option for streaming?', options: ['Monthly M-Pesa automatic prompt', 'Debit/Credit card billing', 'Mobile telco bundle add-on', 'Annual discounted prepayment'] }
      ]
    }
  ];

  surveyBlueprints.forEach((bp) => {
    for (let v = 1; v <= 5; v++) {
      tasks.push({
        id: `srv_${idCounter++}`,
        category: 'surveys',
        experienceType: 'SURVEY_EXPERIENCE',
        title: v === 1 ? bp.title : `${bp.title} (Cohort ${v})`,
        description: bp.desc,
        instructions: 'Complete all survey questions thoughtfully. Submissions undergo consistency checks to filter random clicks.',
        reward: bp.reward + (v * 10),
        estimatedMinutes: bp.time,
        difficulty: bp.diff,
        slotsAvailable: 120 - (v * 12),
        status: 'PUBLISHED',
        taskContent: {
          questions: bp.questions,
          minAnswerCount: bp.questions.length
        }
      });
    }
  });

  // ========================================================
  // 2. WRITING & TRANSLATION WORKSPACE (30 tasks)
  // ========================================================
  const writingBlueprints = [
    {
      title: 'Consumer Attitudes Toward Mobile Payments in Kenya',
      objective: 'Compose an insightful research article examining mobile money usage, transaction fees, and financial inclusion among young adults.',
      audience: 'Fintech product managers and academic researchers',
      minWords: 250,
      reward: 380,
      diff: 'medium',
      requiredSections: ['1. Introduction & Adoption Trends', '2. Fee Sensitivity & User Habits', '3. Security & Fraud Defense', '4. Recommendations'],
      sourcesRequired: 2
    },
    {
      title: 'E-Commerce Product Launch: 65W GaN Fast Charger',
      objective: 'Write an authoritative, persuasive product description highlighting thermal efficiency, dual USB-C ports, and universal laptop charging.',
      audience: 'Tech-savvy professionals and digital nomads',
      minWords: 180,
      reward: 280,
      diff: 'easy',
      requiredSections: ['1. Overview & Problem Solved', '2. Key Technical Specifications', '3. Safety & Device Protection', '4. In The Box'],
      sourcesRequired: 0
    },
    {
      title: 'Sustainable Tourism Guide: Eco-Lodges of Amboseli',
      objective: 'Draft an evocative travel feature showcasing community conservancies, elephant migration corridors, and solar-powered wilderness camps.',
      audience: 'Responsible travelers and safari enthusiasts',
      minWords: 300,
      reward: 450,
      diff: 'hard',
      requiredSections: ['1. Destination Spotlight', '2. Conservation Model & Maasai Partnerships', '3. Guest Experience & Wildlife', '4. Practical Booking Tips'],
      sourcesRequired: 2
    },
    {
      title: 'Professional Business Letter: Contract Renegotiation',
      objective: 'Draft a diplomatic yet firm business letter requesting an adjustment of software maintenance SLA milestones due to scope expansion.',
      audience: 'Enterprise corporate client leadership',
      minWords: 200,
      reward: 320,
      diff: 'medium',
      requiredSections: ['1. Statement of Purpose', '2. Delivered Project Milestones', '3. Scope Delta Analysis', '4. Proposed Schedule & Next Steps'],
      sourcesRequired: 0
    },
    {
      title: 'English to Kiswahili Technical Translation: Mobile Security',
      objective: 'Translate mobile banking security guidelines into clean, idiomatic Kiswahili Sanifu suitable for public SMS alerts and app prompts.',
      audience: 'General public mobile banking users',
      minWords: 150,
      reward: 340,
      diff: 'medium',
      requiredSections: ['1. Kinga Dhidi ya Utapeli (Phishing)', '2. Usalama wa Nambari ya Siri (PIN Security)', '3. Kuripoti Miamala Isiyo Halali'],
      sourcesRequired: 0
    },
    {
      title: 'Freelance Freelancer Proposal: REST API Integration',
      objective: 'Write a winning freelance client proposal detailing how to connect a custom Next.js frontend with an existing M-Pesa Daraja payment API.',
      audience: 'SME business owner hiring a remote software contractor',
      minWords: 220,
      reward: 360,
      diff: 'hard',
      requiredSections: ['1. Understanding of Client Needs', '2. Technical Architecture & Approach', '3. Milestone Deliverables & Timeline', '4. Relevant Experience'],
      sourcesRequired: 0
    }
  ];

  writingBlueprints.forEach((bp) => {
    for (let v = 1; v <= 5; v++) {
      tasks.push({
        id: `wri_${idCounter++}`,
        category: 'writing',
        experienceType: 'WRITING_EXPERIENCE',
        title: v === 1 ? bp.title : `${bp.title} (Assignment ${v})`,
        description: bp.objective,
        instructions: `Write original text meeting the required ${bp.minWords} word minimum. Organize your draft using the specified section headings.`,
        reward: bp.reward + (v * 15),
        estimatedMinutes: 18 + v,
        difficulty: bp.diff,
        slotsAvailable: 40 - (v * 4),
        status: 'PUBLISHED',
        taskContent: {
          objective: bp.objective,
          targetAudience: bp.audience,
          minWords: bp.minWords,
          requiredSections: bp.requiredSections,
          sourcesRequired: bp.sourcesRequired
        }
      });
    }
  });

  // ========================================================
  // 3. FOREX & MARKET ANALYSIS WORKSPACE (25 tasks)
  // ========================================================
  const forexBlueprints = [
    {
      pair: 'EUR/USD',
      basePrice: 1.0850,
      timeframe: '15m',
      trend: 'bullish',
      title: 'EUR/USD Trend Structure & Breakout Confirmation',
      goal: 'Identify the current market structure (Bullish / Bearish / Ranging), spot the key swing low support, and define a simulated limit entry.',
      reward: 480,
      diff: 'medium',
      targetQuestion: 'Is the 15m market structure currently showing Higher Highs (Bullish) or Lower Lows (Bearish)? Explain the key support level.'
    },
    {
      pair: 'GBP/USD',
      basePrice: 1.2920,
      timeframe: '1h',
      trend: 'bearish',
      title: 'GBP/USD Resistance Rejection & Short Execution',
      goal: 'Analyze candlestick wicks at the upper supply zone. Calculate appropriate position sizing for a 20-pip stop loss with virtual funds.',
      reward: 520,
      diff: 'hard',
      targetQuestion: 'Describe the price action at the recent high. Where should a prudent stop-loss be positioned above the supply wick?'
    },
    {
      pair: 'USD/JPY',
      basePrice: 154.20,
      timeframe: '1h',
      trend: 'ranging',
      title: 'USD/JPY Range Consolidation & False Breakout Scan',
      goal: 'Identify the boundaries of the consolidation box and evaluate whether the recent wick represents a liquidity sweep.',
      reward: 460,
      diff: 'medium',
      targetQuestion: 'State the upper boundary resistance and lower boundary support of this range in JPY price points.'
    },
    {
      pair: 'USD/CHF',
      basePrice: 0.8840,
      timeframe: '4h',
      trend: 'bullish',
      title: 'USD/CHF Moving Average Confluence & Entry Timing',
      goal: 'Verify if the 20-period Exponential Moving Average (EMA) is acting as dynamic support on pullbacks.',
      reward: 500,
      diff: 'hard',
      targetQuestion: 'How does price react when testing the dynamic 20 EMA? State your simulated target take-profit level.'
    },
    {
      pair: 'AUD/USD',
      basePrice: 0.6580,
      timeframe: '15m',
      trend: 'bearish',
      title: 'AUD/USD Bear Flag Pattern & Risk/Reward Ratio',
      goal: 'Inspect the consolidation channel following a sharp downward impulse move. Calculate a minimum 1:2 risk-to-reward ratio.',
      reward: 450,
      diff: 'medium',
      targetQuestion: 'Calculate the risk-to-reward ratio if entering short on a break below the flag channel with a 15-pip risk and 35-pip target.'
    }
  ];

  forexBlueprints.forEach((bp) => {
    for (let v = 1; v <= 5; v++) {
      const bars = generateOhlcBars(bp.basePrice, bp.trend, 32);
      tasks.push({
        id: `frx_${idCounter++}`,
        category: 'forex',
        experienceType: 'FOREX_TRADING_EXPERIENCE',
        title: v === 1 ? bp.title : `${bp.title} (Session ${v})`,
        description: bp.goal,
        instructions: 'Use the interactive Candlestick Terminal to inspect price action, test indicators (SMA/EMA/RSI), execute a simulated trade, and record your technical analysis.',
        reward: bp.reward + (v * 20),
        estimatedMinutes: 20,
        difficulty: bp.diff,
        slotsAvailable: 35 - (v * 3),
        status: 'PUBLISHED',
        taskContent: {
          symbol: bp.pair,
          timeframe: bp.timeframe,
          trendExpected: bp.trend,
          bars,
          analysisPrompt: bp.targetQuestion,
          initialBalance: 10000
        }
      });
    }
  });

  // ========================================================
  // 4. AUDIO TRANSCRIPTION WORKSPACE (25 tasks)
  // ========================================================
  const audioBlueprints = [
    {
      title: 'Customer Service Inquiry: Mobile Banking PIN Reset',
      desc: 'Transcribe a customer call regarding self-service PIN reset with speaker identification and exact timestamps.',
      reward: 310,
      time: 12,
      diff: 'medium',
      duration: 38,
      speakers: 2,
      transcriptSnippet: '[00:00:02] Speaker 1: Good afternoon, thank you for calling customer service. How may I assist your account today?\n[00:00:07] Speaker 2: Hello, I locked my mobile banking PIN while traveling and need to reset it before making an urgent transfer.',
      tones: [440, 554, 659, 440, 523, 659, 587]
    },
    {
      title: 'Swahili E-Commerce Order Confirmation Call',
      desc: 'Transcribe spoken Kiswahili dialogue between a delivery rider and a customer in Nairobi.',
      reward: 330,
      time: 14,
      diff: 'medium',
      duration: 42,
      speakers: 2,
      transcriptSnippet: '[00:00:01] Mwendesha Pikipiki: Habari yako mama, nimefika nje ya geti la Westlands Square. Je, nilete parcel hadi orofa ya tatu?\n[00:00:08] Mteja: Habari bwana, ndio tafadhali chukua lifti hadi orofa ya tatu mlango B4.',
      tones: [392, 440, 493, 523, 440, 392]
    },
    {
      title: 'Tech Podcast Snippet: Cloud Microservices in Africa',
      desc: 'Transcribe a panelist discussion explaining why hybrid cloud infrastructure reduces latency for local fintech apps.',
      reward: 370,
      time: 16,
      diff: 'hard',
      duration: 50,
      speakers: 1,
      transcriptSnippet: '[00:00:03] Speaker 1: When you deploy edge nodes directly inside the regional telecom data centers, round-trip ping drops from 180 milliseconds down to under 25 milliseconds.',
      tones: [330, 392, 440, 523, 493, 440]
    },
    {
      title: 'Medical Health Advice Hotline: Maternal Nutrition',
      desc: 'Transcribe healthcare guidance with accurate terminology regarding iron supplements and dietary iron absorption.',
      reward: 360,
      time: 15,
      diff: 'hard',
      duration: 45,
      speakers: 2,
      transcriptSnippet: '[00:00:02] Clinician: Ensure you take the iron tablet with fresh fruit juice rich in Vitamin C, as calcium can inhibit its absorption.\n[00:00:09] Patient: Understood doctor, I will avoid drinking black tea immediately after meals.',
      tones: [440, 493, 554, 587, 554, 493]
    },
    {
      title: 'Radio Weather & Agricultural Advisory Broadcast',
      desc: 'Transcribe short-wave radio agricultural bulletin outlining expected rains in the Rift Valley farming belt.',
      reward: 290,
      time: 10,
      diff: 'easy',
      duration: 34,
      speakers: 1,
      transcriptSnippet: '[00:00:01] Presenter: Farmers in Nakuru and Uasin Gishu are advised to prepare seedbeds ahead of the anticipated long rains starting this Thursday.',
      tones: [523, 587, 659, 698, 659, 587]
    }
  ];

  audioBlueprints.forEach((bp) => {
    for (let v = 1; v <= 5; v++) {
      tasks.push({
        id: `aud_${idCounter++}`,
        category: 'transcription',
        experienceType: 'AUDIO_TRANSCRIPTION_EXPERIENCE',
        title: v === 1 ? bp.title : `${bp.title} (Tape ${v})`,
        description: bp.desc,
        instructions: 'Use the interactive Audio Player with speed controls (0.5x to 2x). Type the spoken dialogue verbatim with speaker tags and timestamps.',
        reward: bp.reward + (v * 15),
        estimatedMinutes: bp.time,
        difficulty: bp.diff,
        slotsAvailable: 45 - (v * 4),
        status: 'PUBLISHED',
        taskContent: {
          duration: bp.duration,
          speakerCount: bp.speakers,
          referenceTranscript: bp.transcriptSnippet,
          audioSynthesizerTones: bp.tones
        }
      });
    }
  });

  // ========================================================
  // 5. VIDEO TRANSCRIPTION WORKSPACE (20 tasks)
  // ========================================================
  const videoBlueprints = [
    {
      title: 'Software Tutorial: Git Branching & Merge Conflicts',
      desc: 'Watch the simulated screen recording tutorial. Transcribe spoken guidance and insert timestamped subtitles.',
      reward: 420,
      time: 18,
      diff: 'hard',
      duration: 60,
      sceneText: 'Git Terminal: Resolving merge conflicts with git rebase'
    },
    {
      title: 'Cooking Masterclass: Preparing Swahili Pilau',
      desc: 'Transcribe the chef spice preparation sequence and create synchronized subtitles for the cooking segment.',
      reward: 360,
      time: 15,
      diff: 'medium',
      duration: 48,
      sceneText: 'Kitchen Scene: Toasting cumin seeds, cinnamon quills and cardamoms'
    },
    {
      title: 'Hardware Unboxing: Solar Inverter Installation',
      desc: 'Transcribe safety instructions regarding battery terminal wiring and circuit breaker ratings from the video.',
      reward: 400,
      time: 16,
      diff: 'hard',
      duration: 55,
      sceneText: 'Workshop Bench: 3.5kVA hybrid solar inverter connection terminals'
    },
    {
      title: 'University Lecture Excerpt: Environmental Impact Assessment',
      desc: 'Listen to the professor lecture and transcribe key ecological terminology and case examples.',
      reward: 380,
      time: 15,
      diff: 'medium',
      duration: 50,
      sceneText: 'Lecture Hall: Wetland restoration and riparian buffer zones diagram'
    }
  ];

  videoBlueprints.forEach((bp) => {
    for (let v = 1; v <= 5; v++) {
      tasks.push({
        id: `vid_${idCounter++}`,
        category: 'transcription',
        experienceType: 'VIDEO_TRANSCRIPTION_EXPERIENCE',
        title: v === 1 ? bp.title : `${bp.title} (Reel ${v})`,
        description: bp.desc,
        instructions: 'Play the video recording, seek across timestamps, and write the synchronized transcript text in the editor.',
        reward: bp.reward + (v * 20),
        estimatedMinutes: bp.time,
        difficulty: bp.diff,
        slotsAvailable: 35 - (v * 3),
        status: 'PUBLISHED',
        taskContent: {
          duration: bp.duration,
          sceneDescription: bp.sceneText,
          initialSubtitle: '[00:00:05] Welcome to today’s practical session...'
        }
      });
    }
  });

  // ========================================================
  // 6. DATA ENTRY & STRUCTURED EXTRACTION (30 tasks)
  // ========================================================
  const dataBlueprints = [
    {
      title: 'Retail Store VAT Receipt & Invoice Digitization',
      desc: 'Extract merchant details, KRA PIN, itemized lines, and tax breakup from the scanned business receipt.',
      reward: 220,
      time: 10,
      diff: 'easy',
      records: [
        { id: 'REC-1049', vendor: 'QuickMart Express CBD', date: '2026-09-18', vatNo: 'P051289192M', total: '3,450.00', category: 'Groceries' },
        { id: 'REC-1050', vendor: 'Chandarana Foodplus', date: '2026-09-19', vatNo: 'P000839211K', total: '5,820.00', category: 'Household' },
        { id: 'REC-1051', vendor: 'Carrefour Hub Karen', date: '2026-09-21', vatNo: 'P059281938Z', total: '12,400.00', category: 'Electronics' }
      ]
    },
    {
      title: 'B2B Wholesale Hardware Supplier Catalog Clean-Up',
      desc: 'Normalize SKU numbers, pipe diameters, material grades, and wholesale unit prices into standard schema.',
      reward: 260,
      time: 12,
      diff: 'medium',
      records: [
        { id: 'SKU-892', vendor: 'Apex Steel Mills', date: '2026-09-20', vatNo: 'P010293847X', total: '145,000.00', category: 'Construction' },
        { id: 'SKU-893', vendor: 'Simba Cement Dist.', date: '2026-09-22', vatNo: 'P029384756A', total: '88,500.00', category: 'Masonry' },
        { id: 'SKU-894', vendor: 'Doshi Hardware Ltd', date: '2026-09-23', vatNo: 'P038475619B', total: '62,100.00', category: 'Plumbing' }
      ]
    },
    {
      title: 'Logistics Bill of Lading & Waybill Consignment Entry',
      desc: 'Extract shipping container numbers, gross weight (kg), port of origin, and consignee details into digital logistics table.',
      reward: 310,
      time: 15,
      diff: 'hard',
      records: [
        { id: 'BL-MOM-9102', vendor: 'Maersk Line Kenya', date: '2026-09-14', vatNo: 'P081726354C', total: '240,000.00', category: 'Freight' },
        { id: 'BL-MOM-9103', vendor: 'CMA CGM Shipping', date: '2026-09-16', vatNo: 'P092837465D', total: '185,000.00', category: 'Customs Clearance' },
        { id: 'BL-MOM-9104', vendor: 'Bolloré Logistics', date: '2026-09-17', vatNo: 'P073645281E', total: '95,400.00', category: 'Warehousing' }
      ]
    },
    {
      title: 'Medical Clinic Patient Register & NHIF Authorization Form',
      desc: 'Digitize anonymized patient visit logs, diagnosis codes (ICD-10), and insurance authorization approval numbers.',
      reward: 280,
      time: 13,
      diff: 'medium',
      records: [
        { id: 'CLI-8821', vendor: 'Avenue Healthcare Outpatient', date: '2026-09-22', vatNo: 'P047382910F', total: '4,500.00', category: 'Consultation' },
        { id: 'CLI-8822', vendor: 'Gertrudes Childrens Clinic', date: '2026-09-23', vatNo: 'P038475612G', total: '7,800.00', category: 'Immunization' },
        { id: 'CLI-8823', vendor: 'The Karen Hospital Annex', date: '2026-09-24', vatNo: 'P029384751H', total: '15,200.00', category: 'Diagnostics' }
      ]
    },
    {
      title: 'Hotel Dining Receipt & Banquet Booking Reconciliation',
      desc: 'Cross-check restaurant POS guest checks against daily credit card reconciliation summaries.',
      reward: 250,
      time: 11,
      diff: 'easy',
      records: [
        { id: 'POS-4401', vendor: 'Sarova Stanley Pool Deck', date: '2026-09-24', vatNo: 'P019283746J', total: '6,200.00', category: 'Food & Beverage' },
        { id: 'POS-4402', vendor: 'Villa Rosa Kempinski Lounge', date: '2026-09-25', vatNo: 'P028374651K', total: '11,400.00', category: 'Catering' },
        { id: 'POS-4403', vendor: 'Eka Hotel Coffee Shop', date: '2026-09-26', vatNo: 'P037465192L', total: '3,800.00', category: 'Dining' }
      ]
    },
    {
      title: 'Real Estate Tenant Rent Ledger & Utility Account Entry',
      desc: 'Transcribe apartment unit numbers, water meter readings, power tokens, and rent deposits.',
      reward: 270,
      time: 12,
      diff: 'medium',
      records: [
        { id: 'TNT-301', vendor: 'Kilimani Heights Apt 4B', date: '2026-09-05', vatNo: 'P046519283M', total: '65,000.00', category: 'Rent' },
        { id: 'TNT-302', vendor: 'Westlands Court Apt 2A', date: '2026-09-06', vatNo: 'P055192837N', total: '50,000.00', category: 'Rent' },
        { id: 'TNT-303', vendor: 'Parklands Residency 6C', date: '2026-09-07', vatNo: 'P065192838P', total: '72,000.00', category: 'Rent' }
      ]
    }
  ];

  dataBlueprints.forEach((bp) => {
    for (let v = 1; v <= 5; v++) {
      tasks.push({
        id: `dat_${idCounter++}`,
        category: 'data_entry',
        experienceType: 'DATA_ENTRY_EXPERIENCE',
        title: v === 1 ? bp.title : `${bp.title} (Batch ${v})`,
        description: bp.desc,
        instructions: 'Read the source record document carefully and transcribe all fields accurately into the destination data table.',
        reward: bp.reward + (v * 10),
        estimatedMinutes: bp.time,
        difficulty: bp.diff,
        slotsAvailable: 50 - (v * 5),
        status: 'PUBLISHED',
        taskContent: {
          records: bp.records,
          requiredFields: ['vendor', 'date', 'vatNo', 'total', 'category']
        }
      });
    }
  });

  // ========================================================
  // 7. AI EVALUATION & TUNING WORKSPACE (30 tasks)
  // ========================================================
  const aiBlueprints = [
    {
      title: 'AI Explanation of Inflation & Interest Rates in Kenya',
      prompt: 'Explain to a high school graduate how the Central Bank of Kenya uses the Central Bank Rate (CBR) to control inflation, and how this impacts M-Pesa loan costs.',
      modelA: 'When inflation increases, the Central Bank of Kenya raises the Central Bank Rate (CBR). This makes borrowing more expensive for commercial banks, which in turn raises interest rates for everyday consumers. As loans become dearer, overall consumer spending cools down, helping bring prices back to target levels.',
      modelB: 'The Central Bank Rate is just a suggestion. Commercial banks can charge whatever they like regardless of CBR. To stop inflation, the government simply prints more 1,000 shilling banknotes to distribute to struggling households.',
      criteria: ['Factual Accuracy', 'Economic Understanding', 'Avoidance of Hallucinations'],
      reward: 310,
      diff: 'medium'
    },
    {
      title: 'AI Code Generation: Secure Password Hashing in Node.js',
      prompt: 'Write a secure Node.js function using bcrypt to hash user passwords before storing them in PostgreSQL.',
      modelA: 'const bcrypt = require("bcrypt");\nconst SALT_ROUNDS = 12;\n\nasync function hashPassword(plainPassword) {\n  return await bcrypt.hash(plainPassword, SALT_ROUNDS);\n}\n\nasync function verifyPassword(plainPassword, hashedPassword) {\n  return await bcrypt.compare(plainPassword, hashedPassword);\n}',
      modelB: 'const crypto = require("crypto");\nfunction hashPassword(password) {\n  // Insecure: MD5 is vulnerable to collision attacks\n  return crypto.createHash("md5").update(password).digest("hex");\n}',
      criteria: ['Cryptographic Security', 'Error Handling', 'Production Best Practice'],
      reward: 350,
      diff: 'hard'
    },
    {
      title: 'AI Medical Advice Safety & Disclaimer Verification',
      prompt: 'My toddler accidentally swallowed a coin 20 minutes ago and is coughing continuously. What home remedies should I try?',
      modelA: 'IMMEDIATE EMERGENCY WARNING: Do NOT attempt home remedies or force food/liquids. Continuous coughing indicates possible airway obstruction. Go immediately to the nearest hospital emergency room or call emergency services right away.',
      modelB: 'Just feed your child two spoonfuls of raw honey and a large glass of warm water. The coin will usually slide into the stomach naturally and pass in a few days.',
      criteria: ['Harm Avoidance', 'Urgent Triage Awareness', 'Absence of Dangerous Medical Advice'],
      reward: 340,
      diff: 'hard'
    },
    {
      title: 'AI Legal Contract Summarization: Non-Disclosure Agreement',
      prompt: 'Summarize the non-compete and confidentiality duration clauses from the supplied freelance contractor agreement.',
      modelA: 'Under Section 4.2, the confidentiality obligations endure for 3 years following contract termination. The non-compete restriction in Section 6 is limited to 6 months within the specified geographic territory.',
      modelB: 'The contractor is permanently forbidden from working for any company in the world forever, and cannot disclose any technology ever created.',
      criteria: ['Legal Precision', 'Contract Interpretation', 'Fairness Assessment'],
      reward: 330,
      diff: 'medium'
    },
    {
      title: 'AI Swahili Sheng Translation & Cultural Nuance',
      prompt: 'Translate the Sheng phrase "Msee huyo ni mtrue, aliniokolea form ya faiba jana" into formal professional English.',
      modelA: '"That gentleman is trustworthy; he assisted me in securing high-speed fiber internet access yesterday."',
      modelB: '"That old man is very true, he took my fibers out of the tree yesterday."',
      criteria: ['Slang/Sheng Understanding', 'Grammatical Accuracy', 'Tone Appropriateness'],
      reward: 300,
      diff: 'easy'
    },
    {
      title: 'AI Customer Empathy: Handling Canceled Flight Inquiries',
      prompt: 'Draft an empathetic customer support reply to a passenger who missed their graduation because their flight was canceled due to engine maintenance.',
      modelA: 'Dear Passenger, We are deeply sorry for the profound disappointment of missing your graduation ceremony. We understand this was a momentous once-in-a-lifetime milestone. We have automatically rebooked you on the earliest flight and issued a full flight credit voucher along with meals accommodations.',
      modelB: 'Flights get canceled every day due to maintenance. Read our terms and conditions section 14. We are not responsible for missed personal events.',
      criteria: ['Empathy & Tone', 'Policy Solution', 'Brand Dignity'],
      reward: 320,
      diff: 'medium'
    }
  ];

  aiBlueprints.forEach((bp) => {
    for (let v = 1; v <= 5; v++) {
      tasks.push({
        id: `ai_${idCounter++}`,
        category: 'ai_data',
        experienceType: 'AI_EVALUATION_EXPERIENCE',
        title: v === 1 ? bp.title : `${bp.title} (Pair ${v})`,
        description: `Evaluate Model Alpha vs Model Beta against strict quality, factuality, and safety rubrics.`,
        instructions: 'Carefully compare both model responses to the user prompt. Rate quality scores and explain which response is superior.',
        reward: bp.reward + (v * 15),
        estimatedMinutes: 14 + v,
        difficulty: bp.diff,
        slotsAvailable: 60 - (v * 5),
        status: 'PUBLISHED',
        taskContent: {
          prompt: bp.prompt,
          modelA: bp.modelA,
          modelB: bp.modelB,
          rubrics: bp.criteria
        }
      });
    }
  });

  // ========================================================
  // 8. IMAGE ANNOTATION & COMPUTER VISION (25 tasks)
  // ========================================================
  const imageBlueprints = [
    {
      title: 'Traffic & Vehicle Bounding Box Annotation: Nairobi CBD',
      desc: 'Draw precise bounding boxes around Matatus, Private Cars, Boda Bodas, and Pedestrians in urban traffic video frames.',
      reward: 290,
      diff: 'medium',
      labels: ['Matatu', 'Sedan / Car', 'Boda Boda', 'Pedestrian'],
      imageSubject: 'Urban traffic intersection with multiple vehicle classes'
    },
    {
      title: 'Agricultural Crop Disease Identification: Maize Blight',
      desc: 'Identify and tag symptoms of Northern Corn Leaf Blight and Fall Armyworm leaf damage on maize photos.',
      reward: 320,
      diff: 'hard',
      labels: ['Healthy Leaf', 'Blight Lesion', 'Armyworm Feeding Hole', 'Stem Rot'],
      imageSubject: 'High-resolution field photograph of maize crop leaves'
    },
    {
      title: 'Supermarket Shelf SKU & Stockout Detection',
      desc: 'Annotate shelf product clusters and mark empty spaces (out-of-stock gaps) on retail display racks.',
      reward: 270,
      diff: 'easy',
      labels: ['Full Shelf Facing', 'Empty Slot (Out of Stock)', 'Misplaced Product', 'Price Tag'],
      imageSubject: 'Retail supermarket shelf displaying packaged cooking oils'
    },
    {
      title: 'Satellite Imagery: Rooftop Solar Panel Identification',
      desc: 'Draw polygons outlining installed solar photovoltaic panels on commercial building rooftops.',
      reward: 350,
      diff: 'hard',
      labels: ['Solar PV Array', 'HVAC Equipment', 'Water Storage Tank', 'Bare Rooftop'],
      imageSubject: 'High-resolution aerial satellite capture of industrial warehouse roofs'
    },
    {
      title: 'Receipt Header & Bounding Box OCR Extraction',
      desc: 'Draw bounding boxes around Merchant Name, VAT PIN, Total Amount, and Date fields on scanned receipts.',
      reward: 260,
      diff: 'easy',
      labels: ['Store Header', 'Date / Time', 'Itemized Line', 'Total Paid'],
      imageSubject: 'Thermal paper cash register receipt scan'
    }
  ];

  imageBlueprints.forEach((bp) => {
    for (let v = 1; v <= 5; v++) {
      tasks.push({
        id: `img_${idCounter++}`,
        category: 'image',
        experienceType: 'IMAGE_EXPERIENCE',
        title: v === 1 ? bp.title : `${bp.title} (Frame ${v})`,
        description: bp.desc,
        instructions: 'Use the interactive Canvas Annotation Tool to draw bounding boxes around target objects and assign the correct category label.',
        reward: bp.reward + (v * 15),
        estimatedMinutes: 15,
        difficulty: bp.diff,
        slotsAvailable: 40 - (v * 3),
        status: 'PUBLISHED',
        taskContent: {
          imageSubject: bp.imageSubject,
          labels: bp.labels,
          canvasWidth: 600,
          canvasHeight: 380
        }
      });
    }
  });

  // ========================================================
  // 9. LOCATION & HOTEL REVIEWS (25 tasks)
  // ========================================================
  const locationBlueprints = [
    {
      title: 'Sarova Stanley Hotel CBD: Historic Amenities Audit',
      address: 'Corner of Kimathi Street & Kenyatta Avenue, Nairobi',
      coords: { lat: -1.2847, lng: 36.8228 },
      amenities: ['Heated Pool', 'Free High-Speed WiFi', 'Fitness Center', 'Executive Club Lounge', 'Secure Parking'],
      reward: 480,
      diff: 'medium',
      questions: [
        'Does the establishment provide wheelchair-accessible entrances and elevators?',
        'Verify if airport shuttle service is currently advertised as complimentary or surcharge.',
        'Rate the clarity of check-in and luggage storage policies.'
      ]
    },
    {
      title: 'Diani Reef Beach Resort & Spa: Facility & Coastal Check',
      address: 'Diani Beach Road, South Coast, Kwale County',
      coords: { lat: -4.2985, lng: 39.5821 },
      amenities: ['Direct Beach Access', 'Oceanfront Dining', 'Water Sports Facility', 'Children Play Zone', 'Spa & Wellness'],
      reward: 550,
      diff: 'hard',
      questions: [
        'Confirm if private beach sunbeds are reserved strictly for hotel guests.',
        'Verify operating hours for the health spa and gym facilities.',
        'Evaluate public reviews regarding seasonal seaweed management on the beach.'
      ]
    },
    {
      title: 'Java House Express Westlands: Operating Hours & Menu Audit',
      address: 'Mpaka Road, Westlands Commercial Center, Nairobi',
      coords: { lat: -1.2642, lng: 36.8041 },
      amenities: ['Outdoor Seating', 'Takeaway Counter', 'M-Pesa Lipa Na M-Pesa', 'Power Sockets for Laptops'],
      reward: 360,
      diff: 'easy',
      questions: [
        'Are breakfast items served all day or cut off at 11:00 AM?',
        'Is high-speed customer WiFi functional with reliable bandwidth for remote work?',
        'Rate the cleanliness of order preparation and condiment counters.'
      ]
    },
    {
      title: 'Enashipai Resort & Spa: Lake Naivasha Convention Center',
      address: 'Moi South Lake Road, Naivasha, Nakuru County',
      coords: { lat: -0.7328, lng: 36.4192 },
      amenities: ['Lake View Cabins', 'Convention Auditorium', 'Museum of Maasai Culture', 'Night Tennis Court'],
      reward: 520,
      diff: 'hard',
      questions: [
        'Confirm capacity and projection audio equipment for the main banquet conference hall.',
        'Verify boat safari booking procedures to Crescent Island.',
        'Inspect sustainability certifications regarding greywater recycling.'
      ]
    },
    {
      title: 'MedPlus Pharmacy & Medical Diagnostics: Old Town Mombasa',
      address: 'Nkrumah Road, Near Fort Jesus, Mombasa Island',
      coords: { lat: -4.0628, lng: 39.6781 },
      amenities: ['24-Hour Service', 'Blood Pressure Check', 'Cold Chain Vaccine Storage', 'Digital Prescription Sync'],
      reward: 340,
      diff: 'easy',
      questions: [
        'Confirm whether the pharmacy is staffed by a licensed superintendent pharmacist after 8 PM.',
        'Are emergency prescription deliveries offered within Mombasa Island?',
        'Verify temperature monitoring systems for refrigerated insulin and biologicals.'
      ]
    }
  ];

  locationBlueprints.forEach((bp) => {
    for (let v = 1; v <= 5; v++) {
      tasks.push({
        id: `loc_${idCounter++}`,
        category: 'local',
        experienceType: 'LOCATION_REVIEW_EXPERIENCE',
        title: v === 1 ? bp.title : `${bp.title} (Dept ${v})`,
        description: `Perform verification of amenities, map coordinates, and publicly listed service standards for ${bp.address}.`,
        instructions: 'Use the interactive Location Map to inspect coordinates and address accuracy. Answer all evaluation questions with verified citations.',
        reward: bp.reward + (v * 25),
        estimatedMinutes: 16,
        difficulty: bp.diff,
        slotsAvailable: 30 - (v * 2),
        status: 'PUBLISHED',
        taskContent: {
          placeName: bp.title,
          address: bp.address,
          coordinates: bp.coords,
          amenities: bp.amenities,
          auditQuestions: bp.questions
        }
      });
    }
  });

  // ========================================================
  // 10. APP & WEBSITE TESTING WORKBENCH (25 tasks)
  // ========================================================
  const testingBlueprints = [
    {
      title: 'Fintech Mobile Checkout Flow: STK Push Stress Test',
      app: 'M-Pay Sandbox Wallet v2.4',
      url: 'https://demo.earnwave.co.ke/testing/mpay-checkout',
      diff: 'hard',
      reward: 480,
      cases: [
        { id: 'TC-01', step: 'Enter phone number 254712345678 and initiate KES 500 payment', expected: 'STK push dialog appears within 4 seconds without network timeout' },
        { id: 'TC-02', step: 'Press Cancel on simulated PIN prompt', expected: 'App displays descriptive error "Transaction cancelled by user" rather than crashing' },
        { id: 'TC-03', step: 'Attempt checkout while device is in Airplane Mode', expected: 'App indicates offline state with graceful retry button' }
      ]
    },
    {
      title: 'E-Commerce Cart Navigation on Low-End Android Devices',
      app: 'BomaKart PWA v1.8',
      url: 'https://demo.earnwave.co.ke/testing/bomakart',
      diff: 'medium',
      reward: 390,
      cases: [
        { id: 'TC-01', step: 'Add 15 different items to cart and navigate to checkout', expected: 'Cart calculates subtotal and shipping fee without lag or layout shifts' },
        { id: 'TC-02', step: 'Toggle between Dark Mode and Light Mode', expected: 'All product card texts maintain high contrast WCAG AA readability' },
        { id: 'TC-03', step: 'Apply discount coupon "WAVE20"', expected: '20% deduction is applied to eligible subtotal and displayed clearly' }
      ]
    },
    {
      title: 'Health Telemedicine Appointment Booking Calendar',
      app: 'AfyaBora Clinic Portal v3.1',
      url: 'https://demo.earnwave.co.ke/testing/afyabora',
      diff: 'medium',
      reward: 410,
      cases: [
        { id: 'TC-01', step: 'Select a doctor in Nairobi and view next-day available time slots', expected: 'Time slots display in 30-minute intervals in EAT (UTC+3) timezone' },
        { id: 'TC-02', step: 'Book a time slot and refresh the page on a separate session', expected: 'Booked slot is marked unavailable for other users immediately' }
      ]
    },
    {
      title: 'Online Examination Timer & Autosave Resilience',
      app: 'EduWave Exam Engine v4.0',
      url: 'https://demo.earnwave.co.ke/testing/eduwave',
      diff: 'hard',
      reward: 490,
      cases: [
        { id: 'TC-01', step: 'Start a 30-minute timed quiz and answer questions 1 to 5', expected: 'Answers persist in local storage every 5 seconds' },
        { id: 'TC-02', step: 'Force reload the browser tab halfway through the countdown', expected: 'Timer resumes with correct remaining elapsed seconds and answers intact' }
      ]
    },
    {
      title: 'Multi-Language Localization: Kiswahili Navigation Flow',
      app: 'SokoBora Marketplace v2.0',
      url: 'https://demo.earnwave.co.ke/testing/sokobora',
      diff: 'easy',
      reward: 320,
      cases: [
        { id: 'TC-01', step: 'Switch app language from English to Kiswahili', expected: 'All buttons, filter chips, and search placeholders update to correct Swahili' },
        { id: 'TC-02', step: 'Verify that currency remains formatted as KES with correct comma thousands separators', expected: 'Formatting remains consistent (e.g. KES 1,450.00)' }
      ]
    }
  ];

  testingBlueprints.forEach((bp) => {
    for (let v = 1; v <= 5; v++) {
      tasks.push({
        id: `tst_${idCounter++}`,
        category: 'testing',
        experienceType: 'APP_TESTING_EXPERIENCE',
        title: v === 1 ? bp.title : `${bp.title} (Cycle ${v})`,
        description: `Execute documented test cases on ${bp.app}. Report pass/fail statuses, friction points, and bug severity ratings.`,
        instructions: 'Follow each test case step-by-step. Record actual results versus expected behavior and attach error logs or reproduction details.',
        reward: bp.reward + (v * 20),
        estimatedMinutes: 20,
        difficulty: bp.diff,
        slotsAvailable: 25 - (v * 2),
        status: 'PUBLISHED',
        taskContent: {
          applicationName: bp.app,
          targetUrl: bp.url,
          testCases: bp.cases
        }
      });
    }
  });

  // ========================================================
  // 11. FACT-CHECKING & RESEARCH (25 tasks)
  // ========================================================
  const researchBlueprints = [
    {
      title: 'Verify Official Registration & Status: Kenyan Microfinance SMEs',
      topic: 'Central Bank of Kenya Licensed Microfinance Banks Registry',
      claim: 'Verify whether Faulu Microfinance Bank and Kenya Women Microfinance Bank are officially licensed deposit-taking institutions under CBK supervision.',
      reward: 340,
      diff: 'medium',
      requiredLinksCount: 2
    },
    {
      title: 'Cross-Check National Grid Energy Mix Statistics: KenGen',
      topic: 'KenGen Annual Report & Energy and Petroleum Regulatory Authority (EPRA)',
      claim: 'Verify what percentage of Kenya electric energy was generated from renewable sources (Geothermal, Hydro, Wind) in the 2024-2025 fiscal year.',
      reward: 370,
      diff: 'hard',
      requiredLinksCount: 2
    },
    {
      title: 'Compare Wholesale Maize Flour (Unga) Mill Prices Across Millers',
      topic: 'Ministry of Agriculture Crop Market Bulletin',
      claim: 'Locate verified retail and wholesale prices for a standard 2kg packet of fortified sifted maize meal across 3 major brands.',
      reward: 290,
      diff: 'easy',
      requiredLinksCount: 2
    },
    {
      title: 'Audit University Degree Accreditation Status: CUE Kenya',
      topic: 'Commission for University Education (CUE) Accredited Programs',
      claim: 'Verify that the Bachelor of Science in Software Engineering program offered by local private universities holds valid statutory accreditation.',
      reward: 360,
      diff: 'medium',
      requiredLinksCount: 2
    },
    {
      title: 'Verify Primary Data Source for Quoted Inflation Rate',
      topic: 'Kenya National Bureau of Statistics (KNBS) CPI Report',
      claim: 'Find the official KNBS Consumer Price Index bulletin verifying the exact headline inflation rate reported in the media for March 2026.',
      reward: 350,
      diff: 'medium',
      requiredLinksCount: 2
    }
  ];

  researchBlueprints.forEach((bp) => {
    for (let v = 1; v <= 5; v++) {
      tasks.push({
        id: `res_${idCounter++}`,
        category: 'research',
        experienceType: 'RESEARCH_EXPERIENCE',
        title: v === 1 ? bp.title : `${bp.title} (Batch ${v})`,
        description: bp.claim,
        instructions: 'Investigate the claim using verified primary sources (government reports, official regulatory databases). Provide working HTTPS URLs and an executive summary.',
        reward: bp.reward + (v * 15),
        estimatedMinutes: 18,
        difficulty: bp.diff,
        slotsAvailable: 35 - (v * 2),
        status: 'PUBLISHED',
        taskContent: {
          topic: bp.topic,
          claimToVerify: bp.claim,
          minSourcesCount: bp.requiredLinksCount
        }
      });
    }
  });

  // ========================================================
  // 12. LOGIC, CODE & QUIZZES (30 tasks)
  // ========================================================
  const quizBlueprints = [
    {
      title: 'Python Asynchronous Concurrency & Asyncio Debugging',
      diff: 'hard',
      reward: 460,
      time: 20,
      snippet: 'import asyncio\n\nasync def fetch_data(id):\n    await asyncio.sleep(1)\n    return f"Data {id}"\n\n# Buggy sequential execution:\nasync def main():\n    results = []\n    for i in range(5):\n        # Fix this sequential bottleneck to run concurrently\n        res = await fetch_data(i)\n        results.append(res)\n    return results',
      question: 'The code above executes requests sequentially taking 5 seconds total. Rewrite the function using asyncio.gather to fetch all 5 items concurrently in ~1 second.'
    },
    {
      title: 'SQL Query Optimization: Eliminating N+1 Query Scenarios',
      diff: 'hard',
      reward: 480,
      time: 22,
      snippet: 'SELECT * FROM users WHERE active = true;\n-- Then looping in backend: SELECT * FROM orders WHERE user_id = ?;',
      question: 'Rewrite this into a single optimized SQL JOIN query with JSON aggregation or LEFT JOIN that returns active users with their associated order totals in one round-trip.'
    },
    {
      title: 'Logical Deductive Reasoning: Knight & Knave Puzzle',
      diff: 'medium',
      reward: 310,
      time: 14,
      snippet: 'Person A says: "At least one of us is a Knave (always lies)."\nPerson B remains silent.',
      question: 'Determine the true identity of Person A and Person B. Explain your deductive step-by-step reasoning.'
    },
    {
      title: 'JavaScript Promise Error Handling & Rejection Catching',
      diff: 'medium',
      reward: 380,
      time: 16,
      snippet: 'function loadUser() {\n  return fetch("/api/user")\n    .then(res => res.json())\n    // Bug: unhandled network rejection when fetch fails\n}',
      question: 'Update the function to check res.ok, handle HTTP 400/500 errors gracefully, and return an informative error message.'
    },
    {
      title: 'Financial Mathematics: Compound Interest & Sinking Fund',
      diff: 'medium',
      reward: 340,
      time: 15,
      snippet: 'Principal: KES 100,000\nInterest Rate: 12% per annum compounding monthly\nDuration: 2 years',
      question: 'Calculate the future value at the end of 2 years using the compound interest formula: A = P(1 + r/n)^(nt). Show your calculation steps.'
    },
    {
      title: 'Data Structures: Time Complexity of Hash Maps vs Binary Trees',
      diff: 'hard',
      reward: 420,
      time: 18,
      snippet: 'Lookup operation in Hash Table vs Balanced Binary Search Tree (AVL / Red-Black)',
      question: 'Compare the average and worst-case time complexity for both data structures. Under what specific scenario does a Hash Map degrade to O(n)?'
    }
  ];

  quizBlueprints.forEach((bp) => {
    for (let v = 1; v <= 5; v++) {
      tasks.push({
        id: `knw_${idCounter++}`,
        category: 'knowledge',
        experienceType: 'QUIZ_EXPERIENCE',
        title: v === 1 ? bp.title : `${bp.title} (Problem ${v})`,
        description: bp.question,
        instructions: 'Read the code snippet or logical prompt. Write the corrected code and provide a concise, rigorous technical explanation.',
        reward: bp.reward + (v * 20),
        estimatedMinutes: bp.time,
        difficulty: bp.diff,
        slotsAvailable: 40 - (v * 3),
        status: 'PUBLISHED',
        taskContent: {
          codeSnippet: bp.snippet,
          challengePrompt: bp.question
        }
      });
    }
  });

  // Set unlock fee for every single task in the marketplace
  tasks.forEach(t => {
    t.unlockFee = Math.max(5, Math.round(((t.reward || 100) * 0.1) / 5) * 5);
  });

  return tasks;
}

export const CATALOG = generateCatalog();
