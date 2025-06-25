import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

const sign_in_btn = document.querySelector("#sign-in-btn");
const sign_up_btn = document.querySelector("#sign-up-btn");
const container = document.querySelector(".container");

sign_up_btn.addEventListener("click", () => {
  container.classList.add("sign-up-mode");
});

sign_in_btn.addEventListener("click", () => {
  container.classList.remove("sign-up-mode");
});

const userAuthenticated = sessionStorage.getItem("userAuthenticated");
console.log(userAuthenticated, "user autheticated");
console.log(!userAuthenticated);
console.log(userAuthenticated === "false");

if (userAuthenticated && userAuthenticated === "false") {
  Toastify({
    text: "Please Log in before playing!",
    duration: 3000, // Duration in milliseconds
    close: true, // Show close button
    gravity: "top", // Position: 'top' or 'bottom'
    position: "right", // Position: 'left', 'center' or 'right'
    backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)", // Custom background color
  }).showToast();
  sessionStorage.removeItem("userAuthenticated");
}
document.addEventListener("DOMContentLoaded", () => {
  // Get form elements
  const signInForm = document.querySelector(".sign-in-form");
  const signUpForm = document.querySelector(".sign-up-form");

  // Handle sign-up
  signUpForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent default form submission behavior

    // Get form data
    const username = signUpForm.querySelector(
      'input[placeholder="Username"]'
    ).value;

    const password = signUpForm.querySelector(
      'input[placeholder="Password"]'
    ).value;

    // Create the JSON body for the request
    const userData = {
      username,
      password,
    };

    try {
      // Send POST request to sign-up API
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(userData),
      });

      const result = await response.json();
      if (response.ok) {
        container.classList.remove("sign-up-mode");
        Toastify({
          text: "Sign Up Successful! Please Log in!",
          duration: 3000, // Duration in milliseconds
          close: true, // Show close button
          gravity: "top", // Position: 'top' or 'bottom'
          position: "right", // Position: 'left', 'center' or 'right'
          backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)", // Custom background color
        }).showToast();
        console.log(result);
      } else {
        alert(`Sign-up failed: ${result.message}`); // Error message
        console.log(result);
      }
    } catch (error) {
      console.error("Error during sign-up:", error);
    }
  });

  // Handle sign-in
  signInForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent default form submission behavior

    // Get form data
    const username = signInForm.querySelector(
      'input[placeholder="Username"]'
    ).value;
    const password = signInForm.querySelector(
      'input[placeholder="Password"]'
    ).value;

    // Create the JSON body for the request
    const loginData = {
      username,
      password,
    };

    try {
      // Send POST request to login API
      const response = await fetch("/api/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(loginData),
      });

      const result = await response.json();
      if (response.ok) {
        if (result.role === "admin") {
          window.location.href = "dashboard.html"; // Redirect admin to the dashboard
        } else {
          window.location.href = "mainDungeon.html"; // Redirect users to the main dungeon
        }
        sessionStorage.setItem("loginSuccess", "true");
      } else {
        alert(`Login failed: ${result.message}`); // Error message
        console.log(result);
      }
    } catch (error) {
      console.error("Error during sign-in:", error);
    }
  });
});
