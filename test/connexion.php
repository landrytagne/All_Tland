<?php
// Configuration de la connexion à la base de données
$host= "localhost"; // Remplacez par l'adresse de votre serveur
$username = "root"; // Remplacez par votre utilisateur MySQL
$password = ""; // Remplacez par votre mot de passe MySQL
$dbname = "Etudiant"; // Nom de la base de données

try {
    // Création d'une connexion PDO
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Vérification des données POST
    if ($_SERVER["REQUEST_METHOD"] == "POST") {
        $user = $_POST['username'];
        $pass = $_POST['password'];

        // Validation basique (à améliorer selon vos besoins)
        if (!empty($user) && !empty($pass)) {
            // Préparation de la requête SQL pour éviter les injections
            $stmt = $pdo->prepare("INSERT INTO etudiant (username, password) VALUES (:username, :password)");
            $stmt->bindParam(':username', $user);
            $stmt->bindParam(':password', $pass);

            // Exécution de la requête
            if ($stmt->execute()) {
                echo "Données insérées avec succès !";
            } else {
                echo "Erreur lors de l'insertion des données.";
            }
        } else {
            echo "Tous les champs sont obligatoires.";
        }
    }
} catch (PDOException $e) {
    // Gestion des erreurs de connexion
    die("Erreur de connexion : " . $e->getMessage());
}s
?>
