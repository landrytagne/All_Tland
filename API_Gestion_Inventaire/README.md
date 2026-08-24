# 📦 API Gestion d'Inventaire de Produits

Une API REST pour gérer un inventaire de produits avec suivi des stocks
et alerte sur stock bas, développée avec **Spring Boot**, **Spring Data
JPA** et **PostgreSQL**.

------------------------------------------------------------------------

## 🚀 Fonctionnalités

-   ✅ Créer un produit (nom, prix, quantité en stock)
-   ✅ Afficher la liste des produits
-   ✅ Mettre à jour un produit (prix, quantité, etc.)
-   ✅ Supprimer un produit
-   ✅ Alerte sur stock bas (produits avec ≤ 5 unités)
-   ✅ Documentation interactive via Swagger

------------------------------------------------------------------------

## 🛠️ Stack Technique

-   Java 21
-   Spring Boot 3.5.1
-   Spring Data JPA (Hibernate)
-   PostgreSQL 18
-   Lombok
-   Swagger / OpenAPI 3
-   Maven

------------------------------------------------------------------------

## 📦 Prérequis

-   Java 21
-   Maven
-   PostgreSQL
-   Git

------------------------------------------------------------------------

## 🗄️ Configuration de la base de données

### 1. Créer la base de données PostgreSQL

``` bash
sudo -u postgres createdb inventory_db
```

### 2. Définir le mot de passe postgres

``` bash
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
```

## 🚀 Lancement de l'API

``` bash
git clone https://github.com/landrytagne/API_Gestion_Inventaire.git
cd API_Gestion_Inventaire
mvn clean install
mvn spring-boot:run
```

## 📄 Documentation (Swagger)

  Ressource      URL
  -------------- ---------------------------------------
  Swagger UI     http://localhost:8080/swagger-ui.html
  OpenAPI JSON   http://localhost:8080/api-docs
