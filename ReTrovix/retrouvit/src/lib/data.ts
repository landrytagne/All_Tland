export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  location: string;
  joinedAt: string;
  trustScore: number;
  objectsFound: number;
  objectsLost: number;
  matches: number;
  verified: boolean;
}

export interface LostObject {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  city: string;
  dateLost: string;
  image?: string;
  images?: string[];
  userId: string;
  user: User;
  status: "active" | "matched" | "resolved" | "expired";
  reward?: number;
  views: number;
  createdAt: string;
}

export interface FoundObject {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  city: string;
  dateFound: string;
  image?: string;
  images?: string[];
  userId: string;
  user: User;
  status: "active" | "matched" | "returned" | "expired";
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participant: User;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  messages: Message[];
}

export interface Notification {
  id: string;
  type: "match" | "message" | "claim" | "system" | "payment";
  title: string;
  description: string;
  read: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: "reward" | "escrow" | "withdrawal" | "refund";
  amount: number;
  status: "pending" | "completed" | "failed";
  description: string;
  createdAt: string;
}

export const categories = [
  { id: "1", name: "Documents", icon: "FileText", count: 1234 },
  { id: "2", name: "Électronique", icon: "Smartphone", count: 856 },
  { id: "3", name: "Sacs & Bagages", icon: "Briefcase", count: 432 },
  { id: "4", name: "Clés", icon: "Key", count: 2100 },
  { id: "5", name: "Animaux", icon: "PawPrint", count: 189 },
  { id: "6", name: "Véhicules", icon: "Car", count: 67 },
  { id: "7", name: "Vêtements", icon: "Shirt", count: 543 },
  { id: "8", name: "Bijoux", icon: "Gem", count: 321 },
  { id: "9", name: "Autres", icon: "Package", count: 987 },
];

export const cities = [
  "Yaoundé", "Douala", "Bafoussam", "Bamenda", "Garoua",
  "Maroua", "Ngaoundéré", "Bertoua", "Ebolowa", "Kribi",
];

export const mockUser: User = {
  id: "1",
  name: "Landry Tagne",
  email: "landry@retrouvit.com",
  phone: "+237 699 123 456",
  location: "Yaoundé, Cameroun",
  joinedAt: "2024-01-15",
  trustScore: 92,
  objectsFound: 12,
  objectsLost: 3,
  matches: 8,
  verified: true,
};

export const mockUsers: User[] = [
  mockUser,
  {
    id: "2",
    name: "Marie Ngono",
    email: "marie@example.com",
    location: "Douala, Cameroun",
    joinedAt: "2024-03-20",
    trustScore: 88,
    objectsFound: 5,
    objectsLost: 1,
    matches: 4,
    verified: true,
  },
  {
    id: "3",
    name: "Paul Fouda",
    email: "paul@example.com",
    location: "Yaoundé, Cameroun",
    joinedAt: "2024-06-10",
    trustScore: 75,
    objectsFound: 8,
    objectsLost: 2,
    matches: 6,
    verified: false,
  },
  {
    id: "4",
    name: "Sophie Biya",
    email: "sophie@example.com",
    location: "Bafoussam, Cameroun",
    joinedAt: "2024-02-28",
    trustScore: 95,
    objectsFound: 15,
    objectsLost: 0,
    matches: 12,
    verified: true,
  },
  {
    id: "5",
    name: "Jean Kamga",
    email: "jean@example.com",
    location: "Bamenda, Cameroun",
    joinedAt: "2024-05-01",
    trustScore: 82,
    objectsFound: 7,
    objectsLost: 4,
    matches: 5,
    verified: true,
  },
];

