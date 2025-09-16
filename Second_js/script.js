const quizData = [
  {
    question: "1. C'est quoi le HTML?",
    a: "Hyper Text Markup Language",
    b: "High Text Machine Language",
    c: "Hyperlinks and Text Markup Language",
    correct: "a",
  },
  {
    question: "2. En quelle année a été créé JavaScript?",
    a: "1996",
    b: "1995",
    c: "1994",
    correct: "b",
  },
  {
    question: "3. Lequel est un framework JavaScript?",
    a: "React",
    b: "Laravel",
    c: "Django",
    correct: "a",
  },
  {
    question: "4. Quel est le créateur de JavaScript?",
    a: "Brendan Eich",
    b: "Tim Berners-Lee",
    c: "James Gosling",
    correct: "a",
  },
  {
    question:
      "5. Quelle est la syntaxe correcte pour référencer un fichier JavaScript externe?",
    a: "LM10",
    b: "PÉLÉ",
    c: "CR7",
    correct: "C",
  },
  {
    question: "6. Que signifie CSS?",
    a: "Creative Style Sheets ",
    b: "Cascading Style Sheets",
    c: "Computer Style Sheets",
    correct: "b",
  },
  {
    question:
      "7. Quel est l'attribut correct pour ajouter une couleur de fond en CSS?",
    a: "background-color",
    b: "bg-color",
    c: "color",
    correct: "a",
  },
  {
    question: "8. Que fait la méthode JavaScript 'addEventListener'?",
    a: "Crée un nouvel élément HTML",
    b: "Supprime un élément du DOM",
    c: "Ajoute un gestionnaire d'événements à un élément",
    correct: "c",
  },
  {
    question: "9. Quelle est la portée d'une variable déclarée avec 'let'?",
    a: "Portée globale",
    b: "Portée de bloc",
    c: "Portée de fonction",
    correct: "b",
  },
  {
    question:
      "10. Quelle méthode permet de convertir une chaîne en nombre en JavaScript?",
    a: "parseInt",
    b: "Number",
    c: "Toutes les réponses sont correctes",
    correct: "c",
  },
];

let currentQuiz = 0;
let score = 0;

const quiz = document.getElementById("quiz");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const submitBtn = document.getElementById("submit");
const results = document.getElementById("results");

function loadQuiz() {
  const currentQuizData = quizData[currentQuiz];
  const answers = Object.entries(currentQuizData)
    .filter(([key]) => key !== "question" && key !== "correct")
    .map(
      ([key, value]) =>
        `<label><input type=\"radio\" name=\"answer\" value=\"${key}\"> ${value}</label><br>`
    )
    .join("");

  quiz.innerHTML = `
      <div class="question">${currentQuizData.question}</div>
      <div class="answers">${answers}</div>
  `;
}

function getSelected() {
  const answers = document.querySelectorAll('input[name="answer"]');
  let selected;
  answers.forEach((answer) => {
    if (answer.checked) selected = answer.value;
  });
  return selected;
}

prevBtn.addEventListener("click", () => {
  if (currentQuiz > 0) {
    currentQuiz--;
    loadQuiz();
  }
});

nextBtn.addEventListener("click", () => {
  if (currentQuiz < quizData.length - 1) {
    const answer = getSelected();
    if (answer === quizData[currentQuiz].correct) {
      score++;
    }
    currentQuiz++;
    loadQuiz();
  }
});

submitBtn.addEventListener("click", () => {
  const answer = getSelected();
  if (answer === quizData[currentQuiz].correct) {
    score++;
  }

  if (currentQuiz === quizData.length - 1) {
    if (score < 7) {
      results.innerHTML = `
              <h2>Votre score : ${score}/${quizData.length}</h2>
              <p>Vous n'avez pas atteint un score satisfaisant.</p>
              <button id="retry">Recommencer</button>
          `;
    } else {
      results.innerHTML = `
              <h2 class="success-message">Félicitations ! Vous avez réussi ! 🎉</h2>
              <h3>Votre score : ${score}/${quizData.length}</h3>
              <button id="retry">Recommencer</button>
          `;
    }

    quiz.innerHTML = "";
    const retryBtn = document.getElementById("retry");
    retryBtn.addEventListener("click", () => {
      currentQuiz = 0;
      score = 0;
      results.innerHTML = "";
      loadQuiz();
    });
  } else {
    currentQuiz++;
    loadQuiz();
  }
});

loadQuiz();
