document.addEventListener("DOMContentLoaded", () => {
  const userGrid = document.querySelector(".grid-user");
  const computerGrid = document.querySelector(".grid-computer");
  const chooseShipsGrid = document.querySelector(".grid-choose-ships");
  const ships = document.querySelectorAll(".ship");
  const carrier = document.querySelector(".carrier");
  const battleship = document.querySelector(".battleship");
  const cruiser = document.querySelector(".cruiser");
  const submarine = document.querySelector(".submarine");
  const destroyer = document.querySelector(".destroyer");
  const startGameButton = document.querySelector("#start-game");
  const rotateShipsButton = document.querySelector("#rotate-ships");
  const currentTurnDisplay = document.querySelector("#current-turn");
  const gameInfoDisplay = document.querySelector("#game-info");
  const userSquares = [];
  const computerSquares = [];
  const width = 10;

  // Create game board
  function createBoard(grid, squares) {
    for (let i = 0; i < width * width; i++) {
      const square = document.createElement("div");
      square.dataset.id = i;
      grid.appendChild(square);
      squares.push(square);
    }
  }

  createBoard(userGrid, userSquares);
  createBoard(computerGrid, computerSquares);
});
