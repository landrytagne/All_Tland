const QuestMeteo = [
  { pays: "France", correct: "25°C", description: "Sunny", icon: "bx-sun" },
  { pays: "Cameroun", correct: "36°C", description: "Hot", icon: "bx-sun" },
  {
    pays: "Belgique",
    correct: "18°C",
    description: "Cloudy",
    icon: "bx-cloud",
  },
  {
    pays: "Allemagne",
    correct: "20°C",
    description: "Rainy",
    icon: "bx-cloud-rain",
  },
  {
    pays: "Grande Bretagne",
    correct: "15°C",
    description: "Foggy",
    icon: "bx-cloud-snow",
  },
  { pays: "Italie", correct: "30°C", description: "Sunny", icon: "bx-sun" },
  { pays: "USA", correct: "28°C", description: "Cloudy", icon: "bx-cloud" },
  {
    pays: "Canada",
    correct: "10°C",
    description: "Snowy",
    icon: "bx-cloud-snow",
  },
  { pays: "Espagne", correct: "32°C", description: "Hot", icon: "bx-sun" },
  {
    pays: "Japon",
    correct: "22°C",
    description: "Rainy",
    icon: "bx-cloud-rain",
  },
];

const part1 = document.getElementById("part1");
const part2 = document.getElementById("part2");
const correctTemp = document.getElementById("correct");
const icon = document.getElementById("icon");
const description = document.getElementById("description");
const select = document.getElementById("select");
const afficher = document.getElementById("afficher");
const paysElement = document.getElementById("pays");
const reset = document.getElementById("reset");

// Gérer le clic sur "Select"
select.addEventListener("click", () => {
  // Changer le fond du body en dégradé bleu
  document.body.style.background =
    "linear-gradient(to bottom right, #8953ECFF, #801AE093)";
  document.body.style.transition = "background 1s ease"; // Transition fluide pour le changement de couleur

  // Afficher uniquement la div "afficher" et masquer les autres
  afficher.style.display = "block";
  part1.style.display = "none";
  part2.style.display = "none";

  // Remplir la div "afficher" avec le formulaire
  afficher.innerHTML = `
  <h3>Veuillez entrer le nom d'un pays<br></h3>
    <label>
      <input type="text" id="country-input" placeholder="Entrez un pays" required>
    </label>
    <p>NB : Danc cette liste seul les pays majeur sont représenté.</p>
    <button class="valider">Valider</button>
     <div id="error-message" style="color: red; margin-top: 20px; margin-left : 3rem; font-size: 0.8rem;"></div>`;

  // Gérer le clic sur le bouton "Valider"
  const validerButton = document.querySelector(".valider");

  validerButton.addEventListener("click", () => {
    const countryInput = document.getElementById("country-input").value.trim();
    const errorMessageDiv = document.getElementById("error-message");
    const result = QuestMeteo.find(
      (item) => item.pays.toLowerCase() === countryInput.toLowerCase()
    );

    if (result) {
      // Réinitialiser le fond du body
      document.body.style.background =
        " linear-gradient(to right, #151616, #02393b)";

      // Masquer la div "afficher" et afficher "part1" et "part2" avec les résultats
      afficher.style.display = "none";
      part1.style.display = "block";
      part2.style.display = "block";

      // Mettre à jour les informations météorologiques
      paysElement.textContent = result.pays;
      correctTemp.textContent = result.correct;
      description.textContent = result.description;
      icon.className = `bx ${result.icon}`;
    } else {
      // Si le pays n'est pas trouvé, afficher un message d'erreur dans "afficher"
      errorMessageDiv.textContent =
        "Résultat pas trouvé, veuillez entrer un autre pays 😊";
    }
  });
});
