// =============================================================================
// FAQ Content & Groups — /src/content/faq.ts
// Single source of truth for all FAQ questions and answers.
// Compliant with Section 0 Anti-Hallucination protocol, Section R6,
// and Store Owner directives:
// - Real founders: Sinan MS, Ganga, Rohith Murali (Est. 2024)
// - Real selling status: Currently selling T-Shirts ONLY; others coming in future
// - Full coverage of Terms, Policies, Returns, Replacements, Damages & Privacy
// =============================================================================

import { getSiteUrl } from '@/lib/siteUrl';

export interface FAQItem {
  id: string;
  group: string;
  question: string;
  answer: string;
}

export interface FAQGroup {
  id: string;
  name: string;
  description: string;
}

export const FAQ_LAST_UPDATED = 'October 2026';

export const FAQ_GROUPS: FAQGroup[] = [
  {
    id: 'about-ficcado',
    name: 'About Ficcado & Founders',
    description: 'Learn about our brand, founding story, our three founders, and our apparel ethos — T-shirts now, all other wears in future.',
  },
  {
    id: 'products-categories',
    name: 'Products & Collections',
    description: 'Information about our active T-Shirt collection and roadmap for upcoming silhouettes.',
  },
  {
    id: 'sizes-fit',
    name: 'Sizes & Fit',
    description: 'Guidance on choosing your size, unisex cuts, and fit recommendations.',
  },
  {
    id: 'how-to-order',
    name: 'How to Order',
    description: 'Step-by-step walkthrough of our Bag checkout and WhatsApp order flow.',
  },
  {
    id: 'reference-id-order-id',
    name: 'Reference ID & Order ID',
    description: 'Understanding temporary reference numbers and confirmed Order IDs.',
  },
  {
    id: 'payment',
    name: 'Payment & Confirmation',
    description: 'How order confirmation and payments work through our WhatsApp fulfillment flow.',
  },
  {
    id: 'delivery',
    name: 'Delivery & Shipping',
    description: 'Courier partner options, rates, delivery timelines, and parcel tracking.',
  },
  {
    id: 'returns-refunds',
    name: 'Returns & Refunds',
    description: 'Our 7-day transparent return policy, exchanges, and refund timelines.',
  },
  {
    id: 'replacements-damages',
    name: 'Replacements & Transit Damages',
    description: 'Zero-hassle replacement procedures for damaged parcels and manufacturing defects.',
  },
  {
    id: 'fabric-care',
    name: 'Garment Care & Fabric',
    description: 'Care instructions for maintaining fabric weight, print vibrancy, and silhouette structure.',
  },
  {
    id: 'terms-commercial',
    name: 'Terms & Conditions',
    description: 'Commercial terms, pricing transparency, GST inclusion, and customer rights.',
  },
  {
    id: 'support-help',
    name: 'Support & Order Help',
    description: 'How to contact customer care, resolve questions, and submit inquiries.',
  },
  {
    id: 'website-privacy',
    name: 'Privacy & Data Protection',
    description: 'How we respect your privacy, collect order details, and safeguard personal data.',
  },
  {
    id: 'reviews-ratings',
    name: 'Reviews & Transparency',
    description: 'Understanding product rating indicators and verified customer feedback.',
  },
];

