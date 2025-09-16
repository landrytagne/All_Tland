// Fonction de calcul de l'IMC
function calculateIMC() {
  const weight = parseFloat(document.getElementById("weight").value);
  const height = parseFloat(document.getElementById("height").value);

  if (isNaN(weight) || isNaN(height) || weight <= 0 || height <= 0) {
    document.getElementById("result").innerText =
      "Veuillez entrer des valeurs valides.";
    return;
  }

  const imc = (weight / (height * height)).toFixed(2);
  let interpretation = "";

  if (imc < 18.5) {
    interpretation = "Maigreur";
  } else if (imc >= 18.5 && imc <= 24.9) {
    interpretation = "Normal";
  } else if (imc >= 25 && imc <= 29.9) {
    interpretation = "Surpoids";
  } else {
    interpretation = "Obésité";
  }

  document.getElementById(
    "result"
  ).innerHTML = `Votre IMC est de <strong>${imc}</strong> (${interpretation}).`;
}
document.getElementById("submitButton").addEventListener("click", calculateIMC);

document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    calculateIMC();
  }
});
