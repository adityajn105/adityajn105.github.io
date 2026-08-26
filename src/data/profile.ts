export const profile = {
  name: 'Aditya Jain',
  role: 'MTS Software Engineer @ Salesforce',
  tagline: 'MSCS (Honors) @ USC · ML / AI Engineer',
  email: 'adityajn105@gmail.com',
  location: 'Sunnyvale, CA',
  resume: '/files/Aditya_Jain_resume.pdf',
  bio: [
    "I'm a machine learning and software engineer on the Search team at Salesforce, where I build data and ML systems at scale — from Search Analytics, which streams tens of millions of rows per org from Apache Iceberg into customers' Data Cloud, to entity-prediction models on Salesforce's open-source ml4ir. I enjoy turning research ideas into production features people actually use.",
    "I earned my MS in Computer Science with Honors (4.0 GPA) from USC, where I also TA'd Applied NLP (CSCI-544). Before that I spent two years as a Data Scientist at Cognizant working on search-ad click prediction and healthcare analytics. My interests span NLP, information retrieval, and computer vision — especially applications at the intersection of language and vision.",
  ],
  socials: [
    { name: 'GitHub', href: 'https://github.com/adityajn105', icon: 'github' },
    { name: 'LinkedIn', href: 'https://linkedin.com/in/adityajn105', icon: 'linkedin' },
    { name: 'Docker Hub', href: 'https://hub.docker.com/u/adityajn105', icon: 'docker' },
    { name: 'Twitter', href: 'https://twitter.com/adityajn105', icon: 'twitter' },
    { name: 'Instagram', href: 'https://www.instagram.com/adityajn105/', icon: 'instagram' },
  ],
  // Contact form endpoint. Formspree's classic email endpoint is deprecated;
  // replace with your form id (https://formspree.io/f/xxxxxxx) — see CLAUDE.md.
  formspree: 'https://formspree.io/f/mainquiry',
} as const;

export const nav = [
  { label: 'About', href: '/#about' },
  { label: 'Blog', href: '/#blog' },
  { label: 'Projects', href: '/#projects' },
  { label: 'Experience', href: '/#experience' },
  { label: 'Contact', href: '/#contact' },
];
