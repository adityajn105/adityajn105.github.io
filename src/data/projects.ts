export interface Project {
  title: string;
  description: string;
  href: string;
  tags: string[];
  featured?: boolean;
}

export const projects: Project[] = [
  {
    title: 'MLfromScratch',
    description:
      'Classification, regression, and clustering algorithms — plus metrics and preprocessing helpers — implemented from scratch with NumPy for a deeper understanding of the math.',
    href: 'https://github.com/adityajn105/MLfromScratch',
    tags: ['NumPy', 'ML', 'Algorithms'],
    featured: true,
  },
  {
    title: 'Brain Tumor Segmentation (MRI)',
    description:
      'Implemented U-Net from "U-Net: Convolutional Networks for Biomedical Image Segmentation" to segment brain tumors in MRI scans.',
    href: 'https://github.com/adityajn105/brain-tumor-segmentation-unet',
    tags: ['U-Net', 'Segmentation', 'PyTorch'],
  },
  {
    title: 'FaceGAN — Generating Random Faces',
    description:
      'Inspired by thispersondoesnotexist.com. Trained a Deep Convolutional GAN on 100k celebrity photos to generate photorealistic faces.',
    href: 'https://github.com/adityajn105/FaceGAN-Generating-Random-Faces',
    tags: ['GAN', 'Generative', 'CV'],
    featured: true,
  },
  {
    title: 'NER / POS Tagging App',
    description:
      'An LSTM seq2seq model that tags words with their Named Entity or Part of Speech. Served with Flask and packaged with Docker.',
    href: 'https://hub.docker.com/r/adityajn105/ner_pos_tagging_app',
    tags: ['LSTM', 'NLP', 'Docker'],
  },
  {
    title: 'Image Caption Generator',
    description:
      'Implementation of the "merge" architecture from "What is the Role of RNNs in an Image Caption Generator?" using Keras.',
    href: 'https://hub.docker.com/r/adityajn105/client_caption_gen',
    tags: ['Keras', 'CV + NLP', 'RNN'],
  },
  {
    title: 'Automatic Kinship Detection',
    description:
      'A Kaggle challenge: given a pair of faces, determine whether they are related. Uses a Siamese network over VGG-Face.',
    href: 'https://github.com/adityajn105/Automatic-kinship-detection',
    tags: ['Siamese Net', 'Kaggle', 'CV'],
  },
  {
    title: 'Flappy Bird RL Agent',
    description:
      'A reinforcement-learning agent trained with Deep Q-Learning on a Dueling Network with Prioritized Experience Replay to play Flappy Bird, in PyTorch.',
    href: 'https://github.com/adityajn105/flappy-bird-deep-q-learning',
    tags: ['DQN', 'RL', 'PyTorch'],
  },
  {
    title: 'TGS Salt Identification',
    description:
      'A Kaggle image-segmentation competition to identify salt sediment in seismic images, tackled with a U-Net encoder/decoder.',
    href: 'https://github.com/adityajn105/TGS-Salt-Identification-Image-Segmentation-',
    tags: ['U-Net', 'Kaggle', 'Segmentation'],
  },
  {
    title: 'One-Shot Face Recognition',
    description:
      'A Siamese network in Keras for one-shot face recognition — recognizing faces without extensive per-person training samples.',
    href: 'https://github.com/adityajn105/Face-Recognition-Siamese-Network',
    tags: ['Siamese Net', 'One-Shot', 'Keras'],
  },
];

export const allProjectsUrl = 'https://projects.adityajain.me';
