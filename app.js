document.addEventListener("DOMContentLoaded", () => {
  const userGrid = document.querySelector(".grid-user");
  const aiGrid = document.querySelector(".grid-ai");
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
  const aiSquares = [];
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
  createBoard(aiGrid, aiSquares);

  // Ships
  const shipArray = [
    {
      name: "carrier",
      directions: [
        [0, 1, 2, 3, 4],
        [0, width, 2 * width, 3 * width, 4 * width],
      ],
    },
    {
      name: "battleship",
      directions: [
        [0, 1, 2, 3],
        [0, width, 2 * width, 3 * width],
      ],
    },
    {
      name: "cruiser",
      directions: [
        [0, 1, 2],
        [0, width, 2 * width],
      ],
    },
    {
      name: "submarine",
      directions: [
        [0, 1, 2],
        [0, width, 2 * width],
      ],
    },
    {
      name: "destroyer",
      directions: [
        [0, 1],
        [0, width],
      ],
    },
  ];

  function isValidStart(start, shipLength, direction) {
    if (direction) {
      // if vertical, only need to check upper limit on start cell
      const upperLimit = 99 - (shipLength - 1) * width;

      return start <= upperLimit;
    } else {
      // if horizontal, need to check the mod of upper limit since it varies for each row
      const upperModLimit = width - shipLength;
      const startModValue = start % width;

      return startModValue <= upperModLimit;
    }
  }

  function isFilled(start, direction) {
    // check if any cells of current ship are already filled by another ship
    return direction.some((index) =>
      aiSquares[start + index].classList.contains("filled")
    );
  }

  // Generate random AI ship layout
  function generateRandomAiShipLayout(ship) {
    const shipIndexes = ship.directions;
    const shipLength = shipIndexes[0].length;

    // Chooses vertical or horizontal placement randomly
    const randomDirection = Math.floor(Math.random() * 2);
    const currentDirection = shipIndexes[randomDirection];

    // Choose random start from cells 0 - 99
    let randomStart = Math.floor(Math.random() * 100);

    // While valid random start is not found OR cell(s) already taken, generate new one
    while (
      !isValidStart(randomStart, shipLength, randomDirection) ||
      isFilled(randomStart, currentDirection)
    ) {
      // Choose NEW random start from cells 0 - 99
      randomStart = Math.floor(Math.random() * 100);
    }

    // If here, then we have both valid random start and no cells are already filled
    currentDirection.forEach((index) =>
      aiSquares[randomStart + index].classList.add("filled", ship.name)
    );
  }

  shipArray.forEach((ship) => generateRandomAiShipLayout(ship));
});