export const mockLostObjects: LostObject[] = [
  {
    id: "l1",
    title: "iPhone 15 Pro Max — Noir Titane",
    description: "Perdu dans le quartier Bastos, près du restaurant Le Cobac. Le téléphone est dans une coque noire avec un écran fissuré. Contient des photos importantes.",
    category: "Électronique",
    location: "Bastos, Yaoundé",
    city: "Yaoundé",
    dateLost: "2025-08-15",
    userId: "1",
    user: mockUsers[0],
    status: "active",
    reward: 25000,
    views: 342,
    createdAt: "2025-08-15T10:30:00Z",
  },
  {
    id: "l2",
    title: "Clés de voiture Toyota Corolla",
    description: "Un trousseau de 3 clés avec un porte-clés en cuir marron. Perdu entre le Marché Central et l'avenue Kennedy.",
    category: "Clés",
    location: "Centre-ville, Yaoundé",
    city: "Yaoundé",
    dateLost: "2025-08-18",
    userId: "3",
    user: mockUsers[2],
    status: "active",
    reward: 15000,
    views: 128,
    createdAt: "2025-08-18T14:20:00Z",
  },
  {
    id: "l3",
    title: "Portefeuille cuir avec documents",
    description: "Portefeuille en cuir noir contenant CNI, permis de conduire et carte bancaire. Perdu dans un taxi de la ligne Bastos - Marché Central.",
    category: "Documents",
    location: "Taxi express, Yaoundé",
    city: "Yaoundé",
    dateLost: "2025-08-17",
    userId: "2",
    user: mockUsers[1],
    status: "active",
    reward: 30000,
    views: 567,
    createdAt: "2025-08-17T08:15:00Z",
  },
  {
    id: "l4",
    title: "Sac à dos Samsonite gris",
    description: "Sac à dos contenant un MacBook Air et des cours universitaires. Perdu à l'Université de Yaoundé I, amphi A.",
    category: "Sacs & Bagages",
    location: "Université de Yaoundé I",
    city: "Yaoundé",
    dateLost: "2025-08-16",
    userId: "4",
    user: mockUsers[3],
    status: "active",
    reward: 50000,
    views: 891,
    createdAt: "2025-08-16T16:45:00Z",
  },
  {
    id: "l5",
    title: "Chat persan —Nom: Mimi",
    description: "Chat persan gris et blanc, portant un collier rose avec une clochette. S'est échappé du quartier Nlongkak.",
    category: "Animaux",
    location: "Nlongkak, Yaoundé",
    city: "Yaoundé",
    dateLost: "2025-08-19",
    userId: "5",
    user: mockUsers[4],
    status: "active",
    reward: 20000,
    views: 1203,
    createdAt: "2025-08-19T07:00:00Z",
  },
  {
    id: "l6",
    title: "Bague en or — Alliance",
    description: "Alliance en or jaune 18 carats, gravée à l'intérieur. Perdue au parc Monument Réunification.",
    category: "Bijoux",
    location: "Parc Monument, Yaoundé",
    city: "Yaoundé",
    dateLost: "2025-08-14",
    userId: "1",
    user: mockUsers[0],
    status: "matched",
    reward: 40000,
    views: 445,
    createdAt: "2025-08-14T11:30:00Z",
  },
];

export const mockFoundObjects: FoundObject[] = [
  {
    id: "f1",
    title: "Porte-monnaie en cuir",
    description: "Trouvé un porte-monnaie en cuir marron près de la station Total Mokolo. Contient des cartes mais pas d'argent.",
    category: "Documents",
    location: "Mokolo, Yaoundé",
    city: "Yaoundé",
    dateFound: "2025-08-18",
    userId: "2",
    user: mockUsers[1],
    status: "active",
    createdAt: "2025-08-18T12:00:00Z",
  },
  {
    id: "f2",
    title: "Samsung Galaxy S23 — Bleu",
    description: "Téléphone Samsung trouvé à côté d'un distributeur automatique UBA, quartier Messa. Écran allumé, pas de code PIN.",
    category: "Électronique",
    location: "Messa, Yaoundé",
    city: "Yaoundé",
    dateFound: "2025-08-19",
    userId: "3",
    user: mockUsers[2],
    status: "active",
    createdAt: "2025-08-19T09:30:00Z",
  },
  {
    id: "f3",
    title: "Trousseau de clés — 5 clés",
    description: "Un trousseau de 5 clés avec un porte-clés en forme de caméléon trouvé dans le bus SJTC ligne 12.",
    category: "Clés",
    location: "Bus SJTC, Douala",
    city: "Douala",
    dateFound: "2025-08-17",
    userId: "4",
    user: mockUsers[3],
    status: "active",
    createdAt: "2025-08-17T17:20:00Z",
  },
  {
    id: "f4",
    title: "Sac à main Hermès — Faux",
    description: "Sac à main beige trouvé au Carrefour Warda. Semble être une contrefaçon mais contient des effets personnels.",
    category: "Sacs & Bagages",
    location: "Carrefour Warda, Douala",
    city: "Douala",
    dateFound: "2025-08-16",
    userId: "5",
    user: mockUsers[4],
    status: "active",
    createdAt: "2025-08-16T14:10:00Z",
  },
  {
    id: "f5",
    title: "Laptop Dell — Silver",
    description: "MacBook trouvé dans un coffee shop du quartier Bonapriso. Le propriétaire l'a oublié en partant.",
    category: "Électronique",
    location: "Bonapriso, Douala",
    city: "Douala",
    dateFound: "2025-08-15",
    userId: "1",
    user: mockUsers[0],
    status: "returned",
    createdAt: "2025-08-15T18:45:00Z",
  },
];

