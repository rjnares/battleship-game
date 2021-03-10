document.addEventListener("DOMContentLoaded", () => {
  const userGrid = document.querySelector(".grid-user");
  const aiGrid = document.querySelector(".grid-ai");
  const chooseShipsGrid = document.querySelector(".grid-choose-ships");
  const ships = document.querySelectorAll(".ship");
  const carrier = document.querySelector(".carrier-container");
  const battleship = document.querySelector(".battleship-container");
  const cruiser = document.querySelector(".cruiser-container");
  const submarine = document.querySelector(".submarine-container");
  const destroyer = document.querySelector(".destroyer-container");
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

  // Generate random placement for each ship
  shipArray.forEach((ship) => generateRandomAiShipLayout(ship));

  // Rotate ships by toggling (adding/removing) a vertical css style of ships
  const HORIZONTAL = "H";
  const VERTICAL = "V";

  // Horizontal init by default
  let orientation = HORIZONTAL;

  function rotateShips() {
    carrier.classList.toggle("carrier-container-vertical");
    battleship.classList.toggle("battleship-container-vertical");
    cruiser.classList.toggle("cruiser-container-vertical");
    submarine.classList.toggle("submarine-container-vertical");
    destroyer.classList.toggle("destroyer-container-vertical");

    orientation = orientation == HORIZONTAL ? VERTICAL : HORIZONTAL;
  }

  rotateShipsButton.addEventListener("click", rotateShips);

  // Drag/place ships
  let selectedShipNameWithIndex = null;
  let draggedShip = null;
  let draggedShipLength = null;

  ships.forEach((ship) =>
    ship.addEventListener("mousedown", (e) => {
      selectedShipNameWithIndex = e.target.id;
    })
  );

  ships.forEach((ship) => ship.addEventListener("dragstart", dragStart));

  userSquares.forEach((square) =>
    square.addEventListener("dragstart", dragStart)
  );
  userSquares.forEach((square) => square.addEventListener("dragend", dragEnd));
  userSquares.forEach((square) =>
    square.addEventListener("dragover", dragOver)
  );
  userSquares.forEach((square) =>
    square.addEventListener("dragenter", dragEnter)
  );
  userSquares.forEach((square) =>
    square.addEventListener("dragleave", dragLeave)
  );
  userSquares.forEach((square) => square.addEventListener("drop", drop));

  function dragStart() {
    draggedShip = this;
    draggedShipLength = draggedShip.children.length;
  }

  function dragEnd() {
    // console.log("drag end");
  }

  function dragOver(event) {
    event.preventDefault();
  }

  function dragEnter(event) {
    event.preventDefault();
  }

  function dragLeave() {
    // console.log("drag leave");
  }

  function canPlace(dropCellId, selectedShipIndex) {
    let pass = true;

    if (orientation == HORIZONTAL) {
      for (let i = 0; i < draggedShipLength; i++) {
        const cellPlaceId = dropCellId - selectedShipIndex + i;
        const filled = userSquares[cellPlaceId].classList.contains("filled");
        if (filled) pass = false;
      }
    } else {
      for (let i = 0; i < draggedShipLength; i++) {
        const cellPlaceId = dropCellId - selectedShipIndex * width + i * width;
        const filled = userSquares[cellPlaceId].classList.contains("filled");
        if (filled) pass = false;
      }
    }
    return pass;
  }

  function drop() {
    const dropCellId = parseInt(this.dataset.id);
    const shipClass = selectedShipNameWithIndex.slice(0, -2);
    const selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1));

    if (orientation == HORIZONTAL) {
      // HORIZONTAL

      // Use drop cell id to find min/max
      const minLimit = dropCellId - (dropCellId % width);
      const maxLimit = minLimit + width - 1;

      // Use drop cell id and selected ship index to find low/high
      const lastShipIndex = parseInt(
        draggedShip.lastElementChild.id.substr(-1)
      );
      const low = dropCellId - selectedShipIndex;
      const high = dropCellId + (lastShipIndex - selectedShipIndex);

      // If min <= low < high <= max then allow placement, otherwise deny placement
      if (
        minLimit <= low &&
        low < high &&
        high <= maxLimit &&
        canPlace(dropCellId, selectedShipIndex)
      ) {
        // Place ship
        for (let i = 0; i < draggedShipLength; i++) {
          const cellPlaceId = dropCellId - selectedShipIndex + i;
          userSquares[cellPlaceId].classList.add("filled", shipClass);
        }

        // Remove ship from choose ship grid to avoid placing more than one of same ship
        chooseShipsGrid.removeChild(draggedShip);
      }
    } else {
      // VERTICAL

      // Use drop cell id and selected ship index to find low/high
      const lastShipIndex = parseInt(
        draggedShip.lastElementChild.id.substr(-1)
      );
      const low = dropCellId - selectedShipIndex * width;
      const high = dropCellId + (lastShipIndex - selectedShipIndex) * width;

      // If 0 <= low < high <= 99 then allow placement, otherwise deny placement
      if (
        0 <= low &&
        low < high &&
        high <= 99 &&
        canPlace(dropCellId, selectedShipIndex)
      ) {
        // Place ship
        for (let i = 0; i < draggedShipLength; i++) {
          const cellPlaceId =
            dropCellId - selectedShipIndex * width + i * width;
          userSquares[cellPlaceId].classList.add("filled", shipClass);
        }

        // Remove ship from choose ship grid to avoid placing more than one of same ship
        chooseShipsGrid.removeChild(draggedShip);
      }
    }
  }

  const aiShipCount = {
    carrier: 5,
    battleship: 4,
    cruiser: 3,
    submarine: 3,
    destroyer: 2,
  };

  const userShipCount = {
    carrier: 5,
    battleship: 4,
    cruiser: 3,
    submarine: 3,
    destroyer: 2,
  };

  function checkGameOver() {
    // Check if all player ship counts are 0, if so, end game
    if (
      userShipCount.carrier +
        userShipCount.battleship +
        userShipCount.cruiser +
        userShipCount.submarine +
        userShipCount.destroyer ==
      0
    ) {
      gameInfoDisplay.innerHTML += " ENEMY WINS!";
      isGameOver = true;
    }

    // Check if all ai ship counts are 0, if so, end game
    if (
      aiShipCount.carrier +
        aiShipCount.battleship +
        aiShipCount.cruiser +
        aiShipCount.submarine +
        aiShipCount.destroyer ==
      0
    ) {
      gameInfoDisplay.innerHTML += " PLAYER WINS!";
      isGameOver = true;
    }
  }

  function revealSquare(square) {
    let message = "";

    // Add number of hits for each ship type hit ONLY if not hit already
    if (!square.classList.contains("hit")) {
      if (square.classList.contains("carrier")) {
        aiShipCount.carrier--;
        if (aiShipCount.carrier == 0)
          message = "Player sunk the enemy Carrier!";
      }
      if (square.classList.contains("battleship")) {
        aiShipCount.battleship--;
        if (aiShipCount.battleship == 0)
          message = "Player sunk the enemy Battleship!";
      }
      if (square.classList.contains("cruiser")) {
        aiShipCount.cruiser--;
        if (aiShipCount.cruiser == 0)
          message = "Player sunk the enemy Cruiser!";
      }
      if (square.classList.contains("submarine")) {
        aiShipCount.submarine--;
        if (aiShipCount.submarine == 0)
          message = "Player sunk the enemy Submarine!";
      }
      if (square.classList.contains("destroyer")) {
        aiShipCount.destroyer--;
        if (aiShipCount.destroyer == 0)
          message = "Player sunk the enemy Destroyer!";
      }
    }

    // Set hit cells
    if (square.classList.contains("filled")) {
      square.classList.add("hit");
      gameInfoDisplay.innerHTML = "Player scored a hit!" + " " + message;
    } else {
      square.classList.add("miss");
      gameInfoDisplay.innerHTML = "Player missed!" + " " + message;
    }

    isUserTurn = false;
    checkGameOver();
    playGame();
  }

  function aiTurn() {
    let randomUserCell = Math.floor(Math.random() * 100);
    let square = userSquares[randomUserCell];
    let message = "";

    while (
      square.classList.contains("hit") ||
      square.classList.contains("miss")
    ) {
      randomUserCell = Math.floor(Math.random() * 100);
      square = userSquares[randomUserCell];
    }

    // Add number of hits for each ship type hit ONLY if not hit already
    if (square.classList.contains("carrier")) {
      userShipCount.carrier--;
      if (userShipCount.carrier == 0)
        message = "Enemy sunk the player's Carrier!";
    }
    if (square.classList.contains("battleship")) {
      userShipCount.battleship--;
      if (userShipCount.battleship == 0)
        message = "Enemy sunk the player's Battleship!";
    }
    if (square.classList.contains("cruiser")) {
      userShipCount.cruiser--;
      if (userShipCount.cruiser == 0)
        message = "Enemy sunk the player's Cruiser!";
    }
    if (square.classList.contains("submarine")) {
      userShipCount.submarine--;
      if (userShipCount.submarine == 0)
        message = "Enemy sunk the player's Submarine!";
    }
    if (square.classList.contains("destroyer")) {
      userShipCount.destroyer--;
      if (userShipCount.destroyer == 0)
        message = "Enemy sunk the player's Destroyer!";
    }

    // Set hit cells
    if (square.classList.contains("filled")) {
      square.classList.add("hit");
      gameInfoDisplay.innerHTML = "Enemy scored a hit!" + " " + message;
    } else {
      square.classList.add("miss");
      gameInfoDisplay.innerHTML = "Enemy missed!" + " " + message;
    }

    isUserTurn = true;
    checkGameOver();
    playGame();
  }

  // Game logic
  let isUserTurn = true;
  let isGameInit = true;
  let isGameOver = false;

  function playGame() {
    // Setup game
    if (isGameInit) {
      // Check if player has placed all ships before starting game
      if (chooseShipsGrid.children.length !== 0) return;

      // Add listener for each square ONLY ONCE
      aiSquares.forEach((square) =>
        square.addEventListener("click", function (e) {
          revealSquare(square);
        })
      );

      // Remove ability to start new game by pressing the button
      startGameButton.removeEventListener("click", playGame);

      isGameInit = false;
    }

    if (isGameOver) {
      return;
    }

    if (isUserTurn) {
      // USER TURN
      currentTurnDisplay.innerHTML = "Player Turn";
    } else {
      // AI TURN
      currentTurnDisplay.innerHTML = "Enemy Turn";

      // AI TAKES TURN
      setTimeout(aiTurn, 1500);
    }
  }

  startGameButton.addEventListener("click", playGame);
});
