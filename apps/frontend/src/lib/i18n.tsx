import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Minimal, dependency-free i18n for the public marketing site (Home/About/
// Navbar/Footer). Deliberately not react-i18next/next-intl — this app only
// needs two languages and a couple of pages, so a plain dictionary + Context
// is the "simple, scalable" solution: add a language by adding a key to
// DICTIONARIES, add copy anywhere by adding a key to both `en` and `am`.
//
// Persists the choice in localStorage so it survives a refresh, same
// pattern as the admin auth token in lib/api.ts.
// ---------------------------------------------------------------------------

export type Language = "en" | "am";

const LANG_KEY = "prqms_lang";

const en = {
  nav: {
    home: "Home",
    about: "About Us",
    track: "Track Repair",
    staffLogin: "Staff Login",
    getQuote: "Get a Free Quote",
  },
  home: {
    badge: "Trusted local repair shop",
    heroTitle: "Fast, Reliable Phone Repair You Can Trust",
    heroSubtitle:
      "Screens, batteries, water damage, and more — fixed by certified technicians with transparent pricing and no surprises.",
    ctaBook: "Book Appointment",
    ctaLearnMore: "Learn more about us",
    statValue: "30 min",
    statLabel: "avg. screen repair",
    servicesTitle: "Our Services",
    servicesSubtitle: "Whatever's wrong with your phone, we've probably fixed it before.",
    services: {
      screen: {
        title: "Screen Replacement",
        description: "Cracked or unresponsive display? We swap it out with premium, warrantied glass.",
      },
      battery: {
        title: "Battery Issues",
        description: "Draining fast or won't hold a charge — we replace it and restore full battery health.",
      },
      water: {
        title: "Water Damage",
        description: "Full diagnostic and corrosion cleanup to bring liquid-damaged devices back to life.",
      },
      motherboard: {
        title: "Motherboard Repair",
        description: "Component-level board repair for the issues most shops won't even attempt.",
      },
    },
    howTitle: "How It Works",
    howSubtitle: "Three simple steps from broken to fixed.",
    steps: {
      select: { title: "Select Phone & Issue", description: "Tell us your device and what's wrong — takes less than a minute." },
      quote: { title: "Get an Instant Quote", description: "See transparent, upfront pricing before you commit to anything." },
      dropoff: { title: "Drop Off or Ship", description: "Bring it by the shop or ship it in — either way, we keep you posted." },
    },
    contactTitle: "Contact Us",
    contactSubtitle: "Questions, feedback, or ready to book? Send {shopName} a message and we'll respond fast.",
  },
  about: {
    heroTitle: "About Us",
    heroSubtitle: "We're on a mission to make phone repair fast, honest, and stress-free.",
    storyTitle: "Our Story & Mission",
    storyP1:
      "{shopName} started with a simple frustration: getting a phone fixed shouldn't feel confusing, slow, or like a gamble on price. Too many people put off a repair because they don't know what it'll cost or how long it'll take.",
    storyP2:
      "Our mission is to take the anxiety out of tech repair — with transparent pricing you see before you commit, blazing-fast turnarounds, and technicians who explain what's actually wrong instead of a wall of jargon.",
    statMinValue: "30 min",
    statMinLabel: "average screen repair",
    statPriceValue: "100%",
    statPriceLabel: "upfront pricing",
    statWarrantyValue: "Warranty",
    statWarrantyLabel: "on every repair",
    statCertifiedValue: "Certified",
    statCertifiedLabel: "technicians only",
    whyTitle: "Why Choose Us",
    whySubtitle: "Our guarantees to every customer, every time.",
    values: {
      certified: {
        title: "Certified Technicians",
        description: "Every repair is handled by trained, certified technicians who know these devices inside out.",
      },
      warranty: {
        title: "Premium Parts, Warranty Included",
        description: "We only use premium-grade parts, and every repair is backed by a solid warranty.",
      },
      pricing: {
        title: "Transparent Pricing, No Hidden Fees",
        description: "The quote you get upfront is the price you pay — no surprise charges at pickup.",
      },
    },
    ctaTitle: "Ready to get your phone fixed?",
    ctaSubtitle: "Get a free, transparent quote in under a minute.",
    ctaButton: "Book Appointment",
  },
  testimonials: {
    title: "What Our Customers Say",
    subtitle: "Real repairs, real reviews.",
    items: [
      {
        name: "Sarah M.",
        detail: "iPhone 14 screen repair",
        quote:
          "Dropped my phone the morning of an interview and they had it looking brand new in 30 minutes. Genuinely didn't expect it to be that fast.",
      },
      {
        name: "David R.",
        detail: "Samsung Galaxy water damage",
        quote:
          "I was sure my phone was dead after it fell in the pool. They saved every photo and it's worked perfectly for months since.",
      },
      {
        name: "Amara T.",
        detail: "Battery replacement",
        quote:
          "Upfront price, no upsell pressure, done same day. It's rare to find a repair shop this straightforward.",
      },
    ],
  },
  contactForm: {
    nameLabel: "Name",
    namePlaceholder: "Jane Doe",
    phoneLabel: "Phone number",
    phonePlaceholder: "(555) 123-4567",
    emailLabel: "Email",
    emailPlaceholder: "jane@example.com",
    messageLabel: "Message",
    messagePlaceholder: "Tell us what's going on with your device, or ask us anything…",
    send: "Send Message",
    sending: "Sending…",
    errorFallback: "Failed to send your message. Please try again.",
    thanksTitle: "Thanks, {firstName}!",
    thanksBody: "We've got your message and will get back to you shortly.",
    referenceLabel: "Reference:",
  },
  faq: {
    title: "Frequently Asked Questions",
    subtitle: "Everything customers usually call to ask.",
    items: [
      {
        question: "Will I lose my data?",
        answer:
          "In almost all repairs (screens, batteries, charging ports) your data is never touched — we don't need to wipe or reset your device. For deeper repairs like motherboard work, we always back up what we can first and let you know upfront if there's any risk.",
      },
      {
        question: "Do you offer a warranty?",
        answer:
          "Yes — every repair includes a warranty covering both the part and our workmanship. If anything we fixed acts up afterward, bring it back and we'll make it right at no extra cost.",
      },
      {
        question: "How long will my repair take?",
        answer:
          "Most common repairs — screens, batteries, charging ports — are done in 30-45 minutes while you wait. Water damage or motherboard repairs typically take 1-2 days since they need a full diagnostic first.",
      },
      {
        question: "Do I need an appointment, or can I just walk in?",
        answer:
          "Walk-ins are always welcome. Booking ahead through the form above just lets us have your part ready and skip the wait, which we'd recommend for anything beyond a quick screen or battery swap.",
      },
    ],
  },
  track: {
    title: "Track Your Repair",
    subtitle: "Enter the tracking code from your repair slip to see live status.",
    placeholder: "e.g. K7QX9M",
    searching: "Searching…",
    button: "Track",
    errorFallback: "Something went wrong",
    deviceLabel: "Device",
    repairLabel: "Repair",
    estimatedLabel: "Estimated time",
  },
  tracker: {
    cancelledTitle: "This repair was cancelled",
    cancelledBody: "Contact the shop if you have any questions.",
    collectedBody: "Picked up — this repair is complete. Thanks!",
    inProgress: "In progress",
    partOnOrder: "Part on order",
    steps: {
      droppedOff: "Dropped Off",
      diagnosing: "Diagnosing",
      waitingOnParts: "Waiting on Parts",
      repairing: "Repairing",
      readyForPickup: "Ready for Pickup",
    },
  },
  footer: {
    navigate: "Navigate",
    contact: "Contact",
    staff: "Staff",
    staffLogin: "Staff / Admin login",
    rights: "All rights reserved.",
  },
  // ------------------------------------------------------------------
  // Internal / staff-only screens (Issue: dark mode + language toggle
  // must work everywhere, not just the public marketing site).
  // ------------------------------------------------------------------
  admin: {
    common: {
      clearSearch: "Clear search",
      noMatches: "No results match your search.",
      searchQueue: "Search name, phone, device or code",
      searchPrices: "Search repair type or brand",
    },
    nav: {
      queue: "Queue",
      newRegistration: "New Registration",
      technician: "Technician",
      settings: "Settings",
      repairTypes: "Repair Types",
      priceList: "Price List",
      messages: "Messages",
      wholesale: "Wholesale & Debtors",
      analytics: "Analytics",
      inventoryAdvanced: "Advanced Stock",
      viewPublicSite: "View public site",
      logout: "Log out",
      adminLogin: "Admin login",
    },
    status: {
      waiting: "Waiting",
      inProgress: "In Progress",
      done: "Done",
      collected: "Collected",
      cancelled: "Cancelled",
      unread: "Unread",
      read: "Read",
      replied: "Replied",
    },
    dashboard: {
      title: "Live Queue",
      waitingCount: "{count} waiting",
      inProgressCount: "{count} in progress",
      readyCount: "{count} ready for pickup",
      nowRepairing: "Now Repairing",
      noTicketInProgress: "No ticket in progress.",
      markDone: "Mark Done",
      waitingQueue: "Waiting Queue",
      nothingWaiting: "Nothing waiting.",
      colNumber: "#",
      colCustomer: "Customer",
      colDeviceRepair: "Device / Repair",
      colEstStart: "Est. Start",
      colEstCost: "Est. Cost",
      colActions: "Actions",
      start: "Start",
      cancel: "Cancel",
      readyForPickup: "Ready for Pickup",
      nothingReady: "Nothing waiting for pickup.",
      markCollected: "Mark Collected",
      actualCostPrompt: "Actual cost (leave blank to keep the estimate):",
      cancelReasonPrompt: "Reason for cancellation:",
      loadFailed: "Failed to load the queue",
      actionFailed: "Action failed",
      finishFirstHint: "Finish the current repair first",
      moveUp: "Move up",
      moveDown: "Move down",
    },
    register: {
      title: "New Registration",
      phoneLabel: "Phone number",
      nameLabel: "Customer name",
      emailLabel: "Email (optional — for pickup-ready notifications)",
      deviceBrandLabel: "Device brand",
      deviceModelLabel: "Device model",
      repairTypeLabel: "Repair type",
      selectPlaceholder: "Select…",
      estimatedCost: "Estimated cost: ${amount}",
      problemLabel: "Problem description",
      pinLabel: "Device password / PIN (optional)",
      notesLabel: "Notes (optional)",
      registering: "Registering…",
      submit: "Register & Print Slip",
      registerFailed: "Failed to register ticket",
      successTitle: "Registration complete",
      successSubtitle: "Please save this ID to track your repair.",
      ticketIdLabel: "Ticket ID",
      trackingCodeLabel: "Tracking Code",
      viewPrintSlip: "View / Print Slip",
      trackThisRepair: "Track This Repair",
      registerAnother: "Register Another",
    },
    slip: {
      pageTitle: "Repair Slip",
      backToQueue: "Back to queue",
      loading: "Loading…",
      newRegistration: "← New registration",
      printSave: "Print / Save as PDF",
      ticketNumber: "Ticket #",
      registered: "Registered",
      customer: "Customer",
      phone: "Phone",
      device: "Device",
      repair: "Repair",
      queuePosition: "Queue position",
      inProgress: "In progress",
      estAppointment: "Est. appointment",
      estCost: "Est. cost",
      trackAnytime: "Track your repair anytime at",
      usingCode: "using code",
      scanToTrack: "Scan to track your repair",
      bringSlip: "Please bring this slip when collecting your device.",
      loadFailed: "Failed to load ticket",
      fallbackShopName: "Repair Shop",
    },
    login: {
      title: "Staff Login",
      emailLabel: "Email",
      passwordLabel: "Password",
      signingIn: "Signing in…",
      signIn: "Sign in",
      failed: "Login failed",
      pleaseLogIn: "Please log in first.",
    },
    settings: {
      title: "Shop Settings",
      shopName: "Shop name",
      address: "Address",
      contactNumber: "Contact number",
      openingTime: "Opening time",
      closingTime: "Closing time",
      lunchStart: "Lunch break start",
      lunchEnd: "Lunch break end",
      daysOff: "Days off",
      saved: "Saved.",
      saving: "Saving…",
      save: "Save settings",
      loadFailed: "Failed to load settings",
      saveFailed: "Failed to save settings",
      changePasswordTitle: "Change Admin Password",
      currentPassword: "Current password",
      newPassword: "New password",
      passwordChanged: "Password changed.",
      changePassword: "Change password",
      changePasswordFailed: "Failed to change password",
      days: {
        sunday: "Sunday",
        monday: "Monday",
        tuesday: "Tuesday",
        wednesday: "Wednesday",
        thursday: "Thursday",
        friday: "Friday",
        saturday: "Saturday",
      },
    },
    repairTypes: {
      title: "Repair Types",
      addTitle: "Add Repair Type",
      nameLabel: "Name",
      durationLabel: "Duration (min)",
      add: "Add",
      colName: "Name",
      colDuration: "Duration",
      colActions: "Actions",
      save: "Save",
      cancel: "Cancel",
      edit: "Edit",
      delete: "Delete",
      confirmDelete: "Delete this repair type?",
      loadFailed: "Failed to load repair types",
      createFailed: "Failed to create repair type",
      updateFailed: "Failed to update repair type",
      deleteFailed: "Failed to delete repair type",
      minutesSuffix: "min",
    },
    priceList: {
      title: "Price List",
      addTitle: "Add Price",
      repairTypeLabel: "Repair type",
      selectPlaceholder: "Select…",
      deviceBrandLabel: "Device brand",
      brandPlaceholder: "blank = default",
      priceLabel: "Price",
      add: "Add",
      hint: "Leave device brand blank to set the default fallback price for that repair type.",
      colRepairType: "Repair Type",
      colBrand: "Brand",
      colPrice: "Price",
      colActions: "Actions",
      defaultLabel: "default",
      save: "Save",
      cancel: "Cancel",
      edit: "Edit",
      delete: "Delete",
      confirmDelete: "Delete this price entry?",
      loadFailed: "Failed to load price list",
      createFailed: "Failed to create price entry",
      updateFailed: "Failed to update price",
      deleteFailed: "Failed to delete price entry",
    },
    messages: {
      title: "Messages",
      unreadBadge: "{count} unread",
      emptyList: "No messages yet — submissions from the \"Get in Touch\" form will show up here.",
      selectPrompt: "Select a message to view it.",
      loading: "Loading…",
      messageLabel: "Message",
      yourReply: "Your reply",
      replyToCustomer: "Reply to this customer",
      sendAnotherReply: "Send another reply",
      sendButton: "Send Reply to Customer",
      sending: "Sending…",
      loadListFailed: "Failed to load messages",
      loadMessageFailed: "Failed to load message",
      sendFailed: "Failed to send reply",
      replyPlaceholder: "Hi {name}, thanks for reaching out...",
    },
    technician: {
      title: "Technician Dashboard",
      droppedOffCount: "{count} dropped off",
      inProcessCount: "{count} in process",
      readyCount: "{count} ready for pickup",
      droppedOff: "Dropped Off",
      inProcess: "In Process",
      readyForPickup: "Ready for Pickup",
      nothingWaiting: "Nothing waiting.",
      noActiveRepair: "No active repair.",
      nothingReady: "Nothing ready yet.",
      checklistDone: "Checklist ✓",
      needsChecklist: "Needs checklist",
      droppedOffAt: "Dropped off {time}",
      startedAt: "Started {time}",
      readySince: "Ready since {time}",
      problem: "Problem",
      checklistTitle: "Pre-Repair Checklist",
      noChecklistYet: "No checklist on file yet.",
      screenLabel: "Screen: {value}",
      touchLabel: "Touch/Face ID: {value}",
      camerasLabel: "Cameras: {value}",
      chargingLabel: "Charging port: {value}",
      working: "Working",
      notWorking: "Not working",
      close: "Close",
      startRepair: "Start Repair",
      markDone: "Mark Done",
      markCollected: "Mark Collected",
      finishCurrentFirst: "Finish the current repair first",
      loadFailed: "Failed to load tickets",
      actionFailed: "Action failed",
      actualCostPrompt: "Actual cost (leave blank to keep the estimate):",
    },
    checklist: {
      title: "Pre-Repair Checklist",
      warning:
        "Record the device's condition before you touch it. This protects both the shop and the customer if there's a dispute later.",
      screenCondition: "Screen Condition",
      screenPerfect: "Perfect",
      screenScratched: "Scratched",
      screenCracked: "Cracked",
      touchFaceId: "Touch / Face ID working?",
      cameras: "Cameras working?",
      chargingPort: "Charging Port working?",
      yes: "Yes",
      no: "No",
      notesLabel: "Technician Notes",
      notesPlaceholder: "Anything else worth flagging (case damage, prior repairs, water exposure)...",
      cancel: "Cancel",
      submit: "Complete Checklist & Start Repair",
      saving: "Saving…",
      incompleteHint: "Answer every item before starting the repair",
      saveFailed: "Failed to save checklist",
    },
  },
};

// Amharic — core nav/CTA terms reviewed for common usage; longer body copy
// is a straightforward first-pass translation and worth a native-speaker
// pass before this goes in front of real customers.
const am: typeof en = {
  nav: {
    home: "መነሻ",
    about: "ስለ እኛ",
    track: "ጥገና ይከታተሉ",
    staffLogin: "የሰራተኛ መግቢያ",
    getQuote: "ነጻ ግምት ያግኙ",
  },
  home: {
    badge: "የታመነ የአካባቢ ጥገና ሱቅ",
    heroTitle: "ፈጣንና አስተማማኝ የስልክ ጥገና",
    heroSubtitle:
      "ስክሪን፣ ባትሪ፣ በውሃ የደረሰ ጉዳት እና ሌሎችም — በተመሰከረላቸው ቴክኒሻኖች፣ ግልጽ ዋጋ እና ያለ ምንም አስገራሚ ክፍያ ይጠገናል።",
    ctaBook: "ቀጠሮ ይያዙ",
    ctaLearnMore: "ስለ እኛ የበለጠ ይወቁ",
    statValue: "30 ደቂቃ",
    statLabel: "አማካይ የስክሪን ጥገና ጊዜ",
    servicesTitle: "አገልግሎቶቻችን",
    servicesSubtitle: "በስልክዎ ላይ የተፈጠረው ማንኛውም ችግር ቢሆን፣ ቀደም ብለን አስተካክለነው ይሆናል።",
    services: {
      screen: {
        title: "የስክሪን ምትክ",
        description: "የተሰነጠቀ ወይም የማይሰራ ስክሪን? በዋስትና በተሸፈነ ጥራት ያለው መስታወት እንቀይራለን።",
      },
      battery: {
        title: "የባትሪ ችግሮች",
        description: "ፈጣን ፍሳሽ ወይም ኃይል የማይይዝ ባትሪ — እንቀይረዋለን እና ሙሉ የባትሪ ጤንነትን እንመልሳለን።",
      },
      water: {
        title: "በውሃ የደረሰ ጉዳት",
        description: "ሙሉ ምርመራ እና የዝገት ማጽዳት በውሃ የተጎዱ መሳሪያዎችን መልሶ ለማስራት።",
      },
      motherboard: {
        title: "የማዘርቦርድ ጥገና",
        description: "አብዛኞቹ ሱቆች የማይሞክሩትን የቦርድ ደረጃ ጥገና እናከናውናለን።",
      },
    },
    howTitle: "እንዴት እንደሚሰራ",
    howSubtitle: "ከተበላሸ ወደ ተስተካከለ ሶስት ቀላል እርምጃዎች።",
    steps: {
      select: { title: "ስልክና ችግር ይምረጡ", description: "መሳሪያዎን እና ችግሩን ይንገሩን — ከአንድ ደቂቃ ያነሰ ጊዜ ይወስዳል።" },
      quote: { title: "ፈጣን ግምት ያግኙ", description: "ከመወሰንዎ በፊት ግልጽና ቅድሚያ የተቀመጠ ዋጋ ይመልከቱ።" },
      dropoff: { title: "ያድርሱ ወይም ይላኩ", description: "ወደ ሱቁ ያምጡ ወይም ይላኩልን — በሁለቱም ሁኔታ እናሳውቅዎታለን።" },
    },
    contactTitle: "አግኙን",
    contactSubtitle: "ጥያቄ፣ አስተያየት ወይም ለመቀጠር ዝግጁ ከሆኑ? ለ{shopName} መልእክት ይላኩ በፍጥነት እንመልስልዎታለን።",
  },
  about: {
    heroTitle: "ስለ እኛ",
    heroSubtitle: "የስልክ ጥገናን ፈጣን፣ ታማኝ እና ያለ ጭንቀት ለማድረግ በተልእኮ ላይ ነን።",
    storyTitle: "ታሪካችንና ተልእኳችን",
    storyP1:
      "{shopName} የተጀመረው ከቀላል ብስጭት ነው፦ ስልክ ማስጠገን ግራ የሚያጋባ፣ ዘገምተኛ ወይም በዋጋ ላይ ውርርድ መሆን የለበትም። ብዙ ሰዎች ዋጋውን ወይም የሚፈጀውን ጊዜ ስለማያውቁ ጥገናን ያዘገያሉ።",
    storyP2:
      "ተልእኳችን ከመወሰንዎ በፊት የሚታይ ግልጽ ዋጋ፣ እጅግ ፈጣን የማጠናቀቂያ ጊዜ እና ውስብስብ የቴክኒክ ቃላት ፋንታ በትክክል ምን እንደተበላሸ የሚያስረዱ ቴክኒሻኖች በመስጠት ከቴክ ጥገና ጭንቀትን ማስወገድ ነው።",
    statMinValue: "30 ደቂቃ",
    statMinLabel: "አማካይ የስክሪን ጥገና",
    statPriceValue: "100%",
    statPriceLabel: "ቅድሚያ የተገለጸ ዋጋ",
    statWarrantyValue: "ዋስትና",
    statWarrantyLabel: "በእያንዳንዱ ጥገና ላይ",
    statCertifiedValue: "የተመሰከረላቸው",
    statCertifiedLabel: "ቴክኒሻኖች ብቻ",
    whyTitle: "ለምን እኛን ይምረጡ",
    whySubtitle: "ለእያንዳንዱ ደንበኛ፣ በየጊዜው የምንሰጣቸው ማረጋገጫዎች።",
    values: {
      certified: {
        title: "የተመሰከረላቸው ቴክኒሻኖች",
        description: "እያንዳንዱ ጥገና እነዚህን መሳሪያዎች ውስጥና ውጭ በሚያውቁ የሰለጠኑ ቴክኒሻኖች ይከናወናል።",
      },
      warranty: {
        title: "ከፍተኛ ጥራት ያላቸው እቃዎች፣ ከዋስትና ጋር",
        description: "ከፍተኛ ጥራት ያላቸውን እቃዎች ብቻ እንጠቀማለን፣ እያንዳንዱ ጥገና በጠንካራ ዋስትና ይሸፈናል።",
      },
      pricing: {
        title: "ግልጽ ዋጋ፣ ምንም የተደበቀ ክፍያ የለም",
        description: "ቅድሚያ የሚሰጥዎት ግምት የሚከፍሉት ዋጋ ነው — በመረከቢያ ጊዜ ምንም አስገራሚ ክፍያ የለም።",
      },
    },
    ctaTitle: "ስልክዎን ለማስጠገን ዝግጁ ነዎት?",
    ctaSubtitle: "በአንድ ደቂቃ ውስጥ ነጻ፣ ግልጽ ግምት ያግኙ።",
    ctaButton: "ቀጠሮ ይያዙ",
  },
  testimonials: {
    title: "ደንበኞቻችን ምን ይላሉ",
    subtitle: "እውነተኛ ጥገናዎች፣ እውነተኛ አስተያየቶች።",
    items: [
      {
        name: "Sarah M.",
        detail: "የአይፎን 14 ስክሪን ጥገና",
        quote:
          "ስልኬን ለቃለ መጠይቅ በዘጋጀሁበት ጠዋት ጣልኩት እና በ30 ደቂቃ ውስጥ አዲስ መስሎ መለሱልኝ። በእውነት ይህን ያህል ፈጣን ይሆናል ብዬ አልጠበቅኩም ነበር።",
      },
      {
        name: "David R.",
        detail: "የሳምሱንግ ጋላክሲ በውሃ ጉዳት",
        quote:
          "ስልኬ ገንዳ ውስጥ ከወደቀ በኋላ እንደሞተ እርግጠኛ ነበርኩ። ሁሉንም ፎቶዎቼን አዳኑልኝ እና ከወራት ጀምሮ ያለምንም ችግር እየሰራ ነው።",
      },
      {
        name: "Amara T.",
        detail: "የባትሪ ምትክ",
        quote: "ቅድሚያ የተገለጸ ዋጋ፣ ምንም ተጨማሪ ሽያጭ ግፊት የለም፣ በዕለቱ ተጠናቀቀ። እንዲህ ግልጽ የሆነ የጥገና ሱቅ ማግኘት ብርቅ ነው።",
      },
    ],
  },
  contactForm: {
    nameLabel: "ስም",
    namePlaceholder: "ጄን ዶ",
    phoneLabel: "ስልክ ቁጥር",
    phonePlaceholder: "(555) 123-4567",
    emailLabel: "ኢሜይል",
    emailPlaceholder: "jane@example.com",
    messageLabel: "መልእክት",
    messagePlaceholder: "በመሳሪያዎ ላይ ስላለው ችግር ይንገሩን፣ ወይም ማንኛውንም ነገር ይጠይቁን…",
    send: "መልእክት ላክ",
    sending: "በመላክ ላይ…",
    errorFallback: "መልእክትዎን መላክ አልተቻለም። እባክዎ እንደገና ይሞክሩ።",
    thanksTitle: "እናመሰግናለን፣ {firstName}!",
    thanksBody: "መልእክትዎን ደርሶናል በቅርቡ እንመልስልዎታለን።",
    referenceLabel: "መለያ ቁጥር፦",
  },
  faq: {
    title: "በተደጋጋሚ የሚነሱ ጥያቄዎች",
    subtitle: "ደንበኞች አብዛኛውን ጊዜ ደውለው የሚጠይቁት ሁሉም ነገር።",
    items: [
      {
        question: "ውሂቤን አጣለሁ?",
        answer:
          "በሁሉም ማለት በሚቻል ጥገናዎች (ስክሪን፣ ባትሪ፣ የቻርጅ ማስገቢያ) ውሂብዎ ፈጽሞ አይነካም — መሳሪያዎን ማጽዳት ወይም ዳግም ማስጀመር አያስፈልገንም። እንደ ማዘርቦርድ ስራ ላሉ ጥልቅ ጥገናዎች፣ መጀመሪያ የቻልነውን ሁሉ እንቀምጣለን እና ማንኛውም አደጋ ካለ አስቀድመን እናሳውቅዎታለን።",
      },
      {
        question: "ዋስትና ትሰጣላችሁ?",
        answer:
          "አዎ — እያንዳንዱ ጥገና ሁለቱንም እቃውን እና የስራችንን ጥራት የሚሸፍን ዋስትና ያካትታል። ያስተካከልነው ነገር ቆይቶ ችግር ካጋጠመው፣ መልሰው ያምጡት ያለ ተጨማሪ ክፍያ እናስተካክለዋለን።",
      },
      {
        question: "ጥገናዬ ምን ያህል ጊዜ ይወስዳል?",
        answer:
          "አብዛኞቹ የተለመዱ ጥገናዎች — ስክሪን፣ ባትሪ፣ የቻርጅ ማስገቢያ — በ30-45 ደቂቃ ውስጥ በመጠባበቅ ላይ ሳሉ ይጠናቀቃሉ። በውሃ የደረሰ ጉዳት ወይም የማዘርቦርድ ጥገናዎች ሙሉ ምርመራ ስለሚያስፈልጋቸው በተለምዶ 1-2 ቀናት ይወስዳሉ።",
      },
      {
        question: "ቀጠሮ ያስፈልገኛል ወይስ በቀጥታ መምጣት እችላለሁ?",
        answer:
          "ያለ ቀጠሮ መምጣት ሁልጊዜ ተቀባይነት አለው። ከላይ ባለው ቅጽ አስቀድሞ መቀጠር የሚያስፈልገውን እቃ ዝግጁ እንዲሆን እና ወረፋን ለመዝለል ብቻ ያስችላል፣ ይህም ከፈጣን ስክሪን ወይም ባትሪ ልውውጥ ውጪ ለሆነ ማንኛውም ነገር እንመክራለን።",
      },
    ],
  },
  track: {
    title: "ጥገናዎን ይከታተሉ",
    subtitle: "ከጥገና ደረሰኝዎ ላይ ያለውን የመከታተያ ኮድ በማስገባት ቀጥታ ሁኔታን ይመልከቱ።",
    placeholder: "ለምሳሌ K7QX9M",
    searching: "በመፈለግ ላይ…",
    button: "ተከታተል",
    errorFallback: "የሆነ ችግር ተፈጥሯል",
    deviceLabel: "መሳሪያ",
    repairLabel: "ጥገና",
    estimatedLabel: "የሚገመተው ጊዜ",
  },
  tracker: {
    cancelledTitle: "ይህ ጥገና ተሰርዟል",
    cancelledBody: "ጥያቄ ካለዎት ሱቁን ያግኙ።",
    collectedBody: "ተረክቧል — ይህ ጥገና ተጠናቅቋል። እናመሰግናለን!",
    inProgress: "በሂደት ላይ",
    partOnOrder: "እቃ በትዕዛዝ ላይ",
    steps: {
      droppedOff: "ገብቷል",
      diagnosing: "በምርመራ ላይ",
      waitingOnParts: "እቃ በመጠባበቅ ላይ",
      repairing: "በጥገና ላይ",
      readyForPickup: "ለመረከብ ዝግጁ",
    },
  },
  footer: {
    navigate: "ማውጫ",
    contact: "አግኙን",
    staff: "ሰራተኞች",
    staffLogin: "የሰራተኛ/አስተዳዳሪ መግቢያ",
    rights: "መብቱ በህግ የተጠበቀ ነው።",
  },
  admin: {
    common: {
      clearSearch: "ፍለጋውን አጽዳ",
      noMatches: "ከፍለጋዎ ጋር የሚዛመድ ውጤት የለም።",
      searchQueue: "በስም፣ በስልክ፣ በመሣሪያ ወይም በኮድ ይፈልጉ",
      searchPrices: "በጥገና ዓይነት ወይም በብራንድ ይፈልጉ",
    },
    nav: {
      queue: "ወረፋ",
      newRegistration: "አዲስ ምዝገባ",
      technician: "ቴክኒሻን",
      settings: "ቅንብሮች",
      repairTypes: "የጥገና አይነቶች",
      priceList: "የዋጋ ዝርዝር",
      messages: "መልእክቶች",
      wholesale: "ጅምላ ሽያጭ እና ዕዳ",
      analytics: "ትንተና",
      inventoryAdvanced: "የክምችት አስተዳደር",
      viewPublicSite: "የህዝብ ገጽን ይመልከቱ",
      logout: "ውጣ",
      adminLogin: "የአስተዳዳሪ መግቢያ",
    },
    status: {
      waiting: "በመጠባበቅ ላይ",
      inProgress: "በሂደት ላይ",
      done: "ተጠናቅቋል",
      collected: "ተረክቧል",
      cancelled: "ተሰርዟል",
      unread: "ያልተነበበ",
      read: "ተነቧል",
      replied: "ተመልሷል",
    },
    dashboard: {
      title: "ቀጥታ ወረፋ",
      waitingCount: "{count} በመጠባበቅ ላይ",
      inProgressCount: "{count} በሂደት ላይ",
      readyCount: "{count} ለመረከብ ዝግጁ",
      nowRepairing: "አሁን በመጠገን ላይ",
      noTicketInProgress: "በሂደት ላይ ምንም ትኬት የለም።",
      markDone: "እንደተጠናቀቀ ምልክት አድርግ",
      waitingQueue: "የመጠባበቂያ ወረፋ",
      nothingWaiting: "ምንም የሚጠብቅ የለም።",
      colNumber: "#",
      colCustomer: "ደንበኛ",
      colDeviceRepair: "መሳሪያ / ጥገና",
      colEstStart: "የሚገመተው መጀመሪያ",
      colEstCost: "የሚገመተው ዋጋ",
      colActions: "ተግባራት",
      start: "ጀምር",
      cancel: "ሰርዝ",
      readyForPickup: "ለመረከብ ዝግጁ",
      nothingReady: "ለመረከብ የሚጠብቅ ምንም የለም።",
      markCollected: "እንደተረከበ ምልክት አድርግ",
      actualCostPrompt: "ትክክለኛ ዋጋ (ግምቱን ለማቆየት ባዶ ይተውት)፦",
      cancelReasonPrompt: "የመሰረዝ ምክንያት፦",
      loadFailed: "ወረፋውን መጫን አልተቻለም",
      actionFailed: "ተግባሩ አልተሳካም",
      finishFirstHint: "መጀመሪያ የአሁኑን ጥገና ጨርስ",
      moveUp: "ወደ ላይ አንቀሳቅስ",
      moveDown: "ወደ ታች አንቀሳቅስ",
    },
    register: {
      title: "አዲስ ምዝገባ",
      phoneLabel: "ስልክ ቁጥር",
      nameLabel: "የደንበኛ ስም",
      emailLabel: "ኢሜይል (አማራጭ — ለመረከቢያ ዝግጁ ማሳወቂያ)",
      deviceBrandLabel: "የመሳሪያ ብራንድ",
      deviceModelLabel: "የመሳሪያ ሞዴል",
      repairTypeLabel: "የጥገና አይነት",
      selectPlaceholder: "ይምረጡ…",
      estimatedCost: "የሚገመተው ዋጋ፦ ${amount}",
      problemLabel: "የችግር መግለጫ",
      pinLabel: "የመሳሪያ የይለፍ ቃል / ፒን (አማራጭ)",
      notesLabel: "ማስታወሻዎች (አማራጭ)",
      registering: "በመመዝገብ ላይ…",
      submit: "መዝግብ እና ደረሰኝ አትም",
      registerFailed: "ትኬት መመዝገብ አልተቻለም",
      successTitle: "ምዝገባ ተጠናቅቋል",
      successSubtitle: "ጥገናዎን ለመከታተል እባክዎ ይህን መለያ ያስቀምጡ።",
      ticketIdLabel: "የትኬት መለያ",
      trackingCodeLabel: "የመከታተያ ኮድ",
      viewPrintSlip: "ደረሰኝ ይመልከቱ / ያትሙ",
      trackThisRepair: "ይህን ጥገና ይከታተሉ",
      registerAnother: "ሌላ ይመዝግቡ",
    },
    slip: {
      pageTitle: "የጥገና ደረሰኝ",
      backToQueue: "ወደ ወረፋ ተመለስ",
      loading: "በመጫን ላይ…",
      newRegistration: "← አዲስ ምዝገባ",
      printSave: "አትም / እንደ PDF አስቀምጥ",
      ticketNumber: "ትኬት #",
      registered: "የተመዘገበበት ጊዜ",
      customer: "ደንበኛ",
      phone: "ስልክ",
      device: "መሳሪያ",
      repair: "ጥገና",
      queuePosition: "የወረፋ ቦታ",
      inProgress: "በሂደት ላይ",
      estAppointment: "የሚገመተው ቀጠሮ",
      estCost: "የሚገመተው ዋጋ",
      trackAnytime: "ጥገናዎን በማንኛውም ጊዜ ይከታተሉ በ",
      usingCode: "በኮድ",
      scanToTrack: "ጥገናዎን ለመከታተል ይቃኙ",
      bringSlip: "መሳሪያዎን ሲረከቡ እባክዎ ይህን ደረሰኝ ይዘው ይምጡ።",
      loadFailed: "ትኬት መጫን አልተቻለም",
      fallbackShopName: "የጥገና ሱቅ",
    },
    login: {
      title: "የሰራተኛ መግቢያ",
      emailLabel: "ኢሜይል",
      passwordLabel: "የይለፍ ቃል",
      signingIn: "በመግባት ላይ…",
      signIn: "ግባ",
      failed: "መግባት አልተሳካም",
      pleaseLogIn: "እባክዎ መጀመሪያ ይግቡ።",
    },
    settings: {
      title: "የሱቅ ቅንብሮች",
      shopName: "የሱቅ ስም",
      address: "አድራሻ",
      contactNumber: "የመገናኛ ቁጥር",
      openingTime: "የመክፈቻ ሰዓት",
      closingTime: "የመዝጊያ ሰዓት",
      lunchStart: "የምሳ እረፍት መጀመሪያ",
      lunchEnd: "የምሳ እረፍት መጨረሻ",
      daysOff: "የእረፍት ቀናት",
      saved: "ተቀምጧል።",
      saving: "በማስቀመጥ ላይ…",
      save: "ቅንብሮችን አስቀምጥ",
      loadFailed: "ቅንብሮችን መጫን አልተቻለም",
      saveFailed: "ቅንብሮችን ማስቀመጥ አልተቻለም",
      changePasswordTitle: "የአስተዳዳሪ የይለፍ ቃል ቀይር",
      currentPassword: "የአሁኑ የይለፍ ቃል",
      newPassword: "አዲስ የይለፍ ቃል",
      passwordChanged: "የይለፍ ቃል ተቀይሯል።",
      changePassword: "የይለፍ ቃል ቀይር",
      changePasswordFailed: "የይለፍ ቃል መቀየር አልተቻለም",
      days: {
        sunday: "እሁድ",
        monday: "ሰኞ",
        tuesday: "ማክሰኞ",
        wednesday: "ረቡዕ",
        thursday: "ሐሙስ",
        friday: "አርብ",
        saturday: "ቅዳሜ",
      },
    },
    repairTypes: {
      title: "የጥገና አይነቶች",
      addTitle: "የጥገና አይነት ጨምር",
      nameLabel: "ስም",
      durationLabel: "ቆይታ (ደቂቃ)",
      add: "ጨምር",
      colName: "ስም",
      colDuration: "ቆይታ",
      colActions: "ተግባራት",
      save: "አስቀምጥ",
      cancel: "ሰርዝ",
      edit: "አስተካክል",
      delete: "ሰርዝ",
      confirmDelete: "ይህን የጥገና አይነት መሰረዝ ይፈልጋሉ?",
      loadFailed: "የጥገና አይነቶችን መጫን አልተቻለም",
      createFailed: "የጥገና አይነት መፍጠር አልተቻለም",
      updateFailed: "የጥገና አይነት ማዘመን አልተቻለም",
      deleteFailed: "የጥገና አይነት መሰረዝ አልተቻለም",
      minutesSuffix: "ደቂቃ",
    },
    priceList: {
      title: "የዋጋ ዝርዝር",
      addTitle: "ዋጋ ጨምር",
      repairTypeLabel: "የጥገና አይነት",
      selectPlaceholder: "ይምረጡ…",
      deviceBrandLabel: "የመሳሪያ ብራንድ",
      brandPlaceholder: "ባዶ = ነባሪ",
      priceLabel: "ዋጋ",
      add: "ጨምር",
      hint: "ለዚያ የጥገና አይነት ነባሪ ዋጋ ለማዘጋጀት የመሳሪያ ብራንድን ባዶ ይተውት።",
      colRepairType: "የጥገና አይነት",
      colBrand: "ብራንድ",
      colPrice: "ዋጋ",
      colActions: "ተግባራት",
      defaultLabel: "ነባሪ",
      save: "አስቀምጥ",
      cancel: "ሰርዝ",
      edit: "አስተካክል",
      delete: "ሰርዝ",
      confirmDelete: "ይህን የዋጋ ማስገቢያ መሰረዝ ይፈልጋሉ?",
      loadFailed: "የዋጋ ዝርዝርን መጫን አልተቻለም",
      createFailed: "የዋጋ ማስገቢያ መፍጠር አልተቻለም",
      updateFailed: "ዋጋ ማዘመን አልተቻለም",
      deleteFailed: "የዋጋ ማስገቢያ መሰረዝ አልተቻለም",
    },
    messages: {
      title: "መልእክቶች",
      unreadBadge: "{count} ያልተነበቡ",
      emptyList: "እስካሁን ምንም መልእክት የለም — ከ«አግኙን» ቅጽ የሚላኩ መልእክቶች እዚህ ይታያሉ።",
      selectPrompt: "ለማየት መልእክት ይምረጡ።",
      loading: "በመጫን ላይ…",
      messageLabel: "መልእክት",
      yourReply: "የእርስዎ ምላሽ",
      replyToCustomer: "ለዚህ ደንበኛ ምላሽ ስጥ",
      sendAnotherReply: "ሌላ ምላሽ ላክ",
      sendButton: "ምላሽ ለደንበኛ ላክ",
      sending: "በመላክ ላይ…",
      loadListFailed: "መልእክቶችን መጫን አልተቻለም",
      loadMessageFailed: "መልእክት መጫን አልተቻለም",
      sendFailed: "ምላሽ መላክ አልተቻለም",
      replyPlaceholder: "ሰላም {name}፣ ስላነጋገሩን እናመሰግናለን...",
    },
    technician: {
      title: "የቴክኒሻን ዳሽቦርድ",
      droppedOffCount: "{count} ገብተዋል",
      inProcessCount: "{count} በሂደት ላይ",
      readyCount: "{count} ለመረከብ ዝግጁ",
      droppedOff: "ገብቷል",
      inProcess: "በሂደት ላይ",
      readyForPickup: "ለመረከብ ዝግጁ",
      nothingWaiting: "ምንም የሚጠብቅ የለም።",
      noActiveRepair: "ንቁ ጥገና የለም።",
      nothingReady: "እስካሁን ዝግጁ የለም።",
      checklistDone: "ዝርዝር ✓",
      needsChecklist: "ዝርዝር ያስፈልጋል",
      droppedOffAt: "የገባው {time}",
      startedAt: "የተጀመረው {time}",
      readySince: "ዝግጁ ከ{time} ጀምሮ",
      problem: "ችግር",
      checklistTitle: "ቅድመ-ጥገና ማረጋገጫ ዝርዝር",
      noChecklistYet: "እስካሁን ምንም ዝርዝር የለም።",
      screenLabel: "ስክሪን፦ {value}",
      touchLabel: "ንክኪ/Face ID፦ {value}",
      camerasLabel: "ካሜራዎች፦ {value}",
      chargingLabel: "የቻርጅ ማስገቢያ፦ {value}",
      working: "ይሰራል",
      notWorking: "አይሰራም",
      close: "ዝጋ",
      startRepair: "ጥገና ጀምር",
      markDone: "እንደተጠናቀቀ ምልክት አድርግ",
      markCollected: "እንደተረከበ ምልክት አድርግ",
      finishCurrentFirst: "መጀመሪያ የአሁኑን ጥገና ጨርስ",
      loadFailed: "ትኬቶችን መጫን አልተቻለም",
      actionFailed: "ተግባሩ አልተሳካም",
      actualCostPrompt: "ትክክለኛ ዋጋ (ግምቱን ለማቆየት ባዶ ይተውት)፦",
    },
    checklist: {
      title: "ቅድመ-ጥገና ማረጋገጫ ዝርዝር",
      warning: "መሳሪያውን ከመንካትዎ በፊት ሁኔታውን ይመዝግቡ። ይህ በኋላ አለመግባባት ቢፈጠር ሱቁንም ደንበኛውንም ይጠብቃል።",
      screenCondition: "የስክሪን ሁኔታ",
      screenPerfect: "ምንም ጉዳት የሌለው",
      screenScratched: "የተቧጨረ",
      screenCracked: "የተሰነጠቀ",
      touchFaceId: "ንክኪ / Face ID ይሰራል?",
      cameras: "ካሜራዎች ይሰራሉ?",
      chargingPort: "የቻርጅ ማስገቢያ ይሰራል?",
      yes: "አዎ",
      no: "አይ",
      notesLabel: "የቴክኒሻን ማስታወሻዎች",
      notesPlaceholder: "ሌላ ልብ ሊባል የሚገባ ነገር ካለ (የኬዝ ጉዳት፣ ቀደም ያለ ጥገና፣ በውሃ መጋለጥ)...",
      cancel: "ሰርዝ",
      submit: "ዝርዝሩን አጠናቅቅ እና ጥገና ጀምር",
      saving: "በማስቀመጥ ላይ…",
      incompleteHint: "ጥገናውን ከመጀመርዎ በፊት እያንዳንዱን ጥያቄ ይመልሱ",
      saveFailed: "ዝርዝሩን ማስቀመጥ አልተቻለም",
    },
  },
};

const DICTIONARIES: Record<Language, typeof en> = { en, am };

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  /** Dot-path lookup, e.g. t("home.heroTitle"). Falls back to the key
   * itself if missing so a typo never crashes the page. `vars` does
   * simple {token} interpolation (e.g. {shopName}). */
  t: (path: string, vars?: Record<string, string>) => string;
  /** Raw dictionary for the current language — use this instead of t()
   * when you need a list (e.g. faq.items), not a single string. */
  dict: typeof en;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(LANG_KEY) : null;
    return stored === "am" ? "am" : "en";
  });

  useEffect(() => {
    localStorage.setItem(LANG_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => {
    const setLanguage = (lang: Language) => setLanguageState(lang);
    const toggleLanguage = () => setLanguageState((prev) => (prev === "en" ? "am" : "en"));
    const t = (path: string, vars?: Record<string, string>) => {
      const raw = getByPath(DICTIONARIES[language], path);
      let text = typeof raw === "string" ? raw : path;
      if (vars) {
        for (const [key, val] of Object.entries(vars)) {
          text = text.replace(new RegExp(`\\{${key}\\}`, "g"), val);
        }
      }
      return text;
    };
    return { language, setLanguage, toggleLanguage, t, dict: DICTIONARIES[language] };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
