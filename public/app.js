document.addEventListener("DOMContentLoaded", () => {
  /* Game Mode Selection */
  let gameMode = null;
  const PLAY_AI = 0;
  const PLAY_ONLINE = 1;
  const playAiButton = document.querySelector("#play-ai");
  const playOnlineButton = document.querySelector("#play-online");

  playAiButton.addEventListener("click", playAi);
  playOnlineButton.addEventListener("click", playOnline);

  /* Current Turn */
  const ENEMY = 0;
  const PLAYER = 1;
  let currentTurn = null;
  let shotFired = -1;

  /* Grids */
  const userGrid = document.querySelector(".grid-user");
  const aiGrid = document.querySelector(".grid-ai");
  const chooseShipsGrid = document.querySelector(".grid-choose-ships");

  /* Grid Squares */
  const userSquares = [];
  const aiSquares = [];
  const CELL_SIDE = 10;

  /* All Ship Elements */
  const allShipElements = document.querySelectorAll(".ship");

  /* Ship Classes */
  const carrier = document.querySelector(".carrier-container");
  const battleship = document.querySelector(".battleship-container");
  const cruiser = document.querySelector(".cruiser-container");
  const submarine = document.querySelector(".submarine-container");
  const destroyer = document.querySelector(".destroyer-container");

  /* Game Functions */
  const startGameButton = document.querySelector("#start-game");
  const rotateShipsButton = document.querySelector("#rotate-ships");
  const currentTurnDisplay = document.querySelector("#current-turn");
  const gameInfoDisplay = document.querySelector("#game-info");

  /* Player Info */
  let playerNum = 0;
  let playerReady = false;
  let enemyReady = false;
  let allShipsPlaced = false;

  // Play AI Code
  function playAi() {
    gameMode = PLAY_AI;

    // Generate random placement for each AI ship
    shipArray.forEach((ship) => generateRandomShipLayout(ship));

    // Start Game button should start game to play against AI
    startGameButton.addEventListener("click", startAiGame);
  }

  // Play Online Code
  function playOnline() {
    gameMode = PLAY_ONLINE;

    const socket = io();

    // Get player number
    socket.on("player-number", (num) => {
      if (num == -1) {
        // Did not connect in time to fill one of two spots
        gameInfoDisplay.innerHTML = "Sorry, the server is full.";
      } else {
        // Is one of two players connected
        playerNum = parseInt(num);

        // playerNum == -1 means currentTurn stays null
        if (playerNum == 0) currentTurn = PLAYER;
        if (playerNum == 1) currentTurn = ENEMY;

        console.log(playerNum);
      }
    });

    // Another player has connected/disconnected
    socket.on("player-connection", (num) => {
      console.log(`Player number ${num} has connected or disconnected`);
      playerConnectedOrDisconnected(num);
    });

    function playerConnectedOrDisconnected(num) {
      const number = parseInt(num);
      let player = `.p${number + 1}`;

      document
        .querySelector(`${player} .connected span`)
        .classList.toggle("green");

      if (number == playerNum) {
        document.querySelector(player).style.fontWeight = "bold";
      }
    }

    startGameButton.addEventListener("click", () => {
      if (allShipsPlaced) startOnlineGame(socket);
      else
        gameInfoDisplay.innerHTML =
          "Cannot start game unless all ships are placed.";
    });
  }

  // Create game board
  function createBoard(grid, squares) {
    for (let i = 0; i < CELL_SIDE * CELL_SIDE; i++) {
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
        [0, CELL_SIDE, 2 * CELL_SIDE, 3 * CELL_SIDE, 4 * CELL_SIDE],
      ],
    },
    {
      name: "battleship",
      directions: [
        [0, 1, 2, 3],
        [0, CELL_SIDE, 2 * CELL_SIDE, 3 * CELL_SIDE],
      ],
    },
    {
      name: "cruiser",
      directions: [
        [0, 1, 2],
        [0, CELL_SIDE, 2 * CELL_SIDE],
      ],
    },
    {
      name: "submarine",
      directions: [
        [0, 1, 2],
        [0, CELL_SIDE, 2 * CELL_SIDE],
      ],
    },
    {
      name: "destroyer",
      directions: [
        [0, 1],
        [0, CELL_SIDE],
      ],
    },
  ];

  function isValidStart(start, shipLength, direction) {
    if (direction) {
      // if vertical, only need to check upper limit on start cell
      const upperLimit = 99 - (shipLength - 1) * CELL_SIDE;

      return start <= upperLimit;
    } else {
      // if horizontal, need to check the mod of upper limit since it varies for each row
      const upperModLimit = CELL_SIDE - shipLength;
      const startModValue = start % CELL_SIDE;

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
  // TODO: Make function take a grid as input so that users can press button to make a random ship layout for them too
  function generateRandomShipLayout(ship) {
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

  allShipElements.forEach((ship) =>
    ship.addEventListener("mousedown", (e) => {
      selectedShipNameWithIndex = e.target.id;
    })
  );

  allShipElements.forEach((ship) =>
    ship.addEventListener("dragstart", dragStart)
  );

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
        const cellPlaceId =
          dropCellId - selectedShipIndex * CELL_SIDE + i * CELL_SIDE;
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
      const minLimit = dropCellId - (dropCellId % CELL_SIDE);
      const maxLimit = minLimit + CELL_SIDE - 1;

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
      const low = dropCellId - selectedShipIndex * CELL_SIDE;
      const high = dropCellId + (lastShipIndex - selectedShipIndex) * CELL_SIDE;

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
            dropCellId - selectedShipIndex * CELL_SIDE + i * CELL_SIDE;
          userSquares[cellPlaceId].classList.add("filled", shipClass);
        }

        // Remove ship from choose ship grid to avoid placing more than one of same ship
        chooseShipsGrid.removeChild(draggedShip);
      }
    }
    // Check if player has placed all ships
    if (!chooseShipsGrid.querySelector(".ship")) allShipsPlaced = true;
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
    startAiGame();
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
    startAiGame();
  }

  // Game logic
  let isUserTurn = true;
  let isGameInit = true;
  let isGameOver = false;

  function startAiGame() {
    // Setup game
    if (isGameInit) {
      // Don't start game unless all ships placed
      if (!allShipsPlaced) {
        gameInfoDisplay.innerHTML =
          "Cannot start game unless all ships are placed.";
        return;
      }

      // Add listener for each square ONLY ONCE
      aiSquares.forEach((square) =>
        square.addEventListener("click", function (e) {
          revealSquare(square);
        })
      );

      // Remove ability to start new game by pressing the button
      startGameButton.removeEventListener("click", startAiGame);

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

  function startOnlineGame(socket) {}
});
