const btn = document.getElementById("btn");
/*const username = document.getElementById("username");
const password = document.getElementById("password ");
const message = document.querySelector(".message");
const interclass = document.querySelector(".interclass");

username.addEventListener("click", () => {
  message.style.display = "block";

  setTimeout(() => {
    message.style.display = "none";
  }, 3000);
});

btn.addEventListener("click", () => {
  interclass.style.display = "block";
  setTimeout(() => {
    interclass.style.display = "none";
  }, 3000);
});*/

const fruits = ["apple", "banana", "orange", "mango", "kiwi"];
fruits.forEach((fruit, index) => {
  console.log(`Fruits ${index + 1}: ${fruit}`);
});
btn.addEventListener("click", () => {
  fruits.push("grapes");
  fruits.forEach((fruit, index) => {
    console.log(`Fruits ${index + 1}: ${fruit}`);
  });
});