export const FAQ_ITEMS: FAQItem[] = [
  // ---------------------------------------------------------------------------
  // 1. About Ficcado & Founders
  // ---------------------------------------------------------------------------
  {
    id: 'what-is-ficcado',
    group: 'about-ficcado',
    question: 'What is Ficcado?',
    answer:
      'Ficcado is an independent Indian clothing brand currently selling signature high quality unisex T-shirts. We focus on structured tees designed for everyday wear, superior comfort, and lasting durability.',
  },
  {
    id: 'who-founded-ficcado',
    group: 'about-ficcado',
    question: 'Who founded Ficcado?',
    answer:
      'Ficcado was founded in 2024 by three close friends: Sinan MS, Ganga Lakshmi, and Rohith Murali. Frustrated by flimsy fast fashion and overpriced designer markup, they united to build an authentic clothing brand focused on fabric integrity and honest design.',
  },
  {
    id: 'what-is-the-ficcado-story',
    group: 'about-ficcado',
    question: 'What is the founding story behind Ficcado?',
    answer:
      'In 2024, three friends—Sinan MS, Ganga Lakshmi, and Rohith Murali—decided to stop searching for quality apparel and create it themselves. They pooled their savings, visited textile mills, engineered custom high quality knits, and officially unveiled Ficcado in 2024 with a "Peoples’ own brand" philosophy: honest materials, zero shortcuts, and personal customer service.',
  },
  {
    id: 'who-are-the-founders-and-their-roles',
    group: 'about-ficcado',
    question: 'Who are the founders and what are their roles at Ficcado?',
    answer:
      'Sinan MS serves as Co-Founder & CEO, leading ultimate decision-making, strategic vision, and team direction. Ganga Lakshmi serves as Co-Founder & Operations & Creative Officer, turning concepts and thoughts into design campaigns and managing operations. Rohith Murali serves as Co-Founder & CFO, directing financial budgeting, capital planning, and team fiscal grounding.',
  },
  {
    id: 'is-ficcado-an-indian-brand',
    group: 'about-ficcado',
    question: 'Is Ficcado an Indian brand?',
    answer:
      'Yes, Ficcado is an independent apparel label founded and based in India. Our collections are crafted domestically and dispatched across India through domestic courier partner networks.',
  },
  {
    id: 'are-ficcado-clothes-unisex',
    group: 'about-ficcado',
    question: 'Are Ficcado clothes unisex?',
    answer:
      'Yes, every garment in the Ficcado catalog is designed with a unisex fit. Our cuts feature relaxed drop-shoulders and balanced draping that suit individuals of all genders comfortably.',
  },
  {
    id: 'who-can-wear-ficcado',
    group: 'about-ficcado',
    question: 'Who can wear Ficcado apparel?',
    answer:
      'Ficcado T-shirts are designed for anyone who appreciates quality structured cotton garments, regardless of age or gender. Our unisex cuts suit all body types with relaxed drop-shoulder draping. Sizing ranges from Small to Extra Large.',
  },
  {
    id: 'does-ficcado-have-a-retail-store',
    group: 'about-ficcado',
    question: 'Does Ficcado have a physical retail store?',
    answer:
      `Ficcado currently operates as a digital online storefront with direct assisted ordering via WhatsApp. All drops are showcased on our official website at ${getSiteUrl()} and dispatched directly to your doorstep.`,
  },
  {
    id: 'how-do-i-contact-ficcado',
    group: 'about-ficcado',
    question: 'How do I contact the Ficcado team?',
    answer:
      'You can reach our team directly on WhatsApp or by emailing ficcado.clothing@gmail.com. Phone support is available at +91 6282000729 (Mon-Fri, 10 AM - 6 PM). Our team is available to assist with sizing advice, order updates, and customer inquiries.',
  },
  {
    id: 'what-is-ficcados-official-website',
    group: 'about-ficcado',
    question: "What is Ficcado's official website address?",
    answer:
      `Ficcado's official online store is accessible at ${getSiteUrl()}. Always verify the web address before submitting your contact information or placing an order.`,
  },

  // ---------------------------------------------------------------------------
  // 2. Products & Collections
  // ---------------------------------------------------------------------------
  {
    id: 'which-categories-are-currently-live',
    group: 'products-categories',
    question: 'Which product categories are currently available for purchase?',
    answer:
      'Currently, Ficcado sells T-Shirts ONLY. We are dedicated to perfecting our signature high quality unisex tees first. All other apparel categories—including Combos, Shirts, Hoodies, Pants, and Sneakers—are currently under development and will be released in future drops.',
  },
  {
    id: 'will-ficcado-sell-other-clothes-in-future',
    group: 'products-categories',
    question: 'Will Ficcado offer other clothing categories in the future?',
    answer:
      'Yes. In the future, Ficcado will expand into Combos, structured Shirts, boxy Hoodies, relaxed Pants, and minimalist Sneakers. Each silhouette will only be launched after rigorous textile and fit testing.',
  },
  {
    id: 'what-does-coming-soon-mean',
    group: 'products-categories',
    question: "What does 'Coming Soon' mean on category pages?",
    answer:
      "'Coming Soon' indicates that the design, sampling, and wear-testing phases are underway for that silhouette. Items in coming-soon categories cannot be purchased right now, but preview pages allow you to view the upcoming roadmap.",
  },
  {
    id: 'what-are-ficcado-combos',
    group: 'products-categories',
    question: 'Will Ficcado offer combo packs or sets?',
    answer:
      'Yes, Combos are an upcoming collection on our roadmap. While we currently sell T-Shirts only, future combo drops will offer coordinated multi-garment packs and layered sets.',
  },
  {
    id: 'are-ficcado-drops-limited',
    group: 'products-categories',
    question: 'Are Ficcado collections produced in limited quantities?',
    answer:
      'Yes, Ficcado releases garments in controlled batch drops rather than mass-producing endless stock. Once a seasonal batch sells out, it may not be restocked in the exact same colorway.',
  },
  {
    id: 'how-do-i-know-if-an-item-is-in-stock',
    group: 'products-categories',
    question: 'How do I know if an item is in stock?',
    answer:
      'Stock availability is displayed directly on each product card and detail modal. If an item is active and in stock, you can select your size and add it to your Shopping Bag.',
  },

  // ---------------------------------------------------------------------------
  // 3. Sizes & Fit
  // ---------------------------------------------------------------------------
  {
    id: 'how-do-i-choose-my-size',
    group: 'sizes-fit',
    question: 'How do I choose my size for a Ficcado garment?',
    answer:
      'Select your size from the available options shown on each product page (typically S, M, L, XL). Because our T-shirts feature a relaxed drop-shoulder cut, ordering your regular size gives a modern, comfortable drape. For a closer fit, consider sizing down.',
  },
  {
    id: 'what-is-unisex-sizing',
    group: 'sizes-fit',
    question: 'What does unisex sizing mean?',
    answer:
      'Unisex sizing means our garments are patterned to drape flatteringly on all body types rather than using restrictive gendered tailoring. Chest width and sleeve drop are calibrated for universal everyday comfort.',
  },
  {
    id: 'what-sizes-are-available',
    group: 'sizes-fit',
    question: 'What sizes are available for each product?',
    answer:
      'Available sizes are pulled live from our inventory records and displayed as selectable chips in the product modal. If a size is out of stock, it will be marked unavailable.',
  },
  {
    id: 'what-if-the-size-does-not-fit',
    group: 'sizes-fit',
    question: 'What if the size I ordered does not fit?',
    answer:
      'We offer a 7-day doorstep exchange policy. If your garment does not fit the way you like, message our team on WhatsApp to request a size swap within 7 days of delivery.',
  },
  {
    id: 'can-i-get-sizing-help-before-ordering',
    group: 'sizes-fit',
    question: 'Can I get personalized sizing advice before ordering?',
    answer:
      'Yes! You can contact us on WhatsApp (+91 6282000729) with your height, build, and preferred fit (oversized vs regular), and our team will recommend the ideal size.',
  },

  // ---------------------------------------------------------------------------
  // 4. How to Order
  // ---------------------------------------------------------------------------
  {
    id: 'how-do-i-place-an-order',
    group: 'how-to-order',
    question: 'How do I place an order on Ficcado?',
    answer:
      'Browsing is simple: add your desired items and sizes to your Shopping Bag, tap Checkout, fill in your delivery address and choose a courier option, then tap "Place Order via WhatsApp". This generates your Reference ID and opens WhatsApp with your pre-formatted order summary.',
  },
  {
    id: 'do-i-need-an-account',
    group: 'how-to-order',
    question: 'Do I need to create an account or password to order?',
    answer:
      'No. Ficcado has zero mandatory accounts, passwords, or logins. You only provide your name, shipping address, and phone number at checkout.',
  },
  {
    id: 'what-happens-when-i-tap-place-order',
    group: 'how-to-order',
    question: 'What happens when I tap Place Order?',
    answer:
      'Our server records your sale request in our database, assigns a unique Reference ID (e.g., FIC-A0001), and automatically redirects you to WhatsApp with a ready-to-send order message addressed to the official Ficcado support line.',
  },
  {
    id: 'what-if-whatsapp-does-not-open',
    group: 'how-to-order',
    question: 'What if WhatsApp does not open automatically?',
    answer:
      'If your browser blocks the redirect, a fallback confirmation page provides a prominent "Continue on WhatsApp" button, displays your Reference ID, and allows you to copy your order summary with one tap.',
  },
  {
    id: 'can-i-order-on-desktop',
    group: 'how-to-order',
    question: 'Can I place an order from a desktop computer or laptop?',
    answer:
      'Yes. On a desktop browser, tapping Place Order will open WhatsApp Web in a new browser tab. If you have the WhatsApp desktop app installed, it can open directly there as well.',
  },
  {
    id: 'can-i-modify-my-order-in-whatsapp',
    group: 'how-to-order',
    question: 'Can I add or remove items after opening WhatsApp?',
    answer:
      'Yes. Because you are chatting directly with the Ficcado operations team, you can simply ask in the chat to adjust a size, color, or quantity before payment confirmation.',
  },

  // ---------------------------------------------------------------------------
  // 5. Reference ID & Order ID
  // ---------------------------------------------------------------------------
  {
    id: 'what-is-a-reference-id',
    group: 'reference-id-order-id',
    question: 'What is a Reference ID?',
    answer:
      'A Reference ID (such as FIC-A0001) is a temporary identifier automatically generated when you submit your checkout form. It reserves your cart request in our database while you transition to WhatsApp.',
  },
  {
    id: 'what-is-the-difference-between-reference-id-and-order-id',
    group: 'reference-id-order-id',
    question: 'What is the difference between a Reference ID and an Order ID?',
    answer:
      'A Reference ID is temporary and generated by the website. An Order ID is the permanent confirmation code issued by the Ficcado team once your order details and payment are finalized in WhatsApp.',
  },
  {
    id: 'where-do-i-use-my-reference-id',
    group: 'reference-id-order-id',
    question: 'Where do I use my Reference ID?',
    answer:
      'Your Reference ID is automatically included in your WhatsApp order message. You can also quote it on our Support page (/support) to inquire about a pending order request.',
  },
  {
    id: 'what-format-does-a-reference-id-use',
    group: 'reference-id-order-id',
    question: 'What format does a Reference ID use?',
    answer:
      'Reference IDs follow the standard pattern FIC- followed by a series letter and 4 digits (e.g. FIC-A0001, FIC-A0002). Offline emergency fallbacks follow FIC-T- followed by a timestamp.',
  },

  // ---------------------------------------------------------------------------
  // 6. Payment & Confirmation
  // ---------------------------------------------------------------------------
  {
    id: 'can-i-pay-directly-on-the-website',
    group: 'payment',
    question: 'Can I pay directly on the website via a payment gateway?',
    answer:
      'No. The Ficcado website does not host an automated online payment gateway. All orders are finalized in personal conversation with our team over WhatsApp to ensure inventory verification and personal care.',
  },
  {
    id: 'how-do-i-pay-for-my-order',
    group: 'payment',
    question: 'How do I pay for my order?',
    answer:
      'Once you send your order message on WhatsApp, our team confirms that your chosen garments are ready for packaging and coordinates payment settlement directly within the chat.',
  },
  {
    id: 'will-i-receive-payment-confirmation',
    group: 'payment',
    question: 'Will I receive confirmation once I pay?',
    answer:
      'Yes, the Ficcado team confirms payment receipt directly in the WhatsApp chat and shares your final Order ID along with dispatch details.',
  },

  // ---------------------------------------------------------------------------
  // 7. Delivery & Shipping
  // ---------------------------------------------------------------------------
  {
    id: 'how-are-delivery-options-determined',
    group: 'delivery',
    question: 'How are delivery options determined?',
    answer:
      'Delivery options are loaded directly from active courier partner records in our Google Sheets database. Each option displays the courier partner name, delivery fee, and estimated timeframe if available.',
  },
  {
    id: 'what-does-free-delivery-mean',
    group: 'delivery',
    question: "What does 'Free' delivery mean?",
    answer:
      "When a delivery partner displays 'Free' in the checkout selector, it means there is zero delivery charge applied to your order through that option.",
  },
  {
    id: 'how-much-does-delivery-cost',
    group: 'delivery',
    question: 'How much does delivery cost?',
    answer:
      'Delivery charges depend on the active courier partner selected and are shown clearly at checkout before you place your order. The server verifies and recomputes the exact rate before finalizing your order.',
  },
  {
    id: 'how-long-does-delivery-take',
    group: 'delivery',
    question: 'How long does delivery take?',
    answer:
      'Delivery timelines vary depending on your destination pin code and the chosen courier partner. If estimated times are configured in our courier sheet, they will be displayed next to the courier name at checkout.',
  },
  {
    id: 'will-i-receive-a-tracking-number',
    group: 'delivery',
    question: 'Will I receive a tracking number for my parcel?',
    answer:
      'Yes. Once your parcel is packaged and handed over to the courier partner, our team sends the courier name and tracking number (AWB) directly to your WhatsApp.',
  },
  {
    id: 'does-ficcado-deliver-all-over-india',
    group: 'delivery',
    question: 'Does Ficcado deliver across all of India?',
    answer:
      'Yes, our courier partners service delivery pincodes across India, including metropolitan cities and regional locations covered by domestic courier networks.',
  },
  {
    id: 'what-if-delivery-options-are-unavailable',
    group: 'delivery',
    question: 'What should I do if delivery options are unavailable at checkout?',
    answer:
      'If delivery options are temporarily unavailable in checkout, a notice is displayed with a direct link to chat with us on WhatsApp. Our team will manually arrange delivery options for your location.',
  },

  // ---------------------------------------------------------------------------
  // 8. Returns & Refunds
  // ---------------------------------------------------------------------------
  {
    id: 'what-is-the-return-policy',
    group: 'returns-refunds',
    question: "What is Ficcado's return policy?",
    answer:
      'We offer a 7-day doorstep return policy. You hold the right to inspect the fabric, fit, and finish of your garments upon delivery. If for any reason the size or drape is not as expected, you can initiate a return or exchange within 7 calendar days of delivery.',
  },
  {
    id: 'how-do-i-initiate-a-return-or-exchange',
    group: 'returns-refunds',
    question: 'How do I initiate a return or size exchange?',
    answer:
      'Reach out directly via WhatsApp (+91 6282000729) or submit a ticket on our Support page (/support) under "Returns & Exchanges" with your Order ID. Our team will coordinate doorstep reverse pickup.',
  },
  {
    id: 'what-condition-must-returned-items-be-in',
    group: 'returns-refunds',
    question: 'What condition must items be in to qualify for return?',
    answer:
      'Items must be unworn, unwashed, free of perfumes or marks, and in their original protective packaging with all garment tags attached.',
  },
  {
    id: 'how-long-do-refunds-take',
    group: 'returns-refunds',
    question: 'How long does it take to receive a refund?',
    answer:
      'Once the returned garment is received at our facility and verified (within 24 hours of arrival), 100% of the purchase price is credited back to your original payment method within 3 to 5 business days with zero restocking fees.',
  },

  // ---------------------------------------------------------------------------
  // 9. Replacements & Transit Damages
  // ---------------------------------------------------------------------------
  {
    id: 'what-if-my-item-arrives-damaged',
    group: 'replacements-damages',
    question: 'What should I do if my garment arrives damaged or defective?',
    answer:
      'In the rare event of transit damage, parcel tampering, or a fabric defect, photograph the package and garment upon delivery and contact our team on WhatsApp or at ficcado.clothing@gmail.com within 48 hours.',
  },
  {
    id: 'does-ficcado-offer-free-replacements',
    group: 'replacements-damages',
    question: 'Are replacements free for damaged goods?',
    answer:
      'Yes! Under our Replacements & Damages Policy (/replacements-damages), we provide 100% free replacement coverage on any verified transit damage or manufacturing flaw, including free doorstep pickup.',
  },
  {
    id: 'how-fast-is-a-replacement-dispatched',
    group: 'replacements-damages',
    question: 'How quickly is a replacement dispatched?',
    answer:
      'Once damage is verified by our team over WhatsApp, a priority replacement parcel is dispatched within 24 hours and a new tracking AWB is shared with you.',
  },

  // ---------------------------------------------------------------------------
  // 10. Garment Care & Fabric
  // ---------------------------------------------------------------------------
  {
    id: 'how-should-i-wash-ficcado-garments',
    group: 'fabric-care',
    question: 'How should I wash and care for my Ficcado t-shirts?',
    answer:
      'To maintain color depth and relaxed structural shape, machine wash cold (30°C) with like colors using a gentle spin cycle. Hang dry in shade. Avoid high-heat tumble drying, and never iron directly over printed or embroidered graphics.',
  },
  {
    id: 'will-ficcado-cotton-t-shirts-shrink',
    group: 'fabric-care',
    question: 'Will Ficcado cotton t-shirts shrink after washing?',
    answer:
      'Our garments utilize natural combed cotton knits that are pre-conditioned. When washed in cold water and line-dried as instructed, structural shrinkage is minimal and negligible.',
  },

  // ---------------------------------------------------------------------------
  // 11. Terms & Conditions
  // ---------------------------------------------------------------------------
  {
    id: 'what-are-the-terms-of-purchase',
    group: 'terms-commercial',
    question: 'What are the commercial terms of purchase with Ficcado?',
    answer:
      'When placing an order, you enter into a direct purchase contract with Ficcado Clothing. We guarantee that garments dispatched match our published descriptions, dimensions, and high-resolution photos. You are protected by our 7-day return guarantee.',
  },
  {
    id: 'are-taxes-included-in-the-price',
    group: 'terms-commercial',
    question: 'Are taxes included in the displayed product prices?',
    answer:
      'Yes. All product prices on Ficcado are in Indian Rupees (INR, ₹) and are fully inclusive of all applicable standard GST and manufacturing taxes with zero hidden fees. Ficcado Clothing is registered with GSTIN: 32CVNPR0498H1Z5.',
  },
  {
    id: 'how-are-disputes-handled',
    group: 'terms-commercial',
    question: 'How does Ficcado handle customer disputes or complaints?',
    answer:
      'As a people’s company, we handle all feedback personally. You can reach our Customer Support at ficcado.clothing@gmail.com or our Point of Grievance (POG) Officer, Rohith Murali, at rohithficcado@gmail.com.',
  },

  // ---------------------------------------------------------------------------
  // 12. Support & Order Help
  // ---------------------------------------------------------------------------
  {
    id: 'how-do-i-get-help-with-an-order',
    group: 'support-help',
    question: 'How do I get help with an existing order?',
    answer:
      'You can message our team directly on WhatsApp or visit our Support page (/support). On the Support page, select "Help regarding order", enter your Reference ID or Order ID, and submit your inquiry.',
  },
  {
    id: 'what-types-of-inquiries-can-i-submit',
    group: 'support-help',
    question: 'What types of inquiries can I submit on the Support page?',
    answer:
      'The Support page allows you to submit requests for General Inquiries, Order Status, Delivery Help, Returns & Exchanges, or Quality Feedback.',
  },
  {
    id: 'how-fast-does-the-team-respond',
    group: 'support-help',
    question: 'How quickly does the Ficcado support team respond and what are the support hours?',
    answer:
      'Our customer support hours are 7:00 AM to 7:00 PM IST daily. Live chat assistance is available through our website contact desk and WhatsApp from Monday to Friday, 10:00 AM to 6:00 PM IST.',
  },
  {
    id: 'what-is-the-support-email',
    group: 'support-help',
    question: 'What is the official support email address and contact phone?',
    answer:
      'Our official support email is ficcado.clothing@gmail.com, and phone support is available at 6282000729 (+91 6282000729). Please include your Reference ID or Order ID for faster assistance.',
  },

  // ---------------------------------------------------------------------------
  // 13. Privacy & Data Protection
  // ---------------------------------------------------------------------------
  {
    id: 'what-personal-data-is-collected',
    group: 'website-privacy',
    question: 'What personal information does Ficcado collect during checkout?',
    answer:
      'We collect only the details necessary to deliver your order: your full name, mobile number, email address, and shipping address. We do not store passwords, bank details, or payment credentials.',
  },
  {
    id: 'why-does-ficcado-need-my-phone-and-email',
    group: 'website-privacy',
    question: 'Why does Ficcado need my mobile number and email?',
    answer:
      'Your mobile number is required to communicate via WhatsApp, send parcel tracking updates, and coordinate delivery with the courier. Your email is used for formal receipt and order records.',
  },
  {
    id: 'is-my-data-shared-with-third-parties',
    group: 'website-privacy',
    question: 'Does Ficcado sell or share personal data?',
    answer:
      'No. Ficcado never sells, rents, or brokers customer data. Your shipping address and contact number are shared strictly with the assigned courier partner solely to fulfill parcel delivery.',
  },
  {
    id: 'how-can-i-delete-my-data',
    group: 'website-privacy',
    question: 'Can I request deletion of my contact information?',
    answer:
      'Yes, you can request complete deletion of your contact records at any time by emailing ficcado.clothing@gmail.com. Please review our full Privacy Policy (/privacy) for more details.',
  },

  // ---------------------------------------------------------------------------
  // 14. Reviews & Transparency
  // ---------------------------------------------------------------------------
  {
    id: 'what-do-the-ratings-mean',
    group: 'reviews-ratings',
    question: 'What do the star ratings on product cards represent?',
    answer:
      'Star ratings and review counts are maintained directly from Ficcado verified records. If a product does not have verified feedback recorded, the rating UI is hidden completely rather than showing an arbitrary default.',
  },
  {
    id: 'can-i-leave-a-review-on-the-website',
    group: 'reviews-ratings',
    question: 'Can I leave a review directly on the website?',
    answer:
      'Website review submission is currently not hosted directly on the page. Customers can share feedback directly with our team on WhatsApp or via the Support page under "Quality Feedback".',
  },
  {
    id: 'why-do-some-items-have-no-ratings',
    group: 'reviews-ratings',
    question: 'Why do some items show no star rating?',
    answer:
      'Under our transparency policy, we only display ratings when real verified feedback exists in our records. Newer drops without feedback do not display placeholder or mock ratings.',
  },
];