export const mockConversations: Conversation[] = [
  {
    id: "c1",
    participant: mockUsers[1],
    lastMessage: "Je peux passer demain pour récupérer le portefeuille, c'est bien ça ?",
    lastMessageAt: "2025-08-19T14:30:00Z",
    unread: 2,
    messages: [
      { id: "m1", senderId: "1", content: "Bonjour, j'ai vu que vous aviez trouvé un portefeuille. C'est le mien !", timestamp: "2025-08-19T10:00:00Z", read: true },
      { id: "m2", senderId: "2", content: "Bonjour ! Oui c'est possible. Vous pouvez me décrire le contenu ?", timestamp: "2025-08-19T10:15:00Z", read: true },
      { id: "m3", senderId: "1", content: "Il y a une CNI au nom de Landry Tagne, une carte bancaire UBA et mon permis de conduire.", timestamp: "2025-08-19T10:20:00Z", read: true },
      { id: "m4", senderId: "2", content: "Parfait, c'est bien le votre ! Je peux passer demain pour récupérer le portefeuille, c'est bien ça ?", timestamp: "2025-08-19T14:30:00Z", read: false },
    ],
  },
  {
    id: "c2",
    participant: mockUsers[3],
    lastMessage: "Merci beaucoup pour le retour du laptop !",
    lastMessageAt: "2025-08-16T09:00:00Z",
    unread: 0,
    messages: [
      { id: "m5", senderId: "4", content: "Bonjour, je pense avoir trouvé votre sac à dos à l'université.", timestamp: "2025-08-15T18:00:00Z", read: true },
      { id: "m6", senderId: "1", content: "C'est possible ! De quelle couleur est-il et qu'est-ce qu'il y a dedans ?", timestamp: "2025-08-15T18:30:00Z", read: true },
      { id: "m7", senderId: "4", content: "C'est un sac gris Samsonite. Il y a un MacBook et des livres de cours.", timestamp: "2025-08-15T19:00:00Z", read: true },
      { id: "m8", senderId: "1", content: "Oui c'est le mien ! Merci beaucoup ! Comment puis-je récupérer ?", timestamp: "2025-08-16T08:00:00Z", read: true },
      { id: "m9", senderId: "4", content: "Je suis à l'amphi A ce matin. Venez quand vous voulez.", timestamp: "2025-08-16T08:30:00Z", read: true },
      { id: "m10", senderId: "1", content: "Merci beaucoup pour le retour du laptop !", timestamp: "2025-08-16T09:00:00Z", read: true },
    ],
  },
  {
    id: "c3",
    participant: mockUsers[4],
    lastMessage: "Je suis dans le quartier Mokolo, près de la mosquée centrale.",
    lastMessageAt: "2025-08-18T16:45:00Z",
    unread: 1,
    messages: [
      { id: "m11", senderId: "5", content: "Bonjour ! J'ai trouvé un porte-monnaie qui pourrait être le vôtre.", timestamp: "2025-08-18T14:00:00Z", read: true },
      { id: "m12", senderId: "1", content: "Vraiment ? C'est incroyable ! C'est un portefeuille en cuir marron ?", timestamp: "2025-08-18T15:00:00Z", read: true },
      { id: "m13", senderId: "5", content: "Oui exactement ! Je suis dans le quartier Mokolo, près de la mosquée centrale.", timestamp: "2025-08-18T16:45:00Z", read: false },
    ],
  },
];

export const mockNotifications: Notification[] = [
  { id: "n1", type: "match", title: "Nouvelle correspondance trouvée !", description: "Votre bague en or correspond avec un objet trouvé au parc Monument.", read: false, createdAt: "2025-08-19T08:00:00Z" },
  { id: "n2", type: "message", title: "Nouveau message de Marie Ngono", description: "Je peux passer demain pour récupérer le portefeuille...", read: false, createdAt: "2025-08-19T14:30:00Z" },
  { id: "n3", type: "claim", title: "Réclamation en attente", description: "Un utilisateur a fait une réclamation sur votre publication iPhone 15 Pro Max.", read: false, createdAt: "2025-08-18T16:00:00Z" },
  { id: "n4", type: "system", title: "Bienvenue sur RetrouvIt !", description: "Complétez votre profil pour augmenter votre score de confiance.", read: true, createdAt: "2025-08-15T10:00:00Z" },
  { id: "n5", type: "payment", title: "Récompense reçue", description: "Vous avez reçu 25 000 FCFA pour la récupération de votre téléphone.", read: true, createdAt: "2025-08-17T12:00:00Z" },
  { id: "n6", type: "match", title: "Objet similaire trouvé", description: "Un sac à dos Samsonite gris a été trouvé à Bonapriso.", read: true, createdAt: "2025-08-16T14:00:00Z" },
];

export const mockTransactions: Transaction[] = [
  { id: "t1", type: "reward", amount: 25000, status: "completed", description: "Récompense pour retour iPhone 15 Pro Max", createdAt: "2025-08-17T12:00:00Z" },
  { id: "t2", type: "escrow", amount: 15000, status: "pending", description: "Séquestre pour clés Toyota Corolla", createdAt: "2025-08-18T14:30:00Z" },
  { id: "t3", type: "withdrawal", amount: -20000, status: "completed", description: "Retrait vers Mobile Money", createdAt: "2025-08-18T16:00:00Z" },
  { id: "t4", type: "reward", amount: 30000, status: "completed", description: "Récompense pour retour portefeuille", createdAt: "2025-08-16T10:00:00Z" },
  { id: "t5", type: "refund", amount: 10000, status: "completed", description: "Remboursement escrow annulé", createdAt: "2025-08-15T08:00:00Z" },
];
