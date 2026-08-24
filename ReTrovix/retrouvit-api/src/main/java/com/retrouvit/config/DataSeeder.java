package com.retrouvit.config;

import com.retrouvit.entity.*;
import com.retrouvit.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final LostObjectRepository lostObjectRepository;
    private final FoundObjectRepository foundObjectRepository;
    private final TransactionRepository transactionRepository;
    private final MatchRepository matchRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("DB already seeded, skipping...");
            return;
        }

        log.info("Seeding database with test data...");

        // ════════════════════════════════════════════════════════════
        // USERS (12)
        // ════════════════════════════════════════════════════════════

        User admin = userRepository.save(User.builder()
                .name("Admin RetrouvIt")
                .email("admin@retrouvit.com")
                .password(passwordEncoder.encode("admin123"))
                .role(Role.ADMIN)
                .phone("+237 699 000 001")
                .location("Yaoundé, Cameroun")
                .trustScore(100).verified(true).walletBalance(500000L)
                .objectsFound(25).objectsLost(0).matches(15)
                .build());

        User amine = userRepository.save(User.builder()
                .name("Amine Djoumessi")
                .email("amine@example.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .phone("+237 699 123 456")
                .location("Yaoundé, Cameroun")
                .trustScore(92).verified(true).walletBalance(75000L)
                .objectsFound(12).objectsLost(3).matches(8)
                .build());

        User patrick = userRepository.save(User.builder()
                .name("Patrick Mbarga")
                .email("patrick@example.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .phone("+237 677 234 567")
                .location("Douala, Cameroun")
                .trustScore(88).verified(true).walletBalance(45000L)
                .objectsFound(8).objectsLost(2).matches(6)
                .build());

        User carine = userRepository.save(User.builder()
                .name("Carine Ngoune")
                .email("carine@example.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .phone("+237 655 345 678")
                .location("Bafoussam, Cameroun")
                .trustScore(75).verified(false).walletBalance(20000L)
                .objectsFound(5).objectsLost(1).matches(3)
                .build());

        User emmanuel = userRepository.save(User.builder()
                .name("Emmanuel Fouda")
                .email("emmanuel@example.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .phone("+237 691 456 789")
                .location("Garoua, Cameroun")
                .trustScore(82).verified(true).walletBalance(35000L)
                .objectsFound(7).objectsLost(4).matches(5)
                .build());

        User sophie = userRepository.save(User.builder()
                .name("Sophie Biya")
                .email("sophie@example.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .phone("+237 670 567 890")
                .location("Bamenda, Cameroun")
                .trustScore(95).verified(true).walletBalance(120000L)
                .objectsFound(15).objectsLost(0).matches(12)
                .build());

        User jean = userRepository.save(User.builder()
                .name("Jean Kamga")
                .email("jean@example.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .phone("+237 680 678 901")
                .location("Kribi, Cameroun")
                .trustScore(68).verified(false).walletBalance(10000L)
                .objectsFound(3).objectsLost(5).matches(2)
                .build());

        // --- 5 new users ---

        User nathalie = userRepository.save(User.builder()
                .name("Nathalie Atangana")
                .email("nathalie@example.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .phone("+237 671 111 222")
                .location("Yaoundé, Cameroun")
                .trustScore(85).verified(true).walletBalance(60000L)
                .objectsFound(10).objectsLost(2).matches(7)
                .build());

        User claude = userRepository.save(User.builder()
                .name("Claude Nkoulou")
                .email("claude@example.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .phone("+237 698 333 444")
                .location("Douala, Cameroun")
                .trustScore(70).verified(false).walletBalance(15000L)
                .objectsFound(4).objectsLost(6).matches(3)
                .build());

        User fatima = userRepository.save(User.builder()
                .name("Fatima Bello")
                .email("fatima@example.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .phone("+237 656 555 666")
                .location("Maroua, Cameroun")
                .trustScore(78).verified(true).walletBalance(25000L)
                .objectsFound(6).objectsLost(3).matches(4)
                .build());

        User roger = userRepository.save(User.builder()
                .name("Roger Tchinda")
                .email("roger@example.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .phone("+237 677 777 888")
                .location("Limbe, Cameroun")
                .trustScore(90).verified(true).walletBalance(80000L)
                .objectsFound(9).objectsLost(1).matches(7)
                .build());

        User marie = userRepository.save(User.builder()
                .name("Marie Kamga")
                .email("marie@example.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .phone("+237 690 999 000")
                .location("Buea, Cameroun")
                .trustScore(88).verified(true).walletBalance(55000L)
                .objectsFound(11).objectsLost(2).matches(9)
                .build());

        // ════════════════════════════════════════════════════════════
        // LOST OBJECTS (20)
        // ════════════════════════════════════════════════════════════

        // 1
        LostObject lost1 = lostObjectRepository.save(LostObject.builder()
                .title("iPhone 15 Pro Max — Noir Titane")
                .description("Perdu dans le quartier Bastos, près du restaurant Le Cobac. Le téléphone est dans une coque noire avec un écran fissuré. Contient des photos importantes de famille.")
                .category("Électronique").location("Bastos, Yaoundé").city("Yaoundé")
                .dateLost(LocalDate.now().minusDays(3)).user(amine)
                .status(ObjectStatus.ACTIVE).reward(25000L).views(342)
                .build());

        // 2
        LostObject lost2 = lostObjectRepository.save(LostObject.builder()
                .title("Clés de voiture Toyota Corolla")
                .description("Un trousseau de 3 clés avec un porte-clés en cuir marron. Perdu entre le Marché Central et l'avenue Kennedy.")
                .category("Clés").location("Centre-ville, Yaoundé").city("Yaoundé")
                .dateLost(LocalDate.now().minusDays(2)).user(patrick)
                .status(ObjectStatus.ACTIVE).reward(15000L).views(128)
                .build());

        // 3
        LostObject lost3 = lostObjectRepository.save(LostObject.builder()
                .title("Portefeuille cuir avec documents")
                .description("Portefeuille en cuir noir contenant CNI, permis de conduire et carte bancaire UBA. Perdu dans un taxi de la ligne Bastos - Marché Central.")
                .category("Documents").location("Taxi express, Yaoundé").city("Yaoundé")
                .dateLost(LocalDate.now().minusDays(1)).user(carine)
                .status(ObjectStatus.ACTIVE).reward(30000L).views(567)
                .build());

        // 4
        LostObject lost4 = lostObjectRepository.save(LostObject.builder()
                .title("Sac à dos Samsonite gris")
                .description("Sac à dos contenant un MacBook Air M2 et des cours universitaires. Perdu à l'Université de Yaoundé I, amphi A.")
                .category("Sacs & Bagages").location("Université de Yaoundé I").city("Yaoundé")
                .dateLost(LocalDate.now().minusDays(5)).user(emmanuel)
                .status(ObjectStatus.MATCHED).reward(50000L).views(891)
                .build());

        // 5
        LostObject lost5 = lostObjectRepository.save(LostObject.builder()
                .title("Chat persan — Nom: Mimi")
                .description("Chat persan gris et blanc, portant un collier rose avec une clochette. S'est échappé du quartier Nlongkak vers 14h.")
                .category("Animaux").location("Nlongkak, Yaoundé").city("Yaoundé")
                .dateLost(LocalDate.now().minusDays(1)).user(jean)
                .status(ObjectStatus.ACTIVE).reward(20000L).views(1203)
                .build());

        // 6
        LostObject lost6 = lostObjectRepository.save(LostObject.builder()
                .title("Bague en or — Alliance")
                .description("Alliance en or jaune 18 carats, gravée à l'intérieur avec les initiales 'M & J'. Perdue au parc Monument Réunification.")
                .category("Bijoux").location("Parc Monument, Yaoundé").city("Yaoundé")
                .dateLost(LocalDate.now().minusDays(7)).user(amine)
                .status(ObjectStatus.MATCHED).reward(40000L).views(445)
                .build());

        // 7
        LostObject lost7 = lostObjectRepository.save(LostObject.builder()
                .title("Vélo VTT Decathlon bleu")
                .description("Vélo VTT Decathlon de taille M, couleur bleu foncé. Volé devant le Supermarché Bonanjo à Douala.")
                .category("Véhicules").location("Bonanjo, Douala").city("Douala")
                .dateLost(LocalDate.now().minusDays(4)).user(patrick)
                .status(ObjectStatus.ACTIVE).reward(75000L).views(234)
                .build());

        // 8
        LostObject lost8 = lostObjectRepository.save(LostObject.builder()
                .title("Samsung Galaxy S24 Ultra")
                .description("Téléphone Samsung Galaxy S24 Ultra violet, dans une coque transparente. Perdu dans un taxi jaune à Douala.")
                .category("Électronique").location("Akwa, Douala").city("Douala")
                .dateLost(LocalDate.now().minusDays(6)).user(sophie)
                .status(ObjectStatus.ACTIVE).reward(35000L).views(187)
                .build());

        // 9
        LostObject lost9 = lostObjectRepository.save(LostObject.builder()
                .title("Robe wax camerounaise taille 42")
                .description("Robe en tissu wax multicolore, achetée au Marché Central. Perdue lors du déplacement Yaoundé-Douala en bus.")
                .category("Vêtements").location("Gare routière Mvan, Yaoundé").city("Yaoundé")
                .dateLost(LocalDate.now().minusDays(2)).user(nathalie)
                .status(ObjectStatus.ACTIVE).reward(10000L).views(95)
                .build());

        // 10
        LostObject lost10 = lostObjectRepository.save(LostObject.builder()
                .title("Toyota Hilux blanche — ABJ 234 XY")
                .description("Pick-up Toyota Hilux blanche garée devant le building RCCM Douala. Volée avec les clés à l'intérieur.")
                .category("Véhicules").location("RCCM Douala").city("Douala")
                .dateLost(LocalDate.now().minusDays(10)).user(roger)
                .status(ObjectStatus.ACTIVE).reward(200000L).views(2340)
                .build());

        // 11
        LostObject lost11 = lostObjectRepository.save(LostObject.builder()
                .title("Laptop Dell XPS 15")
                .description("Dell XPS 15 dans un étui noir. Oublié dans le coworking Camp Youndé, bureau 12. Contient des projets freelance.")
                .category("Électronique").location("Camp Youndé").city("Yaoundé")
                .dateLost(LocalDate.now().minusDays(1)).user(claude)
                .status(ObjectStatus.ACTIVE).reward(45000L).views(312)
                .build());

        // 12
        LostObject lost12 = lostObjectRepository.save(LostObject.builder()
                .title("Montre Rolex Submariner")
                .description("Montre Rolex Submariner verte, cadeau de mariage. Perdue lors d'un dîner au restaurant La Marelle, Bastos.")
                .category("Bijoux").location("La Marelle, Bastos").city("Yaoundé")
                .dateLost(LocalDate.now().minusDays(8)).user(fatima)
                .status(ObjectStatus.MATCHED).reward(150000L).views(1567)
                .build());

        // 13
        LostObject lost13 = lostObjectRepository.save(LostObject.builder()
                .title("Passeport camerounais")
                .description("Passeport biométrique au nom de Claude Nkoulou. Perdu à l'aéroport de Douala, terminal international.")
                .category("Documents").location("Aéroport Douala").city("Douala")
                .dateLost(LocalDate.now().minusDays(4)).user(claude)
                .status(ObjectStatus.ACTIVE).reward(50000L).views(678)
                .build());

        // 14
        LostObject lost14 = lostObjectRepository.save(LostObject.builder()
                .title("Chien labrador — Nom: Brutus")
                .description("Labrador marron de 3 ans, stérilisé, puce électronique. S'est échappé du quartier Akwa après un orage.")
                .category("Animaux").location("Akwa, Douala").city("Douala")
                .dateLost(LocalDate.now().minusDays(3)).user(marie)
                .status(ObjectStatus.ACTIVE).reward(25000L).views(943)
                .build());

        // 15
        LostObject lost15 = lostObjectRepository.save(LostObject.builder()
                .title("Valise Samsonite noire")
                .description("Grande valise noire contenant vêtements et produits cosmétiques. Perdue à la gare routière de Bafoussam.")
                .category("Sacs & Bagages").location("Gare Bafoussam").city("Bafoussam")
                .dateLost(LocalDate.now().minusDays(6)).user(carine)
                .status(ObjectStatus.RESOLVED).reward(15000L).views(203)
                .build());

        // 16
        LostObject lost16 = lostObjectRepository.save(LostObject.builder()
                .title("AirPods Pro 2ème génération")
                .description("AirPods Pro dans leur étui blanc, trouvés manquants après un cours à l'ENS Paris-Yaoundé. Étui avec gravure 'E.F'.")
                .category("Électronique").location("ENS Yaoundé").city("Yaoundé")
                .dateLost(LocalDate.now().minusDays(2)).user(emmanuel)
                .status(ObjectStatus.ACTIVE).reward(20000L).views(156)
                .build());

        // 17
        LostObject lost17 = lostObjectRepository.save(LostObject.builder()
                .title("Registre de commerce original")
                .description("Registre de commerce de mon entreprise, perdu lors d'un déplacement au guichet unique de Kribi. Document irremplaçable.")
                .category("Documents").location("Guichet unique, Kribi").city("Kribi")
                .dateLost(LocalDate.now().minusDays(5)).user(jean)
                .status(ObjectStatus.ACTIVE).reward(100000L).views(432)
                .build());

        // 18
        LostObject lost18 = lostObjectRepository.save(LostObject.builder()
                .title("Sac à main Longchamp rose")
                .description("Sac Longchamp pliable rose foncé. Contenu : portefeuille, téléphone, clés. Perdu au Carrefour Warda, Douala.")
                .category("Sacs & Bagages").location("Carrefour Warda, Douala").city("Douala")
                .dateLost(LocalDate.now().minusDays(1)).user(nathalie)
                .status(ObjectStatus.ACTIVE).reward(20000L).views(178)
                .build());

        // 19
        LostObject lost19 = lostObjectRepository.save(LostObject.builder()
                .title("Livre — Le Malade Imaginaire de Molière")
                .description("Exemplaire annoté pour le bac blanc. Couverture orange, notes au crayon dans les marges. Perdu à la bibliothèque universitaire de Buea.")
                .category("Autres").location("Biblio. universitaire, Buea").city("Buea")
                .dateLost(LocalDate.now().minusDays(3)).user(marie)
                .status(ObjectStatus.ACTIVE).reward(5000L).views(67)
                .build());

        // 20
        LostObject lost20 = lostObjectRepository.save(LostObject.builder()
                .title("Bracelet connecté Fitbit Charge 5")
                .description("Bracelet noir, perdu lors d'une course dans le parc artisanal de Limbe. Contient mes données de santé depuis 2 ans.")
                .category("Électronique").location("Parc artisanal, Limbe").city("Limbe")
                .dateLost(LocalDate.now().minusDays(2)).user(roger)
                .status(ObjectStatus.ACTIVE).reward(15000L).views(134)
                .build());

        // ════════════════════════════════════════════════════════════
        // FOUND OBJECTS (12)
        // ════════════════════════════════════════════════════════════

        FoundObject found1 = foundObjectRepository.save(FoundObject.builder()
                .title("Porte-monnaie en cuir")
                .description("Trouvé un porte-monnaie en cuir marron près de la station Total Mokolo. Contient des cartes bancaires mais pas d'argent visible.")
                .category("Documents").location("Mokolo, Yaoundé").city("Yaoundé")
                .dateFound(LocalDate.now().minusDays(2)).user(sophie)
                .status(ObjectStatus.ACTIVE).views(89)
                .build());

        FoundObject found2 = foundObjectRepository.save(FoundObject.builder()
                .title("Samsung Galaxy S23 — Bleu")
                .description("Téléphone Samsung trouvé à côté d'un distributeur automatique UBA, quartier Messa. Écran allumé, pas de code PIN.")
                .category("Électronique").location("Messa, Yaoundé").city("Yaoundé")
                .dateFound(LocalDate.now().minusDays(1)).user(amine)
                .status(ObjectStatus.ACTIVE).views(156)
                .build());

        FoundObject found3 = foundObjectRepository.save(FoundObject.builder()
                .title("Trousseau de clés — 5 clés")
                .description("Un trousseau de 5 clés avec un porte-clés en forme de caméléon trouvé dans le bus SJTC ligne 12.")
                .category("Clés").location("Bus SJTC, Douala").city("Douala")
                .dateFound(LocalDate.now().minusDays(3)).user(emmanuel)
                .status(ObjectStatus.ACTIVE).views(67)
                .build());

        FoundObject found4 = foundObjectRepository.save(FoundObject.builder()
                .title("Sac à main beige")
                .description("Sac à main beige trouvé au Carrefour Warda. Contient des effets personnels et une carte d'identité.")
                .category("Sacs & Bagages").location("Carrefour Warda, Douala").city("Douala")
                .dateFound(LocalDate.now().minusDays(4)).user(carine)
                .status(ObjectStatus.ACTIVE).views(203)
                .build());

        FoundObject found5 = foundObjectRepository.save(FoundObject.builder()
                .title("MacBook Air — Silver")
                .description("MacBook Air trouvé dans un coffee shop du quartier Bonapriso. Le propriétaire l'a oublié en partant.")
                .category("Électronique").location("Bonapriso, Douala").city("Douala")
                .dateFound(LocalDate.now().minusDays(6)).user(jean)
                .status(ObjectStatus.RETURNED).views(312)
                .build());

        FoundObject found6 = foundObjectRepository.save(FoundObject.builder()
                .title("iPhone 14 — Rose")
                .description("iPhone 14 rose trouvé sur un banc du parc Monaya. Le téléphone sonnait quand je l'ai trouvé.")
                .category("Électronique").location("Parc Monaya, Yaoundé").city("Yaoundé")
                .dateFound(LocalDate.now().minusDays(2)).user(nathalie)
                .status(ObjectStatus.ACTIVE).views(245)
                .build());

        FoundObject found7 = foundObjectRepository.save(FoundObject.builder()
                .title("Carte d'identité — Ngoune C.")
                .description("Carte nationale d'identité camerounaise trouvée à la gare routière de Mvan.")
                .category("Documents").location("Gare Mvan, Yaoundé").city("Yaoundé")
                .dateFound(LocalDate.now().minusDays(1)).user(claude)
                .status(ObjectStatus.ACTIVE).views(98)
                .build());

        FoundObject found8 = foundObjectRepository.save(FoundObject.builder()
                .title("Clés de scooter Yamaha")
                .description("Clés de scooter Yamaha Noir, trouvées devant la pharmacie du Centre, Bafoussam.")
                .category("Clés").location("Centre-ville, Bafoussam").city("Bafoussam")
                .dateFound(LocalDate.now().minusDays(5)).user(fatima)
                .status(ObjectStatus.ACTIVE).views(56)
                .build());

        FoundObject found9 = foundObjectRepository.save(FoundObject.builder()
                .title("Chat roux trouvé — sans collier")
                .description("Petit chat roux sans collier trouvé dans la rue derrière le marché central de Maroua. Semble bien nourri, a l'habitude des humains.")
                .category("Animaux").location("Marché Central, Maroua").city("Maroua")
                .dateFound(LocalDate.now().minusDays(1)).user(fatima)
                .status(ObjectStatus.ACTIVE).views(432)
                .build());

        FoundObject found10 = foundObjectRepository.save(FoundObject.builder()
                .title("Pendentif en argent avec chaîne")
                .description("Pendentif en argent avec petit médaillon, trouvé dans le bus express Yaoundé-Bamenda.")
                .category("Bijoux").location("Bus express Yaoundé-Bamenda").city("Yaoundé")
                .dateFound(LocalDate.now().minusDays(3)).user(marie)
                .status(ObjectStatus.ACTIVE).views(87)
                .build());

        FoundObject found11 = foundObjectRepository.save(FoundObject.builder()
                .title("Sac de sport Nike noir")
                .description("Sac de sport Nike trouvé au stade omnisport de Douala après le match Canon Yaoundé. Contient vêtements et chaussures.")
                .category("Sacs & Bagages").location("Stade omnisports, Douala").city("Douala")
                .dateFound(LocalDate.now().minusDays(2)).user(roger)
                .status(ObjectStatus.ACTIVE).views(167)
                .build());

        FoundObject found12 = foundObjectRepository.save(FoundObject.builder()
                .title("Trousseau de clés — porte-clés Kribi")
                .description("Clés trouvées au parking du Supermarché Bonanjo. Porte-clés avec logo de la ville de Kribi.")
                .category("Clés").location("Bonanjo, Douala").city("Douala")
                .dateFound(LocalDate.now().minusDays(4)).user(patrick)
                .status(ObjectStatus.ACTIVE).views(43)
                .build());

        // ════════════════════════════════════════════════════════════
        // MATCHES (8)
        // ════════════════════════════════════════════════════════════

        matchRepository.save(Match.builder()
                .lostObject(lost1).foundObject(found2)
                .matchScore(92).status(MatchStatus.CONFIRMED).user(amine)
                .build());

        matchRepository.save(Match.builder()
                .lostObject(lost4).foundObject(found5)
                .matchScore(95).status(MatchStatus.COMPLETED).user(emmanuel)
                .build());

        matchRepository.save(Match.builder()
                .lostObject(lost6).foundObject(found10)
                .matchScore(78).status(MatchStatus.PENDING).user(amine)
                .build());

        matchRepository.save(Match.builder()
                .lostObject(lost12).foundObject(found1)
                .matchScore(65).status(MatchStatus.PENDING).user(fatima)
                .build());

        matchRepository.save(Match.builder()
                .lostObject(lost14).foundObject(found9)
                .matchScore(88).status(MatchStatus.CONFIRMED).user(marie)
                .build());

        matchRepository.save(Match.builder()
                .lostObject(lost3).foundObject(found7)
                .matchScore(95).status(MatchStatus.COMPLETED).user(carine)
                .build());

        matchRepository.save(Match.builder()
                .lostObject(lost8).foundObject(found2)
                .matchScore(45).status(MatchStatus.REJECTED).user(sophie)
                .build());

        matchRepository.save(Match.builder()
                .lostObject(lost15).foundObject(found4)
                .matchScore(82).status(MatchStatus.COMPLETED).user(carine)
                .build());

        // ════════════════════════════════════════════════════════════
        // TRANSACTIONS (15)
        // ════════════════════════════════════════════════════════════

        transactionRepository.save(Transaction.builder()
                .user(amine).type(TransactionType.DEPOSIT).amount(100000L)
                .status(TransactionStatus.COMPLETED)
                .description("Dépôt initial via Mobile Money MTN").build());

        transactionRepository.save(Transaction.builder()
                .user(amine).type(TransactionType.REWARD).amount(25000L)
                .status(TransactionStatus.COMPLETED)
                .description("Récompense pour retour iPhone 15 Pro Max").build());

        transactionRepository.save(Transaction.builder()
                .user(patrick).type(TransactionType.DEPOSIT).amount(50000L)
                .status(TransactionStatus.COMPLETED)
                .description("Dépôt via Orange Money").build());

        transactionRepository.save(Transaction.builder()
                .user(sophie).type(TransactionType.REWARD).amount(35000L)
                .status(TransactionStatus.COMPLETED)
                .description("Récompense pour retour Samsung Galaxy S24 Ultra").build());

        transactionRepository.save(Transaction.builder()
                .user(emmanuel).type(TransactionType.ESCROW).amount(50000L)
                .status(TransactionStatus.PENDING)
                .description("Séquestre pour récupération sac à dos Samsonite").build());

        transactionRepository.save(Transaction.builder()
                .user(carine).type(TransactionType.DEPOSIT).amount(30000L)
                .status(TransactionStatus.COMPLETED)
                .description("Dépôt via Mobile Money Orange").build());

        transactionRepository.save(Transaction.builder()
                .user(roger).type(TransactionType.DEPOSIT).amount(200000L)
                .status(TransactionStatus.COMPLETED)
                .description("Dépôt via Wave pour recherche Toyota").build());

        transactionRepository.save(Transaction.builder()
                .user(roger).type(TransactionType.WITHDRAWAL).amount(50000L)
                .status(TransactionStatus.COMPLETED)
                .description("Retrait vers compte UBA ****4521").build());

        transactionRepository.save(Transaction.builder()
                .user(nathalie).type(TransactionType.DEPOSIT).amount(40000L)
                .status(TransactionStatus.COMPLETED)
                .description("Dépôt Mobile Money MTN").build());

        transactionRepository.save(Transaction.builder()
                .user(nathalie).type(TransactionType.REWARD).amount(10000L)
                .status(TransactionStatus.COMPLETED)
                .description("Récompense pour retour sac Longchamp").build());

        transactionRepository.save(Transaction.builder()
                .user(fatima).type(TransactionType.DEPOSIT).amount(25000L)
                .status(TransactionStatus.COMPLETED)
                .description("Dépôt via Orange Money").build());

        transactionRepository.save(Transaction.builder()
                .user(claude).type(TransactionType.DEPOSIT).amount(15000L)
                .status(TransactionStatus.COMPLETED)
                .description("Dépôt initial").build());

        transactionRepository.save(Transaction.builder()
                .user(marie).type(TransactionType.REWARD).amount(20000L)
                .status(TransactionStatus.COMPLETED)
                .description("Récompense récupération AirPods").build());

        transactionRepository.save(Transaction.builder()
                .user(jean).type(TransactionType.REFUND).amount(10000L)
                .status(TransactionStatus.COMPLETED)
                .description("Remboursement séquestre annulé").build());

        transactionRepository.save(Transaction.builder()
                .user(sophie).type(TransactionType.DEPOSIT).amount(80000L)
                .status(TransactionStatus.COMPLETED)
                .description("Dépôt via Wave").build());

        // ════════════════════════════════════════════════════════════
        // CONVERSATIONS & MESSAGES (6 conversations)
        // ════════════════════════════════════════════════════════════

        // Conv 1: Amine ↔ Sophie (iPhone match)
        Conversation conv1 = conversationRepository.save(Conversation.builder()
                .user1(amine).user2(sophie)
                .lastMessage("Parfait, je passe demain à 10h !")
                .lastMessageAt(LocalDateTime.now().minusHours(1))
                .unreadCount(1).build());

        messageRepository.save(Message.builder().conversation(conv1).sender(amine)
                .content("Bonjour ! J'ai vu que vous avez trouvé un Samsung S23. Est-ce qu'il porte un écran fissuré ?").read(true)
                .createdAt(LocalDateTime.now().minusHours(5)).build());
        messageRepository.save(Message.builder().conversation(conv1).sender(sophie)
                .content("Bonjour Oui, l'écran est légèrement fissuré dans le coin supérieur droit.").read(true)
                .createdAt(LocalDateTime.now().minusHours(4)).build());
        messageRepository.save(Message.builder().conversation(conv1).sender(amine)
                .content("C'est bien mon téléphone ! Comment puis-je le récupérer ?").read(true)
                .createdAt(LocalDateTime.now().minusHours(3)).build());
        messageRepository.save(Message.builder().conversation(conv1).sender(sophie)
                .content("Je suis au quartier Messa. Vous pouvez passer demain matin si vous voulez.").read(true)
                .createdAt(LocalDateTime.now().minusHours(2)).build());
        messageRepository.save(Message.builder().conversation(conv1).sender(amine)
                .content("Parfait, je passe demain à 10h !").read(false)
                .createdAt(LocalDateTime.now().minusHours(1)).build());

        // Conv 2: Emmanuel ↔ Jean (MacBook)
        Conversation conv2 = conversationRepository.save(Conversation.builder()
                .user1(emmanuel).user2(jean)
                .lastMessage("Merci beaucoup pour votre honnêteté !")
                .lastMessageAt(LocalDateTime.now().minusDays(1))
                .unreadCount(0).build());

        messageRepository.save(Message.builder().conversation(conv2).sender(emmanuel)
                .content("Bonjour, j'ai perdu un MacBook Air à Bonapriso. C'est le vôtre qu'on vous a rendu ?").read(true)
                .createdAt(LocalDateTime.now().minusDays(2)).build());
        messageRepository.save(Message.builder().conversation(conv2).sender(jean)
                .content("Oui ! Vous pouvez venir le chercher au coffee shop Karma, ouais.").read(true)
                .createdAt(LocalDateTime.now().minusDays(2)).build());
        messageRepository.save(Message.builder().conversation(conv2).sender(emmanuel)
                .content("Merci beaucoup pour votre honnêteté !").read(true)
                .createdAt(LocalDateTime.now().minusDays(1)).build());

        // Conv 3: Carine ↔ Claude (Portefeuille)
        Conversation conv3 = conversationRepository.save(Conversation.builder()
                .user1(carine).user2(claude)
                .lastMessage("J'ai retrouvé votre carte d'identité, je peux vous l'envoyer.")
                .lastMessageAt(LocalDateTime.now().minusHours(12))
                .unreadCount(1).build());

        messageRepository.save(Message.builder().conversation(conv3).sender(claude)
                .content("Bonjour ! Votre carte d'identité a été trouvée à la gare Mvan.").read(true)
                .createdAt(LocalDateTime.now().minusHours(20)).build());
        messageRepository.save(Message.builder().conversation(conv3).sender(carine)
                .content("Oh c'est fantastique ! Où puis-je la récupérer ?").read(true)
                .createdAt(LocalDateTime.now().minusHours(15)).build());
        messageRepository.save(Message.builder().conversation(conv3).sender(claude)
                .content("J'ai retrouvé votre carte d'identité, je peux vous l'envoyer.").read(false)
                .createdAt(LocalDateTime.now().minusHours(12)).build());

        // Conv 4: Marie ↔ Fatima (Chien)
        Conversation conv4 = conversationRepository.save(Conversation.builder()
                .user1(marie).user2(fatima)
                .lastMessage("Merci ! C'est bien lui, Brutus a 3 ans et il est stérilisé.")
                .lastMessageAt(LocalDateTime.now().minusHours(6))
                .unreadCount(0).build());

        messageRepository.save(Message.builder().conversation(conv4).sender(fatima)
                .content("Bonjour ! J'ai trouvé un chat roux au marché de Maroua. Ce n'est pas un labrador mais je voulais signaler.").read(true)
                .createdAt(LocalDateTime.now().minusHours(10)).build());
        messageRepository.save(Message.builder().conversation(conv4).sender(marie)
                .content("Merci pour l'info ! Mon chien est un labrador marron, pas un chat. Mais merci quand même !").read(true)
                .createdAt(LocalDateTime.now().minusHours(8)).build());
        messageRepository.save(Message.builder().conversation(conv4).sender(marie)
                .content("Merci ! C'est bien lui, Brutus a 3 ans et il est stérilisé.").read(true)
                .createdAt(LocalDateTime.now().minusHours(6)).build());

        // Conv 5: Patrick ↔ Amine (Clés)
        Conversation conv5 = conversationRepository.save(Conversation.builder()
                .user1(patrick).user2(amine)
                .lastMessage("Ok parfait. Je vous envoie une photo.")
                .lastMessageAt(LocalDateTime.now().minusDays(3))
                .unreadCount(0).build());

        messageRepository.save(Message.builder().conversation(conv5).sender(patrick)
                .content("Bonjour, j'ai trouvé un trousseau de clés dans le bus ligne 12. Est-ce les vôtres ?").read(true)
                .createdAt(LocalDateTime.now().minusDays(4)).build());
        messageRepository.save(Message.builder().conversation(conv5).sender(amine)
                .content("Bonjour ! Mes clés ont un porte-clés en cuir marron. Est-ce que c'est le cas ?").read(true)
                .createdAt(LocalDateTime.now().minusDays(3)).build());
        messageRepository.save(Message.builder().conversation(conv5).sender(patrick)
                .content("Ok parfait. Je vous envoie une photo.").read(true)
                .createdAt(LocalDateTime.now().minusDays(3)).build());

        // Conv 6: Sophie ↔ Roger (Valise)
        Conversation conv6 = conversationRepository.save(Conversation.builder()
                .user1(sophie).user2(roger)
                .lastMessage("Merci Roger, vous êtes un bon samaritain !")
                .lastMessageAt(LocalDateTime.now().minusHours(3))
                .unreadCount(0).build());

        messageRepository.save(Message.builder().conversation(conv6).sender(roger)
                .content("Bonjour Sophie, votre sac de sport a été retrouvé au stade après le match.").read(true)
                .createdAt(LocalDateTime.now().minusHours(8)).build());
        messageRepository.save(Message.builder().conversation(conv6).sender(sophie)
                .content("C'est super ! Il y a mes chaussures de running dedans. Quand puis-je le récupérer ?").read(true)
                .createdAt(LocalDateTime.now().minusHours(5)).build());
        messageRepository.save(Message.builder().conversation(conv6).sender(roger)
                .content("Vous pouvez passer au stade demain entre 8h et 12h. Je serai au comptoir d'accueil.").read(true)
                .createdAt(LocalDateTime.now().minusHours(4)).build());
        messageRepository.save(Message.builder().conversation(conv6).sender(sophie)
                .content("Merci Roger, vous êtes un bon samaritain !").read(true)
                .createdAt(LocalDateTime.now().minusHours(3)).build());

        // ════════════════════════════════════════════════════════════
        // NOTIFICATIONS (15)
        // ════════════════════════════════════════════════════════════

        notificationRepository.save(Notification.builder()
                .user(amine).type(NotificationType.MATCH)
                .title("Nouvelle correspondance !")
                .description("Votre iPhone 15 Pro Max correspond avec un Samsung Galaxy S23 trouvé à Messa.")
                .read(false).build());

        notificationRepository.save(Notification.builder()
                .user(amine).type(NotificationType.MESSAGE)
                .title("Nouveau message de Sophie")
                .description("Sophie vous a envoyé un message concernant votre téléphone.")
                .read(true).build());

        notificationRepository.save(Notification.builder()
                .user(emmanuel).type(NotificationType.MATCH)
                .title("Correspondance confirmée !")
                .description("Votre sac à dos Samsonite a été retrouvé par Jean Kamga.")
                .read(true).build());

        notificationRepository.save(Notification.builder()
                .user(carine).type(NotificationType.CLAIM)
                .title("Réclamation en cours")
                .description("Votre portefeuille a été trouvé. En attente de vérification d'identité.")
                .read(false).build());

        notificationRepository.save(Notification.builder()
                .user(sophie).type(NotificationType.PAYMENT)
                .title("Récompense reçue")
                .description("Vous avez reçu 35 000 XAF pour le retour du Samsung Galaxy S24 Ultra.")
                .read(true).build());

        notificationRepository.save(Notification.builder()
                .user(patrick).type(NotificationType.SYSTEM)
                .title("Bienvenue sur RetrouvIt !")
                .description("Complétez votre profil pour augmenter votre score de confiance.")
                .read(true).build());

        notificationRepository.save(Notification.builder()
                .user(roger).type(NotificationType.MATCH)
                .title("Nouvelle correspondance")
                .description("Votre Toyota Hilux correspond avec un véhicule signalé au centre-ville.")
                .read(false).build());

        notificationRepository.save(Notification.builder()
                .user(nathalie).type(NotificationType.MESSAGE)
                .title("Nouveau message")
                .description("Un utilisateur vous a contacté au sujet de votre robe wax.")
                .read(false).build());

        notificationRepository.save(Notification.builder()
                .user(fatima).type(NotificationType.MATCH)
                .title("Correspondance trouvée !")
                .description("Votre Rolex Submariner correspond avec un bijou trouvé par Fatima Bello.")
                .read(true).build());

        notificationRepository.save(Notification.builder()
                .user(claude).type(NotificationType.PAYMENT)
                .title("Dépôt effectué")
                .description("Votre dépôt de 15 000 XAF via Orange Money a été confirmé.")
                .read(true).build());

        notificationRepository.save(Notification.builder()
                .user(marie).type(NotificationType.MATCH)
                .title("Votre chien a été retrouvé !")
                .description("Un labrador correspondant à la description de Brutus a été trouvé à Maroua.")
                .read(false).build());

        notificationRepository.save(Notification.builder()
                .user(jean).type(NotificationType.SYSTEM)
                .title("Rappel : vérifiez votre email")
                .description("Vérifiez votre adresse email pour activer toutes les fonctionnalités.")
                .read(true).build());

        notificationRepository.save(Notification.builder()
                .user(amine).type(NotificationType.PAYMENT)
                .title("Paiement en attente")
                .description("Votre demande de retrait de 10 000 XAF est en cours de traitement.")
                .read(true).build());

        notificationRepository.save(Notification.builder()
                .user(carine).type(NotificationType.MATCH)
                .title("Valise retrouvée !")
                .description("Votre valise Samsonite a été retrouvée à la gare de Bafoussam.")
                .read(true).build());

        notificationRepository.save(Notification.builder()
                .user(sophie).type(NotificationType.SYSTEM)
                .title("Profil vérifié ✓")
                .description("Félicitations ! Votre profil est maintenant vérifié. Vous avez un badge bleu.")
                .read(true).build());

        // ════════════════════════════════════════════════════════════
        // DONE
        // ════════════════════════════════════════════════════════════

        log.info("═══════════════════════════════════════════════════════");
        log.info("Database seeded successfully!");
        log.info("─── Users: 12 | Lost: 20 | Found: 12 | Matches: 8 ───");
        log.info("─── Transactions: 15 | Conversations: 6 ────────────");
        log.info("─── Messages: 21 | Notifications: 15 ───────────────");
        log.info("═══════════════════════════════════════════════════════");
        log.info("Test Accounts:");
        log.info("  Admin:   admin@retrouvit.com   / admin123");
        log.info("  User 1:  amine@example.com     / password123");
        log.info("  User 2:  patrick@example.com   / password123");
        log.info("  User 3:  carine@example.com    / password123");
        log.info("  User 4:  emmanuel@example.com  / password123");
        log.info("  User 5:  sophie@example.com    / password123");
        log.info("  User 6:  jean@example.com      / password123");
        log.info("  User 7:  nathalie@example.com  / password123");
        log.info("  User 8:  claude@example.com    / password123");
        log.info("  User 9:  fatima@example.com    / password123");
        log.info("  User 10: roger@example.com     / password123");
        log.info("  User 11: marie@example.com     / password123");
        log.info("═══════════════════════════════════════════════════════");
    }
}
