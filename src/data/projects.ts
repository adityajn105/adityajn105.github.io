// Canonical project list — the single source of truth for BOTH adityajain.me
// (this site) and projects.adityajain.me, which fetches these at build time via
// the /projects.json endpoint (src/pages/projects.json.ts).
//
// - `href`  : primary link (repo / gist / Docker Hub) — the card's stretched link.
// - `image` : optional thumbnail. Local files live in /public/img and are served
//             from this origin; a few point at remote screenshots hosted in the
//             source repos (kept as-is so we don't duplicate large assets). The
//             /projects.json endpoint rewrites the local /img/... paths to
//             absolute https://adityajain.me/... URLs for cross-site consumers.
// - `demo`  : optional live demo / interactive link.
// - `blog`  : optional companion blog post on this site.
// - `tags`  : tech stack, shown as a mono caption.
export interface Project {
  title: string;
  description: string;
  href: string;
  image?: string;
  demo?: string;
  blog?: string;
  tags: string[];
}

// The homepage (src/pages/index.astro) shows the first 6 as a "Selected work"
// bento grid; the full list lives at projects.adityajain.me.
export const allProjectsUrl = 'https://projects.adityajain.me';

export const projects: Project[] = [
  {
    title: 'Portfolio Chatbot — Agentic RAG',
    description:
      'A retrieval-augmented, agentic assistant for my site, built from scratch (no LangChain): a ReAct agent that searches a crawl of my blog and can email me, with tools exposed over MCP and streamed to an embeddable chat widget. Runs on a fully-free stack — FastAPI on Render, Gemini for generation and embeddings.',
    href: 'https://github.com/adityajn105/portfolio-chatbot',
    image: '/img/portfolio-chatbot.png',
    demo: 'https://chat.adityajain.me',
    blog: 'https://adityajain.me/blogs/building-a-portfolio-chatbot.html',
    tags: ['RAG', 'Agents', 'MCP', 'FastAPI', 'Gemini'],
  },
  {
    title: 'TradeBuddy — Stock Analysis',
    description:
      'A client-side stock-analysis tool: enter a US ticker to get support/resistance zones, entry/stop/target levels, risk:reward, and position sizing. All math runs in the browser and shows its work — the formula and source behind every number. Not financial advice.',
    href: 'https://github.com/adityajn105/trade-buddy',
    image: '/img/trade-buddy.png',
    demo: 'https://trade-buddy.adityajain.me/',
    tags: ['JavaScript', 'Technical Analysis', 'Charts'],
  },
  {
    title: 'Checkers AI — Alpha-Beta Minimax',
    description:
      'An AI agent using Minimax with alpha-beta pruning to play checkers. Built for the CSCI-561 "Foundations of AI" course, where it competed against other students\' agents.',
    href: 'https://gist.github.com/adityajn105/ffd0040ac636860539f5a473a7d733fc',
    image: '/img/checkers_agent.png',
    tags: ['AI', 'Minimax', 'Game'],
  },
  {
    title: 'MLfromScratch',
    description:
      'Classification, regression, and clustering algorithms — plus metrics, preprocessing, and model-selection helpers — implemented from scratch with NumPy for a deeper understanding of how they work.',
    href: 'https://github.com/adityajn105/MLfromScratch',
    tags: ['Machine Learning', 'NumPy', 'Python'],
  },
  {
    title: 'Brain Tumor Segmentation (MRI)',
    description:
      'A U-Net (from "U-Net: Convolutional Networks for Biomedical Image Segmentation") built in Keras to segment brain tumors in MRI scans.',
    href: 'https://github.com/adityajn105/brain-tumor-segmentation-unet',
    image: '/img/brain-tumor-segmentation.gif',
    tags: ['Deep Learning', 'Segmentation', 'Keras'],
  },
  {
    title: 'NER / POS Tagging App',
    description:
      'An LSTM-based seq2seq model that tags every word of a paragraph with its Named Entity or Part of Speech. Served with Flask and Docker.',
    href: 'https://hub.docker.com/r/adityajn105/client_caption_gen',
    image:
      'https://github.com/adityajn105/NLP-projects/raw/master/Part%20of%20Speech%20Tagging%20(RNN)/web_app.png',
    tags: ['NLP', 'LSTM', 'Flask', 'Docker'],
  },
  {
    title: 'Image Caption Bot',
    description:
      'The "merge" architecture from "What is the Role of RNNs in an Image Caption Generator?" implemented in Keras and deployed with gRPC and tf-serving on Docker.',
    href: 'https://hub.docker.com/r/adityajn105/client_caption_gen',
    image:
      'https://github.com/adityajn105/my_docker_files/raw/master/Caption%20Generator/images/test.png',
    tags: ['Deep Learning', 'CNN + RNN', 'tf-serving'],
  },
  {
    title: 'Automatic Kinship Detection',
    description:
      'A Kaggle challenge: given a pair of face images, decide whether the two people are related. Tackled with a Siamese network over VGG-Face.',
    href: 'https://github.com/adityajn105/Automatic-kinship-detection',
    image:
      'https://github.com/adityajn105/Automatic-kinship-detection/raw/master/screenshots/kinship_detection.gif',
    tags: ['Computer Vision', 'Siamese Network', 'Kaggle'],
  },
  {
    title: 'FaceGAN — Generating Random Faces',
    description:
      'Inspired by thispersondoesnotexist.com. A Deep Convolutional GAN trained on 100k celebrity photos whose generator produces novel human faces.',
    href: 'https://github.com/adityajn105/FaceGAN-Generating-Random-Faces',
    image:
      'https://raw.githubusercontent.com/adityajn105/FaceGAN-Generating-Random-Faces/master/screenshots/web_progress.gif',
    tags: ['GAN', 'Generative', 'Computer Vision'],
  },
  {
    title: 'Flappy Bird RL Agent',
    description:
      'A reinforcement-learning agent trained with Deep Q-Learning on a Double Dueling network with Prioritized Experience Replay to play Flappy Bird. Implemented in PyTorch.',
    href: 'https://github.com/adityajn105/flappy-bird-deep-q-learning',
    image:
      'https://github.com/adityajn105/flappy-bird-deep-q-learning/raw/master/screenshots/gameplay.gif',
    blog: 'https://adityajain.me/blogs/deep-q-learning.html',
    tags: ['Reinforcement Learning', 'Deep Q-Learning', 'PyTorch'],
  },
  {
    title: 'One-Shot Face Recognition',
    description:
      'A Siamese network in Keras for one-shot face recognition — recognizing faces without the extensive training samples a classifier would need.',
    href: 'https://github.com/adityajn105/Face-Recognition-Siamese-Network',
    image:
      'https://github.com/adityajn105/Face-Recognition-Siamese-Network/raw/master/screenshots/test1.png',
    tags: ['Computer Vision', 'Siamese Network', 'Keras'],
  },
  {
    title: 'TGS Salt Identification',
    description:
      'A Kaggle image-segmentation competition: identify pixels containing salt sediment in seismic images. Solved with a U-Net encoder–decoder.',
    href: 'https://github.com/adityajn105/TGS-Salt-Identification-Image-Segmentation-',
    image: '/img/tgs-salt.png',
    tags: ['Segmentation', 'U-Net', 'Kaggle'],
  },
  {
    title: 'Attention-Based Date Translator',
    description:
      'An attention-based machine-translation model that converts human-readable dates to a machine-readable format. Inspired by the final week of Andrew Ng\'s Deep Learning Specialization.',
    href: 'https://github.com/adityajn105/Attention-Based-Machine-Translation-Demo',
    image: '/img/date_translator.png',
    tags: ['NLP', 'Attention', 'seq2seq'],
  },
  {
    title: 'Character Recognizer WebApp',
    description:
      'A web app where you draw a digit on an HTML canvas and a deep ConvNet predicts what you drew. Hosted on Flask.',
    href: 'https://github.com/adityajn105/Character-Recognition-webapp',
    image: '/img/character_recognition.gif',
    tags: ['Deep Learning', 'CNN', 'Flask'],
  },
  {
    title: 'Dictionary ChatBot',
    description:
      'A chatbot that returns the meaning of any word via the Oxford Dictionary API. Built with Amazon Lex (intents, slots, prompts), AWS Lambda, and Slack.',
    href: 'https://github.com/adityajn105/Dictionary-ChatBot',
    image: '/img/chatbot.gif',
    demo: 'https://join.slack.com/t/dictionarybot/shared_invite/enQtMzM0NjI3NzYxNTQyLWI0MmNmNzI0OTg4OTZhMjRmZTQwODE1ZjM0NzVjYmQwYTc1MDBlZjI3M2EzODE0NjJmYWRlNGMxMzIzY2FlNzY',
    tags: ['Chatbot', 'Amazon Lex', 'Lambda'],
  },
  {
    title: '8-Puzzle Game (A*)',
    description:
      'The classic 8-puzzle playable in a Linux terminal. Built with python-curses and solved with A* search using Manhattan distance as the heuristic.',
    href: 'https://github.com/adityajn105/8-Puzzle-using-A-',
    image: 'https://asciinema.org/a/190814.svg',
    demo: 'https://asciinema.org/a/190814',
    tags: ['Algorithms', 'A* Search', 'curses'],
  },
  {
    title: 'Snake Game on Terminal',
    description:
      'A terminal Snake game written in Python 3 in about 200 lines — comments, whitespace, and credits included.',
    href: 'https://github.com/adityajn105/SnakeGame-Python',
    image: 'https://asciinema.org/a/190808.svg',
    demo: 'https://asciinema.org/a/190808',
    tags: ['Python', 'curses', 'Game'],
  },
  {
    title: 'Aadhaar Authentication System',
    description:
      'Built at Smart India Hackathon 2017 (2nd place nationally, Dept. of Biotechnology). An Android app that authenticates exam candidates via Aadhaar biometrics to prevent impersonation.',
    href: 'https://github.com/adityajn105/NemisisAadharAuth',
    image: '/img/nemesis.png',
    tags: ['Android', 'Biometrics', 'Hackathon'],
  },
  {
    title: 'Nearby Friends — Android App',
    description:
      'An Android app that tracks friends via GPS and notifies you when one is nearby, using the Google Maps Distance Matrix API. Tracking is opt-in per invitation.',
    href: 'https://github.com/adityajn105/NearbyFriends',
    tags: ['Android', 'Google Maps API', 'GPS'],
  },
];
