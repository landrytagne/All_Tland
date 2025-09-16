// Récupérer les éléments des boutons
/*const btnSombre = document.getElementById("sombre");
const btnClair = document.getElementById("clair");

// Fonction pour appliquer le mode sombre
const activerModeSombre = () => {
  document.body.style.backgroundColor = "black"; // Fond noir
  document.body.style.color = "white"; // Texte blanc
  btnSombre.classList.add("active");
  btnClair.classList.remove("active");
};

// Fonction pour appliquer le mode clair
const activerModeClair = () => {
  document.body.style.color = "black";
  document.body.style.backgroundColor = "white"; // Fond blanc
  document.body.style.color = "black"; // Texte noir
  btnClair.classList.add("active");
  btnSombre.classList.remove("active");
};

// Ajouter des événements pour les boutons
btnSombre.addEventListener("click", activerModeSombre);
btnClair.addEventListener("click", activerModeClair);

// Par défaut, activer le mode sombre
activerModeSombre();*/

/*const header = document.getElementById("header");*/
const body = document.body;
const sombre = document.getElementById("sombre");
const clair = document.getElementById("clair");
/*const title = document.getElementById("title");
const container = document.getElementById("container");
const texte = document.getElementById("texte");
const design = document.getElementById("design");
const btn = document.getElementById("btn");
const identification = document.getElementById("identification");
const form = document.getElementById("form");*/

sombre.addEventListener("click", () => {
  document.body.style.backgroundColor = "black";
});

clair.addEventListener("click", () => {
  document.body.style.backgroundColor = "white";
});

function activerModeSombre() {
  body.classList.remove("light-mode");

  const elementsAvecLghtMode = document.querySelectorAll(".light-mode");
  elementsAvecLghtMode.forEach((element) => {
    element.classList.remove("light-mode");
  });
}

function activerModeClair() {
  body.classList.add("light-mode");

  const elementsCiblés = document.querySelectorAll(
    "header, header i, .premier a, nav ul li a, h1, .texte h3, section, .form input, .btn, .design"
  );
  elementsCiblés.forEach((element) => {
    element.classList.add("light-mode");
  });
}

// Ajouter des événements de clic pour les boutons//
sombre.addEventListener("click", activerModeSombre);
clair.addEventListener("click", activerModeClair);
